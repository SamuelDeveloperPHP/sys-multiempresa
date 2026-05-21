<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * @deprecated Modulos Frota foram consolidados em ModulesPermissionsSeeder
 *             (seeder canonico rodado pelo DatabaseSeeder). Mantido aqui
 *             apenas para SMS e Sincronizacao, ate que tambem sejam
 *             migrados para o canonico.
 *
 * Cria/atualiza modulos Frota + SMS + Sincronizacao no menu do sistema.
 * Ideompotente — pode rodar varias vezes.
 *
 * Uso:
 *   php artisan db:seed --class=Database\\Seeders\\ModulesFrotaSeeder
 */
class ModulesFrotaSeeder extends Seeder
{
    public function run(): void
    {
        $modulos = [
            // Pais (parent_id = null)
            ['slug' => 'frota',         'name' => 'Frota',         'icon' => 'truck',     'url' => 'admin.frota.index',         'parent_slug' => null],
            ['slug' => 'sms',           'name' => 'SMS',           'icon' => 'shield',    'url' => 'admin.sms.index',           'parent_slug' => null],
            ['slug' => 'sincronizacao', 'name' => 'Sincronizacao', 'icon' => 'refresh',   'url' => 'admin.sincronizacao.index', 'parent_slug' => null],

            // Filhos — Frota
            ['slug' => 'frota.veiculos',      'name' => 'Veiculos',      'icon' => 'car',          'url' => 'admin.frota.veiculos.index',      'parent_slug' => 'frota'],
            ['slug' => 'frota.locacoes',      'name' => 'Locacoes',      'icon' => 'link',         'url' => 'admin.frota.locacoes.index',      'parent_slug' => 'frota'],
            ['slug' => 'frota.checklists',    'name' => 'Checklists',    'icon' => 'check-square', 'url' => 'admin.frota.checklists.index',    'parent_slug' => 'frota'],
            ['slug' => 'frota.abastecimentos','name' => 'Abastecimentos','icon' => 'gas-pump',     'url' => 'admin.frota.abastecimentos.index','parent_slug' => 'frota'],
            ['slug' => 'frota.diario',        'name' => 'Diario de Bordo','icon' => 'book',        'url' => 'admin.frota.diario.index',        'parent_slug' => 'frota'],
            ['slug' => 'frota.horimetro',     'name' => 'Horimetros',    'icon' => 'clock',        'url' => 'admin.frota.horimetro.index',     'parent_slug' => 'frota'],
            ['slug' => 'frota.quilometragem', 'name' => 'Hodometros',    'icon' => 'speedometer',  'url' => 'admin.frota.quilometragem.index', 'parent_slug' => 'frota'],
            ['slug' => 'frota.preventivas',   'name' => 'Preventivas',   'icon' => 'wrench',       'url' => 'admin.frota.preventivas.index',   'parent_slug' => 'frota'],

            // Filhos — SMS (placeholder para Fase 3)
            ['slug' => 'sms.checklists',  'name' => 'Checklists SMS', 'icon' => 'shield-check', 'url' => 'admin.sms.checklists.index',  'parent_slug' => 'sms'],
            ['slug' => 'sms.funcionarios','name' => 'Funcionarios SMS','icon' => 'users',      'url' => 'admin.sms.funcionarios.index','parent_slug' => 'sms'],
        ];

        // 1) cria/atualiza todos os pais primeiro
        foreach (array_filter($modulos, fn ($m) => $m['parent_slug'] === null) as $m) {
            $this->upsertModule($m, null);
        }

        // 2) depois os filhos com parent_id resolvido
        foreach (array_filter($modulos, fn ($m) => $m['parent_slug'] !== null) as $m) {
            $parentId = DB::table('modules')->where('slug', $m['parent_slug'])->value('id');
            $this->upsertModule($m, $parentId);
        }

        $this->command->info('Modulos Frota/SMS/Sincronizacao cadastrados/atualizados.');
    }

    protected function upsertModule(array $m, ?int $parentId): void
    {
        DB::table('modules')->updateOrInsert(
            ['slug' => $m['slug']],
            [
                'name' => $m['name'],
                'icon' => $m['icon'],
                'url' => $m['url'],
                'parent_id' => $parentId,
                'updated_at' => now(),
                'created_at' => DB::raw('COALESCE(created_at, NOW())'),
            ]
        );
    }
}
