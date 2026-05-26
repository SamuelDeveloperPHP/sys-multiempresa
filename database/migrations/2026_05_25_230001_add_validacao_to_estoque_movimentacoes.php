<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona campos de validação/auditoria à movimentação:
 *
 *   retirante_user_id     : quem retirou (no caso de SAIDA). FK opcional para users.
 *   validacao_method      : 'SENHA', 'BIOMETRIA' ou null (mov sem validação)
 *   validado_em           : timestamp de quando foi validado
 *   movimentacao_origem_id: FK para mov original (usado em DEVOLUCAO interna —
 *                           liga a devolução à saída que está sendo devolvida)
 *
 * Saída de estoque agora exige validação por senha (e/ou biometria FASE 7.C)
 * do retirante. Devolução exige validação por senha do almoxarife (FASE 7.B).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->foreignId('retirante_user_id')->nullable()->after('user_create')
                ->constrained('users')->nullOnDelete();
            $t->enum('validacao_method', ['SENHA', 'BIOMETRIA'])->nullable()->after('retirante_user_id');
            $t->timestamp('validado_em')->nullable()->after('validacao_method');

            $t->foreignId('movimentacao_origem_id')->nullable()->after('movimentacao_par_id')
                ->constrained('estoque_movimentacoes')->nullOnDelete();

            $t->index(['retirante_user_id', 'data_movimento'], 'estoque_mov_retirante_idx');
            $t->index('movimentacao_origem_id', 'estoque_mov_origem_idx');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->dropIndex('estoque_mov_retirante_idx');
            $t->dropIndex('estoque_mov_origem_idx');
            $t->dropForeign(['retirante_user_id']);
            $t->dropForeign(['movimentacao_origem_id']);
            $t->dropColumn(['retirante_user_id', 'validacao_method', 'validado_em', 'movimentacao_origem_id']);
        });
    }
};
