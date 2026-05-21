<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_categorias', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('nome_categoria', 120);
            $t->string('status_categoria', 30)->default('Ativo');
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'nome_categoria']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_categorias');
    }
};
