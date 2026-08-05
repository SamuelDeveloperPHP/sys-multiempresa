<?php

namespace App\Models\Scopes;

use App\Helpers\CompanyContext;
use App\Services\ObraAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Isolamento por OBRA (canteiro). Irmão do CompanyScope: aquele corta por
 * empresa, este corta por obra DENTRO da empresa.
 *
 * Aplicado pela trait App\Models\Traits\ObraScoped, que também diz QUAL é a
 * coluna de obra do model (`id_obra` ou `obra_id`).
 *
 * Quem decide o conjunto de obras é App\Services\ObraAccess (fonte única) —
 * aqui só se traduz a resposta dele em SQL.
 *
 * ---------------------------------------------------------------------------
 *  QUANDO ESTE SCOPE NÃO FAZ NADA (no-op) — de propósito
 * ---------------------------------------------------------------------------
 *   a) Sem usuário autenticado: CLI/artisan, filas, jobs, seeds, sync interno.
 *   b) Sem empresa corrente em sessão (CompanyContext).
 *   c) ObraAccess devolveu null (super_admin / todas_obras).
 *
 * (a) e (b) espelham a filosofia do CompanyScope. É o que impede o scope de
 * silenciosamente esvaziar comandos de console e workers — lá o isolamento tem
 * de ser explícito no código que chama.
 */
class ObraScope implements Scope
{
    /**
     * ===========================================================
     *  DECISÃO: registro com coluna de obra NULL é VISÍVEL P/ TODOS.
     * ===========================================================
     * Um registro sem obra não pertence a canteiro nenhum (cadastro geral da
     * empresa, ex.: fornecedor corporativo, veículo no pátio). Ele aparece para
     * qualquer usuário da empresa.
     *
     * PARA INVERTER a regra (NULL passa a ser invisível para quem é restrito),
     * basta trocar esta constante para false. É o ÚNICO ponto — não espalhe
     * `orWhereNull` por controllers.
     */
    public const NULL_VISIVEL = true;

    public function apply(Builder $builder, Model $model): void
    {
        $ids = $this->obrasPermitidas();

        if ($ids === null) {
            return; // sem restrição (ou sem contexto para restringir)
        }

        // COMO restringir é responsabilidade do MODEL (trait ObraScoped): a
        // maioria filtra pela própria coluna de obra, mas existe caso em que a
        // obra real não está na tabela — Frota\Veiculo, cuja obra corrente é a
        // da locação em aberto, não a coluna denormalizada `veiculos.obra_id`.
        // Ver ObraScoped::applyObraScopeConstraint() e o override no Veiculo.
        $model->applyObraScopeConstraint($builder, $ids);
    }

    /**
     * @return int[]|null  null = não restringir
     */
    private function obrasPermitidas(): ?array
    {
        $user = Auth::user();

        if (! $user) {
            return null; // (a) CLI, fila, job, seed
        }

        $companyId = CompanyContext::id();

        if (! $companyId) {
            return null; // (b) sem empresa em sessão
        }

        // (c) null aqui já significa "sem restrição" — repassa direto.
        return app(ObraAccess::class)->allowedObraIds($user, $companyId);
    }
}
