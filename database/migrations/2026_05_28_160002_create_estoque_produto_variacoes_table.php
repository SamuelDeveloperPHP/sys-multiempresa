<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 1 (EPI) — listas de variação cadastradas no produto.
 *
 * Guarda as OPÇÕES disponíveis de cor e tamanho de um EPI/calçado/uniforme.
 * Catálogo é global, então sem company_id.
 *
 *   tipo:
 *     - 'cor'                 → ex.: "Marrom", "Preto"
 *     - 'tamanho_numerico'    → ex.: "35", "42" (calçados)
 *     - 'tamanho_vestuario'   → ex.: "P", "M", "GG" (uniformes/luvas)
 *
 * A combinação (cor × tamanho) só vira uma "variante" com SALDO próprio na
 * Parte 2 (entrada), referenciada por lote/saldo. Aqui é só o cadastro das
 * opções que o operador montou.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_produto_variacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->string('tipo', 20);          // cor | tamanho_numerico | tamanho_vestuario
            $t->string('valor', 40);         // "Marrom", "42", "GG"
            $t->unsignedInteger('ordem')->default(0);
            $t->timestamps();

            $t->unique(['produto_id', 'tipo', 'valor'], 'produto_variacao_unica');
            $t->index(['produto_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_produto_variacoes');
    }
};
