<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Registra o modulo "Pneus" como item do menu Frota (catalogo cross-veiculo,
 * igual a Preventivas/Checklists). Idempotente.
 */
return new class extends Migration {
    public function up(): void
    {
        $frotaId = DB::table('modules')->where('slug', 'frota')->value('id');
        if (! $frotaId) return;
        if (DB::table('modules')->where('slug', 'frota.pneus')->exists()) return;

        $id = DB::table('modules')->insertGetId([
            'slug'                     => 'frota.pneus',
            'name'                     => 'Pneus',
            'route_name'               => 'admin.frota.pneus.index',
            'icon'                     => 'fa-solid fa-life-ring',
            'parent_id'                => $frotaId,
            'id_modulo_relacionamento' => $frotaId,
            'url'                      => null,
            'ordem'                    => 285,
            'sort_order'               => 285,
            'is_active'                => 1,
            'show_in_menu'             => 1,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);
    }

    public function down(): void
    {
        $id = DB::table('modules')->where('slug', 'frota.pneus')->value('id');
        if ($id) {
            DB::table('module_permissions')->where('module_id', $id)->delete();
            DB::table('modules')->where('id', $id)->delete();
        }
    }
};
