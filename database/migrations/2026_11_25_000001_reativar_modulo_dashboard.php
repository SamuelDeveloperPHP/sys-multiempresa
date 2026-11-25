<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * O módulo Dashboard foi desativado quando o super_admin ainda ignorava o
 * ModuleAccess. Com permissões explícitas para todos, um Dashboard inativo
 * bloqueia a página inicial de qualquer usuário, inclusive o admin master.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('modules')
            ->where('route_name', 'dashboard')
            ->update(['is_active' => true, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Não volta a desativar: isso restauraria o bloqueio do Dashboard.
    }
};
