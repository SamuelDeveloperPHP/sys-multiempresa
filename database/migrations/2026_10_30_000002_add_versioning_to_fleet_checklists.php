<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('veiculo_checklist', function (Blueprint $table): void {
            $table->unsignedInteger('versao')->default(1)->after('situacao');
        });

        Schema::table('veiculo_checklist_itens', function (Blueprint $table): void {
            $table->boolean('obrigatorio')->default(true)->after('nome_servico');
            $table->boolean('critico')->default(false)->after('obrigatorio');
        });

        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table): void {
            $table->unsignedInteger('template_versao')->nullable()->after('id_checklist');
            $table->json('template_snapshot')->nullable()->after('template_versao');
            $table->string('resultado_inspecao', 30)->nullable()->after('status');
            $table->boolean('requer_acao')->default(false)->after('resultado_inspecao');
            $table->index(['company_id', 'resultado_inspecao'], 'idx_checklist_company_result');
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table): void {
            $table->dropIndex('idx_checklist_company_result');
            $table->dropColumn(['template_versao', 'template_snapshot', 'resultado_inspecao', 'requer_acao']);
        });

        Schema::table('veiculo_checklist_itens', function (Blueprint $table): void {
            $table->dropColumn(['obrigatorio', 'critico']);
        });

        Schema::table('veiculo_checklist', function (Blueprint $table): void {
            $table->dropColumn('versao');
        });
    }
};
