<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notas fiscais das manutenções corretivas (lista repetível).
 *
 * Substitui os campos fixos nf_pecas/nf_mao_obra/valor_da_mao_obra por uma
 * lista variável de NFs (número, data, valor) em JSON — paridade com o legado.
 * `valor_do_servico` continua existindo e passa a refletir o total das NFs
 * (mantém os gráficos de custo, que somam essa coluna).
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('veiculo_manutencaos')) {
            return;
        }
        Schema::table('veiculo_manutencaos', function (Blueprint $table) {
            if (!Schema::hasColumn('veiculo_manutencaos', 'notas_fiscais')) {
                $table->json('notas_fiscais')->nullable()->after('valor_do_servico');
            }
        });
        // Remove os campos fixos adicionados na migration anterior (mesma sessão,
        // sem dados) — o detalhamento de custo agora é a lista de NFs.
        Schema::table('veiculo_manutencaos', function (Blueprint $table) {
            foreach (['valor_da_mao_obra', 'nf_pecas', 'nf_mao_obra'] as $col) {
                if (Schema::hasColumn('veiculo_manutencaos', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('veiculo_manutencaos')) {
            return;
        }
        Schema::table('veiculo_manutencaos', function (Blueprint $table) {
            if (Schema::hasColumn('veiculo_manutencaos', 'notas_fiscais')) {
                $table->dropColumn('notas_fiscais');
            }
            $table->decimal('valor_da_mao_obra', 12, 2)->nullable();
            $table->string('nf_pecas', 60)->nullable();
            $table->string('nf_mao_obra', 60)->nullable();
        });
    }
};
