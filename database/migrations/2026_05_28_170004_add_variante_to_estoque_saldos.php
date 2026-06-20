<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte 2 (EPI) — saldo passa a ser por (produto, obra, VARIANTE).
 *
 * Material comum → variante_id = null → chave (produto, obra, null), idêntica
 * ao comportamento atual. EPI → uma linha de saldo por combinação cor×tamanho.
 *
 * Detalhe MySQL: a unique antiga (produto_id, obra_id) também servia de índice
 * para a FK de produto_id, então não dá pra dropá-la sem antes criar um índice
 * avulso em produto_id.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) Coluna variante_id (idempotente — a tentativa anterior pode tê-la criado)
        if (!Schema::hasColumn('estoque_saldos', 'variante_id')) {
            Schema::table('estoque_saldos', function (Blueprint $t) {
                $t->foreignId('variante_id')->nullable()->after('produto_id')
                    ->constrained('estoque_produto_variantes')->nullOnDelete();
            });
        }

        // 2) Índice avulso em produto_id para liberar a FK (se ainda não existir)
        $temIdxProduto = collect(DB::select("SHOW INDEX FROM estoque_saldos"))
            ->contains(fn ($i) => $i->Key_name === 'estoque_saldos_produto_id_index');
        if (!$temIdxProduto) {
            Schema::table('estoque_saldos', fn (Blueprint $t) => $t->index('produto_id'));
        }

        // 3) Troca a unique (produto, obra) → (produto, obra, variante)
        $indices = collect(DB::select("SHOW INDEX FROM estoque_saldos"))->pluck('Key_name')->unique();
        if ($indices->contains('estoque_saldos_produto_obra_unique')) {
            Schema::table('estoque_saldos', fn (Blueprint $t) => $t->dropUnique('estoque_saldos_produto_obra_unique'));
        }
        if (!$indices->contains('estoque_saldos_produto_obra_variante_unique')) {
            Schema::table('estoque_saldos', fn (Blueprint $t) =>
                $t->unique(['produto_id', 'obra_id', 'variante_id'], 'estoque_saldos_produto_obra_variante_unique'));
        }
    }

    public function down(): void
    {
        Schema::table('estoque_saldos', function (Blueprint $t) {
            $t->dropUnique('estoque_saldos_produto_obra_variante_unique');
            $t->unique(['produto_id', 'obra_id'], 'estoque_saldos_produto_obra_unique');
            $t->dropForeign(['variante_id']);
            $t->dropColumn('variante_id');
        });
    }
};
