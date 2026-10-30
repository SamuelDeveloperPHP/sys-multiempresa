<?php

namespace App\Services\Frota;

use App\Models\Frota\VeiculoChecklistItem;
use App\Models\Frota\VeiculoChecklistServico;

final class ChecklistExecutionContract
{
    public const STATUS_CONCLUIDO = 'CONCLUIDO';

    public function toArray(VeiculoChecklistServico $execution): array
    {
        $date = $execution->dataCanonica();

        return [
            'id' => $execution->id,
            'client_uuid' => $execution->client_uuid,
            'veiculo_id' => $execution->id_veiculo,
            'checklist_id' => $execution->id_checklist,
            'user_id' => $execution->id_user,
            'status' => self::STATUS_CONCLUIDO,
            'resultado_inspecao' => $execution->resultado_inspecao,
            'requer_acao' => (bool) $execution->requer_acao,
            'template_versao' => $execution->template_versao,
            // Compatibilidade temporária com o cache Dexie e clientes antigos.
            'ciclo_status' => $execution->status_ciclo ?: CicloAbertoService::STATUS_FECHADO,
            'template_nome' => $execution->template_snapshot['template_nome']
                ?? $execution->checklist?->nome_checklist,
            'data' => $date?->toIso8601String(),
            'data_execucao' => $date?->toIso8601String(),
            'responsavel' => $execution->responsavel ?: $execution->user?->name ?: $execution->user_create,
            'km_atual' => $execution->km_atual,
            'hr_atual' => $execution->hr_atual,
            'respostas' => $this->responses($execution),
            'observacao_geral' => $execution->observacao_geral,
        ];
    }

    public function responses(VeiculoChecklistServico $execution): array
    {
        $responses = is_array($execution->respostas) ? $execution->respostas : [];

        if ($responses !== []) {
            $itemNames = VeiculoChecklistItem::query()
                ->whereIn('id', collect($responses)->pluck('item_id')->filter()->unique())
                ->pluck('nome_servico', 'id');

            return collect($responses)->map(function (array $response) use ($itemNames): array {
                $itemId = isset($response['item_id']) ? (int) $response['item_id'] : null;
                $response['item_id'] = $itemId;
                $response['item_nome'] = $response['item_nome'] ?? ($itemId ? $itemNames->get($itemId) : null) ?? 'Item sem identificação';
                $response['ok'] = filter_var($response['ok'] ?? null, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
                $response['obs'] = $response['obs'] ?? null;
                $response['foto_url'] = $this->photoUrl($response['foto_url'] ?? $response['foto_path'] ?? null);

                return $response;
            })->values()->all();
        }

        $execution->loadMissing('itensRealizados.item');
        $snapshotItems = collect($execution->template_snapshot['itens'] ?? [])->keyBy('item_id');

        return $execution->itensRealizados->map(function ($item) use ($snapshotItems): array {
            $itemId = $item->id_checklist_itens ? (int) $item->id_checklist_itens : null;
            $snapshot = $snapshotItems->get($itemId, []);

            return [
                'item_id' => $itemId,
                'item_nome' => $snapshot['nome'] ?? $item->item?->nome_servico ?? 'Item sem identificação',
                'obrigatorio' => (bool) ($snapshot['obrigatorio'] ?? true),
                'critico' => (bool) ($snapshot['critico'] ?? false),
                'ok' => strtolower((string) $item->status) === 'sim',
                'obs' => $item->observacao,
                'foto_url' => $this->photoUrl($item->arquivo_servidor ?: $item->arquivo_app),
            ];
        })->values()->all();
    }

    private function photoUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return url('storage/'.ltrim($path, '/'));
    }
}
