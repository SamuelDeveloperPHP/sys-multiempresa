<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table) {
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'responsavel')) {
                $table->string('responsavel', 255)->nullable()->after('user_edit');
            }
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'km_atual')) {
                $table->decimal('km_atual', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'hr_atual')) {
                $table->decimal('hr_atual', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'respostas')) {
                $table->json('respostas')->nullable();
            }
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'observacao_geral')) {
                $table->text('observacao_geral')->nullable();
            }
            if (!Schema::hasColumn('veiculo_checklist_itens_servicos', 'data_execucao')) {
                $table->dateTime('data_execucao')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $table) {
            $cols = ['responsavel', 'km_atual', 'hr_atual', 'respostas', 'observacao_geral', 'data_execucao'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('veiculo_checklist_itens_servicos', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
