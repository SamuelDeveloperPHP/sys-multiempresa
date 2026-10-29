<?php

namespace App\Services\Frota;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class DiagnosticoIntegridadeFrota
{
    /**
     * Executa verificações somente leitura sobre invariantes operacionais.
     */
    public function executar(?int $companyId = null): array
    {
        $checks = [
            'veiculos_com_multiplas_locacoes_ativas' => $this->locacoesAtivasDuplicadas($companyId),
            'motoristas_com_multiplos_diarios_abertos' => $this->diariosAbertosDuplicados($companyId),
            'checklists_invisiveis_no_admin' => $this->checklistsInvisiveisNoAdmin($companyId),
        ];

        return [
            'generated_at' => now()->toIso8601String(),
            'filters' => ['company_id' => $companyId],
            'summary' => [
                'checks_with_issues' => collect($checks)->where('issue_count', '>', 0)->count(),
                'total_issue_groups' => collect($checks)->sum('issue_count'),
                'total_affected_records' => collect($checks)->sum('affected_records'),
            ],
            'checks' => $checks,
        ];
    }

    private function locacoesAtivasDuplicadas(?int $companyId): array
    {
        $query = DB::table('veiculos_locacaos')
            ->whereNull('deleted_at')
            ->whereNull('data_fim');

        $this->filtrarEmpresa($query, $companyId);

        $records = $query
            ->select(['company_id', 'veiculo_id'])
            ->selectRaw('COUNT(*) as total_ativos')
            ->selectRaw('GROUP_CONCAT(id) as ids')
            ->groupBy('company_id', 'veiculo_id')
            ->havingRaw('COUNT(*) > 1')
            ->orderBy('company_id')
            ->orderBy('veiculo_id')
            ->get()
            ->map(fn (object $row): array => [
                'company_id' => $this->nullableInt($row->company_id),
                'veiculo_id' => (int) $row->veiculo_id,
                'total_ativos' => (int) $row->total_ativos,
                'locacao_ids' => $this->parseIds($row->ids),
            ])
            ->all();

        return $this->check(
            'Veículos com mais de uma locação ativa',
            $records,
            fn (array $record): int => $record['total_ativos'],
        );
    }

    private function diariosAbertosDuplicados(?int $companyId): array
    {
        $query = DB::table('veiculos_diario_bordo')
            ->whereNull('deleted_at')
            ->whereNotNull('id_user')
            ->whereRaw('UPPER(ciclo_status) = ?', ['ABERTO']);

        $this->filtrarEmpresa($query, $companyId);

        $records = $query
            ->select(['company_id', 'id_user'])
            ->selectRaw('COUNT(*) as total_abertos')
            ->selectRaw('GROUP_CONCAT(id) as ids')
            ->groupBy('company_id', 'id_user')
            ->havingRaw('COUNT(*) > 1')
            ->orderBy('company_id')
            ->orderBy('id_user')
            ->get()
            ->map(fn (object $row): array => [
                'company_id' => $this->nullableInt($row->company_id),
                'user_id' => (int) $row->id_user,
                'total_abertos' => (int) $row->total_abertos,
                'diario_ids' => $this->parseIds($row->ids),
            ])
            ->all();

        return $this->check(
            'Motoristas com mais de um diário aberto',
            $records,
            fn (array $record): int => $record['total_abertos'],
        );
    }

    private function checklistsInvisiveisNoAdmin(?int $companyId): array
    {
        $query = DB::table('veiculo_checklist_itens_servicos')
            ->whereNull('deleted_at')
            ->whereNotNull('data_execucao')
            ->whereNull('data_cadastro');

        $this->filtrarEmpresa($query, $companyId);

        $records = $query
            ->orderBy('company_id')
            ->orderBy('id')
            ->get(['id', 'company_id', 'id_veiculo', 'id_user', 'data_execucao'])
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'company_id' => $this->nullableInt($row->company_id),
                'veiculo_id' => $this->nullableInt($row->id_veiculo),
                'user_id' => $this->nullableInt($row->id_user),
                'data_execucao' => (string) $row->data_execucao,
            ])
            ->all();

        return $this->check(
            'Checklists executados sem data_cadastro',
            $records,
            fn (): int => 1,
        );
    }

    private function filtrarEmpresa(Builder $query, ?int $companyId): void
    {
        if ($companyId !== null) {
            $query->where('company_id', $companyId);
        }
    }

    private function check(string $label, array $records, callable $affectedRecords): array
    {
        return [
            'label' => $label,
            'issue_count' => count($records),
            'affected_records' => collect($records)->sum($affectedRecords),
            'records' => $records,
        ];
    }

    private function parseIds(?string $ids): array
    {
        if ($ids === null || $ids === '') {
            return [];
        }

        $parsed = array_map('intval', explode(',', $ids));
        sort($parsed);

        return $parsed;
    }

    private function nullableInt(mixed $value): ?int
    {
        return $value === null ? null : (int) $value;
    }
}
