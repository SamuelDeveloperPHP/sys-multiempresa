<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table): void {
            $table->index(['company_id', 'data_execucao'], 'idx_checklist_company_execution_date');
            $table->index(['company_id', 'data_cadastro'], 'idx_checklist_company_legacy_date');
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table): void {
            $table->dropIndex('idx_checklist_company_execution_date');
            $table->dropIndex('idx_checklist_company_legacy_date');
        });
    }
};
