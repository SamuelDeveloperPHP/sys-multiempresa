<?php

namespace App\Models\Traits;

use App\Models\Scopes\ObraScope;

/**
 * Marca o model como ISOLADO POR OBRA (ver App\Models\Scopes\ObraScope).
 *
 * Uso:
 *
 *   class Funcionario extends Model {
 *       use Tenantable, ObraScoped;          // coluna padrão: id_obra
 *   }
 *
 *   class Saldo extends Model {
 *       use Tenantable, ObraScoped;
 *       protected string $obraColumn = 'obra_id';   // estoque/veículos
 *   }
 *
 * ---------------------------------------------------------------------------
 *  POR QUE a trait NÃO declara $obraColumn com valor padrão
 * ---------------------------------------------------------------------------
 * Porque o PHP proíbe: se a trait declarasse
 * `protected string $obraColumn = 'id_obra';` e o model redeclarasse com
 * 'obra_id', o PHP 8 aborta com fatal error ("define the same property ... the
 * definition differs and is considered incompatible"). Propriedade vinda de
 * trait só pode ser redeclarada com MESMA visibilidade, MESMO tipo e MESMO
 * valor inicial — ou seja, override seria impossível.
 *
 * Então o padrão mora na constante DEFAULT_OBRA_COLUMN e o model só declara
 * $obraColumn quando FOGE do padrão.
 *
 * ---------------------------------------------------------------------------
 *  O que esta trait NÃO faz (de propósito)
 * ---------------------------------------------------------------------------
 * Diferente da Tenantable (que preenche company_id no creating), aqui NÃO se
 * preenche a coluna de obra automaticamente a partir do ObraContext. Muitos
 * fluxos gravam a obra explicitamente (transferência de estoque, lançamento
 * retroativo, importação) e um preenchimento automático mudaria dado existente
 * sem ninguém pedir. Quem cria decide a obra.
 */
trait ObraScoped
{
    /** Coluna de obra usada pela maioria das tabelas legadas. */
    public const DEFAULT_OBRA_COLUMN = 'id_obra';

    protected static function bootObraScoped(): void
    {
        static::addGlobalScope(new ObraScope);
    }

    /**
     * Nome da coluna de obra deste model.
     *
     * Lê a propriedade $obraColumn quando o model a declara; senão devolve o
     * padrão. Sobrescreva a PROPRIEDADE (não este método) nos models cuja
     * coluna é `obra_id`.
     */
    public function getObraColumn(): string
    {
        return property_exists($this, 'obraColumn')
            ? $this->obraColumn
            : self::DEFAULT_OBRA_COLUMN;
    }

    /**
     * Traduz o conjunto de obras permitidas em SQL para ESTE model.
     *
     * Padrão: filtra pela própria coluna de obra da tabela.
     *
     * SOBRESCREVA quando a obra real do registro NÃO estiver nesta tabela — é
     * o caso de Frota\Veiculo, cuja obra corrente vem da locação em aberto.
     *
     * @param  int[]  $obraIds  conjunto permitido (pode ser vazio = nenhuma)
     */
    public function applyObraScopeConstraint(\Illuminate\Database\Eloquent\Builder $builder, array $obraIds): void
    {
        // Qualifica com o nome da tabela: sem isso, um join com outra tabela
        // que também tenha id_obra/obra_id gera "Column 'id_obra' is ambiguous".
        $coluna = $this->getTable() . '.' . $this->getObraColumn();

        // O grupo em closure é OBRIGATÓRIO: sem ele o orWhereNull vaza para
        // fora e anula os demais where da consulta (viraria "... OR col IS NULL"
        // no nível de cima, mostrando registros de outras empresas).
        $builder->where(function ($q) use ($coluna, $obraIds) {
            // whereIn com array vazio vira "0 = 1" — correto: não vê nenhuma
            // obra específica, e sobra só o NULL abaixo.
            $q->whereIn($coluna, $obraIds);

            if (ObraScope::NULL_VISIVEL) {
                $q->orWhereNull($coluna);
            }
        });
    }

    /**
     * Escapa do isolamento por obra nesta consulta.
     *
     * Use com parcimônia e SEMPRE com um filtro explícito no lugar — telas de
     * administração, relatórios consolidados, rotinas de manutenção. É o mesmo
     * papel do withoutGlobalScope(CompanyScope::class) no multiempresa.
     */
    public static function semIsolamentoDeObra(): \Illuminate\Database\Eloquent\Builder
    {
        return static::withoutGlobalScope(ObraScope::class);
    }
}
