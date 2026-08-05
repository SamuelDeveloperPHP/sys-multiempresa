<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Higieniza os módulos do menu "Config. de Usuários".
 *
 * Problemas corrigidos (observados na tabela `modules`):
 *  1. Módulo raiz duplicado "Usuários" (route_name admin.users.index, sem filhos)
 *     — header de menu morto que só duplica a seção. Escondemos do menu
 *     (show_in_menu=0) MAS mantemos is_active=1: o ModuleAccess resolve esse
 *     módulo por route_name p/ enforcement, então não pode ser desativado.
 *  2. Telas reais escondidas sob "Config. de Usuários": Níveis de Acesso, Ativos
 *     e Inativos estavam com show_in_menu=0 — por isso o usuário não as via.
 *  3. Linhas-lixo (Store/Update/Destroy/Edit/Show) cadastradas como módulos —
 *     são AÇÕES, não telas. Desativadas: as rotas correspondentes caem no
 *     fallback do ModuleAccess (o módulo pai .index + a habilidade certa).
 *
 * Mira por route_name (estável entre ambientes), não por id.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) Esconde o header morto "Usuários" (raiz), mantendo-o ATIVO p/ enforcement.
        DB::table('modules')
            ->where('route_name', 'admin.users.index')
            ->whereNull('parent_id')
            ->update(['show_in_menu' => 0]);

        // 2) Torna visíveis as telas reais de config de usuário.
        DB::table('modules')
            ->whereIn('route_name', [
                'admin.users.permissions.index', // Níveis de Acesso (permissões)
                'users.active',                  // Ativos
                'users.inactive',                // Inativos
            ])
            ->update(['show_in_menu' => 1]);

        // Garante a seção pai visível e ativa.
        DB::table('modules')->where('slug', 'user-config')
            ->update(['is_active' => 1, 'show_in_menu' => 1]);

        // 3) Desativa as linhas-lixo (ações cadastradas como módulos).
        DB::table('modules')
            ->whereIn('route_name', [
                'admin.users.store',
                'admin.users.update',
                'admin.users.destroy',
                'admin.users.edit',
                'admin.users.show',
                'users.destroy',
            ])
            ->update(['is_active' => 0, 'show_in_menu' => 0]);
    }

    public function down(): void
    {
        // Reverte ao estado observado antes da migração.
        DB::table('modules')
            ->where('route_name', 'admin.users.index')
            ->whereNull('parent_id')
            ->update(['show_in_menu' => 1]);

        DB::table('modules')
            ->whereIn('route_name', [
                'admin.users.permissions.index',
                'users.active',
                'users.inactive',
            ])
            ->update(['show_in_menu' => 0]);

        DB::table('modules')
            ->whereIn('route_name', [
                'admin.users.store',
                'admin.users.update',
                'admin.users.destroy',
                'admin.users.edit',
                'admin.users.show',
                'users.destroy',
            ])
            ->update(['is_active' => 1]);
    }
};
