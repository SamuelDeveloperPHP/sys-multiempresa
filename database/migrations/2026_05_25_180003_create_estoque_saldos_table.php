<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Saldo atual de cada (produto × obra). Tabela denormalizada para evitar
 * SUM() em tempo real sobre estoque_movimentacoes.
 *
 * Atualizada automaticamente pelo Observer
 * App\Observers\EstoqueMovimentacaoObserver após cada movimentação salva.
 *
 * Em caso de divergência: rodar `php artisan estoque:recalcular-saldos`
 * (a ser criado) que zera tudo e soma de novo a partir das movimentações.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('estoque_saldos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('produto_id')->constrained('estoque_produtos')->cascadeOnDelete();
            $t->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();

            $t->decimal('quantidade', 14, 3)->default(0);
            $t->decimal('valor_medio', 12, 2)->default(0); // PMP — Preço Médio Ponderado
            $t->timestamp('ultima_movimentacao_at')->nullable();

            $t->timestamps();

            // Uma linha por (produto, obra) — chave única lógica
            $t->unique(['produto_id', 'obra_id'], 'estoque_saldos_produto_obra_unique');
            $t->index(['company_id', 'obra_id']);
            // Alerta de baixo: query "quantidade < produto.estoque_minimo"
            $t->index('quantidade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_saldos');
    }
};
