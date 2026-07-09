<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Detalhamento de custo das manutenções corretivas.
 *
 * A tabela já tinha valor_do_servico (peças/serviço). Adiciona a mão de obra
 * como custo separado + os números das notas fiscais de peças e mão de obra
 * (paridade com o formulário de OS preventiva).
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('veiculo_manutencaos')) {
            return;
        }
        Schema::table('veiculo_manutencaos', function (Blueprint $table) {
            if (!Schema::hasColumn('veiculo_manutencaos', 'valor_da_mao_obra')) {
                $table->decimal('valor_da_mao_obra', 12, 2)->nullable()->after('valor_do_servico');
            }
            if (!Schema::hasColumn('veiculo_manutencaos', 'nf_pecas')) {
                $table->string('nf_pecas', 60)->nullable();
            }
            if (!Schema::hasColumn('veiculo_manutencaos', 'nf_mao_obra')) {
                $table->string('nf_mao_obra', 60)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('veiculo_manutencaos')) {
            return;
        }
        Schema::table('veiculo_manutencaos', function (Blueprint $table) {
            foreach (['valor_da_mao_obra', 'nf_pecas', 'nf_mao_obra'] as $col) {
                if (Schema::hasColumn('veiculo_manutencaos', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
