<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Cadastra os módulos de estoque. */
class EstoqueModulesSeeder extends Seeder
{
    /**
     * Estrutura dos módulos. Pais primeiro, filhos referenciam por parent_slug.
     */
    protected array $modulos = [
        // ------------------------------------------------------------------
        // PAI
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque',
            'parent_slug'  => null,
            'name'         => 'Estoque',
            'route_name'   => null,
            'icon'         => 'fa-solid fa-boxes-stacked',
            'sort_order'   => 50,
        ],

        // ------------------------------------------------------------------
        // FILHOS — FASE 2 (catálogo)
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque.produtos',
            'parent_slug'  => 'estoque',
            'name'         => 'Produtos',
            'route_name'   => 'admin.estoque.produtos.index',
            'icon'         => 'fa-solid fa-box',
            'sort_order'   => 1,
        ],
        [
            'slug'         => 'estoque.categorias',
            'parent_slug'  => 'estoque',
            'name'         => 'Categorias',
            'route_name'   => 'admin.estoque.categorias.index',
            'icon'         => 'fa-solid fa-folder-tree',
            'sort_order'   => 2,
        ],

        // ------------------------------------------------------------------
        // FASES FUTURAS (placeholders — show_in_menu=false até implementar)
        // ------------------------------------------------------------------
        [
            'slug'         => 'estoque.movimentacoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Movimentações',
            'route_name'   => 'admin.estoque.movimentacoes.index',
            'icon'         => 'fa-solid fa-arrow-right-arrow-left',
            'sort_order'   => 3,
            'show_in_menu' => true, // FASE 3 implementada
        ],
        [
            // Saldos por obra — visão consolidada do catálogo × obra escolhida
            'slug'         => 'estoque.saldos',
            'parent_slug'  => 'estoque',
            'name'         => 'Saldos por Obra',
            'route_name'   => 'admin.estoque.saldos.index',
            'icon'         => 'fa-solid fa-boxes-stacked',
            'sort_order'   => 4,
            'show_in_menu' => true,
        ],
        [
            'slug'         => 'estoque.requisicoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Requisições',
            'route_name'   => 'admin.estoque.requisicoes.index',
            'icon'         => 'fa-solid fa-clipboard-list',
            'sort_order'   => 4,
            'show_in_menu' => true, // FASE 4 implementada
        ],
        [
            'slug'         => 'estoque.inventarios',
            'parent_slug'  => 'estoque',
            'name'         => 'Inventários e Alertas',
            'route_name'   => 'admin.estoque.inventarios.index',
            'icon'         => 'fa-solid fa-list-check',
            'sort_order'   => 5,
            'show_in_menu' => true, // FASE 5 implementada
        ],
        [
            'slug'         => 'estoque.devolucoes',
            'parent_slug'  => 'estoque',
            'name'         => 'Devoluções',
            'route_name'   => 'admin.estoque.devolucoes.index',
            'icon'         => 'fa-solid fa-rotate-left',
            'sort_order'   => 5,
            'show_in_menu' => true, // FASE 7.B
        ],
        [
            'slug'         => 'estoque.almoxarifes',
            'parent_slug'  => 'estoque',
            'name'         => 'Almoxarifes',
            'route_name'   => 'admin.estoque.almoxarifes.index',
            'icon'         => 'fa-solid fa-user-shield',
            'sort_order'   => 7,
            'show_in_menu' => true, // FASE 7.B+ gestão de aprovadores
        ],
        [
            'slug'         => 'estoque.biometria_funcionarios',
            'parent_slug'  => 'estoque',
            'name'         => 'Biometria de funcionários',
            'route_name'   => 'admin.estoque.biometria-funcionarios.index',
            'icon'         => 'fa-solid fa-fingerprint',
            'sort_order'   => 8,
            'show_in_menu' => true, // cadastro de digital de terceiros
        ],
        [
            'slug'         => 'estoque.relatorios',
            'parent_slug'  => 'estoque',
            'name'         => 'Relatórios',
            'route_name'   => 'admin.estoque.relatorios.hub',
            'icon'         => 'fa-solid fa-chart-line',
            'sort_order'   => 6,
            'show_in_menu' => true, // FASE 6 implementada
        ],
        [
            'slug'         => 'estoque.sincronizacao_leroy',
            'parent_slug'  => 'estoque',
            'name'         => 'Sincronização Leroy Merlin',
            'route_name'   => 'admin.estoque.sincronizacao-leroy.index',
            'icon'         => 'fa-solid fa-cloud-arrow-down',
            'sort_order'   => 9,
            'show_in_menu' => true, // catálogo de referência externo
        ],
        [
            'slug'         => 'estoque.importacao',
            'parent_slug'  => 'estoque',
            'name'         => 'Importar p/ Estoque',
            'route_name'   => 'admin.estoque.importacao.index',
            'icon'         => 'fa-solid fa-arrow-right-arrow-left',
            'sort_order'   => 10,
            'show_in_menu' => true, // ponte Leroy -> estoque operacional
        ],
    ];

    public function run(): void
    {
        // ----- 1) PAIS -----
        $paisIdsBySlug = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] === null) as $m) {
            $id = $this->upsertModulo($m, null);
            $paisIdsBySlug[$m['slug']] = $id;
        }

        // ----- 2) FILHOS -----
        $filhosIds = [];
        foreach (array_filter($this->modulos, fn ($m) => $m['parent_slug'] !== null) as $m) {
            $parentId = $paisIdsBySlug[$m['parent_slug']]
                ?? Module::where('slug', $m['parent_slug'])->value('id');
            $id = $this->upsertModulo($m, $parentId);
            $filhosIds[] = $id;
        }

        $todosIds = array_merge(array_values($paisIdsBySlug), $filhosIds);

        $this->command->info('Módulos Estoque cadastrados: ' . count($todosIds));
    }

    protected function upsertModulo(array $m, ?int $parentId): int
    {
        $now = now();
        DB::table('modules')->updateOrInsert(
            ['slug' => $m['slug']],
            [
                'parent_id'    => $parentId,
                'name'         => $m['name'],
                'route_name'   => $m['route_name'] ?? null,
                'icon'         => $m['icon'] ?? null,
                'sort_order'   => $m['sort_order'] ?? 0,
                'is_active'    => $m['is_active'] ?? true,
                'show_in_menu' => $m['show_in_menu'] ?? true,
                'updated_at'   => $now,
                'created_at'   => DB::raw('COALESCE(created_at, NOW())'),
            ]
        );
        return (int) DB::table('modules')->where('slug', $m['slug'])->value('id');
    }
}
