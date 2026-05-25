<?php

namespace App\Http\Controllers\Mobile\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\StoreAbastecimentoRequest;
use App\Http\Requests\Mobile\StoreChecklistServicoRequest;
use App\Http\Requests\Mobile\StoreDiarioBordoRequest;
use App\Http\Requests\Mobile\UpdateAbastecimentoRequest;
use App\Http\Requests\Mobile\UpdateChecklistServicoRequest;
use App\Http\Requests\Mobile\UpdateDiarioBordoRequest;
use App\Helpers\CompanyContext;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Frota\VeiculoChecklist;
use App\Models\Frota\VeiculoChecklistItem;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;
use App\Models\Frota\VeiculoHorimetro;
use App\Models\Frota\VeiculoLocacao;
use App\Models\Frota\VeiculoPreventiva;
use App\Models\Frota\VeiculoPreventivaItem;
use App\Models\Frota\VeiculoPreventivaItemRealizada;
use App\Models\Frota\VeiculoQuilometragem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * MobileApiController — endpoints JSON consumidos pelos repositories
 * do frontend mobile (Dexie). Cada endpoint retorna { data: [...] } ou
 * { veiculo, preventivas_itens, servicos_preventiva, medicaoAtual }.
 *
 * Para POST/PUT/DELETE, payload e respostas usam nomes "lógicos"
 * (veiculo_id, data, descricao) traduzidos aqui para as colunas reais.
 */
class MobileApiController extends Controller
{
    /**
     * Defense-in-depth: além do trait Tenantable nos models, aplicamos
     * where('company_id', X) explicitamente. Se o trait falhar/for desligado,
     * ainda garantimos isolamento entre empresas.
     */
    private function companyId(): ?int
    {
        return CompanyContext::current()?->id;
    }

    /**
     * Garante que o veiculoId pertence à empresa atual.
     * Retorna o veículo ou aborta 403.
     */
    private function veiculoDaEmpresa(int $veiculoId): Veiculo
    {
        $companyId = $this->companyId();
        $query = Veiculo::query()->where('id', $veiculoId);
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        $veiculo = $query->first();
        abort_if(!$veiculo, 403, 'Veículo não encontrado ou não pertence à sua empresa.');
        return $veiculo;
    }

    // -------------------------------------------------------------------------
    // Ping (health-check usado pelo useOnlineStatus)
    // -------------------------------------------------------------------------
    public function ping()
    {
        return response()->json([
            'ok' => true,
            'ts' => now()->toIso8601String(),
            'user' => Auth::user()?->only('id', 'name'),
        ]);
    }

    // -------------------------------------------------------------------------
    // VEÍCULOS — list + show
    // -------------------------------------------------------------------------
    public function veiculosIndex()
    {
        $companyId = $this->companyId();
        $query = Veiculo::query()
            ->select(['id', 'company_id', 'obra_id', 'prefixo', 'placa', 'marca', 'modelo',
                      'imagem', 'tipo', 'tipo_km', 'tipo_hr',
                      'quilometragem_inicial', 'horimetro_inicial'])
            ->orderBy('prefixo');
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        $veiculos = $query->get()
            ->map(function ($v) {
                // Expõe campos "atual" calculados (compatibilidade com o front)
                $v->quilometragem_atual = $this->ultimaQuilometragem($v->id) ?? (float) $v->quilometragem_inicial;
                $v->horimetro_atual     = $this->ultimoHorimetro($v->id)     ?? (float) $v->horimetro_inicial;
                return $v;
            });

        return response()->json([
            'status' => true,
            'data' => $veiculos,
            'veiculos' => $veiculos,
        ]);
    }

