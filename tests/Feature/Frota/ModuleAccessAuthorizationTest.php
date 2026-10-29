<?php

namespace Tests\Feature\Frota;

use App\Http\Middleware\ModuleAccess;
use Illuminate\Routing\Route;

class ModuleAccessAuthorizationTest extends AdminFrotaTestCase
{
    public function test_fallback_de_mutacao_customizada_nunca_retorna_view(): void
    {
        $postRoute = new Route(['POST'], '/acao-customizada', ['uses' => fn () => null]);
        $deleteRoute = new Route(['DELETE'], '/acao-customizada', ['uses' => fn () => null]);

        $this->assertSame('edit', ModuleAccess::abilityForRoute($postRoute));
        $this->assertSame('delete', ModuleAccess::abilityForRoute($deleteRoute));
    }

    public function test_todas_as_rotas_mutaveis_de_frota_exigem_habilidade_de_escrita(): void
    {
        $routes = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn (Route $route): bool => str_starts_with((string) $route->getName(), 'admin.frota.'))
            ->filter(fn (Route $route): bool => array_intersect(
                ['POST', 'PUT', 'PATCH', 'DELETE'],
                $route->methods(),
            ) !== [])
            ->values();

        $this->assertCount(92, $routes, 'A matriz deve acompanhar todas as rotas mutáveis de Frota.');

        foreach ($routes as $route) {
            $ability = ModuleAccess::abilityForRoute($route);

            $this->assertContains(
                $ability,
                ['create', 'edit', 'delete'],
                "A rota {$route->getName()} não pode usar habilidade de leitura.",
            );

            if (! in_array($route->getActionMethod(), ['store', 'update', 'destroy'], true)) {
                $this->assertNotNull(
                    $route->getAction(ModuleAccess::ROUTE_ABILITY_KEY),
                    "A rota customizada {$route->getName()} deve declarar moduleAbility().",
                );
            }
        }
    }

    public function test_perfil_somente_leitura_nao_altera_configuracao_de_pneus(): void
    {
        $company = $this->criarEmpresa();
        $user = $this->criarUsuario($company);
        $veiculo = $this->criarVeiculo($company, ['config_pneus' => null]);

        $this->concederPermissao(
            $user,
            $company,
            'admin.frota.veiculos.index',
            ['list', 'view'],
        );

        $this->comContexto($user, $company)
            ->put(route('admin.frota.veiculos.pneus.config', $veiculo), [
                'config_pneus' => 'passeio_4x2',
            ])
            ->assertForbidden();

        $this->assertNull($veiculo->fresh()->config_pneus);
    }

    public function test_perfil_editor_mantem_acesso_a_acao_customizada(): void
    {
        $company = $this->criarEmpresa();
        $user = $this->criarUsuario($company);
        $veiculo = $this->criarVeiculo($company, ['config_pneus' => null]);

        $this->concederPermissao(
            $user,
            $company,
            'admin.frota.veiculos.index',
            ['list', 'view', 'edit'],
        );

        $this->comContexto($user, $company)
            ->from(route('admin.frota.veiculos.show', $veiculo))
            ->put(route('admin.frota.veiculos.pneus.config', $veiculo), [
                'config_pneus' => 'passeio_4x2',
            ])
            ->assertRedirect(route('admin.frota.veiculos.show', $veiculo));

        $this->assertSame('passeio_4x2', $veiculo->fresh()->config_pneus);
    }
}
