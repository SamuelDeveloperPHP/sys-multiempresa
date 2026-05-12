<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Reestrutura o item de menu "Empresas":
 *
 * Antes:  companies (leaf) → route companies.index
 * Depois: companies (pai)  → sem rota direta
 *           ├─ companies-list  → companies.index   (Lista de empresas)
 *           └─ obras           → admin.obras.index  (Obras)
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Converte o módulo "companies" em pai (sem rota direta)
        $parent = DB::table('modules')->where('slug', 'companies')->first();

        if (! $parent) {
            // Cria o pai caso não exista
            $parentId = DB::table('modules')->insertGetId([
                'slug'                     => 'companies',
                'name'                     => 'Empresas',
                'route_name'               => null,
                'icon'                     => 'fa-solid fa-building',
                'parent_id'                => null,
                'id_modulo_relacionamento' => null,
                'url'                      => null,
                'ordem'                    => 10,
                'sort_order'               => 10,
                'is_active'                => 1,
                'show_in_menu'             => 1,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        } else {
            $parentId = $parent->id;

            // Transforma em agrupador (sem rota, mantém ícone/ordem)
            DB::table('modules')->where('id', $parentId)->update([
                'route_name' => null,
                'updated_at' => now(),
            ]);
        }

        // 2. Cria filho "Lista de empresas" → companies.index
        $listExists = DB::table('modules')->where('slug', 'companies-list')->exists();

        if (! $listExists) {
            $listId = DB::table('modules')->insertGetId([
                'slug'                     => 'companies-list',
                'name'                     => 'Lista de empresas',
                'route_name'               => 'companies.index',
                'icon'                     => 'fa-solid fa-list',
                'parent_id'                => $parentId,
                'id_modulo_relacionamento' => null,
                'url'                      => null,
                'ordem'                    => 10,
                'sort_order'               => 10,
                'is_active'                => 1,
                'show_in_menu'             => 1,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        } else {
            $listId = DB::table('modules')->where('slug', 'companies-list')->value('id');
            DB::table('modules')->where('id', $listId)->update([
                'parent_id'  => $parentId,
                'updated_at' => now(),
            ]);
        }

        // 3. Cria filho "Obras" → admin.obras.index
        $obrasExists = DB::table('modules')->where('slug', 'obras')->exists();

        if (! $obrasExists) {
            $obrasId = DB::table('modules')->insertGetId([
                'slug'                     => 'obras',
                'name'                     => 'Obras',
                'route_name'               => 'admin.obras.index',
                'icon'                     => 'fa-solid fa-helmet-safety',
                'parent_id'                => $parentId,
                'id_modulo_relacionamento' => null,
                'url'                      => null,
                'ordem'                    => 20,
                'sort_order'               => 20,
                'is_active'                => 1,
                'show_in_menu'             => 1,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        } else {
            $obrasId = DB::table('modules')->where('slug', 'obras')->value('id');
            DB::table('modules')->where('id', $obrasId)->update([
                'parent_id'  => $parentId,
                'updated_at' => now(),
            ]);
        }

        // 4. Propaga permissões existentes de "companies" para os novos filhos
        $combinations = DB::table('module_permissions')
            ->where('module_id', $parentId)
            ->select('company_id', 'user_id')
            ->get();

        foreach ($combinations as $c) {
            foreach ([$listId ?? null, $obrasId ?? null] as $moduleId) {
                if (! $moduleId) {
                    continue;
                }

                $exists = DB::table('module_permissions')
                    ->where('company_id', $c->company_id)
                    ->where('user_id', $c->user_id)
                    ->where('module_id', $moduleId)
                    ->exists();

                if (! $exists) {
                    DB::table('module_permissions')->insert([
                        'company_id' => $c->company_id,
                        'user_id'    => $c->user_id,
                        'module_id'  => $moduleId,
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
    }

    public function down(): void
    {
        // Restaura companies como leaf direto para companies.index
        DB::table('modules')->where('slug', 'companies')->update([
            'route_name' => 'companies.index',
            'updated_at' => now(),
        ]);

        // Remove os filhos criados aqui
        $listId  = DB::table('modules')->where('slug', 'companies-list')->value('id');
        $obrasId = DB::table('modules')->where('slug', 'obras')->value('id');

        foreach (array_filter([$listId, $obrasId]) as $id) {
            DB::table('module_permissions')->where('module_id', $id)->delete();
        }

        DB::table('modules')->whereIn('slug', ['companies-list', 'obras'])->delete();
    }
};
