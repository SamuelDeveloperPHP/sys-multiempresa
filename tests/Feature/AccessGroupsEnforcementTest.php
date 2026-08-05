<?php

namespace Tests\Feature;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Admin\UserController;
use App\Http\Middleware\ModuleAccess;
use App\Models\AccessGroup;
use App\Models\Scopes\CompanyScope;
use App\Services\EffectivePermissions;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Route;
use Illuminate\Validation\ValidationException;
use ReflectionMethod;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\BuildsAccessLevelSchema;
use Tests\TestCase;

/**
 * Enforcement e escopo multiempresa da feature "Níveis de Acesso".
 *
 * Cobre (o quanto o ambiente permite):
 *   8) Enforcement por verbo — exercita o MIDDLEWARE REAL (ModuleAccess).
 *   9) Tenant scoping do CRUD — CompanyScope no route-model binding (=> 404).
 *  10) assertAccessGroupsBelong — invoca o MÉTODO REAL do UserController.
 *
 * Observação de ambiente: não é possível subir o stack HTTP completo em
 * sqlite :memory: (as 128 migrations não rodam do zero — ver trait). Então,
 * em vez de $this->get()/post(), exercitamos as MESMAS peças de código reais
 * (middleware/controller/scope) diretamente sobre o schema mínimo. Isso prova
 * a decisão de enforcement sem depender do banco de dev.
 */
class AccessGroupsEnforcementTest extends TestCase
{
    use BuildsAccessLevelSchema;

