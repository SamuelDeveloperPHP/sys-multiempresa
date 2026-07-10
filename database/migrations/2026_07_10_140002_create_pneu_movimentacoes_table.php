<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ledger do pneu: todo evento (montagem, desmontagem, rodizio, recapagem,
 * conserto, sucateamento). A medicao (km/hr do veiculo no momento) e a base
 * para calcular km/hr rodado -> CPK.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pneu_movimentacoes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('pneu_id')->constrained('pneus')->cascadeOnDelete();
            $t->string('tipo', 20); // compra|montagem|desmontagem|rodizio|recapagem|conserto|sucateamento
            $t->foreignId('veiculo_id')->nullable()->constrained('veiculos')->nullOnDelete();
            $t->string('posicao', 12)->nullable();
            $t->string('posicao_anterior', 12)->nullable(); // p/ rodizio
            $t->integer('medicao')->nullable();             // km OU hr do veiculo no evento
            $t->string('medicao_tipo', 3)->nullable();      // km | hr
            $t->date('data');
            $t->decimal('valor', 12, 2)->nullable();        // custo do evento (recapagem/conserto)
            $t->unsignedBigInteger('fornecedor_id')->nullable(); // recapadora/oficina
            $t->unsignedInteger('vida_resultante')->nullable();  // p/ recapagem
            $t->text('observacao')->nullable();
            $t->string('nota_fiscal', 60)->nullable();
            $t->string('arquivo', 255)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['pneu_id', 'data']);
            $t->index(['veiculo_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pneu_movimentacoes');
    }
};
