<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estrutura de Funcionarios + Funcao + Setor.
 * Multi-empresa: todas as tabelas tem company_id.
 *
 * IMPORTANTE (schema drift):
 * Em ambientes que vieram do import legado (ETL — engeativos2), estas tabelas
 * JÁ EXISTEM com um schema mais rico (criado fora das migrations). Por isso
 * cada Schema::create() abaixo é guardado por Schema::hasTable(): em banco
 * legado vira no-op (não recria/quebra), e em instalação NOVA cria a base
 * mínima — que as migrations seguintes (000004 legacy fields, 000005
 * company_id, 240001 auth fields) complementam.
 *
 * Os nomes de tabela seguem os Models:
 *   - FuncionarioFuncao -> funcao_funcionarios
 *   - FuncionarioSetor  -> funcionarios_setor   (NÃO "funcionario_setores")
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('funcao_funcionarios')) {
            Schema::create('funcao_funcionarios', function (Blueprint $t) {
                $t->id();
                $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $t->string('funcao', 120);
                $t->timestamps();
                $t->softDeletes();
                $t->index(['company_id', 'funcao']);
            });
        }

        if (!Schema::hasTable('funcionarios_setor')) {
            Schema::create('funcionarios_setor', function (Blueprint $t) {
                $t->id();
                $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $t->string('nome', 120);
                $t->timestamps();
                $t->softDeletes();
                $t->index(['company_id', 'nome']);
            });
        }

        if (!Schema::hasTable('funcionarios')) {
            Schema::create('funcionarios', function (Blueprint $t) {
                $t->id();
                $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
                $t->foreignId('id_funcao')->nullable()->constrained('funcao_funcionarios')->nullOnDelete();
                $t->foreignId('id_setor')->nullable()->constrained('funcionarios_setor')->nullOnDelete();
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
        }

        // Vinculo usuario-funcionario (1:1 logico mas pivot p/ flexibilidade futura)
        if (!Schema::hasTable('user_funcionario')) {
            Schema::create('user_funcionario', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $t->foreignId('funcionario_id')->constrained('funcionarios')->cascadeOnDelete();
                $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $t->unique(['user_id', 'company_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_funcionario');
        Schema::dropIfExists('funcionarios');
        Schema::dropIfExists('funcionarios_setor');
        Schema::dropIfExists('funcao_funcionarios');
    }
};
