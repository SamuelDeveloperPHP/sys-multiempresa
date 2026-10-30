<?php

namespace App\Services\Frota;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class NormalizarContratoChecklist
{
    private const TABLE = 'veiculo_checklist_itens_servicos';

    public function inspect(?int $companyId = null): array
    {
        return [
            'company_id' => $companyId,
            'missing_canonical_date' => $this->query($companyId)
                ->whereNull('data_execucao')
                ->whereNotNull('data_cadastro')
                ->count(),
            'missing_compatibility_date' => $this->query($companyId)
                ->whereNotNull('data_execucao')
                ->whereNull('data_cadastro')
                ->count(),
            'missing_both_dates' => $this->query($companyId)
                ->whereNull('data_execucao')
                ->whereNull('data_cadastro')
                ->whereNotNull('created_at')
                ->count(),
            'noncanonical_status' => $this->query($companyId)
                ->where(function (Builder $query): void {
                    $query->whereNull('status_ciclo')->orWhereRaw('UPPER(status_ciclo) <> ?', ['FECHADO']);
                })
                ->count(),
        ];
    }

    public function execute(?int $companyId = null): array
    {
        $before = $this->inspect($companyId);

        $updated = DB::transaction(function () use ($companyId): array {
            $fromLegacyDate = $this->query($companyId)
                ->whereNull('data_execucao')
                ->whereNotNull('data_cadastro')
                ->update(['data_execucao' => DB::raw('data_cadastro')]);

            $fromCreatedAt = $this->query($companyId)
                ->whereNull('data_execucao')
                ->whereNull('data_cadastro')
                ->whereNotNull('created_at')
                ->update([
                    'data_execucao' => DB::raw('created_at'),
                    'data_cadastro' => DB::raw('created_at'),
                ]);

            $compatibilityDate = $this->query($companyId)
                ->whereNotNull('data_execucao')
                ->whereNull('data_cadastro')
                ->update(['data_cadastro' => DB::raw('data_execucao')]);

            $status = $this->query($companyId)
                ->where(function (Builder $query): void {
                    $query->whereNull('status_ciclo')->orWhereRaw('UPPER(status_ciclo) <> ?', ['FECHADO']);
                })
                ->update(['status_ciclo' => 'FECHADO']);

            return compact('fromLegacyDate', 'fromCreatedAt', 'compatibilityDate', 'status');
        });

        return [
            'before' => $before,
            'updated' => $updated,
            'after' => $this->inspect($companyId),
        ];
    }

    private function query(?int $companyId): Builder
    {
        return DB::table(self::TABLE)
            ->whereNull('deleted_at')
            ->when($companyId !== null, fn (Builder $query) => $query->where('company_id', $companyId));
    }
}
