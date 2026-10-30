<?php

namespace App\Services\Frota;

use App\Models\Frota\VeiculoChecklist;
use App\Models\Frota\VeiculoChecklistServico;
use Illuminate\Validation\ValidationException;

final class ChecklistSubmission
{
    public const RESULTADO_CONFORME = 'CONFORME';

    public const RESULTADO_NAO_CONFORME = 'NAO_CONFORME';

    public const RESULTADO_REPROVADO_CRITICO = 'REPROVADO_CRITICO';

    public function prepareForTemplate(int $templateId, int $vehicleId, array $responses): array
    {
        $template = VeiculoChecklist::query()
            ->with(['itens' => fn ($query) => $query
                ->where(fn ($active) => $active->whereNull('situacao')->orWhereRaw('LOWER(situacao) = ?', ['ativo']))
                ->orderBy('id')])
            ->findOrFail($templateId);

        if ((int) $template->id_veiculo !== $vehicleId) {
            throw ValidationException::withMessages([
                'checklist_id' => 'O checklist informado não pertence a este veículo.',
            ]);
        }

        $snapshot = $this->snapshotFromTemplate($template);

        return $this->prepare($snapshot, $responses);
    }

    public function prepareForExecution(VeiculoChecklistServico $execution, array $responses): array
    {
        $snapshot = $execution->template_snapshot;

        if (! is_array($snapshot) || empty($snapshot['itens'])) {
            return $this->prepareForTemplate(
                (int) $execution->id_checklist,
                (int) $execution->id_veiculo,
                $responses,
            );
        }

        return $this->prepare($snapshot, $responses);
    }

    public function snapshotFromTemplate(VeiculoChecklist $template): array
    {
        $template->loadMissing(['itens' => fn ($query) => $query
            ->where(fn ($active) => $active->whereNull('situacao')->orWhereRaw('LOWER(situacao) = ?', ['ativo']))
            ->orderBy('id')]);

        return [
            'schema_version' => 1,
            'origem' => 'TEMPLATE',
            'template_id' => (int) $template->id,
            'template_versao' => (int) ($template->versao ?: 1),
            'template_nome' => $template->nome_checklist,
            'itens' => $template->itens->map(fn ($item): array => [
                'item_id' => (int) $item->id,
                'nome' => $item->nome_servico,
                'obrigatorio' => (bool) $item->obrigatorio,
                'critico' => (bool) $item->critico,
                'tipo_itens' => $item->tipo_itens,
            ])->values()->all(),
        ];
    }

    public function snapshotFromLegacy(VeiculoChecklistServico $execution, array $responses): array
    {
        $template = $execution->checklist;
        $items = collect($responses)->map(fn (array $response): array => [
            'item_id' => isset($response['item_id']) ? (int) $response['item_id'] : null,
            'nome' => $response['item_nome'] ?? 'Item sem identificação',
            'obrigatorio' => true,
            'critico' => false,
            'tipo_itens' => null,
        ])->values()->all();

        return [
            'schema_version' => 1,
            'origem' => 'LEGADO_RECONSTRUIDO',
            'template_id' => $execution->id_checklist ? (int) $execution->id_checklist : null,
            'template_versao' => (int) ($template?->versao ?: 1),
            'template_nome' => $template?->nome_checklist,
            'itens' => $items,
        ];
    }

    public function outcome(array $responses): array
    {
        $failed = collect($responses)->filter(fn (array $response): bool => ($response['ok'] ?? null) === false);
        $critical = $failed->contains(fn (array $response): bool => (bool) ($response['critico'] ?? false));

        return [
            'resultado_inspecao' => $critical
                ? self::RESULTADO_REPROVADO_CRITICO
                : ($failed->isNotEmpty() ? self::RESULTADO_NAO_CONFORME : self::RESULTADO_CONFORME),
            'requer_acao' => $failed->isNotEmpty(),
        ];
    }

    private function prepare(array $snapshot, array $responses): array
    {
        $items = collect($snapshot['itens'] ?? [])->keyBy(fn (array $item): int => (int) $item['item_id']);
        $submitted = collect($responses);
        $errors = [];

        $counts = $submitted->countBy(fn (array $response): int => (int) ($response['item_id'] ?? 0));
        foreach ($submitted as $index => $response) {
            $itemId = (int) ($response['item_id'] ?? 0);
            if (($counts[$itemId] ?? 0) > 1) {
                $errors["respostas.{$index}.item_id"] = 'O item foi informado mais de uma vez.';
            } elseif (! $items->has($itemId)) {
                $errors["respostas.{$index}.item_id"] = 'O item não pertence a esta versão do checklist.';
            }
        }

        $submittedIds = $submitted->pluck('item_id')->map(fn ($id): int => (int) $id)->unique();
        $missing = $items->filter(fn (array $item, int $id): bool => (bool) ($item['obrigatorio'] ?? true) && ! $submittedIds->contains($id)
        );
        if ($missing->isNotEmpty()) {
            $errors['respostas'] = 'Responda todos os itens obrigatórios: '.$missing
                ->pluck('nome')->take(5)->implode(', ').($missing->count() > 5 ? '…' : '').'.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $byId = $submitted->keyBy(fn (array $response): int => (int) $response['item_id']);
        $normalized = $items->map(function (array $item, int $itemId) use ($byId): ?array {
            $response = $byId->get($itemId);
            if ($response === null) {
                return null;
            }

            return array_merge($response, [
                'item_id' => $itemId,
                'item_nome' => $item['nome'] ?? 'Item sem identificação',
                'obrigatorio' => (bool) ($item['obrigatorio'] ?? true),
                'critico' => (bool) ($item['critico'] ?? false),
            ]);
        })->filter()->values()->all();

        return array_merge([
            'respostas' => $normalized,
            'template_snapshot' => $snapshot,
            'template_versao' => (int) ($snapshot['template_versao'] ?? 1),
        ], $this->outcome($normalized));
    }
}
