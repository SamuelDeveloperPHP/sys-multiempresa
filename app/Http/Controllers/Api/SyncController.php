<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

/**
 * SyncController do sys-multiempresa — adaptado do engeativos2.
 *
 * Diferencas chave em relacao ao SyncController antigo:
 *   1. Filtro por COMPANY: todas as queries respeitam o `company_id` do usuario.
 *   2. Obras permitidas vem de `obra_user` (pivot) — nao mais de CadastroUsuariosVinculo.
 *   3. Veiculos permitidos: obra_id IN (obras do usuario na empresa atual).
 *   4. UPSERT por id_local mantido (idempotencia).
 *   5. Preservacao de created_at no UPSERT mantida.
 *   6. Cabeza do payload: status='success' + registros_sincronizados (compat. com app RN).
 *
 * Rotas (ver routes/api-app.php):
 *   GET  /api/sync/schema             -> contrato
 *   POST /api/upload/{tabela}         -> upload generico (UPSERT por id_local)
 *   GET  /api/download/{tabela}       -> download filtrado por empresa+obras
 *   POST /api/sincronizacoes          -> registra evento de sync no servidor
 *   POST /api/sincronizacoes/log-error -> registra log de erro do mobile
 */
class SyncController extends Controller
{
    /** Tabelas que podem ser SINCRONIZADAS (download e/ou upload) */
    protected array $tabelasPermitidas = [
        // Catalogos (download)
        'users', 'funcionarios', 'funcao_funcionarios', 'obras', 'sincronizacaos',
        'veiculos', 'veiculos_locacaos',
        'veiculo_checklist', 'veiculo_checklist_itens',
        'veiculo_preventivas', 'veiculo_preventivas_itens_realizadas',
        // Upload (mobile -> servidor)
        'veiculo_checklist_itens_servicos',
        'veiculo_checklist_itens_realizados',
        'veiculo_checklist_evidencias',
        'veiculo_horimetro', 'veiculo_quilometragems',
        'veiculo_abastecimentos', 'veiculos_diario_bordo',
    ];

