<?php

namespace Tests\Unit;

use App\Services\EffectivePermissions;
use Tests\Concerns\BuildsAccessLevelSchema;
use Tests\TestCase;

/**
 * Testes da FONTE ÚNICA da verdade de permissões efetivas.
 *
 * Regra: override em module_permissions(company,user,module) VENCE por inteiro;
 * senão herda do access_group do usuário naquela empresa; senão false;
 * super_admin sempre true.
 *
 * Ambiente: sqlite :memory: com schema mínimo montado à mão (ver trait).
 * Nunca toca o banco de dev (sys_engeativos).
 */
class EffectivePermissionsTest extends TestCase
{
    use BuildsAccessLevelSchema;

    private EffectivePermissions $svc;

    private const MOD = 5;   // módulo genérico usado nos casos 1..6

    protected function setUp(): void
    {
        parent::setUp();
        $this->bootAccessLevelSchema();
        $this->svc = new EffectivePermissions();
    }

    // ---- Caso 1: grupo concede ------------------------------------------------

    public function test_caso1_grupo_concede_sem_override(): void
    {
        $company = $this->makeCompany('A');
        $user    = $this->makeUser();
        $groupId = $this->makeGroup($company->id, 'Editores');
        $this->grantGroup($groupId, self::MOD, ['edit' => true]); // só edit
        $this->linkUserCompany($user, $company, $groupId);

        $this->assertTrue(
            $this->svc->can($user, $company, self::MOD, 'edit'),
            'Grupo concede can_edit=true => can(edit) deve ser true'
        );
        // Aceita o prefixo can_.
        $this->assertTrue($this->svc->can($user, $company, self::MOD, 'can_edit'));
        // Habilidade não concedida pelo grupo permanece false.
        $this->assertFalse($this->svc->can($user, $company, self::MOD, 'delete'));
        // Também funciona passando o id da empresa (Company|int).
        $this->assertTrue($this->svc->can($user, $company->id, self::MOD, 'edit'));
    }

    // ---- Caso 2: override NEGA vence -----------------------------------------

    public function test_caso2_override_nega_vence_sobre_grupo_que_concede(): void
    {
        $company = $this->makeCompany('A');
        $user    = $this->makeUser();
        $groupId = $this->makeGroup($company->id, 'Editores');
        $this->grantGroup($groupId, self::MOD, ['edit' => true]);   // grupo concede
        $this->linkUserCompany($user, $company, $groupId);
        $this->setOverride($company->id, $user->id, self::MOD, ['edit' => false]); // override nega

        $this->assertFalse(
            $this->svc->can($user, $company, self::MOD, 'edit'),
            'Override can_edit=false deve VENCER o grupo que concede'
        );
    }

    // ---- Caso 3: override CONCEDE vence --------------------------------------

    public function test_caso3_override_concede_vence_sobre_grupo_silencioso_ou_negador(): void
    {
        // (a) grupo silencioso (sem linha p/ o módulo), override concede
        $company = $this->makeCompany('A');
        $user    = $this->makeUser();
        $groupId = $this->makeGroup($company->id, 'Basico');
        $this->linkUserCompany($user, $company, $groupId); // grupo sem permissão no módulo
        $this->setOverride($company->id, $user->id, self::MOD, ['edit' => true]);

        $this->assertTrue(
            $this->svc->can($user, $company, self::MOD, 'edit'),
            'Grupo silencioso + override concede => true'
        );

        // (b) grupo NEGA explicitamente (linha com edit=false), override concede
        $company2 = $this->makeCompany('A2');
        $user2    = $this->makeUser();
        $group2   = $this->makeGroup($company2->id, 'Negador');
        $this->grantGroup($group2, self::MOD, ['edit' => false]); // grupo com edit=false
        $this->linkUserCompany($user2, $company2, $group2);
        $this->setOverride($company2->id, $user2->id, self::MOD, ['edit' => true]);

        $this->assertTrue(
            $this->svc->can($user2, $company2, self::MOD, 'edit'),
            'Grupo nega + override concede => override vence => true'
        );
    }

    // ---- Caso 4: retrocompatibilidade (sem grupo, só overrides) --------------

