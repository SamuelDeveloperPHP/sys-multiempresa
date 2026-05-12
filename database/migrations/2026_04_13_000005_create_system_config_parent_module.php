<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cria o módulo-pai "Configurações do Sistema" e agrupa
 * Módulos, Auditoria e Backups como filhos.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Cria o módulo pai
        $parentId = DB::table('modules')->insertGetId([
            'slug'                     => 'system-config',
            'name'                     => 'Configurações do Sistema',
            'route_name'               => null,
            'icon'                     => 'fa-solid fa-gear',
            'parent_id'                => null,
            'id_modulo_relacionamento' => null,
            'url'                      => null,
            'ordem'                    => 90,
            'sort_order'               => 90,
            'is_active'                => 1,
            'show_in_menu'             => 1,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        // 2. Vincula os filhos ao novo pai e ajusta sort_order
        DB::table('modules')->where('slug', 'modules')->update([
            'parent_id'  => $parentId,
            'sort_order' => 10,
            'updated_at' => now(),
        ]);

        DB::table('modules')->where('slug', 'audit-logs')->update([
            'parent_id'  => $parentId,
            'sort_order' => 20,
            'updated_at' => now(),
        ]);

        DB::table('modules')->where('slug', 'backups')->update([
            'parent_id'  => $parentId,
            'sort_order' => 30,
            'updated_at' => now(),
        ]);

        // 3. Cria permissão para o pai em todas as combinações company/user existentes
        $combinations = DB::table('module_permissions')
            ->select('company_id', 'user_id')
            ->distinct()
            ->get();

        foreach ($combinations as $c) {
            $exists = DB::table('module_permissions')
                ->where('company_id', $c->company_id)
                ->where('user_id', $c->user_id)
                ->where('module_id', $parentId)
                ->exists();

            if (! $exists) {
                DB::table('module_permissions')->insert([
                    'company_id' => $c->company_id,
                    'user_id'    => $c->user_id,
                    'module_id'  => $parentId,
                    'can_list'   => 1,
                    'can_view'   => 1,
                    'can_create' => 1,
                    'can_edit'   => 1,
                    'can_delete' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $parent = DB::table('modules')->where('slug', 'system-config')->first();

        if ($parent) {
            // Devolve os filhos para raiz
            DB::table('modules')
                ->whereIn('slug', ['modules', 'audit-logs', 'backups'])
                ->update(['parent_id' => null]);

            // Remove permissões do pai
            DB::table('module_permissions')
                ->where('module_id', $parent->id)
                ->delete();

            // Remove o pai
            DB::table('modules')->where('id', $parent->id)->delete();
        }
    }
};