    public function veiculosShow($id)
    {
        $veiculo = $this->veiculoDaEmpresa((int) $id);

        $preventivasItens = VeiculoPreventivaItem::where('veiculo_id', $id)->get();
        $servicosPreventiva = VeiculoPreventivaItemRealizada::where('veiculo_id', $id)
            ->orderBy('id', 'desc')
            ->get();

        // Calcula medição atual a partir das tabelas de leitura (última)
        $kmAtual = $this->ultimaQuilometragem($id) ?? (float) $veiculo->quilometragem_inicial;
        $hrAtual = $this->ultimoHorimetro($id)     ?? (float) $veiculo->horimetro_inicial;

        // Anexa pseudo-fields esperados pelo front
        $veiculo->quilometragem_atual = $kmAtual;
        $veiculo->horimetro_atual     = $hrAtual;

        $medicaoAtual = $veiculo->tipo_hr == 1 ? $hrAtual : $kmAtual;

        return response()->json([
            'status' => true,
            'veiculo' => $veiculo,
            'preventivas_itens' => $preventivasItens,
            'servicos_preventiva' => $servicosPreventiva,
            'medicaoAtual' => $medicaoAtual,
        ]);
    }

    /**
     * Última leitura registrada de horímetro do veículo.
     * Tabela: veiculo_horimetro (horimetro_novo = nova leitura).
     */
    private function ultimoHorimetro($veiculoId): ?float
    {
        try {
            $row = VeiculoHorimetro::where('veiculo_id', $veiculoId)
                ->orderByDesc('data_horimetro')
                ->orderByDesc('id')
                ->first();
            return $row ? (float) ($row->horimetro_novo ?? $row->horimetro_atual ?? 0) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Última leitura registrada de quilometragem do veículo.
     * Tabela: veiculo_quilometragems (quilometragem_nova = nova leitura).
     */
    private function ultimaQuilometragem($veiculoId): ?float
    {
        try {
            $row = VeiculoQuilometragem::where('veiculo_id', $veiculoId)
                ->orderByDesc('data_quilometragem')
                ->orderByDesc('id')
                ->first();
            return $row ? (float) ($row->quilometragem_nova ?? $row->quilometragem_atual ?? 0) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // ABASTECIMENTOS — CRUD
    // -------------------------------------------------------------------------
    public function abastecimentosByVeiculo($veiculoId)
    {
        $this->veiculoDaEmpresa((int) $veiculoId); // garante ownership
        $userEmail = Auth::user()?->email;
        $rows = VeiculoAbastecimento::where('veiculo_id', $veiculoId)
            ->where('user_create', $userEmail)                   // ISOLAMENTO POR USUÁRIO
            ->orderBy('data_abastecimento', 'desc')
            ->get()
            ->map(fn($r) => $this->mapAbastecimento($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function abastecimentosStore(StoreAbastecimentoRequest $request)
    {
        // Garante que o veículo pertence à empresa do usuário
        $this->veiculoDaEmpresa((int) $request->veiculo_id);
        $payload = $this->normalizeAbastecimento($request->validated());
        $payload['company_id'] = $this->companyId();
        $rec = VeiculoAbastecimento::create($payload);
        return response()->json(['status' => true, 'data' => $this->mapAbastecimento($rec)], 201);
    }

    public function abastecimentosUpdate(UpdateAbastecimentoRequest $request, $id)
    {
        $rec = VeiculoAbastecimento::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->veiculo_id);  // ownership check
        $payload = $this->normalizeAbastecimento($request->validated(), false);
        $rec->update($payload);
        return response()->json(['status' => true, 'data' => $this->mapAbastecimento($rec->fresh())]);
    }

    public function abastecimentosDestroy($id)
    {
        $rec = VeiculoAbastecimento::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->veiculo_id);
        $rec->delete();
        return response()->json(['status' => true]);
    }

    private function normalizeAbastecimento(array $in, bool $create = true): array
    {
        $user = Auth::user();
        $out = [
            'veiculo_id'         => $in['veiculo_id'] ?? null,
            'id_obra'            => $in['id_obra'] ?? null,
            'data_abastecimento' => $in['data'] ?? $in['data_abastecimento'] ?? null,
            'fornecedor'         => $in['fornecedor'] ?? null,
            'combustivel'        => $in['combustivel'] ?? null,
            'quantidade'         => $in['quantidade'] ?? null,
            'valor_do_litro'     => $in['valor_do_litro'] ?? null,
            'valor_total'        => $in['valor_total'] ?? null,
            'km_atual'           => $in['km_atual'] ?? null,
            'hr_atual'           => $in['hr_atual'] ?? null,
        ];
        if ($create) {
            $out['user_create'] = $user?->email;
        } else {
            $out['user_edit'] = $user?->email;
        }
        return array_filter($out, fn($v) => $v !== null);
    }

    private function mapAbastecimento(VeiculoAbastecimento $r): array
    {
        return [
            'id'             => $r->id,
            'veiculo_id'     => $r->veiculo_id,
            'data'           => optional($r->data_abastecimento)->toIso8601String(),
            'fornecedor'     => $r->fornecedor,
            'combustivel'    => $r->combustivel,
            'quantidade'     => (float) $r->quantidade,
            'valor_do_litro' => (float) $r->valor_do_litro,
            'valor_total'    => (float) $r->valor_total,
            'km_atual'       => $r->km_atual,
            'hr_atual'       => $r->hr_atual,
            'observacao'     => null,
            'created_at'     => $r->created_at?->toIso8601String(),
            'updated_at'     => $r->updated_at?->toIso8601String(),
        ];
    }

    // -------------------------------------------------------------------------
    // DIÁRIO DE BORDO — CRUD
    // -------------------------------------------------------------------------
    public function diarioByVeiculo($veiculoId)
    {
        $this->veiculoDaEmpresa((int) $veiculoId);
        $userId = Auth::id();
        $rows = VeiculoDiarioBordo::where('id_veiculo', $veiculoId)
            ->where('id_user', $userId)                       // ISOLAMENTO POR USUÁRIO
            ->orderBy('data_cadastro', 'desc')
            ->get()
            ->map(fn($r) => $this->mapDiario($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function diarioStore(StoreDiarioBordoRequest $request)
    {
        $veiculoId = (int) ($request->veiculo_id ?? $request->id_veiculo);
        $this->veiculoDaEmpresa($veiculoId);
        $payload = $this->normalizeDiario($request->validated());
        $payload['company_id'] = $this->companyId();
        $rec = VeiculoDiarioBordo::create($payload);
        return response()->json(['status' => true, 'data' => $this->mapDiario($rec)], 201);
    }

    public function diarioUpdate(UpdateDiarioBordoRequest $request, $id)
    {
        $rec = VeiculoDiarioBordo::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);
        $rec->update($this->normalizeDiario($request->validated(), false));
        return response()->json(['status' => true, 'data' => $this->mapDiario($rec->fresh())]);
    }

    public function diarioDestroy($id)
    {
        $rec = VeiculoDiarioBordo::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);
        $rec->delete();
        return response()->json(['status' => true]);
    }

    private function normalizeDiario(array $in, bool $create = true): array
    {
        $user = Auth::user();
        $out = [
            'id_veiculo'            => $in['veiculo_id'] ?? $in['id_veiculo'] ?? null,
            'id_obra'               => $in['id_obra'] ?? null,
            'data_cadastro'         => $in['data'] ?? $in['data_cadastro'] ?? null,
            'horario_inicial'       => $in['horario_inicial'] ?? null,
            'horario_final'         => $in['horario_final'] ?? null,
            'descricao_atividade'   => $in['descricao'] ?? $in['descricao_atividade'] ?? null,
            'km_anterior'           => $in['km_inicial'] ?? null,
            'km_atual'              => $in['km_final']   ?? $in['km_atual'] ?? null,
            'hr_anterior'           => $in['hr_inicial'] ?? null,
            'hr_atual'              => $in['hr_final']   ?? $in['hr_atual'] ?? null,
        ];
        if ($create) {
            $out['user_create'] = $user?->email;
            $out['id_user'] = $user?->id;
        } else {
            $out['user_edit'] = $user?->email;
        }
        return array_filter($out, fn($v) => $v !== null);
    }

    private function mapDiario(VeiculoDiarioBordo $r): array
    {
        return [
            'id'           => $r->id,
            'veiculo_id'   => $r->id_veiculo,
            'data'         => optional($r->data_cadastro)->toIso8601String(),
            'responsavel'  => $r->user?->name,
            'descricao'    => $r->descricao_atividade,
            'km_inicial'   => $r->km_anterior,
            'km_final'     => $r->km_atual,
            'hr_inicial'   => $r->hr_anterior,
            'hr_final'     => $r->hr_atual,
            'observacao'   => $r->descricao_encerramento,
            'created_at'   => $r->created_at?->toIso8601String(),
        ];
    }

    // -------------------------------------------------------------------------
    // CHECKLISTS — templates + execuções
    // -------------------------------------------------------------------------
    /**
     * Lista templates de checklist do veículo (catálogo + itens).
     * Tabela veiculo_checklist tem id_veiculo (não id_obra) — checklist é
     * configurado POR VEÍCULO no SGA. Coluna do nome: nome_checklist.
     * Itens em veiculo_checklist_itens com id_checklist + nome_servico.
     */
    public function checklistsByVeiculo($veiculoId)
    {
        $this->veiculoDaEmpresa((int) $veiculoId); // ownership

        $checklists = VeiculoChecklist::where('id_veiculo', $veiculoId)
            ->where(function ($q) {
                $q->whereNull('situacao')->orWhere('situacao', 'Ativo')->orWhere('situacao', 'ativo');
            })
            ->get();

        $ids = $checklists->pluck('id');
        $itens = VeiculoChecklistItem::whereIn('id_checklist', $ids)
            ->where(function ($q) {
                $q->whereNull('situacao')->orWhere('situacao', 'Ativo')->orWhere('situacao', 'ativo');
            })
            ->get();

        return response()->json([
            'status' => true,
            'checklists' => $checklists->map(fn($c) => [
                'id' => $c->id,
                'veiculo_id' => $c->id_veiculo,
                'nome' => $c->nome_checklist ?? "Checklist #{$c->id}",
                'descricao' => $c->descricao ?? null,
            ]),
            'itens' => $itens->map(fn($i) => [
                'id' => $i->id,
                'checklist_id' => $i->id_checklist,
                'veiculo_id' => $i->id_veiculo,
                'nome' => $i->nome_servico ?? $i->descricao,
                'descricao' => $i->descricao ?? null,
                'periodo_maq_vei' => $i->periodo_maq_vei ?? null,
                'tipo_itens' => $i->tipo_itens ?? null,
                'obrigatorio' => true,
            ]),
        ]);
    }

    /**
     * @deprecated Mantido para compatibilidade com clientes antigos.
     * Use checklistsByVeiculo. Esta versão retorna vazio em vez de 500.
     */
    public function checklistsByObra($obraId)
    {
        return response()->json([
            'status' => true,
            'checklists' => [],
            'itens' => [],
            'deprecated' => 'Use /api/mobile/veiculos/{veiculoId}/checklists',
        ]);
    }

    public function checklistsAll()
    {
        $checklists = VeiculoChecklist::all();
        $itens = VeiculoChecklistItem::all();
        return response()->json([
            'status' => true,
            'checklists' => $checklists,
            'itens' => $itens,
        ]);
    }

    public function checklistServicosByVeiculo($veiculoId)
    {
        $this->veiculoDaEmpresa((int) $veiculoId);
        $userEmail = Auth::user()?->email;
        $rows = VeiculoChecklistServico::where('id_veiculo', $veiculoId)
            ->where('user_create', $userEmail)                  // ISOLAMENTO POR USUÁRIO
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => $this->mapChecklistServico($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function checklistServicosStore(StoreChecklistServicoRequest $request)
    {
        $this->veiculoDaEmpresa((int) $request->veiculo_id);
        $user = Auth::user();
        $rec = VeiculoChecklistServico::create([
            'company_id'    => $this->companyId(),
            'id_veiculo'    => $request->veiculo_id,
            'id_checklist'  => $request->checklist_id,
            'data_execucao' => $request->data,
            'responsavel'   => $request->responsavel,
            'km_atual'      => $request->km_atual,
            'hr_atual'      => $request->hr_atual,
            'respostas'     => $request->respostas,
            'observacao_geral' => $request->observacao_geral,
            'user_create'   => $user?->email,
        ]);
        return response()->json(['status' => true, 'data' => $this->mapChecklistServico($rec)], 201);
    }

    public function checklistServicosUpdate(UpdateChecklistServicoRequest $request, $id)
    {
        $rec = VeiculoChecklistServico::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);

        $payload = $request->only([
            'data', 'responsavel', 'km_atual', 'hr_atual', 'observacao_geral'
        ]);
        if ($request->has('respostas')) {
            $payload['respostas'] = $request->respostas;  // cast 'array' no model serializa
        }
        if (isset($payload['data'])) {
            $payload['data_execucao'] = $payload['data'];
            unset($payload['data']);
        }
        $payload['user_edit'] = Auth::user()?->email;
        $rec->update($payload);
        return response()->json(['status' => true, 'data' => $this->mapChecklistServico($rec->fresh())]);
    }

    public function checklistServicosDestroy($id)
    {
        $rec = VeiculoChecklistServico::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);
        $rec->delete();
        return response()->json(['status' => true]);
    }

    private function mapChecklistServico(VeiculoChecklistServico $r): array
    {
        $respostas = $r->respostas;
        if (is_string($respostas)) {
            $respostas = json_decode($respostas, true) ?: [];
        }
        return [
            'id'              => $r->id,
            'veiculo_id'      => $r->id_veiculo,
            'checklist_id'    => $r->id_checklist,
            'template_nome'   => optional($r->checklist)->nome ?? optional($r->checklist)->titulo,
            'data'            => optional($r->data_execucao ?? $r->created_at)->toIso8601String(),
            'responsavel'     => $r->responsavel,
            'km_atual'        => $r->km_atual,
            'hr_atual'        => $r->hr_atual,
            'respostas'       => $respostas,
            'observacao_geral'=> $r->observacao_geral,
        ];
    }

    // -------------------------------------------------------------------------
    // LOCAÇÕES — read-only
    // -------------------------------------------------------------------------
    public function locacoesByVeiculo($veiculoId)
    {
        $this->veiculoDaEmpresa((int) $veiculoId);
        $rows = VeiculoLocacao::where('id_veiculo', $veiculoId)
            ->orderBy('id', 'desc')
            ->get();
        return response()->json(['status' => true, 'data' => $rows]);
    }

    // =========================================================================
    // LISTAS GLOBAIS (cross-veículo) — usadas pelas pages /mobile/{recurso}
    // Cada uma filtra por company_id defensivamente.
    // =========================================================================
    public function abastecimentosAll(Request $request)
    {
        $limit = min((int) $request->get('limit', 100), 500);
        $user = Auth::user();
        $q = VeiculoAbastecimento::query()
            ->where('user_create', $user?->email);              // ISOLAMENTO POR USUÁRIO
        if ($cid = $this->companyId()) $q->where('company_id', $cid);
        $rows = $q->orderBy('data_abastecimento', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($r) => $this->mapAbastecimento($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function diarioAll(Request $request)
    {
        $limit = min((int) $request->get('limit', 100), 500);
        $userId = Auth::id();
        $q = VeiculoDiarioBordo::query()
            ->where('id_user', $userId);                        // ISOLAMENTO POR USUÁRIO
        if ($cid = $this->companyId()) $q->where('company_id', $cid);
        $rows = $q->orderBy('data_cadastro', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($r) => $this->mapDiario($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function checklistServicosAll(Request $request)
    {
        $limit = min((int) $request->get('limit', 100), 500);
        $userEmail = Auth::user()?->email;
        $q = VeiculoChecklistServico::query()
            ->where('user_create', $userEmail);                 // ISOLAMENTO POR USUÁRIO
        if ($cid = $this->companyId()) $q->where('company_id', $cid);
        $rows = $q->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($r) => $this->mapChecklistServico($r));
        return response()->json(['status' => true, 'data' => $rows]);
    }

    public function locacoesAll(Request $request)
    {
        $limit = min((int) $request->get('limit', 200), 500);
        $q = VeiculoLocacao::query();
        if ($cid = $this->companyId()) $q->where('company_id', $cid);
        $rows = $q->orderBy('id', 'desc')->limit($limit)->get();
        return response()->json(['status' => true, 'data' => $rows]);
    }
}
