<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Funcionario;
use App\Models\FuncionarioFuncao;
use App\Models\FuncionarioSetor;
use App\Models\Obra;
use App\Models\Company;
use App\Models\Module;
use App\Models\User;
use App\Models\ModulePermission;
use App\Http\Requests\Admin\StoreFuncionarioRequest;
use App\Http\Requests\Admin\UpdateFuncionarioRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Throwable;
use App\Models\AnexoFuncionario;
use App\Models\AnexoFuncionarioHistorico;
use App\Helpers\FileUploadHelper;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Services\Funcionario\FichaRegistroExtractor;

class FuncionarioController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Funcionario::with(['obra', 'funcao', 'setor']);

            if ($search = $request->input('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('nome', 'like', "%{$search}%")
                        ->orWhere('cpf', 'like', "%{$search}%")
                        ->orWhere('matricula', 'like', "%{$search}%");
                });
            }

            // Status: padrão "Ativo"; "Todos" = sem filtro de status.
            $status = $request->input('status', 'Ativo');
            if ($status !== 'Todos') {
                $query->where('status', $status);
            }

            if ($companyId = $request->input('company_id')) {
                $query->where('company_id', $companyId);
            }

            $perPage = (int) $request->input('per_page', 20);
            if (! in_array($perPage, [20, 25, 50, 100], true)) {
                $perPage = 20;
            }

            $funcionarios = $query
                ->orderBy('nome')
                ->paginate($perPage)
                ->withQueryString();

            $companies = Company::orderBy('name')->get();

            return Inertia::render('Admin/Funcionarios/Index', [
                'funcionarios' => $funcionarios,
                'companies'    => $companies,
                'filters'      => array_merge(
                    $request->only(['q', 'company_id', 'per_page']),
                    ['status' => $status]
                ),
                'can'          => $this->abilitiesForCurrentUser('funcionarios'),
            ]);
            
        } catch (Throwable $e) {
            Log::error('Erro ao listar funcionarios', [
                'msg' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->withErrors(['error' => 'Falha ao listar funcionários.']);
        }
    }

    public function revisaoOnedrive()
    {
        try {
            $funcionarios = Funcionario::with(['obra', 'funcao', 'setor'])
                ->where('status', 'Ativo')
                ->orderBy('nome')
                ->paginate(50);

            return Inertia::render('Admin/Funcionarios/RevisaoOneDrive', [
                'funcionarios' => $funcionarios
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao listar funcionarios para Revisao OneDrive', [
                'msg' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao abrir tela de revisão.']);
        }
    }

    public function show(Funcionario $funcionario)
    {
        try {
            $funcionario->load(['obra', 'funcao', 'setor']);
            
            // Tenta achar o usuário vinculado
            $pivot = DB::table('user_funcionario')->where('funcionario_id', $funcionario->id)->first();
            $linkedUser = $pivot ? User::find($pivot->user_id) : null;

            // ---------------------------------------------------------
            // CARREGAMENTO DE ANEXOS E QUALIFICACOES (LEGADO)
            // ---------------------------------------------------------
            $anexos_funcionarios = DB::table('anexos_funcionarios')
                ->where('id_funcionario', $funcionario->id)
                ->where('id_qualificacao', 0)
                ->get();

            $subquery = DB::table('anexos_funcionarios as af1')
                ->select('af1.*')
                ->join(DB::raw('(
                SELECT MAX(id) as max_id
                FROM anexos_funcionarios
                WHERE id_funcionario = ' . $funcionario->id . '
                GROUP BY id_funcionario, id_qualificacao
            ) as ultimos'), 'af1.id', '=', 'ultimos.max_id');

            $qualificacao_funcoes = DB::table('funcionarios_qualificacoes')
                ->leftJoinSub($subquery, 'anexos_funcionarios', function ($join) {
                    $join->on('anexos_funcionarios.id_qualificacao', '=', 'funcionarios_qualificacoes.id_qualificacao')
                        ->on('anexos_funcionarios.id_funcionario', '=', 'funcionarios_qualificacoes.id_funcionario');
                })
                ->leftJoin('funcionarios_funcao_qualificacoes', 'funcionarios_funcao_qualificacoes.id', '=', 'funcionarios_qualificacoes.id_qualificacao')
                ->leftJoin('funcionarios_docs', 'funcionarios_docs.id', '=', 'funcionarios_funcao_qualificacoes.id_documento')
                ->where('funcionarios_qualificacoes.id_funcionario', $funcionario->id)
                ->where('funcionarios_qualificacoes.id_qualificacao', '!=', 0)
                ->select(
                    'funcionarios_qualificacoes.*',
                    'anexos_funcionarios.arquivo as arquivo_anexo',
                    'anexos_funcionarios.id as id_anexo',
                    'anexos_funcionarios.nome_arquivo',
                    'anexos_funcionarios.data_conclusao',
                    'anexos_funcionarios.data_validade_doc',
                    'anexos_funcionarios.situacao_doc',
                    'anexos_funcionarios.usuario_cad',
                    'anexos_funcionarios.user_edit',
                    'anexos_funcionarios.usuario_aprov',
                    'anexos_funcionarios.usuario_reprov',
                    DB::raw('DATEDIFF(anexos_funcionarios.data_validade_doc, CURDATE()) as dias_restantes'),
                    'funcionarios_docs.documento as documento_nome',
                    'funcionarios_funcao_qualificacoes.tempo_validade as regra_validade'
                )
                ->get();

            $funcionario->setAttribute('anexos_funcionarios', $anexos_funcionarios);
            $funcionario->setAttribute('qualificacao_funcoes', $qualificacao_funcoes);
            // Flag derivada — não vaza o hash da senha_retirada (que está em $hidden)
            $funcionario->setAttribute('tem_senha_retirada', !empty($funcionario->senha_retirada));

            // EPIs em posse (NR-6): derivado das SAÍDAs de EPI feitas por este
            // funcionário, descontando o que já foi devolvido.
            $funcionario->setAttribute('epi_retirados', $this->episEmPosse($funcionario->id));

            return Inertia::render('Admin/Funcionarios/Show', [
                'funcionario' => $funcionario,
                'linkedUser'  => $linkedUser,
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao exibir funcionario', [
                'msg' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao exibir funcionário.']);
        }
    }

    /**
     * EPIs em posse do funcionário (NR-6): SAÍDAs de EPI autenticadas por ele,
     * descontando devoluções. Fonte da verdade = movimentações.
     */
    private function episEmPosse(int $funcionarioId): \Illuminate\Support\Collection
    {
        try {
            return \App\Models\Estoque\Movimentacao::query()
                ->where('tipo', \App\Models\Estoque\Movimentacao::TIPO_SAIDA)
                ->where('retirante_funcionario_id', $funcionarioId)
                ->whereHas('produto', fn ($q) => $q->whereIn('tipo_item', \App\Models\Estoque\Produto::TIPOS_COM_LOTE))
                ->with([
                    'produto:id,sku,nome,unidade,tipo_item',
                    'variante:id,cor,tamanho',
                    'lote:id,numero_ca,numero_lote,validade',
                    'obra:id,codigo_obra,nome_fantasia',
                ])
                ->withSum('devolucoesFeitas as devolvido', 'quantidade')
                ->orderByDesc('data_movimento')
                ->get()
                ->map(function ($m) {
                    return [
                        'id'          => $m->id,
                        'data'        => optional($m->data_movimento)->format('Y-m-d'),
                        'produto'     => $m->produto?->nome,
                        'sku'         => $m->produto?->sku,
                        'unidade'     => $m->produto?->unidade,
                        'tipo_item'   => $m->produto?->tipo_item,
                        'variacao'    => collect([$m->variante?->cor, $m->variante?->tamanho])->filter()->implode(' · ') ?: null,
                        'numero_ca'   => $m->lote?->numero_ca,
                        'numero_lote' => $m->lote?->numero_lote,
                        'validade'    => optional($m->lote?->validade)->format('Y-m-d'),
                        'obra'        => $m->obra ? ($m->obra->codigo_obra . ' — ' . $m->obra->nome_fantasia) : null,
                        'quantidade'  => (float) $m->quantidade,
                        'devolvido'   => (float) ($m->devolvido ?? 0),
                        'em_posse'    => (float) $m->quantidade - (float) ($m->devolvido ?? 0),
                        'metodo'      => $this->metodoValidacaoLabel($m->validacao_method),
                        'validado_em' => optional($m->validado_em)->format('d/m/Y H:i'),
                    ];
                })
                ->filter(fn ($x) => $x['em_posse'] > 0.0001)
                ->values();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    /** Rótulo legível do método de validação da retirada. */
    private function metodoValidacaoLabel(?string $metodo): ?string
    {
        return match ($metodo) {
            'SENHA_FUNC'     => 'Senha pessoal do funcionário',
            'SENHA'          => 'Senha do usuário do sistema',
            'BIOMETRIA_FUNC' => 'Biometria do funcionário',
            'BIOMETRIA'      => 'Biometria (WebAuthn)',
            default          => $metodo,
        };
    }

    /**
     * Tela de EMISSÃO da ficha de EPI (NR-6): preview dos EPIs em posse +
     * coleta da assinatura do funcionário. GET .../{funcionario}/ficha-epi
     */
    public function fichaEpi(Funcionario $funcionario)
    {
        $funcionario->load(['obra:id,codigo_obra,nome_fantasia', 'funcao:id,funcao']);

        return view('funcionarios.ficha-epi-emitir', [
            'funcionario' => $funcionario,
            'epis'        => $this->episEmPosse($funcionario->id),
            'empresa'     => \App\Helpers\CompanyContext::current(),
            'operador'    => Auth::user(),
        ]);
    }

    /**
     * GERA a ficha: monta o snapshot imutável, calcula o hash de integridade,
     * grava a assinatura e cria o registro verificável. POST .../ficha-epi
     */
    public function gerarFichaEpi(Request $request, Funcionario $funcionario)
    {
        $data = $request->validate([
            'assinatura'      => ['nullable', 'string', 'max:500000'], // data URL PNG
            'assinatura_tipo' => ['nullable', 'string', 'max:30'],
        ]);

        $funcionario->load(['obra:id,codigo_obra,nome_fantasia', 'funcao:id,funcao']);
        $empresa = \App\Helpers\CompanyContext::current();

        $epis = $this->episEmPosse($funcionario->id)->map(function ($e) {
            return [
                'data'        => $e['data'] ? \Illuminate\Support\Carbon::parse($e['data'])->format('d/m/Y') : '—',
                'produto'     => $e['produto'],
                'sku'         => $e['sku'],
                'unidade'     => $e['unidade'],
                'variacao'    => $e['variacao'],
                'numero_ca'   => $e['numero_ca'],
                'numero_lote' => $e['numero_lote'],
                'validade'    => $e['validade'] ? \Illuminate\Support\Carbon::parse($e['validade'])->format('d/m/Y') : null,
                'obra'        => $e['obra'],
                'em_posse'    => $e['em_posse'],
                'metodo'      => $e['metodo'],
                'validado_em' => $e['validado_em'],
            ];
        })->values()->all();

        $conteudo = [
            'versao'      => 1,
            'funcionario' => [
                'id'        => $funcionario->id,
                'nome'      => $funcionario->nome,
                'matricula' => $funcionario->matricula,
                'cpf'       => $funcionario->cpf,
                'funcao'    => $funcionario->funcao?->funcao,
                'obra'      => $funcionario->obra ? ($funcionario->obra->codigo_obra . ' — ' . $funcionario->obra->nome_fantasia) : null,
            ],
            'empresa'     => $empresa?->name,
            'emitida_em'  => now()->format('d/m/Y H:i:s'),
            'emitida_por' => Auth::user()?->email,
            'epis'        => $epis,
        ];

        // JSON canônico (string crua) — é o que será hasheado e re-hasheado na verificação.
        $canonical = json_encode($conteudo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hash      = hash_hmac('sha256', $canonical, config('app.key'));

        $temAssinatura = !empty($data['assinatura']) && str_starts_with($data['assinatura'], 'data:image');

        $ficha = \App\Models\Estoque\EpiFicha::create([
            'company_id'      => $empresa?->id,
            'funcionario_id'  => $funcionario->id,
            'codigo'          => bin2hex(random_bytes(16)),
            'hash'            => $hash,
            'conteudo'        => $canonical,
            'assinatura'      => $temAssinatura ? $data['assinatura'] : null,
            'assinatura_tipo' => $temAssinatura ? 'manuscrita_digital' : 'impressa',
            'emitida_por'     => Auth::user()?->email,
        ]);

        return redirect()->route('ficha-epi.verificar', $ficha->codigo);
    }

    /**
     * Documento final / verificação: renderiza o SNAPSHOT gravado, confere a
     * integridade (hash) e mostra QR + assinatura + método. GET verificar-ficha-epi/{codigo}
     */
    public function verificarFichaEpi(string $codigo)
    {
        $ficha  = \App\Models\Estoque\EpiFicha::where('codigo', $codigo)->firstOrFail();
        $integro = $ficha->estaIntegra();

        // QR apontando para a verificação PÚBLICA (fiscal escaneia sem login)
        $url = route('ficha-epi.verificar', $codigo);
        $qrSvg = null;
        try {
            $renderer = new \BaconQrCode\Renderer\ImageRenderer(
                new \BaconQrCode\Renderer\RendererStyle\RendererStyle(140, 1),
                new \BaconQrCode\Renderer\Image\SvgImageBackEnd()
            );
            $qrSvg = (new \BaconQrCode\Writer($renderer))->writeString($url);
        } catch (\Throwable $e) {
            $qrSvg = null;
        }

        return view('funcionarios.ficha-epi', [
            'ficha'   => $ficha,
            'dados'   => $ficha->dados,
            'integro' => $integro,
            'qrSvg'   => $qrSvg,
            'url'     => $url,
        ]);
    }

    public function create()
    {
        try {
            $companies = Company::orderBy('name')->get();
            $obras = Obra::orderBy('nome_fantasia')->get();
            $funcoes = FuncionarioFuncao::orderBy('funcao')->get();
            $setores = FuncionarioSetor::orderBy('nome_setor')->get();

            $modules = Module::query()->active()->orderBy('ordem')->orderBy('name')->get();
            // Agrupa por parent_id (canônico, usado pelo sidebar)
            $groupedModules = $modules->groupBy(function ($module) {
                return $module->parent_id ?: $module->id;
            });

            return Inertia::render('Admin/Funcionarios/Create', [
                'companies' => $companies,
                'obras' => $obras,
                'funcoes' => $funcoes,
                'setores' => $setores,
                'groupedModules' => $groupedModules,
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao carregar formulario create funcionario', [
                'msg' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao carregar formulário.']);
        }
    }

    /**
     * Lê uma "Ficha de Registro de Empregado" (PDF digital ou foto/scan) e
     * devolve os campos do cadastro em JSON, para PRÉ-PREENCHER o formulário
     * de create()/edit(). Nada é gravado: o usuário confere e confirma no
     * botão Salvar normal. Sem IA — usa pdfparser (PDF) ou Tesseract (imagem).
     */
    public function extrairDocumento(Request $request, FichaRegistroExtractor $extractor)
    {
        // Quem pode importar é quem pode cadastrar OU editar funcionário.
        $abilities = $this->abilitiesForCurrentUser('funcionarios');
        if (! $abilities['create'] && ! $abilities['edit']) {
            return response()->json([
                'ok'      => false,
                'message' => 'Você não tem permissão para importar dados de funcionário.',
            ], 403);
        }

        // OCR/rasterização podem consumir tempo e memória; dá folga ao PHP do Apache
        // (php.ini do WAMP costuma ser 128M / 120s).
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);

        $maxKb = (int) config('funcionario_import.max_file_mb', 20) * 1024;

        $request->validate([
            'arquivo' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', "max:{$maxKb}"],
        ], [
            'arquivo.required' => 'Selecione um arquivo (PDF ou imagem).',
            'arquivo.mimes'    => 'Formato inválido. Aceitos: PDF, JPG, PNG ou WEBP.',
            'arquivo.max'      => "O arquivo excede o limite de {$maxKb} KB.",
        ]);

        try {
            $t0 = microtime(true);
            $resultado = $extractor->extrair($request->file('arquivo'));
            Log::info('func_import.extraido', [
                'ok'    => $resultado['ok'] ?? null,
                'fonte' => $resultado['fonte'] ?? null,
                'ms'    => (int) round((microtime(true) - $t0) * 1000),
            ]);

            return response()->json($resultado);
        } catch (Throwable $e) {
            Log::error('Erro ao extrair documento do funcionario', [
                'msg'   => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'ok'      => false,
                'message' => 'Falha ao processar o documento. Tente outro arquivo.',
            ], 422);
        }
    }

    /**
     * Recebe o TEXTO já reconhecido no navegador (PDF.js + Tesseract.js) e roda
     * apenas o parse/avaliação — dispensa rasterizador/OCR no servidor.
     */
    public function extrairTexto(Request $request, FichaRegistroExtractor $extractor)
    {
        $abilities = $this->abilitiesForCurrentUser('funcionarios');
        if (! $abilities['create'] && ! $abilities['edit']) {
            return response()->json([
                'ok'      => false,
                'message' => 'Você não tem permissão para importar dados de funcionário.',
            ], 403);
        }

        $data = $request->validate([
            'texto'     => ['required', 'string', 'max:300000'],
            'fonte'     => ['nullable', 'string', 'in:ocr,pdf_texto'],
            'confianca' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ], [
            'texto.required' => 'Não foi possível extrair texto do documento.',
        ]);

        try {
            $resultado = $extractor->extrairDeTexto(
                $data['texto'],
                $data['fonte'] ?? 'ocr',
                isset($data['confianca']) ? (float) $data['confianca'] : null
            );
            Log::info('func_import.extraido_texto', [
                'ok'    => $resultado['ok'] ?? null,
                'fonte' => $resultado['fonte'] ?? null,
                'len'   => mb_strlen($data['texto']),
            ]);
            return response()->json($resultado);
        } catch (Throwable $e) {
            Log::error('Erro ao extrair texto do funcionario', ['msg' => $e->getMessage()]);
            return response()->json([
                'ok'      => false,
                'message' => 'Falha ao interpretar o texto do documento.',
            ], 422);
        }
    }

    public function store(StoreFuncionarioRequest $request)
    {
        try {
            DB::beginTransaction();
            $data = $request->validated();
            
            $companyId = $data['companies'][0] ?? null;
            $data['company_id'] = $companyId;

            $funcionario = Funcionario::create($data);

            if ($request->boolean('create_user') && !empty($data['user_email'])) {
                $user = User::create([
                    'name' => $data['nome'],
                    'email' => $data['user_email'],
                    'password' => Hash::make($data['user_password']),
                    'type' => $data['user_type'] ?? 'user',
                    'is_active' => true,
                ]);

                if ($companyId) {
                    $user->companies()->sync([$companyId => ['role' => 'user']]);
                    DB::table('user_funcionario')->insert([
                        'user_id' => $user->id,
                        'funcionario_id' => $funcionario->id,
                        'company_id' => $companyId
                    ]);
                }

                app(\App\Http\Controllers\Admin\UserController::class)->syncModulePermissionsFromRequest($request, $user);
            }

            DB::commit();
            return redirect()->route('admin.funcionarios.index')->with('success', 'Funcionário cadastrado com sucesso.');
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Erro ao cadastrar funcionario', [
                'dados' => $request->all(),
                'msg' => $e->getMessage(),
            ]);
            return back()->withInput()->withErrors(['error' => 'Falha ao cadastrar funcionário: ' . $e->getMessage()]);
        }
    }

    public function edit(Funcionario $funcionario)
    {
        try {
            $companies = Company::orderBy('name')->get();
            $obras = Obra::orderBy('nome_fantasia')->get();
            $funcoes = FuncionarioFuncao::orderBy('funcao')->get();
            $setores = FuncionarioSetor::orderBy('nome_setor')->get();
            $selectedCompanies = [$funcionario->company_id];

            $modules = Module::query()->active()->orderBy('ordem')->orderBy('name')->get();
            // Agrupa por parent_id (canônico, usado pelo sidebar)
            $groupedModules = $modules->groupBy(function ($module) {
                return $module->parent_id ?: $module->id;
            });

            // Tenta achar o usuário vinculado
            $pivot = DB::table('user_funcionario')->where('funcionario_id', $funcionario->id)->first();
            $linkedUser = $pivot ? User::find($pivot->user_id) : null;
            $modulePermissions = $linkedUser ? ModulePermission::where('user_id', $linkedUser->id)->get()->keyBy('module_id') : [];

            // ---------------------------------------------------------
            // CARREGAMENTO DE ANEXOS E QUALIFICACOES (LEGADO)
            // ---------------------------------------------------------
            $anexos_funcionarios = DB::table('anexos_funcionarios')
                ->where('id_funcionario', $funcionario->id)
                ->where('id_qualificacao', 0)
                ->get();

            $subquery = DB::table('anexos_funcionarios as af1')
                ->select('af1.*')
                ->join(DB::raw('(
                SELECT MAX(id) as max_id
                FROM anexos_funcionarios
                WHERE id_funcionario = ' . $funcionario->id . '
                GROUP BY id_funcionario, id_qualificacao
            ) as ultimos'), 'af1.id', '=', 'ultimos.max_id');

            $qualificacao_funcoes = DB::table('funcionarios_qualificacoes')
                ->leftJoinSub($subquery, 'anexos_funcionarios', function ($join) {
                    $join->on('anexos_funcionarios.id_qualificacao', '=', 'funcionarios_qualificacoes.id_qualificacao')
                        ->on('anexos_funcionarios.id_funcionario', '=', 'funcionarios_qualificacoes.id_funcionario');
                })
                ->leftJoin('funcionarios_funcao_qualificacoes', 'funcionarios_funcao_qualificacoes.id', '=', 'funcionarios_qualificacoes.id_qualificacao')
                ->leftJoin('funcionarios_docs', 'funcionarios_docs.id', '=', 'funcionarios_funcao_qualificacoes.id_documento')
                ->where('funcionarios_qualificacoes.id_funcionario', $funcionario->id)
                ->where('funcionarios_qualificacoes.id_qualificacao', '!=', 0)
                ->select(
                    'funcionarios_qualificacoes.*',
                    'anexos_funcionarios.arquivo as arquivo_anexo',
                    'anexos_funcionarios.id as id_anexo',
                    'anexos_funcionarios.nome_arquivo',
                    'anexos_funcionarios.data_conclusao',
                    'anexos_funcionarios.data_validade_doc',
                    'anexos_funcionarios.situacao_doc',
                    'anexos_funcionarios.usuario_cad',
                    'anexos_funcionarios.user_edit',
                    'anexos_funcionarios.usuario_aprov',
                    'anexos_funcionarios.usuario_reprov',
                    DB::raw('DATEDIFF(anexos_funcionarios.data_validade_doc, CURDATE()) as dias_restantes'),
                    'funcionarios_docs.documento as documento_nome',
                    'funcionarios_funcao_qualificacoes.tempo_validade as regra_validade'
                )
                ->get();

            $funcionario->setAttribute('anexos_funcionarios', $anexos_funcionarios);
            $funcionario->setAttribute('qualificacao_funcoes', $qualificacao_funcoes);

            return Inertia::render('Admin/Funcionarios/Edit', [
                'funcionario' => $funcionario,
                'companies' => $companies,
                'selectedCompanies' => $selectedCompanies,
                'obras' => $obras,
                'funcoes' => $funcoes,
                'setores' => $setores,
                'groupedModules' => $groupedModules,
                'linkedUser' => $linkedUser,
                'modulePermissions' => $modulePermissions,
            ]);
        } catch (Throwable $e) {
            Log::error('Erro ao carregar formulario edit funcionario', [
                'msg' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao carregar formulário de edição.']);
        }
    }

    public function update(UpdateFuncionarioRequest $request, Funcionario $funcionario)
    {
        try {
            DB::beginTransaction();
            $data = $request->validated();
            
            $companyId = $data['companies'][0] ?? null;
            if ($companyId) {
                $data['company_id'] = $companyId;
            }

            $funcionario->update($data);

            $pivot = DB::table('user_funcionario')->where('funcionario_id', $funcionario->id)->first();
            $user = $pivot ? User::find($pivot->user_id) : null;

            if ($request->boolean('create_user') && !empty($data['user_email'])) {
                if (!$user) {
                    $user = User::create([
                        'name' => $data['nome'],
                        'email' => $data['user_email'],
                        'password' => Hash::make($data['user_password'] ?? '12345678'),
                        'type' => $data['user_type'] ?? 'user',
                        'is_active' => true,
                    ]);
                    if ($companyId) {
                        $user->companies()->sync([$companyId => ['role' => 'user']]);
                        DB::table('user_funcionario')->insert([
                            'user_id' => $user->id,
                            'funcionario_id' => $funcionario->id,
                            'company_id' => $companyId
                        ]);
                    }
                } else {
                    $userData = ['email' => $data['user_email'], 'type' => $data['user_type'] ?? 'user'];
                    if (!empty($data['user_password'])) {
                        $userData['password'] = Hash::make($data['user_password']);
                    }
                    $user->update($userData);
                }

                app(\App\Http\Controllers\Admin\UserController::class)->syncModulePermissionsFromRequest($request, $user);
            } elseif ($user && !$request->boolean('create_user')) {
                // Se desmarcou criar usuario, talvez deletar ou apenas revogar acessos? Vamos remover o vinculo
                DB::table('user_funcionario')->where('funcionario_id', $funcionario->id)->delete();
                // Opcional: deletar o user tbm? $user->delete();
            }

            DB::commit();
            return redirect()->route('admin.funcionarios.index')->with('success', 'Funcionário atualizado com sucesso.');
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Erro ao atualizar funcionario', [
                'dados' => $request->all(),
                'msg' => $e->getMessage(),
            ]);
            return back()->withInput()->withErrors(['error' => 'Falha ao atualizar funcionário.']);
        }
    }

    public function destroy(Funcionario $funcionario)
    {
        try {
            // Defesa em profundidade: o middleware module.access já bloqueia,
            // mas reforçamos no controller caso alguém chame por outra via.
            $abilities = $this->abilitiesForCurrentUser('funcionarios');
            if (! $abilities['delete']) {
                abort(403, 'Você não tem permissão para excluir funcionários.');
            }

            $funcionario->delete();
            return redirect()->route('admin.funcionarios.index')->with('success', 'Funcionário removido com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao remover funcionario', ['msg' => $e->getMessage()]);
            return back()->withErrors(['error' => 'Falha ao remover funcionário.']);
        }
    }

    /**
     * Salva uma imagem editada (PNG em base64) como foto do funcionário.
     * Origem: editor de crachá (Fabric.js canvas exportado).
     * Destino: public/uploads/usuarios/{id}/foto.png + coluna imagem_usuario.
     */
    public function salvarFotoPerfil(Request $request, Funcionario $funcionario)
    {
        try {
            $request->validate([
                'image' => 'required|string',  // data URL: data:image/png;base64,...
            ]);

            $abilities = $this->abilitiesForCurrentUser('funcionarios');
            if (! $abilities['edit']) {
                abort(403, 'Sem permissão para alterar fotos de funcionário.');
            }

            $dataUrl = $request->input('image');

            // Aceita 'data:image/png;base64,XXX' ou já apenas o base64
            if (preg_match('/^data:image\/(png|jpe?g|webp);base64,(.+)$/i', $dataUrl, $matches)) {
                $ext     = strtolower($matches[1]) === 'jpg' ? 'jpeg' : strtolower($matches[1]);
                $payload = $matches[2];
            } else {
                $ext     = 'png';
                $payload = $dataUrl;
            }

            $binary = base64_decode($payload, true);
            if ($binary === false) {
                return back()->withErrors(['error' => 'Imagem em formato inválido.']);
            }

            // Limita ~5 MB para evitar abuso
            if (strlen($binary) > 5 * 1024 * 1024) {
                return back()->withErrors(['error' => 'Imagem maior que 5 MB.']);
            }

            $filename  = 'foto.' . $ext;
            $relPath   = "uploads/usuarios/{$funcionario->id}/{$filename}";
            $publicDir = public_path("uploads/usuarios/{$funcionario->id}");

            if (! is_dir($publicDir)) {
                mkdir($publicDir, 0775, true);
            }

            file_put_contents(public_path($relPath), $binary);

            $funcionario->update(['imagem_usuario' => $relPath]);

            return back()->with('success', 'Foto do funcionário atualizada com sucesso.');
        } catch (Throwable $e) {
            Log::error('Erro ao salvar foto do funcionario', [
                'funcionario_id' => $funcionario->id,
                'msg' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao salvar foto: ' . $e->getMessage()]);
        }
    }

    /**
     * Retorna abilidades CRUD do usuário logado para o módulo informado.
     * super_admin sempre pode tudo. Outros usuários consultam module_permissions
     * na empresa atual.
     */
    protected function abilitiesForCurrentUser(string $moduleSlug): array
    {
        $user      = Auth::user();
        $companyId = \App\Helpers\CompanyContext::id();

        $defaults = ['list' => false, 'view' => false, 'create' => false, 'edit' => false, 'delete' => false];

        if (! $user) {
            return $defaults;
        }

        if ($user->type === 'super_admin') {
            return array_fill_keys(array_keys($defaults), true);
        }

        if (! $companyId) {
            return $defaults;
        }

        $abilities = $defaults;
        foreach (array_keys($defaults) as $ability) {
            $abilities[$ability] = $user->hasModulePermission($companyId, $moduleSlug, $ability);
        }

        return $abilities;
    }

    public function adicionarAnexos(Request $request)
    {
        if (!$request->hasFile('file')) {
            return back()->withErrors(['error' => 'Selecione ao menos um arquivo.']);
        }

        $files = $request->file("file");
        $id_funcionario = $request->id_funcionario_anexo;
        $usuario_logado = Auth::user()->email ?? 'Sistema';
        $dataHoraAtual = Carbon::now();

        $funcionario = Funcionario::find($id_funcionario);

        try {
            DB::beginTransaction();

            foreach ($files as $key => $file) {
                $nome_documento = $request->nome_qualificacao[$key] ?? $file->getClientOriginalName();
                $data_conclusao = $request->data_conclusao[$key] ?? $dataHoraAtual->format('Y-m-d');
                $data_validade = $request->data_validade_doc[$key] ?? null;

                $situacao_doc = 1; // Pendente
                $usuario_aprov = null;
                $data_aprovacao = null;

                if (isset($request->situacao_doc[$key])) {
                    $situacao_doc = $request->situacao_doc[$key];
                    if ($situacao_doc == 2) { 
                        $data_aprovacao = $dataHoraAtual;
                        $usuario_aprov = $usuario_logado;
                    }
                }

                $anexo = new AnexoFuncionario([
                    'id_funcionario'    => $id_funcionario,
                    'id_qualificacao'   => 0, // Documento Avulso
                    'id_funcao'         => $funcionario->id_funcao ?? 0,
                    'usuario_cad'       => $usuario_logado,
                    'usuario_aprov'     => $usuario_aprov,
                    'arquivo'           => $file->getClientOriginalName(),
                    'nome_arquivo'      => $file->getClientOriginalName(),
                    'data_conclusao'    => $data_conclusao,
                    'data_validade_doc' => $data_validade,
                    'data_aprovacao'    => $data_aprovacao,
                    'situacao_doc'      => $situacao_doc,
                ]);

                $anexo->save();

                // 2. Upload Físico (Disk Public)
                $file->storeAs("public/uploads/usuarios/{$id_funcionario}", $file->getClientOriginalName());
                
                // OneDrive Upload (Assíncrono ou imediato, usando FileUploadHelper se configurado)
                try {
                    $folderName = (string) $id_funcionario;
                    FileUploadHelper::uploadFilesToFolder($folderName, $file, 'usuarios');
                } catch (\Exception $e) {
                    Log::error('Erro ao enviar para OneDrive', ['msg' => $e->getMessage()]);
                }
            }
            DB::commit();
            return back()->with('success', count($files) . ' arquivo(s) adicionado(s) com sucesso!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erro ao adicionar anexos', ['msg' => $e->getMessage()]);
            return back()->withErrors(['error' => 'Falha ao adicionar arquivos.']);
        }
    }

    public function anexos(Request $request, $id)
    {
        $request->validate([
            'id_qualificacao' => 'required',
            'file' => 'required|file',
        ]);

        $file = $request->file('file');
        $id_qualificacao = $request->id_qualificacao;
        $usuario_logado = Auth::user()->email ?? 'Sistema';
        $funcionario = Funcionario::findOrFail($id);

        try {
            DB::beginTransaction();

            $data_conclusao = $request->data_conclusao ?: Carbon::now()->format('Y-m-d');
            $data_validade = null;

            if ($request->filled('tempo_validade') && $request->tempo_validade > 0) {
                $data_validade = Carbon::parse($data_conclusao)->addMonths($request->tempo_validade)->format('Y-m-d');
            }

            $anexo = new AnexoFuncionario([
                'id_funcionario'    => $id,
                'id_qualificacao'   => $id_qualificacao,
                'id_funcao'         => $funcionario->id_funcao ?? 0,
                'usuario_cad'       => $usuario_logado,
                'arquivo'           => $file->getClientOriginalName(),
                'nome_arquivo'      => $file->getClientOriginalName(),
                'data_conclusao'    => $data_conclusao,
                'data_validade_doc' => $data_validade,
                'situacao_doc'      => 1, // Pendente
            ]);

            $anexo->save();

            $file->storeAs("public/uploads/usuarios/{$id}", $file->getClientOriginalName());
            
            try {
                $folderName = (string) $id;
                FileUploadHelper::uploadFilesToFolder($folderName, $file, 'usuarios');
            } catch (\Exception $e) {
                Log::error('Erro ao enviar documento obrigatorio para OneDrive', ['msg' => $e->getMessage()]);
            }

            DB::commit();
            return back()->with('success', 'Documento anexado com sucesso!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erro ao anexar documento obrigatorio', ['msg' => $e->getMessage()]);
            return back()->withErrors(['error' => 'Falha ao anexar documento.']);
        }
    }

    public function aprovarDocumentos(Request $request, $anexoId)
    {
        $request->validate([
            'selectValue'      => 'required|in:1,2,18',  
            'motivoReprovacao' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $anexo = AnexoFuncionario::findOrFail($anexoId);
            $userMail = Auth::user()->email ?? 'Sistema';
            $now = Carbon::now();

            switch ((int) $request->selectValue) {
                case 2: // Aprovado
                    $anexo->update([
                        'situacao_doc'  => 2,
                        'usuario_aprov' => $userMail,
                        'ativo'         => 'yes',
                    ]);
                    break;
                case 18: // Reprovado
                    $anexo->update([
                        'situacao_doc'   => 18,
                        'usuario_reprov' => $userMail,
                    ]);

                    if ($motivo = $request->motivoReprovacao) {
                        AnexoFuncionarioHistorico::create([
                            'id_anexo'          => $anexo->id,
                            'id_funcionario'    => $anexo->id_funcionario,
                            'id_qualificacao'   => $anexo->id_qualificacao,
                            'user_create'       => $userMail,
                            'historico'         => sprintf(
                                    "[%s] Usuário: %s - Motivo: %s",
                                    $now->format('d/m/Y H:i'),
                                    $userMail,
                                    $motivo
                            ),
                        ]);
                    }
                    break;
                case 1: // Voltar para pendente
                    $anexo->update([
                        'situacao_doc' => 1,
                        'usuario_aprov' => null,
                        'usuario_reprov' => null,
                    ]);
                    break;
            }

            DB::commit();
            return back()->with('success', 'Status do documento alterado com sucesso!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erro ao aprovar/reprovar documento', ['msg' => $e->getMessage()]);
            return back()->withErrors(['error' => 'Falha ao processar a aprovação.']);
        }
    }

    public function excluirDocumento($anexoId)
    {
        try {
            $anexo = AnexoFuncionario::findOrFail($anexoId);
            $anexo->delete();
            return back()->with('success', 'Documento removido com sucesso!');
        } catch (\Exception $e) {
            Log::error('Erro ao excluir documento', ['msg' => $e->getMessage()]);
            return back()->withErrors(['error' => 'Falha ao excluir o documento.']);
        }
    }
}