    public function test_caso4_retrocompat_usuario_sem_grupo_so_overrides(): void
    {
        $company = $this->makeCompany('A');
        $user    = $this->makeUser();
        $this->linkUserCompany($user, $company, null); // SEM grupo

        // Override com um mix conhecido nas 5 abilities.
        $mix = ['list' => true, 'view' => true, 'create' => false, 'edit' => true, 'delete' => false];
        $this->setOverride($company->id, $user->id, self::MOD, $mix);

        foreach ($mix as $ability => $expected) {
            $this->assertSame(
                $expected,
                $this->svc->can($user, $company, self::MOD, $ability),
                "Retrocompat: can({$ability}) deve espelhar a linha de override"
            );
        }

        // Módulo SEM linha de override => nega em todas (legado: linha existe? can_x : false).
        $moduleSemLinha = 999;
        foreach (['list', 'view', 'create', 'edit', 'delete'] as $ability) {
            $this->assertFalse(
                $this->svc->can($user, $company, $moduleSemLinha, $ability),
                "Retrocompat: módulo sem linha deve negar ({$ability})"
            );
        }
    }

    // ---- Caso 5: isolamento entre empresas -----------------------------------

    public function test_caso5_isolamento_entre_empresas(): void
    {
        $companyA = $this->makeCompany('A');
        $companyB = $this->makeCompany('B');
        $user     = $this->makeUser();

        // Footprint SÓ na empresa A: grupo concede tudo + override concede.
        $groupA = $this->makeGroup($companyA->id, 'AdminA');
        $this->grantGroup($groupA, self::MOD, ['list' => true, 'view' => true, 'edit' => true]);
        $this->linkUserCompany($user, $companyA, $groupA);
        $this->setOverride($companyA->id, $user->id, self::MOD, ['list' => true, 'delete' => true]);

        // O usuário NÃO tem vínculo com a empresa B.
        foreach (['list', 'view', 'create', 'edit', 'delete'] as $ability) {
            $this->assertFalse(
                $this->svc->can($user, $companyB, self::MOD, $ability),
                "Empresa B não deve enxergar footprint da A ({$ability})"
            );
        }

        // listableModuleIds não vaza módulos da A para a B.
        $this->assertSame([], $this->svc->listableModuleIds($user, $companyB));
        $this->assertContains(self::MOD, $this->svc->listableModuleIds($user, $companyA));
    }

    // ---- Caso 6: super_admin sempre true -------------------------------------

    public function test_caso6_super_admin_sempre_true(): void
    {
        $company = $this->makeCompany('A');
        $admin   = $this->makeUser('super_admin');
        // Sem grupo e sem override e, para reforçar, um override que NEGA.
        $this->linkUserCompany($admin, $company, null);
        $this->setOverride($company->id, $admin->id, self::MOD, [
            'list' => false, 'view' => false, 'create' => false, 'edit' => false, 'delete' => false,
        ]);

        foreach (['list', 'view', 'create', 'edit', 'delete'] as $ability) {
            $this->assertTrue(
                $this->svc->can($admin, $company, self::MOD, $ability),
                "super_admin deve poder tudo, mesmo com override negando ({$ability})"
            );
        }
        // Sem nenhum vínculo/empresa arbitrária também.
        $this->assertTrue($this->svc->can($admin, 424242, 777, 'delete'));
    }

    // ---- Caso 7: listableModuleIds (override vence por módulo) ----------------

    public function test_caso7_listable_module_ids_precedencia_por_modulo(): void
    {
        $company = $this->makeCompany('A');
        $user    = $this->makeUser();
        $groupId = $this->makeGroup($company->id, 'Grupo');

        // Grupo concede can_list em 5, 6 e 8 (8 será derrubado por override).
        $this->grantGroup($groupId, 5, ['list' => true]);
        $this->grantGroup($groupId, 6, ['list' => true]);
        $this->grantGroup($groupId, 8, ['list' => true]);
        // Grupo NÃO concede list em 9 (view only) -> não deve listar.
        $this->grantGroup($groupId, 9, ['view' => true]);
        $this->linkUserCompany($user, $company, $groupId);

        // Overrides: módulo 5 nega (vence), módulo 7 concede (adiciona),
        // módulo 8 nega (vence sobre o grupo que concedia).
        $this->setOverride($company->id, $user->id, 5, ['list' => false]);
        $this->setOverride($company->id, $user->id, 7, ['list' => true]);
        $this->setOverride($company->id, $user->id, 8, ['list' => false]);

        $listable = $this->svc->listableModuleIds($user, $company);
        sort($listable);

        // Esperado: 6 (grupo), 7 (override concede). 5 e 8 negados por override; 9 sem list.
        $this->assertSame([6, 7], $listable, 'Precedência por módulo no menu incorreta');
    }
}
