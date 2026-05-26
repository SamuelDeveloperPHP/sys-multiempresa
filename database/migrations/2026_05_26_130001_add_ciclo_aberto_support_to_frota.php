<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Suporte à validação server-side de "ciclo aberto" (complementa FASE 6).
 *
 * Regra de negócio (legado): um motorista só pode ter 1 ciclo ABERTO por vez
 * (diário de bordo OU checklist). Para abrir em outro veículo, fecha o anterior.
 *
 * Esta migration prepara o schema pra fazer essa checagem de forma eficiente e
 * consistente entre as duas tabelas:
 *  - veiculos_diario_bordo        : já tem id_user + ciclo_status
 *  - veiculo_checklist_itens_servicos : tinha só user_create (email) + status_ciclo
 *    -> adiciona id_user (espelhando o diário) + backfill a partir do email.
 *
 * Idempotente (guards hasColumn/getIndexes) — segura pra rodar via --path.
 */
return new class extends Migration {
    public function up(): void
    {
        // 1) id_user no checklist (espelha o diário, scoping confiável por usuário)
        if (Schema::hasTable('veiculo_checklist_itens_servicos')
            && !Schema::hasColumn('veiculo_checklist_itens_servicos', 'id_user')) {
            Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $t) {
                $t->unsignedBigInteger('id_user')->nullable()->after('user_create');
            });

            // Backfill: casa user_create (email) com users.email
            DB::statement("
                UPDATE veiculo_checklist_itens_servicos s
                JOIN users u ON u.email = s.user_create
                SET s.id_user = u.id
                WHERE s.id_user IS NULL AND s.user_create IS NOT NULL
            ");
        }

        // 2) Índices pra acelerar a busca de 'ciclo aberto por usuário'
        $this->addIndexIfMissing('veiculos_diario_bordo', 'idx_diario_ciclo_user', ['id_user', 'ciclo_status']);
        $this->addIndexIfMissing('veiculo_checklist_itens_servicos', 'idx_chk_ciclo_user', ['id_user', 'status_ciclo']);
    }

    public function down(): void
    {
        $this->dropIndexIfExists('veiculos_diario_bordo', 'idx_diario_ciclo_user');
        $this->dropIndexIfExists('veiculo_checklist_itens_servicos', 'idx_chk_ciclo_user');

        if (Schema::hasColumn('veiculo_checklist_itens_servicos', 'id_user')) {
            Schema::table('veiculo_checklist_itens_servicos', function (Blueprint $t) {
                $t->dropColumn('id_user');
            });
        }
    }

    private function addIndexIfMissing(string $table, string $indexName, array $columns): void
    {
        if (!Schema::hasTable($table)) return;
        // garante que todas as colunas existem
        foreach ($columns as $c) {
            if (!Schema::hasColumn($table, $c)) return;
        }
        $existentes = collect(Schema::getIndexes($table))->pluck('name')->all();
        if (in_array($indexName, $existentes, true)) return;

        Schema::table($table, function (Blueprint $t) use ($indexName, $columns) {
            $t->index($columns, $indexName);
        });
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        if (!Schema::hasTable($table)) return;
        $existentes = collect(Schema::getIndexes($table))->pluck('name')->all();
        if (!in_array($indexName, $existentes, true)) return;

        Schema::table($table, function (Blueprint $t) use ($indexName) {
            $t->dropIndex($indexName);
        });
    }
};
