<?php

namespace App\Infrastructure\Jarvis\Tools\Ferramental;

use App\Domain\Jarvis\Contracts\ToolInterface;
use Illuminate\Support\Facades\DB;

class ConsultarFerramentasDisponiveisTool implements ToolInterface
{
    public function name(): string { return 'ferramental.consultar_disponiveis'; }
    public function description(): string { return 'Consulta ferramentas disponíveis usando a tabela de estoque do sistema anfitrião.'; }
    public function permission(): string { return 'jarvis.ferramental.list'; }
    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'obra_id' => ['type' => 'integer'],
                'search' => ['type' => 'string'],
                'limit' => ['type' => 'integer'],
            ],
        ];
    }
    public function requiresApproval(array $arguments, array $context = []): bool { return false; }
    public function execute(array $arguments, array $context = []): array
    {
        $table = 'ativos_externo_estoque';
        if (! DB::getSchemaBuilder()->hasTable($table)) {
            return [
                'warning' => 'A tabela [ativos_externo_estoque] não existe no ambiente atual. Ajuste esta tool para o seu schema real.',
                'items' => [],
                'total' => 0,
            ];
        }

        $limit = (int) ($arguments['limit'] ?? 15);
        $search = (string) ($arguments['search'] ?? '');
        $obraId = $arguments['obra_id'] ?? null;

        $query = DB::table($table)->select(['id', 'patrimonio', 'status', 'id_obra'])->where('status', '!=', 6);
        if ($obraId) { $query->where('id_obra', (int) $obraId); }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('patrimonio', 'like', '%' . $search . '%');
            });
        }
        $rows = $query->limit(max(1, min($limit, 50)))->get();
        return [
            'filters' => ['obra_id' => $obraId, 'search' => $search],
            'total' => $rows->count(),
            'items' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'patrimonio' => $row->patrimonio,
                'status' => $row->status,
                'obra_id' => $row->id_obra,
            ])->values()->all(),
            'note' => 'Tool de exemplo pronta para ser adaptada ao schema final do módulo de ferramental.',
        ];
    }
}
