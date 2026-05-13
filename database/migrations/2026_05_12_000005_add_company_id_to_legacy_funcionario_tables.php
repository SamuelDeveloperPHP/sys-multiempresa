<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona company_id às tabelas legadas funcao_funcionarios e funcionarios_setor.
 * O CompanyScope (via trait Tenantable) exige a coluna em todas as tabelas multi-tenant.
 *
 * Backfill: como hoje todos os 1933 funcionários estão na empresa 1, os registros
 * existentes recebem company_id = 1.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ----------------------------------------------------------------
        // funcao_funcionarios — adiciona company_id se não existir
        // ----------------------------------------------------------------
        if (Schema::hasTable('funcao_funcionarios') && ! Schema::hasColumn('funcao_funcionarios', 'company_id')) {
            Schema::table('funcao_funcionarios', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
                $table->index('company_id', 'funcao_funcionarios_company_id_idx');
            });

            // Backfill — todos os registros existentes pertencem à empresa 1
            DB::table('funcao_funcionarios')
                ->whereNull('company_id')
                ->update(['company_id' => 1]);
        }

        // ----------------------------------------------------------------
        // funcionarios_setor — adiciona company_id se não existir
        // ----------------------------------------------------------------
        if (Schema::hasTable('funcionarios_setor') && ! Schema::hasColumn('funcionarios_setor', 'company_id')) {
            Schema::table('funcionarios_setor', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
                $table->index('company_id', 'funcionarios_setor_company_id_idx');
            });

            DB::table('funcionarios_setor')
                ->whereNull('company_id')
                ->update(['company_id' => 1]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('funcao_funcionarios') && Schema::hasColumn('funcao_funcionarios', 'company_id')) {
            Schema::table('funcao_funcionarios', function (Blueprint $table) {
                $table->dropIndex('funcao_funcionarios_company_id_idx');
                $table->dropColumn('company_id');
            });
        }

        if (Schema::hasTable('funcionarios_setor') && Schema::hasColumn('funcionarios_setor', 'company_id')) {
            Schema::table('funcionarios_setor', function (Blueprint $table) {
                $table->dropIndex('funcionarios_setor_company_id_idx');
                $table->dropColumn('company_id');
            });
        }
    }
};
