<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 — Permite que o retirante seja um FUNCIONÁRIO (sem login).
 *
 * Mudanças:
 *   - Nova coluna `retirante_funcionario_id` (FK funcionarios) paralela
 *     a `retirante_user_id`. Para uma mesma movimentação SAIDA preencher
 *     UM dos dois (exclusivo).
 *   - `validacao_method` aceita agora `SENHA_FUNC` e `BIOMETRIA_FUNC`
 *     (validação contra `funcionarios.senha_retirada` ou webauthn do funcionário).
 *
 * Estratégia para `validacao_method`: converte o ENUM em VARCHAR para
 * permitir crescimento futuro sem ALTER TABLE pesado.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) Adiciona FK retirante_funcionario_id
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->foreignId('retirante_funcionario_id')->nullable()
                ->after('retirante_user_id')
                ->constrained('funcionarios')->nullOnDelete();

            $t->index(['retirante_funcionario_id', 'data_movimento'],
                     'estoque_mov_retirante_func_idx');
        });

        // 2) Converte validacao_method de ENUM para VARCHAR(20). Mantém os
        //    valores atuais ('SENHA', 'BIOMETRIA') e libera 'SENHA_FUNC',
        //    'BIOMETRIA_FUNC' para o novo fluxo.
        //
        //    Em MySQL/MariaDB o doctrine não converte ENUM facilmente,
        //    então usamos DB::statement diretamente.
        DB::statement('ALTER TABLE estoque_movimentacoes MODIFY validacao_method VARCHAR(20) NULL');
    }

    public function down(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->dropIndex('estoque_mov_retirante_func_idx');
            $t->dropForeign(['retirante_funcionario_id']);
            $t->dropColumn('retirante_funcionario_id');
        });

        // Volta para ENUM original (descarta valores incompatíveis se houver).
        DB::statement("ALTER TABLE estoque_movimentacoes
                       MODIFY validacao_method ENUM('SENHA','BIOMETRIA') NULL");
    }
};
