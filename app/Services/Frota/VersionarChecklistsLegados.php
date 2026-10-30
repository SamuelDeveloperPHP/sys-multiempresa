<?php

namespace App\Services\Frota;

use App\Models\Frota\VeiculoChecklistServico;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class VersionarChecklistsLegados
{
    public function __construct(
        private readonly ChecklistExecutionContract $contract,
        private readonly ChecklistSubmission $submission,
    ) {}

    public function inspect(?int $companyId = null): array
    {
        return [
            'company_id' => $companyId,
            'missing_template_version' => $this->query($companyId)->whereNull('template_versao')->count(),
            'missing_template_snapshot' => $this->query($companyId)->whereNull('template_snapshot')->count(),
            'missing_inspection_result' => $this->query($companyId)->whereNull('resultado_inspecao')->count(),
        ];
    }

    public function execute(?int $companyId = null): array
    {
        $before = $this->inspect($companyId);
        $updated = 0;

        $this->query($companyId)
            ->where(fn (Builder $query) => $query
                ->whereNull('template_versao')
                ->orWhereNull('template_snapshot')
                ->orWhereNull('resultado_inspecao'))
            ->with(['checklist', 'itensRealizados.item'])
            ->orderBy('id')
            ->chunkById(100, function ($executions) use (&$updated): void {
                DB::transaction(function () use ($executions, &$updated): void {
                    foreach ($executions as $execution) {
                        $responses = $this->contract->responses($execution);
                        $snapshot = $execution->template_snapshot
                            ?: $this->submission->snapshotFromLegacy($execution, $responses);
                        $outcome = $this->submission->outcome($responses);

                        DB::table($execution->getTable())->where('id', $execution->id)->update([
                            'template_versao' => $execution->template_versao
                                ?: (int) ($snapshot['template_versao'] ?? 1),
                            'template_snapshot' => json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                            'resultado_inspecao' => $execution->resultado_inspecao
                                ?: $outcome['resultado_inspecao'],
                            'requer_acao' => $outcome['requer_acao'],
                            'updated_at' => $execution->updated_at,
                        ]);
                        $updated++;
                    }
                });
            });

        return [
            'before' => $before,
            'updated' => $updated,
            'after' => $this->inspect($companyId),
        ];
    }

    private function query(?int $companyId): Builder
    {
        return VeiculoChecklistServico::withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->when($companyId !== null, fn (Builder $query) => $query->where('company_id', $companyId));
    }
}
