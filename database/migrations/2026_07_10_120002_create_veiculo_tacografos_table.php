<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Frota — tacografo do veiculo (importado do legado engeativos2).
 * Documento com data de emissao e vencimento + observacoes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_tacografos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->string('descricao', 191);
            $t->date('data_da_emissao')->nullable();
            $t->date('data_do_vencimento')->nullable();
            $t->text('observacao')->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['veiculo_id', 'data_do_vencimento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_tacografos');
    }
};
