<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O export para Excel do TCPOweb traz o "Memorial Descritivo" da composição
 * (conteúdo do serviço, critério de medição, normas técnicas). É informação
 * técnica útil para orçamento — guardamos junto da composição.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('tcpo_composicoes', function (Blueprint $t) {
            $t->text('memorial_conteudo')->nullable()->after('descricao');
            $t->text('memorial_criterio')->nullable()->after('memorial_conteudo');
            $t->text('memorial_normas')->nullable()->after('memorial_criterio');
        });
    }

    public function down(): void
    {
        Schema::table('tcpo_composicoes', function (Blueprint $t) {
            $t->dropColumn(['memorial_conteudo', 'memorial_criterio', 'memorial_normas']);
        });
    }
};
