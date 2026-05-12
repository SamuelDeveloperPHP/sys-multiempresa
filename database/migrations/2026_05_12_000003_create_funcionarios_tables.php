<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estrutura de Funcionarios + Funcao + Setor.
 * Multi-empresa: todas as tabelas tem company_id.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('funcao_funcionarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('funcao', 120);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'funcao']);
        });

        Schema::create('funcionario_setores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->string('nome', 120);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'nome']);
        });

        Schema::create('funcionarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->foreignId('id_funcao')->nullable()->constrained('funcao_funcionarios')->nullOnDelete();
            $t->foreignId('id_setor')->nullable()->constrained('funcionario_setores')->nullOnDelete();
            $t->string('nome', 191);
            $t->string('matricula', 60)->nullable();
            $t->string('cpf', 20)->nullable();
            $t->string('status', 30)->default('Ativo');
            $t->string('imagem_usuario')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'cpf']);
            $t->index(['company_id', 'matricula']);
        });

        // Vinculo usuario-funcionario (1:1 logico mas pivot p/ flexibilidade futura)
        Schema::create('user_funcionario', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('funcionario_id')->constrained('funcionarios')->cascadeOnDelete();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->unique(['user_id', 'company_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_funcionario');
        Schema::dropIfExists('funcionarios');
        Schema::dropIfExists('funcionario_setores');
        Schema::dropIfExists('funcao_funcionarios');
    }
};
