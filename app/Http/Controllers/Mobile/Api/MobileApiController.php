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
use App\Models\Funcionario;
use App\Models\Obra;
use App\Models\FuncionarioFuncao;
use App\Services\Frota\CicloAbertoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

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

    /**
     * Idempotência do sync offline: se o cliente reenviar um create com o
     * mesmo client_uuid (retry após resposta perdida), devolvemos o registro
     * já criado em vez de gerar duplicata.
     */
    private function findByClientUuid(string $modelClass, ?string $uuid)
    {
        if (!$uuid) {
            return null;
        }
        $query = $modelClass::query()->where('client_uuid', $uuid);
        if ($companyId = $this->companyId()) {
            $query->where('company_id', $companyId);
        }
        return $query->first();
    }

    /**
     * Create com proteção contra corrida de retries simultâneos: se o índice
     * unique de client_uuid barrar a duplicata, devolve o registro existente.
     * Retorna [Model $rec, bool $jaExistia].
     */
    private function createComClientUuid(string $modelClass, array $payload): array
    {
        try {
            return [$modelClass::create($payload), false];
        } catch (\Illuminate\Database\QueryException $e) {
            $existing = $this->findByClientUuid($modelClass, $payload['client_uuid'] ?? null);
            if ($existing) {
                return [$existing, true];
            }
            throw $e;
        }
    }

    /**
     * Salva uma foto base64 (data URL) como ARQUIVO no disco público, na
     * convenção do SyncController legado: uploads/aplicativo/{contexto}/.
     * Retorna ['nome', 'path', 'url'] ou null se o data URL for inválido.
     * Entradas já validadas pelo FormRequest (formato data:image + tamanho).
     */
    private function salvarFotoBase64(?string $dataUrl, string $contexto, string $prefixo = 'img'): ?array
    {
        if (!$dataUrl || !is_string($dataUrl)) {
            return null;
        }
        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,/', $dataUrl, $m)) {
            return null;
        }
        $conteudo = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
        if (!$conteudo) {
            return null;
        }
        $ext = $m[1] === 'jpg' ? 'jpeg' : $m[1];
        $nome = uniqid($prefixo . '_', true) . '.' . $ext;
        $caminho = "uploads/aplicativo/{$contexto}/{$nome}";
        Storage::disk('public')->put($caminho, $conteudo);
        return ['nome' => $nome, 'path' => $caminho, 'url' => url('storage/' . $caminho)];
    }

    /**
     * Extrai as fotos base64 (foto_data_url) das respostas de checklist e as
     * salva como arquivo. No JSON persistido fica apenas 'foto_path' — sem
     * isso, cada execução inflaria a coluna `respostas` com megabytes de
     * base64 (estourando post_max_size / max_allowed_packet e inchando o banco).
     * 'foto_path' pré-existente (edição de registro já sincronizado) passa
     * intacto; base64 inválido é descartado sem derrubar o request.
     */
    private function extrairFotosRespostas(?array $respostas): ?array
    {
        if (!$respostas) {
            return $respostas;
        }
        foreach ($respostas as $i => $r) {
            $dataUrl = $r['foto_data_url'] ?? null;
            unset($respostas[$i]['foto_data_url']);
            $foto = $this->salvarFotoBase64($dataUrl, 'checklist_servicos', 'chk');
            if ($foto) {
                $respostas[$i]['foto_path'] = $foto['path'];
            }
        }
        return array_values($respostas);
    }

    /**
     * Complementa cada resposta com 'foto_url' navegável a partir do
     * 'foto_path' persistido (para o front exibir a foto sincronizada).
     */
    private function respostasComFotoUrl(?array $respostas): ?array
    {
        if (!$respostas) {
            return $respostas;
        }
        return array_map(function ($r) {
            if (is_array($r) && !empty($r['foto_path'])) {
                $r['foto_url'] = url('storage/' . ltrim($r['foto_path'], '/'));
            }
            return $r;
        }, $respostas);
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

        // OBS importante: ambas tabelas usam `id_veiculo` (não `veiculo_id`).
        // Migrations: 2026_05_12_000013_create_frota_preventivas_tables.php +
        // 2026_05_19_140001_create_veiculo_preventivas_itens_table.php
        //
        // Try/catch por bloco: se uma tabela opcional não existir (migration
        // ainda não rodada em produção), o app ainda retorna o veículo com
        // listas vazias em vez de 500.
        $preventivasItens = [];
        try {
            $preventivasItens = VeiculoPreventivaItem::where('id_veiculo', $id)->get();
        } catch (\Throwable $e) {
            \Log::warning('[veiculosShow] preventivas_itens falhou', [
                'veiculo_id' => $id, 'msg' => $e->getMessage(),
            ]);
        }

        $servicosPreventiva = [];
        try {
            $servicosPreventiva = VeiculoPreventivaItemRealizada::where('id_veiculo', $id)
                ->orderBy('id', 'desc')
                ->get();
        } catch (\Throwable $e) {
            \Log::warning('[veiculosShow] servicos_preventiva falhou', [
                'veiculo_id' => $id, 'msg' => $e->getMessage(),
            ]);
        }

        // Calcula medição atual a partir das tabelas de leitura (última)
        $kmAtual = $this->ultimaQuilometragem($id) ?? (float) ($veiculo->quilometragem_inicial ?? 0);
        $hrAtual = $this->ultimoHorimetro($id)     ?? (float) ($veiculo->horimetro_inicial ?? 0);

        // Anexa pseudo-fields esperados pelo front
        $veiculo->quilometragem_atual = $kmAtual;
        $veiculo->horimetro_atual     = $hrAtual;

        $medicaoAtual = ($veiculo->tipo_hr ?? 0) == 1 ? $hrAtual : $kmAtual;

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

        // Idempotência: reenvio do mesmo create devolve o registro existente
        if ($existing = $this->findByClientUuid(VeiculoAbastecimento::class, $request->input('client_uuid'))) {
            return response()->json(['status' => true, 'data' => $this->mapAbastecimento($existing), 'deduplicated' => true]);
        }

        $payload = $this->normalizeAbastecimento($request->validated());
        $payload['company_id'] = $this->companyId();
        if ($uuid = $request->input('client_uuid')) {
            $payload['client_uuid'] = $uuid;
        }
        // Foto do comprovante: base64 vira arquivo (convenção legada:
        // arquivo_app = nome, arquivo_servidor = URL). O campo era ignorado
        // e a foto do comprovante nunca chegava ao servidor.
        $foto = $this->salvarFotoBase64($request->validated()['arquivo_app_data_url'] ?? null, 'abastecimentos', 'abast');
        if ($foto) {
            $payload['arquivo_app'] = $foto['nome'];
            $payload['arquivo_servidor'] = $foto['url'];
        }
        [$rec, $jaExistia] = $this->createComClientUuid(VeiculoAbastecimento::class, $payload);
        return response()->json(
            ['status' => true, 'data' => $this->mapAbastecimento($rec), 'deduplicated' => $jaExistia],
            $jaExistia ? 200 : 201
        );
    }

    public function abastecimentosUpdate(UpdateAbastecimentoRequest $request, $id)
    {
        $rec = VeiculoAbastecimento::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->veiculo_id);  // ownership check
        $payload = $this->normalizeAbastecimento($request->validated(), false);
        // Troca de foto do comprovante na edição (mesma convenção do store)
        $foto = $this->salvarFotoBase64($request->validated()['arquivo_app_data_url'] ?? null, 'abastecimentos', 'abast');
        if ($foto) {
            $payload['arquivo_app'] = $foto['nome'];
            $payload['arquivo_servidor'] = $foto['url'];
        }
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
            'client_uuid'    => $r->client_uuid,
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
            // URL do comprovante salvo no servidor (foto capturada no app)
            'comprovante_url' => $r->arquivo_servidor,
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

    public function diarioStore(StoreDiarioBordoRequest $request, CicloAbertoService $ciclo)
    {
        $veiculoId = (int) ($request->veiculo_id ?? $request->id_veiculo);
        $this->veiculoDaEmpresa($veiculoId);

        // Idempotência ANTES da regra de ciclo: o replay de um create que já
        // abriu ciclo não pode falhar com 422 — devolve o registro existente.
        if ($existing = $this->findByClientUuid(VeiculoDiarioBordo::class, $request->input('client_uuid'))) {
            return response()->json(['status' => true, 'data' => $this->mapDiario($existing), 'deduplicated' => true]);
        }

        $user = Auth::user();
        // Abrir diário = abrir ciclo (default ABERTO). Valida regra "1 ciclo por motorista".
        if ($ciclo->ehAbertura($request->input('ciclo_status'))) {
            $ciclo->assertPodeAbrir((int) $user->id, $veiculoId, $user->email);
        }

        $payload = $this->normalizeDiario($request->validated());
        $payload['company_id']  = $this->companyId();
        $payload['ciclo_status'] = strtoupper($request->input('ciclo_status', CicloAbertoService::STATUS_ABERTO));
        if ($uuid = $request->input('client_uuid')) {
            $payload['client_uuid'] = $uuid;
        }
        // Foto da ABERTURA (base64 → arquivo; convenção legada)
        $foto = $this->salvarFotoBase64($request->validated()['arquivo_app_data_url'] ?? null, 'diario_bordo', 'diario');
        if ($foto) {
            $payload['arquivo_app'] = $foto['nome'];
            $payload['arquivo_servidor'] = $foto['url'];
        }
        [$rec, $jaExistia] = $this->createComClientUuid(VeiculoDiarioBordo::class, $payload);
        return response()->json(
            ['status' => true, 'data' => $this->mapDiario($rec), 'deduplicated' => $jaExistia],
            $jaExistia ? 200 : 201
        );
    }

    public function diarioUpdate(UpdateDiarioBordoRequest $request, $id)
    {
        $rec = VeiculoDiarioBordo::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);
        $payload = $this->normalizeDiario($request->validated(), false);

        // Fechamento de ciclo: explícito (ciclo_status) ou implícito (horário/hr/km final).
        if (strtoupper((string) $request->input('ciclo_status')) === CicloAbertoService::STATUS_FECHADO
            || $request->filled('horario_final') || $request->filled('hr_final') || $request->filled('km_final')) {
            $payload['ciclo_status'] = CicloAbertoService::STATUS_FECHADO;
        }

        // Foto do FECHAMENTO — coluna própria para não sobrescrever a da abertura
        $fotoFech = $this->salvarFotoBase64($request->validated()['arquivo_fechamento_data_url'] ?? null, 'diario_bordo', 'diario_fech');
        if ($fotoFech) {
            $payload['arquivo_fechamento_app'] = $fotoFech['nome'];
            $payload['arquivo_fechamento_servidor'] = $fotoFech['url'];
        }
        // Troca da foto de abertura (edição)
        $fotoAb = $this->salvarFotoBase64($request->validated()['arquivo_app_data_url'] ?? null, 'diario_bordo', 'diario');
        if ($fotoAb) {
            $payload['arquivo_app'] = $fotoAb['nome'];
            $payload['arquivo_servidor'] = $fotoAb['url'];
        }

        $rec->update($payload);
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
            // Campos do encerramento (Close.jsx)
            'horas_trabalhadas_minutos' => $in['horas_trabalhadas_minutos'] ?? null,
            'descricao_encerramento'    => $in['observacao_fechamento'] ?? $in['descricao_encerramento'] ?? null,
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
            'client_uuid'  => $r->client_uuid,
            'veiculo_id'   => $r->id_veiculo,
            'user_id'      => $r->id_user,
            'ciclo_status' => $r->ciclo_status,
            'data'         => optional($r->data_cadastro)->toIso8601String(),
            'responsavel'  => $r->user?->name,
            'descricao'    => $r->descricao_atividade,
            'descricao_atividade' => $r->descricao_atividade,
            'horario_inicial' => optional($r->horario_inicial)->toIso8601String(),
            'horario_final'   => optional($r->horario_final)->toIso8601String(),
            'horas_trabalhadas_minutos' => $r->horas_trabalhadas_minutos,
            'km_inicial'   => $r->km_anterior,
            'km_final'     => $r->km_atual,
            'hr_inicial'   => $r->hr_anterior,
            'hr_final'     => $r->hr_atual,
            'observacao'   => $r->descricao_encerramento,
            'observacao_fechamento' => $r->descricao_encerramento,
            // Fotos: abertura e fechamento (colunas separadas)
            'foto_url'            => $r->arquivo_servidor,
            'foto_fechamento_url' => $r->arquivo_fechamento_servidor,
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
                // Não existe config por item no schema (veiculo_checklist_itens
                // não tem coluna 'obrigatorio'). Regra de negócio vigente:
                // TODOS os itens do checklist devem ser respondidos.
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
        // ESCOPO DE EMPRESA obrigatório: sem ele este endpoint vazava os
        // checklists de TODAS as empresas (multi-tenant). Mesmo filtro de
        // situação usado em checklistsByVeiculo.
        $companyId = $this->companyId();

        $qc = VeiculoChecklist::query()->where(function ($q) {
            $q->whereNull('situacao')->orWhere('situacao', 'Ativo')->orWhere('situacao', 'ativo');
        });
        if ($companyId) {
            $qc->where('company_id', $companyId);
        }
        $checklists = $qc->get();

        $itens = VeiculoChecklistItem::whereIn('id_checklist', $checklists->pluck('id'))
            ->where(function ($q) {
                $q->whereNull('situacao')->orWhere('situacao', 'Ativo')->orWhere('situacao', 'ativo');
            })
            ->get();

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

    public function checklistServicosStore(StoreChecklistServicoRequest $request, CicloAbertoService $ciclo)
    {
        $veiculoId = (int) $request->veiculo_id;
        $this->veiculoDaEmpresa($veiculoId);
        $user = Auth::user();

        // Idempotência ANTES da regra de ciclo: o replay de um create que já
        // abriu ciclo não pode falhar com 422 — devolve o registro existente.
        if ($existing = $this->findByClientUuid(VeiculoChecklistServico::class, $request->input('client_uuid'))) {
            return response()->json(['status' => true, 'data' => $this->mapChecklistServico($existing), 'deduplicated' => true]);
        }

        // Abertura de checklist = abre ciclo. Encerramento (tipo/ciclo_status) não bloqueia.
        $ehAbertura = $ciclo->ehAbertura($request->input('ciclo_status'), $request->input('tipo'));
        if ($ehAbertura) {
            $ciclo->assertPodeAbrir((int) $user->id, $veiculoId, $user->email);
        }

        $statusCiclo = strtoupper($request->input('ciclo_status')
            ?: ($ehAbertura ? CicloAbertoService::STATUS_ABERTO : CicloAbertoService::STATUS_FECHADO));

        // Usa as respostas VALIDADAS (whitelist de chaves) e extrai as fotos
        // base64 para arquivos — o JSON persiste apenas foto_path.
        $respostas = $this->extrairFotosRespostas($request->validated()['respostas'] ?? null);

        [$rec, $jaExistia] = $this->createComClientUuid(VeiculoChecklistServico::class, [
            'company_id'    => $this->companyId(),
            'client_uuid'   => $request->input('client_uuid'),
            'id_veiculo'    => $veiculoId,
            'id_checklist'  => $request->checklist_id,
            'status_ciclo'  => $statusCiclo,
            'data_execucao' => $request->data,
            'responsavel'   => $request->responsavel,
            'km_atual'      => $request->km_atual,
            'hr_atual'      => $request->hr_atual,
            'respostas'     => $respostas,
            'observacao_geral' => $request->observacao_geral,
            'user_create'   => $user?->email,
            'id_user'       => $user?->id,
        ]);
        return response()->json(
            ['status' => true, 'data' => $this->mapChecklistServico($rec), 'deduplicated' => $jaExistia],
            $jaExistia ? 200 : 201
        );
    }

    public function checklistServicosUpdate(UpdateChecklistServicoRequest $request, $id)
    {
        $rec = VeiculoChecklistServico::findOrFail($id);
        $this->veiculoDaEmpresa((int) $rec->id_veiculo);

        $payload = $request->only([
            'data', 'responsavel', 'km_atual', 'hr_atual', 'observacao_geral'
        ]);
        if ($request->has('respostas')) {
            // Validadas + fotos base64 extraídas para arquivo (foto_path).
            $payload['respostas'] = $this->extrairFotosRespostas(
                $request->validated()['respostas'] ?? []
            );
        }
        if (isset($payload['data'])) {
            $payload['data_execucao'] = $payload['data'];
            unset($payload['data']);
        }
        // Encerramento de ciclo: explícito por ciclo_status ou tipo=ENCERRAMENTO
        if (strtoupper((string) $request->input('ciclo_status')) === CicloAbertoService::STATUS_FECHADO
            || strtoupper((string) $request->input('tipo')) === 'ENCERRAMENTO') {
            $payload['status_ciclo'] = CicloAbertoService::STATUS_FECHADO;
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
        $respostas = $this->respostasComFotoUrl($respostas);
        return [
            'id'              => $r->id,
            'client_uuid'     => $r->client_uuid,
            'veiculo_id'      => $r->id_veiculo,
            'checklist_id'    => $r->id_checklist,
            'user_id'         => $r->id_user,
            'ciclo_status'    => $r->status_ciclo,   // front (Dexie) usa 'ciclo_status'
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

    // =========================================================================
    // PERFIL DO USUÁRIO — endpoint /api/mobile/users/me
    // Retorna user logado + funcionario + obra + função
    // =========================================================================
    public function me()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Não autenticado'], 401);
        }

        // Tenta achar funcionário pelo email do usuário
        $funcionario = null;
        $obra = null;
        $funcao = null;

        try {
            $funcionario = Funcionario::where('email', $user->email)
                ->orWhere(function ($q) use ($user) {
                    if (method_exists($user, 'getKey')) {
                        $q->orWhere('id', $user->id_funcionario ?? null);
                    }
                })
                ->first();

            if ($funcionario) {
                if ($funcionario->id_obra) {
                    $obra = Obra::find($funcionario->id_obra);
                }
                if ($funcionario->id_funcao) {
                    $funcao = FuncionarioFuncao::find($funcionario->id_funcao);
                }
            }
        } catch (\Throwable $e) {
            // Silencia — funcionario relacionado é opcional
        }

        return response()->json([
            'status' => true,
            'user' => [
                'id'              => $user->id,
                'name'            => $user->name,
                'email'           => $user->email,
                'type'            => $user->type ?? null,
                'profile_photo'   => $user->profile_photo_url ?? null,
                'two_factor'      => !empty($user->two_factor_confirmed_at),
            ],
            'funcionario' => $funcionario ? [
                'id'             => $funcionario->id,
                'matricula'      => $funcionario->matricula,
                'nome'           => $funcionario->nome,
                'cpf'            => $funcionario->cpf,
                'celular'        => $funcionario->celular,
                'email'          => $funcionario->email,
                'imagem_usuario' => $funcionario->imagem_usuario,
                'situacao'       => $funcionario->situacao,
            ] : null,
            'obra' => $obra ? [
                'id'          => $obra->id,
                'codigo_obra' => $obra->codigo_obra ?? null,
                'nome'        => $obra->nome ?? $obra->descricao ?? null,
            ] : null,
            'funcao' => $funcao ? [
                'id'     => $funcao->id,
                'funcao' => $funcao->funcao ?? $funcao->nome ?? null,
            ] : null,
        ]);
    }

    /**
     * PUT /api/mobile/users/change-password
     * Body: { current_password, password, password_confirmation }
     *
     * Validações:
     *  - current_password confere com o hash atual
     *  - nova senha tem 8+ chars, letras+números, não pwned (HIBP via Laravel Password rule)
     *  - password_confirmation === password
     */
    public function changePassword(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Não autenticado'], 401);
        }

        $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->letters()->numbers()->uncompromised(),
            ],
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'status' => true,
            'message' => 'Senha alterada com sucesso. Você será desconectado.',
        ]);
    }
}
