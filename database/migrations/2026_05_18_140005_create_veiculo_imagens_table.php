<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_imagens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            $t->string('arquivo', 500);
            $t->string('descricao', 191)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->unsignedInteger('ordem')->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'veiculo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_imagens');
    }
};
