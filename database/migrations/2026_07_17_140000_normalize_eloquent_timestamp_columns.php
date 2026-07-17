<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normaliza as colunas de timestamp gerenciadas pelo Eloquent
 * (created_at / updated_at / deleted_at) que sofreram "drift" de schema:
 * colunas com DEFAULT CURRENT_TIMESTAMP e/ou ON UPDATE CURRENT_TIMESTAMP,
 * herdadas de importação/dump legado (módulo de funcionários) ou de ALTER
 * manual em produção (veiculo_abastecimentos).
 *
 * POR QUE É BUG:
 *   Quando o MySQL gera/regera esses campos (via DEFAULT/ON UPDATE), usa o
 *   fuso da SESSÃO do servidor (SYSTEM = UTC-3 aqui), enquanto a aplicação
 *   grava tudo em UTC. Resultado: created_at diverge ~3h dos demais campos e
 *   é sobrescrito a cada UPDATE — perdendo o instante real de criação.
 *   Campos como data_sincronizacao são DATETIME escritos só pela app (now()),
 *   por isso ficam corretos.
 *
 * CORREÇÃO:
 *   Devolver essas colunas ao formato que $table->timestamps() produz
 *   (NULL DEFAULT NULL, sem ON UPDATE), tornando a APLICAÇÃO a única fonte de
 *   escrita (UTC). O tipo atual da coluna é PRESERVADO (não força TIMESTAMP
 *   sobre DATETIME) para não disparar conversão de fuso nos valores existentes.
 *
 * CARACTERÍSTICAS:
 *   - Auto-descoberta: conserta o que estiver torto NAQUELE banco (a lista
 *     difere entre local e produção).
 *   - Idempotente: uma vez limpo, o SELECT não retorna nada.
 *   - Escopo pelos 3 nomes do Eloquent → colunas que usam CURRENT_TIMESTAMP de
 *     propósito (queued_at, failed_at, started_at…) ficam INTACTAS.
 *   - Blindagem: relaxa NO_ZERO_DATE/STRICT só nesta sessão (restaura no fim),
 *     para o ALTER não falhar em tabelas legadas com valores '0000-00-00'.
 *
 * NÃO corrige valores já gravados errados (só a definição da coluna) — o
 * backfill de created_at é decisão à parte.
 */
return new class extends Migration
{
    /** Modos de sql_mode que podem barrar o ALTER de colunas legadas com zero-date. */
    private array $modosARelaxar = ['NO_ZERO_DATE', 'NO_ZERO_IN_DATE', 'STRICT_TRANS_TABLES', 'STRICT_ALL_TABLES'];

    public function up(): void
    {
        $sqlModeOriginal = DB::selectOne('SELECT @@session.sql_mode AS m')->m;
        $sqlModeRelaxado = implode(',', array_filter(
            explode(',', (string) $sqlModeOriginal),
            fn ($modo) => !in_array($modo, $this->modosARelaxar, true)
        ));

        DB::statement("SET SESSION sql_mode = '{$sqlModeRelaxado}'");

        try {
            $colunas = DB::select("
                SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS tipo
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND COLUMN_NAME IN ('created_at', 'updated_at', 'deleted_at')
                  AND (EXTRA LIKE '%on update%' OR COLUMN_DEFAULT IS NOT NULL)
                ORDER BY TABLE_NAME, COLUMN_NAME
            ");

            foreach ($colunas as $col) {
                // Preserva o tipo (timestamp/datetime); remove DEFAULT e ON UPDATE
                // e garante nullable — idêntico ao que $table->timestamps() gera.
                DB::statement("ALTER TABLE `{$col->t}` MODIFY `{$col->c}` {$col->tipo} NULL DEFAULT NULL");
                echo "  normalizada: {$col->t}.{$col->c} ({$col->tipo})\n";
            }

            if (empty($colunas)) {
                echo "  nenhuma coluna com drift — nada a fazer.\n";
            }
        } finally {
            DB::statement("SET SESSION sql_mode = '{$sqlModeOriginal}'");
        }
    }

    public function down(): void
    {
        // Intencionalmente vazio: reverter reintroduziria o DEFAULT/ON UPDATE
        // legado — exatamente o bug que esta migration corrige.
    }
};
