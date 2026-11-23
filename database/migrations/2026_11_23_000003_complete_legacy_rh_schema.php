<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Completa o schema de RH em instalações novas (ver 2026_05_12_000003).
 *
 * O banco legado tem estruturas criadas fora das migrations que o código usa:
 * três tabelas lidas por FuncionarioController@show/@edit, a coluna
 * funcionarios_setor.nome_setor (modelo FuncionarioSetor) e funcionarios.data_nascimento
 * (aba Visão Geral). Tudo é guardado por hasTable/hasColumn: no legado é no-op.
 * As tabelas novas repetem a estrutura legada (sem company_id nem FKs, como lá).
 */
return new class extends Migration {
    public function up(): void
    {
        // O modelo usa nome_setor; a migration 000003 criou "nome".
        if (Schema::hasTable('funcionarios_setor')
            && Schema::hasColumn('funcionarios_setor', 'nome')
            && !Schema::hasColumn('funcionarios_setor', 'nome_setor')) {
            Schema::table('funcionarios_setor', function (Blueprint $t) {
                $t->renameColumn('nome', 'nome_setor');
            });
        }

        if (Schema::hasTable('funcionarios') && !Schema::hasColumn('funcionarios', 'data_nascimento')) {
            Schema::table('funcionarios', function (Blueprint $t) {
                $t->date('data_nascimento')->nullable();
            });
        }

        if (!Schema::hasTable('funcionarios_qualificacoes')) {
            Schema::create('funcionarios_qualificacoes', function (Blueprint $t) {
                $t->integer('id', true);
                $t->integer('id_funcao');
                $t->integer('id_funcionario');
                $t->integer('id_qualificacao')->nullable();
                $t->string('usuario', 250)->nullable();
                $t->integer('tempo_validade')->nullable();
                $t->integer('situacao')->nullable();
                $this->datasLegadas($t);
            });
        }

        if (!Schema::hasTable('funcionarios_funcao_qualificacoes')) {
            Schema::create('funcionarios_funcao_qualificacoes', function (Blueprint $t) {
                $t->bigInteger('id', true);
                $t->integer('id_funcao');
                $t->string('id_documento', 250)->nullable();
                $t->integer('tempo_validade')->nullable();
                $t->integer('situacao')->nullable();
                $t->boolean('publica')->default(true);
                $this->datasLegadas($t);
            });
        }

        if (!Schema::hasTable('funcionarios_docs')) {
            Schema::create('funcionarios_docs', function (Blueprint $t) {
                $t->bigInteger('id', true);
                $t->integer('id_obra')->nullable();
                $t->integer('id_setor')->nullable();
                $t->string('documento', 100)->nullable();
                $t->string('tmp_validade', 7)->nullable();
                $t->string('vence', 5)->nullable();
                $t->longText('descricao')->nullable();
                $t->string('user_create', 250)->nullable();
                $t->string('user_edit', 250)->nullable();
                $this->datasLegadas($t);
                $t->index('id_obra');
            });
        }
    }

    // Mantém tudo: em bancos legados essas estruturas existiam antes desta migration.
    public function down(): void
    {
    }

    // No legado created_at é timestamp e updated_at/deleted_at são datetime.
    private function datasLegadas(Blueprint $t): void
    {
        $t->timestamp('created_at')->nullable();
        $t->dateTime('updated_at')->nullable();
        $t->dateTime('deleted_at')->nullable();
    }
};
