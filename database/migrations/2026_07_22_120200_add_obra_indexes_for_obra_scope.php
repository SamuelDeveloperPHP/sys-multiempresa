<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para o ObraScope (App\Models\Scopes\ObraScope).
 *
 * O scope acrescenta em TODA consulta dos models isolados um filtro
 * `(<col_obra> IN (...) OR <col_obra> IS NULL)`, quase sempre junto do
 * `company_id` do CompanyScope. Sem índice composto (company_id, <col_obra>)
 * isso vira full scan nas tabelas grandes (veiculo_checklist_itens_realizados
 * tem ~85k linhas).
 *
 * Levantamento feito no information_schema de `sys_engeativos` antes desta
 * migration:
 *  - TODAS as tabelas do inventário já tinham um índice de FK só na coluna de
 *    obra (`*_id_obra_foreign` / `*_obra_id_foreign`), EXCETO
 *    `anexos_funcionarios_historico` e `funcionarios_docs`, que não tinham
 *    índice nenhum além do PRIMARY.
 *  - O índice COMPOSTO (company_id, <col_obra>) só existia em `estoque_lotes`
 *    e `estoque_saldos` (ver $jaExistiam abaixo).
 *
 * A migration é idempotente: consulta o information_schema e só cria o que
 * faltar, então rodar de novo (ou em outro banco) não quebra.
 */
return new class extends Migration {
    /**
     * tabela => coluna de obra.
     * NÃO inclui `obra_user` nem `obras` — essas são as tabelas de acesso em si.
     */
    private array $alvos = [
        'anexos_funcionarios_historico'        => 'id_obra',
        'fornecedores'                         => 'id_obra',
        'funcionarios'                         => 'id_obra',
        'funcionarios_docs'                    => 'id_obra',
        'veiculo_abastecimentos'               => 'id_obra',
        'veiculo_checklist_itens_realizados'   => 'id_obra',
        'veiculo_checklist_itens_servicos'     => 'id_obra',
        'veiculo_horimetro'                    => 'id_obra',
        'veiculo_manutencaos'                  => 'id_obra',
        'veiculo_preventivas_itens_realizadas' => 'id_obra',
        'veiculo_quilometragems'               => 'id_obra',
        'veiculos_diario_bordo'                => 'id_obra',
        'veiculos_locacaos'                    => 'id_obra',
        'estoque_devolucoes'                   => 'obra_id',
        'estoque_inventarios'                  => 'obra_id',
        'estoque_lotes'                        => 'obra_id',
        'estoque_movimentacoes'                => 'obra_id',
        'estoque_saldos'                       => 'obra_id',
        'veiculos'                             => 'obra_id',
    ];

    /**
     * Tabelas que JÁ possuíam o índice composto antes desta migration.
     * O down() não mexe nelas — o índice não é nosso.
     */
    private array $jaExistiam = ['estoque_lotes', 'estoque_saldos'];

    public function up(): void
    {
        foreach ($this->alvos as $tabela => $colObra) {
            if (! Schema::hasTable($tabela) || ! Schema::hasColumn($tabela, $colObra)) {
                continue;
            }

            $colunas = $this->colunasDoIndice($tabela, $colObra);

            if ($this->indicePrefixoExiste($tabela, $colunas)) {
                continue; // já coberto (inclusive por um índice mais amplo)
            }

            Schema::table($tabela, function (Blueprint $table) use ($colunas, $tabela) {
                $table->index($colunas, $this->nomeIndice($tabela, $colunas));
            });
        }
    }

    public function down(): void
    {
        foreach ($this->alvos as $tabela => $colObra) {
            if (in_array($tabela, $this->jaExistiam, true)) {
                continue;
            }

            if (! Schema::hasTable($tabela)) {
                continue;
            }

            $nome = $this->nomeIndice($tabela, $this->colunasDoIndice($tabela, $colObra));

            if (! $this->indiceExistePorNome($tabela, $nome)) {
                continue;
            }

            try {
                Schema::table($tabela, fn (Blueprint $table) => $table->dropIndex($nome));
            } catch (\Illuminate\Database\QueryException $e) {
                // MySQL 1553: "Cannot drop index ...: needed in a foreign key
                // constraint". Acontece quando a tabela tem FK em company_id e
                // NÃO tinha nenhum outro índice começando por company_id — o
                // nosso índice composto passou a ser o que sustenta a FK.
                // Manter o índice é inofensivo (só ocupa espaço); abortar o
                // rollback inteiro por causa disso, não. Segue o baile.
                if (! str_contains($e->getMessage(), '1553')) {
                    throw $e;
                }
            }
        }
    }

    /** Composto com company_id quando a tabela for multiempresa; senão só a obra. */
    private function colunasDoIndice(string $tabela, string $colObra): array
    {
        return Schema::hasColumn($tabela, 'company_id')
            ? ['company_id', $colObra]
            : [$colObra];
    }

    private function nomeIndice(string $tabela, array $colunas): string
    {
        return $tabela . '_' . implode('_', $colunas) . '_index';
    }

    /** Existe algum índice cujas PRIMEIRAS colunas são exatamente $colunas? */
    private function indicePrefixoExiste(string $tabela, array $colunas): bool
    {
        foreach ($this->indices($tabela) as $cols) {
            if (array_slice($cols, 0, count($colunas)) === $colunas) {
                return true;
            }
        }

        return false;
    }

    private function indiceExistePorNome(string $tabela, string $nome): bool
    {
        return array_key_exists($nome, $this->indices($tabela));
    }

    /** @return array<string, string[]>  nome do índice => colunas na ordem */
    private function indices(string $tabela): array
    {
        $linhas = DB::select(
            'SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
               FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
           ORDER BY INDEX_NAME, SEQ_IN_INDEX',
            [$tabela]
        );

        $indices = [];
        foreach ($linhas as $linha) {
            $indices[$linha->INDEX_NAME][] = $linha->COLUMN_NAME;
        }

        return $indices;
    }
};