    /** Colunas permitidas por tabela (contrato de sync — fonte da verdade) */
    protected array $colunasPermitidas = [
        'users' => ['id','name','email','biometria','geolocalizacao','password_app','sync_status','data_sincronizacao'],
        'obras' => ['id','id_empresa','nome_fantasia','razao_social','cnpj','codigo_obra','sync_status','data_sincronizacao'],
        'funcionarios' => ['id','id_obra','id_funcao','id_setor','nome','matricula','cpf','status','imagem_usuario','data_sincronizacao','sync_status'],
        'funcao_funcionarios' => ['id','funcao','data_sincronizacao','sync_status'],
        'sincronizacaos' => ['id','tabela','tipo','ultima_sincronizacao','data_sincronizacao','user_create','user_id'],

        'veiculos' => ['id','obra_id','prefixo','tipo','placa','modelo','marca','ano','imagem','tipo_km','tipo_hr','data_sincronizacao','sync_status','created_at'],
        'veiculos_locacaos' => ['id','id_obra','veiculo_id','id_obraDestino','id_funcionario','id_funcionario_destino','tipo_veiculo','data_inicio','data_prevista','data_fim','data_sincronizacao','sync_status','created_at'],

        'veiculo_checklist' => ['id','id_veiculo','nome_checklist','situacao','user_create','user_edit','sync_status','data_sincronizacao','created_at','updated_at','deleted_at'],
        'veiculo_checklist_itens' => ['id','id_checklist','id_veiculo','nome_servico','periodo_maq_vei','alerta_venci','tipo_itens','periodo_dias','alert_venc_dias','user_create','user_edit','situacao','sync_status','data_sincronizacao','created_at','updated_at','deleted_at'],

        'veiculo_checklist_itens_servicos' => ['id','id_obra','id_veiculo','id_checklist','id_local','status','status_ciclo','tipo_checklist','id_abertura_vinculada','data_fechamento','anomalia_offline','foto_extra_1','desc_extra_1','foto_extra_2','desc_extra_2','foto_extra_3','desc_extra_3','foto_extra_4','desc_extra_4','data_cadastro','user_create','user_edit','sync_status','data_sincronizacao','created_at','deleted_at','updated_at'],

        'veiculo_checklist_itens_realizados' => ['id','id_obra','id_checklist','id_local','id_checklist_realizado','id_checklist_itens','id_veiculo','data_cadastro','status','arquivo_app','arquivo_servidor','user_create','horimetro_atual','horimetro_novo','quilometragem_atual','quilometragem_nova','observacao','sync_status','data_sincronizacao','created_at','deleted_at','updated_at'],

        'veiculo_horimetro' => ['id','id_local','veiculo_id','id_funcionario','id_obra','user_create','user_edit','horimetro_atual','horimetro_novo','data_horimetro','sync_status','data_sincronizacao','created_at','updated_at'],

        'veiculo_quilometragems' => ['id','id_local','id_obra','veiculo_id','id_funcionario','user_create','quilometragem_atual','quilometragem_nova','data_quilometragem','sync_status','data_sincronizacao','created_at','updated_at'],

        'veiculo_abastecimentos' => ['id','id_local','veiculo_id','id_obra','id_funcionario','user_create','user_edit','data_abastecimento','km_anterior','km_atual','hr_anterior','hr_atual','fornecedor','combustivel','tipo','quantidade','valor_do_litro','valor_total','arquivo_app','arquivo_servidor','sync_status','data_sincronizacao','created_at','updated_at'],

        'veiculos_diario_bordo' => ['id','id_local','id_obra','id_veiculo','id_user','user_create','user_edit','data_cadastro','horario_inicial','hr_anterior','km_anterior','horario_final','hr_atual','km_atual','descricao_atividade','arquivo_app','arquivo_servidor','sync_status','data_sincronizacao','created_at','deleted_at','updated_at'],

        'veiculo_preventivas' => ['id','id_veiculo','nome_preventiva','nome_servico','tipo_veiculo','situacao','periodo','tipo','alerta_venci','user_create','user_edit','sync_status','data_sincronizacao','created_at','updated_at','deleted_at'],

        'veiculo_preventivas_itens_realizadas' => ['id','id_veiculo','fornecedor_id','id_obra','id_preventiva','id_motorista','tipo','nf_pecas','nf_mao_obra','valor_do_servico','valor_da_mao_obra','total_valor_servico','quilometragem_atual','quilometragem_nova','campo_calc_km','horimetro_atual','horimetro_proximo','campo_cal_hr','data_de_execucao','data_previsao_termino','data_conclusao','campo_cal_mes','data_de_vencimento','descricao','status_realizado','user_create','user_edit','sync_status','data_sincronizacao','created_at','updated_at','deleted_at'],

        'veiculo_checklist_evidencias' => ['id','id_local','parent_tabela','parent_id_local','campo_foto','arquivo_local','arquivo_app','arquivo_servidor','user_create','user_edit','sync_status','data_sincronizacao'],
    ];

