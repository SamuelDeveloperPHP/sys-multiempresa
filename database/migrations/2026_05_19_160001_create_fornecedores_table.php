<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fornecedores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('nome_fantasia', 191);
            $t->string('razao_social', 191)->nullable();
            $t->string('atividade_principal', 100)->nullable();
            $t->string('cnpj', 20)->nullable();
            $t->string('cpf', 20)->nullable();
            $t->string('cep', 15)->nullable();
            $t->string('endereco', 191)->nullable();
            $t->string('numero', 20)->nullable();
            $t->string('bairro', 100)->nullable();
            $t->string('cidade', 100)->nullable();
            $t->string('estado', 2)->nullable();
            $t->string('email', 191)->nullable();
            $t->string('celular', 30)->nullable();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->enum('status', ['Ativo', 'Inativo'])->default('Ativo');
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'nome_fantasia']);
            $t->index(['company_id', 'cnpj']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
