<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 2 — devolução por FUNCIONÁRIO (sem login).
 *
 * Mudanças:
 *   - `funcionario_id` FK funcionarios (paralelo a funcionario_user_id).
 *   - `funcionario_user_id` passa a ser NULLABLE (já era FK constrained, mas a
 *     coluna ficava obrigatória implicitamente). Agora a regra é: exatamente
 *     um dos dois deve estar preenchido (validado no FormRequest).
 *   - `validacao_funcionario_method`: 'SENHA_FUNC' (default) ou 'BIOMETRIA_FUNC'
 *     para diferenciar dos fluxos antigos com senha de usuário.
 *   - Permite status APROVADA criada direto pelo fluxo rápido (a coluna não
 *     muda — só a lógica do controller).
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) `funcionario_user_id` aceita NULL (era FK constrained sem nullable)
        DB::statement('ALTER TABLE estoque_devolucoes MODIFY funcionario_user_id BIGINT UNSIGNED NULL');

        // 2) Adiciona funcionario_id paralelo
        Schema::table('estoque_devolucoes', function (Blueprint $t) {
            $t->foreignId('funcionario_id')->nullable()
                ->after('funcionario_user_id')
                ->constrained('funcionarios')->nullOnDelete();

            $t->index(['funcionario_id', 'status'], 'estoque_dev_funcionario_idx');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_devolucoes', function (Blueprint $t) {
            $t->dropIndex('estoque_dev_funcionario_idx');
            $t->dropForeign(['funcionario_id']);
            $t->dropColumn('funcionario_id');
        });
        // Não tentamos restaurar NOT NULL em funcionario_user_id (registros
        // que estão sendo migrados podem ter ficado NULL).
    }
};