    public function schema(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'tabelasPermitidas' => $this->tabelasPermitidas,
            'colunasPermitidas' => $this->colunasPermitidas,
        ]);
    }

    // ============================================================
    // UPLOAD (mobile -> servidor)
    // ============================================================
    public function upload(string $tabela, Request $request): JsonResponse
    {
        if (!in_array($tabela, $this->tabelasPermitidas, true)) {
            return response()->json(['status' => 'error', 'message' => "Tabela '{$tabela}' nao permitida"], 403);
        }

        $validator = Validator::make($request->all(), ['registros' => 'required|array|min:1']);
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $usuario = Auth::user();
        $companyId = $this->resolveCompanyId($usuario, $request);
        if (!$companyId) {
            return response()->json(['status' => 'error', 'message' => 'Empresa nao identificada para o usuario'], 422);
        }

        $colunas = $this->colunasPermitidasExistentes($tabela);
        if (empty($colunas)) {
            return response()->json(['status' => 'error', 'message' => "Tabela '{$tabela}' sem estrutura sincronizavel"], 422);
        }

        $registros = $request->input('registros', []);
        $idsCriados = [];
        $registrosSincronizados = [];

        try {
            DB::beginTransaction();

            foreach ($registros as $registro) {
                $registro = (array) $registro;
                $origemDados = isset($registro['dados']) && is_array($registro['dados'])
                    ? $registro['dados']
                    : $registro;

                // Filtro estrito: apenas colunas declaradas
                $dados = array_intersect_key($origemDados, array_flip($colunas));
                unset($dados['id']);

                // Atribui company_id se a tabela suportar (multi-tenant)
                if (Schema::hasColumn($tabela, 'company_id')) {
                    $dados['company_id'] = $companyId;
                }

                // Processa arquivo principal (base64 -> storage)
                if (!empty($registro['arquivo_uri'])) {
                    $arquivo = $this->salvarArquivo($registro['arquivo_uri'], $tabela, 'file');
                    if ($arquivo) {
                        if (in_array('arquivo_app', $colunas, true))      $dados['arquivo_app'] = $arquivo['nome'];
                        if (in_array('arquivo_servidor', $colunas, true)) $dados['arquivo_servidor'] = $arquivo['url'];
                    }
                }
                // Fotos extras 1..4
                for ($i = 1; $i <= 4; $i++) {
                    $keyUri = "foto_extra_uri_$i";
                    $colunaFoto = "foto_extra_$i";
                    if (!empty($registro[$keyUri]) && in_array($colunaFoto, $colunas, true)) {
                        $arq = $this->salvarArquivo($registro[$keyUri], $tabela, "extra_{$i}");
                        if ($arq) $dados[$colunaFoto] = $arq['nome'];
                    }
                }

                // Metadados de sync
                if (in_array('sync_status', $colunas, true))         $dados['sync_status'] = 1;
                if (in_array('data_sincronizacao', $colunas, true))  $dados['data_sincronizacao'] = now();
                if (in_array('updated_at', $colunas, true))          $dados['updated_at'] = now();

                $dados = array_intersect_key($dados, array_flip($colunas));

                if (empty($dados)) {
                    throw new \RuntimeException("Registro sem colunas permitidas para {$tabela}");
                }

                // UPSERT por id_local quando disponivel
                $idLocal = $origemDados['id_local'] ?? $registro['id_local'] ?? null;
                $usaIdLocal = !empty($idLocal) && in_array('id_local', $colunas, true);

                if ($usaIdLocal) {
                    $existente = DB::table($tabela)
                        ->where('id_local', $idLocal)
                        ->where('company_id', $companyId)
                        ->first();

                    if ($existente) {
                        if (isset($existente->created_at)) $dados['created_at'] = $existente->created_at;
                        else unset($dados['created_at']);
                        DB::table($tabela)
                            ->where('id_local', $idLocal)
                            ->where('company_id', $companyId)
                            ->update($dados);
                        $idNovo = (int) $existente->id;
                    } else {
                        if (in_array('created_at', $colunas, true) && empty($dados['created_at'])) {
                            $dados['created_at'] = now();
                        }
                        $idNovo = DB::table($tabela)->insertGetId($dados);
                    }
                } else {
                    if (in_array('created_at', $colunas, true) && empty($dados['created_at'])) {
                        $dados['created_at'] = now();
                    }
                    $idNovo = DB::table($tabela)->insertGetId($dados);
                }

                $idsCriados[] = $idNovo;
                $registrosSincronizados[] = [
                    'id_local' => $registro['id'] ?? $registro['id_local'] ?? $registro['__rowid'] ?? null,
                    'uuid_local' => $registro['id_local'] ?? $registro['uuid'] ?? null,
                    'id_servidor' => $idNovo,
                    'arquivo_app' => $dados['arquivo_app'] ?? null,
                    'arquivo_servidor' => $dados['arquivo_servidor'] ?? null,
                ];
            }

            DB::table('sincronizacaos')->insert([
                'company_id' => $companyId,
                'user_id' => $usuario->id,
                'user_create' => $usuario->email ?? 'sistema@app',
                'tabela' => $tabela,
                'tipo' => 'upload',
                'data_sincronizacao' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => count($registros) . ' registros sincronizados',
                'ids_criados' => $idsCriados,
                'registros_sincronizados' => $registrosSincronizados,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('SyncController.upload', [
                'tabela' => $tabela, 'company_id' => $companyId,
                'user_id' => $usuario->id,
                'erro' => $e->getMessage(), 'linha' => $e->getLine(), 'arquivo' => $e->getFile(),
                'trace' => $e->getTraceAsString(),
            ]);
            $mensagem = $e instanceof \RuntimeException ? $e->getMessage() : 'Falha ao sincronizar. Tente novamente.';
            return response()->json(['status' => 'error', 'message' => $mensagem], 500);
        }
    }

    // ============================================================
    // DOWNLOAD (servidor -> mobile)
    // ============================================================
    public function download(string $tabela, Request $request): JsonResponse
    {
        if (!in_array($tabela, $this->tabelasPermitidas, true)) {
            return response()->json(['status' => 'error', 'message' => "Tabela '{$tabela}' nao permitida"], 403);
        }

        $usuario = Auth::user();
        $companyId = $this->resolveCompanyId($usuario, $request);
        if (!$companyId) {
            return response()->json(['status' => 'success', 'total' => 0, 'data' => []]);
        }

        $obrasPermitidas = $usuario->obrasForCompany($companyId)->pluck('obras.id')->all();
        $colunas = $this->colunasPermitidasExistentes($tabela);
        $select = empty($colunas) ? ['*'] : $colunas;

        $tabelasComObra = ['veiculos', 'veiculos_locacaos', 'veiculo_abastecimentos', 'veiculos_diario_bordo',
            'veiculo_horimetro', 'veiculo_quilometragems', 'veiculo_checklist_itens_servicos',
            'veiculo_checklist_itens_realizados', 'veiculo_preventivas_itens_realizadas'];

        try {
            $query = DB::table($tabela)->select($select);

            // Filtro de empresa
            if (Schema::hasColumn($tabela, 'company_id')) {
                $query->where('company_id', $companyId);
            }

            // Filtro por obra do usuario
            if (in_array($tabela, $tabelasComObra, true)) {
                if (Schema::hasColumn($tabela, 'obra_id')) {
                    $query->whereIn('obra_id', $obrasPermitidas);
                } elseif (Schema::hasColumn($tabela, 'id_obra')) {
                    $query->whereIn('id_obra', $obrasPermitidas);
                }
            }

            // Filtro especifico por tabela
            switch ($tabela) {
                case 'users':
                    $query->where('id', $usuario->id);
                    break;

                case 'obras':
                    $query->whereIn('id', $obrasPermitidas);
                    break;

                case 'veiculo_horimetro':
                case 'veiculo_quilometragems':
                    // Apenas o ULTIMO de cada veiculo (igual o engeativos2)
                    $sub = DB::table($tabela)
                        ->select(DB::raw('MAX(id) as id'))
                        ->where('company_id', $companyId)
                        ->whereIn('id_obra', $obrasPermitidas)
                        ->groupBy('veiculo_id');
                    $query->joinSub($sub, 'ultimos', fn ($j) => $j->on("{$tabela}.id", '=', 'ultimos.id'));
                    break;
            }

            // Soft-delete universal
            if (Schema::hasColumn($tabela, 'deleted_at')) {
                $query->whereNull("{$tabela}.deleted_at");
            }

            // Filtro incremental
            if ($request->filled('data_sincronizacao') && Schema::hasColumn($tabela, 'updated_at')) {
                $query->where('updated_at', '>', $request->get('data_sincronizacao'));
            }

            $dados = $query->get();

            DB::table('sincronizacaos')->insert([
                'company_id' => $companyId,
                'user_id' => $usuario->id,
                'user_create' => $usuario->email ?? 'sistema@app',
                'tabela' => $tabela,
                'tipo' => 'download',
                'data_sincronizacao' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'total' => $dados->count(),
                'data' => $dados->values()->all(),
            ]);
        } catch (\Throwable $e) {
            Log::error('SyncController.download', [
                'tabela' => $tabela, 'company_id' => $companyId,
                'user_id' => $usuario->id,
                'erro' => $e->getMessage(), 'linha' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['status' => 'error', 'message' => 'Falha ao buscar dados.'], 500);
        }
    }

    // ============================================================
    // Sincronizacao / log de erros
    // ============================================================
    public function registrarSync(Request $request): JsonResponse
    {
        $usuario = Auth::user();
        $companyId = $this->resolveCompanyId($usuario, $request);
        $data = $request->validate([
            'tabela' => 'required|string',
            'tipo' => 'required|in:upload,download',
            'user_create' => 'nullable|string',
        ]);

        DB::table('sincronizacaos')->insert([
            'company_id' => $companyId,
            'user_id' => $usuario->id,
            'user_create' => $data['user_create'] ?? $usuario->email,
            'tabela' => $data['tabela'],
            'tipo' => $data['tipo'],
            'data_sincronizacao' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json(['status' => 'success']);
    }

    public function registrarLogErro(Request $request): JsonResponse
    {
        $usuario = Auth::user();
        $companyId = $this->resolveCompanyId($usuario, $request);

        $logs = $request->input('logs', []);
        foreach ($logs as $log) {
            DB::table('sync_logs')->insert([
                'company_id' => $companyId,
                'user_id' => $usuario->id,
                'uuid' => $log['uuid'] ?? null,
                'tabela' => $log['tabela'] ?? null,
                'etapa' => $log['etapa'] ?? null,
                'id_local' => $log['id_local'] ?? null,
                'server_id' => $log['server_id'] ?? null,
                'mensagem' => $log['mensagem'] ?? null,
                'payload_resumido' => $log['payload_resumido'] ?? null,
                'stack_trace' => $log['stack_trace'] ?? null,
                'status_envio_log' => 'Recebido',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return response()->json(['status' => 'success', 'recebidos' => count($logs)]);
    }

    // ============================================================
    // Helpers
    // ============================================================
    protected function colunasPermitidasExistentes(string $tabela): array
    {
        if (!Schema::hasTable($tabela)) return [];
        $colunasReais = Schema::getColumnListing($tabela);
        $contrato = $this->colunasPermitidas[$tabela] ?? [];
        return array_values(array_intersect($contrato, $colunasReais));
    }

    protected function resolveCompanyId($usuario, Request $request): ?int
    {
        if ($id = (int) $request->header('X-Company-Id')) return $id;
        if ($id = (int) $request->input('company_id')) return $id;
        return (int) $usuario->companies()->value('companies.id') ?: null;
    }

    protected function salvarArquivo(?string $arquivoUri, string $tabela, string $prefixo): ?array
    {
        if (empty($arquivoUri)) return null;

        $conteudo = null;
        $extensao = 'bin';

        if (preg_match('/^data:(.*?);base64,/', $arquivoUri, $m)) {
            $mime = $m[1];
            $conteudo = base64_decode(substr($arquivoUri, strpos($arquivoUri, ',') + 1));
            if (str_contains($mime, 'image/')) $extensao = explode('/', $mime)[1] ?: 'jpg';
            elseif ($mime === 'application/pdf') $extensao = 'pdf';
        } elseif (str_starts_with($arquivoUri, 'http')) {
            // ja eh URL — passar adiante
            return ['nome' => basename(parse_url($arquivoUri, PHP_URL_PATH) ?? ''), 'url' => $arquivoUri];
        }

        if (!$conteudo) return null;
        if (strlen($conteudo) > 10 * 1024 * 1024) {
            throw new \RuntimeException("Arquivo excede 10 MB em {$tabela}");
        }

        $nome = uniqid($prefixo . '_', true) . ".{$extensao}";
        $caminho = "uploads/aplicativo/{$tabela}/{$nome}";
        Storage::disk('public')->put($caminho, $conteudo);
        return ['nome' => $nome, 'url' => url("storage/{$caminho}")];
    }
}
