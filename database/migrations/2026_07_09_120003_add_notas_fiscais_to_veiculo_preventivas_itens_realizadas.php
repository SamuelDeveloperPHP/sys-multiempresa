<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notas fiscais da OS preventiva como lista (mesmo padrão da corretiva):
 * cada NF tem numero/data/valor/arquivo. O total alimenta total_valor_servico
 * (os gráficos de custo). Substitui os campos avulsos nf_pecas/nf_mao_obra/
 * valor_do_servico/valor_da_mao_obra no formulário (colunas antigas ficam
 * nullable no banco por compatibilidade com registros legados).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('veiculo_preventivas_itens_realizadas', function (Blueprint $t) {
            if (! Schema::hasColumn('veiculo_preventivas_itens_realizadas', 'notas_fiscais')) {
                $t->json('notas_fiscais')->nullable()->after('nf_mao_obra');
            }
        });
    }

    public function down(): void
    {
        Schema::table('veiculo_preventivas_itens_realizadas', function (Blueprint $t) {
            if (Schema::hasColumn('veiculo_preventivas_itens_realizadas', 'notas_fiscais')) {
                $t->dropColumn('notas_fiscais');
            }
        });
    }
};