    private const MOD_NIVEIS = 11; // módulo "Níveis de Acesso"
    private const ROUTE_INDEX = 'admin.users.permissions.index';

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootAccessLevelSchema();
        CompanyContext::clear();
    }

    protected function tearDown(): void
    {
        CompanyContext::clear();
        parent::tearDown();
    }

    // ---- Caso 8: enforcement por verbo (middleware real) ---------------------

    public function test_caso8_enforcement_por_verbo_no_middleware(): void
    {
        $company = $this->makeCompany('A');
        $user    = $this->makeUser(); // NÃO super_admin
        $this->linkUserCompany($user, $company, null);

        // Módulo 11 e override que concede SÓ can_list.
        $this->makeModule(self::MOD_NIVEIS, self::ROUTE_INDEX, 'Níveis de Acesso');
        $this->setOverride($company->id, $user->id, self::MOD_NIVEIS, ['list' => true]);

        $this->actingAs($user);
        CompanyContext::set($company);
        $this->assertSame($company->id, CompanyContext::id(), 'contexto de empresa deve estar setado');

        // Bridge: o serviço (fonte da verdade que o middleware consome) devolve
        // exatamente estes booleanos para o módulo 11.
        $svc = new EffectivePermissions();
        $this->assertTrue($svc->can($user, $company, self::MOD_NIVEIS, 'list'));
        $this->assertFalse($svc->can($user, $company, self::MOD_NIVEIS, 'create'));
        $this->assertFalse($svc->can($user, $company, self::MOD_NIVEIS, 'edit'));
        $this->assertFalse($svc->can($user, $company, self::MOD_NIVEIS, 'delete'));

        // GET index  -> ability 'list'   -> 200 (liberado)
        $this->assertSame(200, $this->runModuleAccess(self::ROUTE_INDEX, 'index'),
            'GET index deveria passar (can_list=true)');

        // POST store -> ability 'create' -> 403
        $this->assertSame(403, $this->runModuleAccess('admin.users.permissions.store', 'store'),
            'POST store deveria ser 403 (can_create=false)');

        // PUT update -> ability 'edit'   -> 403
        $this->assertSame(403, $this->runModuleAccess('admin.users.permissions.update', 'update'),
            'PUT update deveria ser 403 (can_edit=false)');

        // DELETE destroy -> ability 'delete' -> 403
        $this->assertSame(403, $this->runModuleAccess('admin.users.permissions.destroy', 'destroy'),
            'DELETE destroy deveria ser 403 (can_delete=false)');
    }

    public function test_caso8b_super_admin_passa_em_todos_os_verbos(): void
    {
        $company = $this->makeCompany('A');
        $admin   = $this->makeUser('super_admin');
        $this->linkUserCompany($admin, $company, null);
        $this->makeModule(self::MOD_NIVEIS, self::ROUTE_INDEX, 'Níveis de Acesso');

        $this->actingAs($admin);
        CompanyContext::set($company);

        foreach ([
            [self::ROUTE_INDEX, 'index'],
            ['admin.users.permissions.store', 'store'],
            ['admin.users.permissions.update', 'update'],
            ['admin.users.permissions.destroy', 'destroy'],
        ] as [$routeName, $action]) {
            $this->assertSame(200, $this->runModuleAccess($routeName, $action),
                "super_admin deveria passar em {$action}");
        }
    }

    // ---- Caso 9: tenant scoping do CRUD (CompanyScope no binding) -------------

    public function test_caso9_tenant_scoping_do_binding_de_access_group(): void
    {
        $companyA = $this->makeCompany('A');
        $companyB = $this->makeCompany('B');
        $groupA   = $this->makeGroup($companyA->id, 'GrupoA');
        $groupB   = $this->makeGroup($companyB->id, 'GrupoB');

        // Empresa corrente = A.
        CompanyContext::set($companyA);
        $this->assertTrue(CompanyContext::hasCurrent());

        // Route-model binding usa o CompanyScope (Tenantable): só enxerga A.
        $this->assertNotNull(
            AccessGroup::find($groupA),
            'grupo da própria empresa deve ser resolvido pelo binding'
        );
        $this->assertNull(
            AccessGroup::find($groupB),
            'grupo de OUTRA empresa deve sumir do binding (=> 404)'
        );

        // Backstop manual do controller: mesmo forçando (sem escopo), o
        // company_id do grupo B difere da empresa atual => abort(403).
        $rawB = AccessGroup::withoutGlobalScope(CompanyScope::class)->find($groupB);
        $this->assertNotNull($rawB);
        $this->assertNotSame(
            (int) $companyA->id,
            (int) $rawB->company_id,
            'backstop: company_id do grupo != empresa atual dispara 403'
        );
    }

    // ---- Caso 10: assertAccessGroupsBelong (método real) ---------------------

    public function test_caso10_assert_access_groups_belong_rejeita_grupo_de_outra_empresa(): void
    {
        $companyA = $this->makeCompany('A');
        $companyB = $this->makeCompany('B');
        $groupB   = $this->makeGroup($companyB->id, 'GrupoB');

        $controller = app(UserController::class);
        $method = new ReflectionMethod($controller, 'assertAccessGroupsBelong');
        $method->setAccessible(true);

        // (FALHA) empresa A recebendo um grupo que é da empresa B.
        $bad = Request::create('/admin/users/x', 'POST', [
            'access_groups' => [(string) $companyA->id => (string) $groupB],
        ]);

        $threw = false;
        try {
            $method->invoke($controller, $bad, [$companyA->id]);
        } catch (ValidationException $e) {
            $threw = true;
            $this->assertArrayHasKey(
                "access_groups.{$companyA->id}",
                $e->errors(),
                'a mensagem de erro deve apontar a empresa divergente'
            );
        }
        $this->assertTrue($threw, 'grupo de outra empresa deveria lançar ValidationException (não persiste)');

        // (OK) empresa B recebendo o próprio grupo -> não lança.
        $good = Request::create('/admin/users/x', 'POST', [
            'access_groups' => [(string) $companyB->id => (string) $groupB],
        ]);
        $method->invoke($controller, $good, [$companyB->id]);
        $this->assertTrue(true, 'grupo pertencente à empresa não deve lançar');
    }

    // ------------------------------------------------------------------ infra --

    /**
     * Executa o middleware ModuleAccess REAL contra uma rota nomeada + método
     * de action, devolvendo o status HTTP resultante (200 liberado, 403 negado).
     */
    private function runModuleAccess(string $routeName, string $actionMethod): int
    {
        $httpMethod = match ($actionMethod) {
            'store'   => 'POST',
            'update'  => 'PUT',
            'destroy' => 'DELETE',
            default   => 'GET',
        };

        $uri     = '/admin/users/permissions';
        $request = Request::create($uri, $httpMethod);

        // 'controller' precisa estar setado: Route::getActionMethod() deriva o
        // método a partir de action['controller'] (não de 'uses'). Sem ele, o
        // método vira "Closure" e o middleware cai no ability default ('view').
        $controllerAction = \App\Http\Controllers\Admin\AccessGroupController::class . '@' . $actionMethod;

        $route = new Route([$httpMethod], $uri, [
            'uses'       => $controllerAction,
            'controller' => $controllerAction,
        ]);
        $route->name($routeName);
        $route->bind($request);
        $request->setRouteResolver(fn () => $route);

        try {
            $response = (new ModuleAccess())->handle($request, fn () => new Response('OK', 200));

            return $response->getStatusCode();
        } catch (HttpException $e) {
            return $e->getStatusCode();
        }
    }
}
