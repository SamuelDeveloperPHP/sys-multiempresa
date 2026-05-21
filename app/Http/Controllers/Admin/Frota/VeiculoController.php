<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Helpers\FileUploadHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Frota\StoreVeiculoRequest;
use App\Http\Requests\Admin\Frota\UpdateVeiculoRequest;
use App\Services\Frota\CalculadorCiclosPreventiva;
use App\Models\Frota\MarcaMaquina;
use App\Models\Frota\ModeloMaquina;
use App\Models\Frota\TiposVeiculo;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoCategoria;
use App\Models\Frota\VeiculoDocLegal;
use App\Models\Frota\VeiculoDocTecnico;
use App\Models\Frota\VeiculoImagem;
use App\Models\Frota\VeiculoIpva;
use App\Models\Frota\VeiculoManutencao;
use App\Models\Frota\VeiculoPreventiva;
use App\Models\Frota\VeiculoSeguro;
use App\Models\Frota\VeiculoSubCategoria;
use App\Models\Obra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = Veiculo::query()
            ->with(['obra:id,nome_fantasia,code', 'categoria:id,nome_categoria']);

        if ($search = $request->string('q')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('prefixo', 'like', "%{$search}%")
                  ->orWhere('placa',  'like', "%{$search}%")
                  ->orWhere('modelo', 'like', "%{$search}%")
                  ->orWhere('marca',  'like', "%{$search}%");
            });
        }

        if ($situacao = $request->input('situacao')) {
            $query->where('situacao', $situacao);
        }

        if ($obraId = $request->input('obra_id')) {
            $query->where('obra_id', $obraId);
        }

        if ($categoriaId = $request->input('id_categoria')) {
            $query->where('id_categoria', $categoriaId);
        }

        $veiculos = $query->orderBy('prefixo')->paginate(20)->withQueryString();

        return Inertia::render('Admin/Frota/Veiculos/Index', [
            'veiculos'   => $veiculos,
            'obras'      => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'categorias' => VeiculoCategoria::orderBy('nome_categoria')->get(['id', 'nome_categoria']),
            'filtros'    => $request->only(['q', 'situacao', 'obra_id', 'id_categoria']),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Veiculos/Form', [
            'veiculo'      => null,
            'subcategorias'=> [],
            'lookups'      => $this->lookups(),
        ]);
    }

    public function store(StoreVeiculoRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['user_create'] = Auth::user()?->email;

        $imagem = $request->file('imagem');
        unset($data['imagem']);

        $veiculo = Veiculo::create($data);

        if ($imagem) {
            $veiculo->update(['imagem' => $this->saveMainImage($veiculo, $imagem)]);
        }

        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veículo cadastrado.');
    }

    public function show(Veiculo $veiculo): InertiaResponse
    {
        $veiculo->load([
            'obra:id,nome_fantasia,code',
            'categoria:id,nome_categoria',
            'subcategoria:id,nome_subcategoria',
            'preventiva:id,nome_preventiva',
            'imagens',
            'locacaoAtual.obraDestino:id,nome_fantasia,code',
        ]);

        // Aba: Corretivas
        $manutencoes = $veiculo->manutencoes()
            ->with('fornecedor:id,nome_fantasia,razao_social')
            ->orderByDesc('data_de_execucao')
            ->limit(200)
            ->get();

        // Aba: Seguros
        $seguros = $veiculo->seguros()
            ->orderByDesc('carencia_final')
            ->get();

        // Aba: IPVAs
        $ipvas = $veiculo->ipvas()
            ->orderByDesc('referencia_ano')
            ->get();

        // Aba: Docs Legais e Tecnicos
        $docsLegais   = $veiculo->docsLegais()->orderByDesc('data_validade')->get();
        $docsTecnicos = $veiculo->docsTecnicos()->orderByDesc('data_validade')->get();

        // Aba: Abastecimentos
        $abastecimentos = $veiculo->abastecimentos()
            ->orderByDesc('data_abastecimento')
            ->limit(200)
            ->get()
            ->map(function ($a) use ($veiculo) {
                if ($veiculo->tipo_hr) {
                    $inicial = $a->hr_anterior ?? 0;
                    $final   = $a->hr_atual ?? 0;
                } else {
                    $inicial = $a->km_anterior ?? 0;
                    $final   = $a->km_atual ?? 0;
                }
                $percorrido = max(0, $final - $inicial);
                $qtd        = (float) $a->quantidade;
                $a->medicao_inicial = $inicial;
                $a->medicao_final   = $final;
                $a->percorrido      = $percorrido;
                $a->custo_por_litro = $qtd > 0 ? ((float) $a->valor_total) / $qtd : 0;
                $a->custo_por_km    = $percorrido > 0 ? ((float) $a->valor_total) / $percorrido : 0;
                $a->emissao_carbono = $this->calcularEmissaoCO2($a->combustivel ?? '', $qtd);
                return $a;
            });

        // Aba: Hodômetro / Horímetro (uma lista, dependendo do tipo)
        if ($veiculo->tipo_hr) {
            $medicoes = $veiculo->horimetros()->orderByDesc('data_horimetro')->limit(200)->get();
        } else {
            $medicoes = $veiculo->quilometragens()->orderByDesc('data_quilometragem')->limit(200)->get();
        }

        // Aba: Preventivas (catalogo do veiculo)
        $preventivas = $veiculo->preventivas()->orderBy('nome_preventiva')->get();

        // Lookups para o modal de cadastrar OS preventiva
        $fornecedores = \App\Models\Fornecedor::where('status', 'Ativo')
            ->orderBy('nome_fantasia')
            ->get(['id', 'nome_fantasia']);

        // ---- DASHBOARD DE CICLOS ----
        $dashboardCiclos = app(CalculadorCiclosPreventiva::class)->montar($veiculo);

        // Historico de OS preventivas (servicos_preventiva no legado)
        $servicosPreventiva = $veiculo->preventivasRealizadas()
            ->with(['motorista:id,nome', 'preventiva:id,nome_preventiva'])
            ->orderByDesc('data_de_execucao')
            ->limit(200)
            ->get();

        return Inertia::render('Admin/Frota/Veiculos/Show', [
            'veiculo'             => $veiculo,
            'manutencoes'         => $manutencoes,
            'seguros'             => $seguros,
            'ipvas'               => $ipvas,
            'docs_legais'         => $docsLegais,
            'docs_tecnicos'       => $docsTecnicos,
            'abastecimentos'      => $abastecimentos,
            'medicoes'            => $medicoes,
            'preventivas'         => $preventivas,
            'dashboard_ciclos'    => $dashboardCiclos,
            'servicos_preventiva' => $servicosPreventiva,
            'fornecedores'        => $fornecedores,
        ]);
    }

    /**
     * @deprecated movido para App\Services\Frota\CalculadorCiclosPreventiva
     */
    protected function montarDashboardCiclos(Veiculo $veiculo): array
    {
        $itens = $veiculo->preventivasItens()->orderBy('periodo_maq_vei')->get();
        $realizadas = $veiculo->preventivasRealizadas()->get();

        // medicaoAtual: ultimo horimetro_novo OU quilometragem_nova
        $medicaoAtual = $veiculo->tipo_hr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        // Margem para considerar o ciclo "liberado" (proximo do vencimento)
        $margem = $veiculo->tipo_hr ? 100 : 1500;

        // Agrupa itens por periodo_maq_vei
        $grupos = $itens->groupBy('periodo_maq_vei')->sortKeys();

        $ciclosLiberados = [];
        $statusDosCiclos = [];

        foreach ($grupos as $periodo => $itensDoCiclo) {
            // Ultima execucao desse ciclo (campo_cal_km / campo_cal_hr == periodo)
            $ultima = $realizadas->first(function ($m) use ($periodo, $veiculo) {
                $perDb = $veiculo->tipo_hr ? $m->campo_cal_hr : $m->campo_calc_km;
                return (int) $perDb === (int) $periodo;
            });

            $alvo = (int) $periodo;
            $dataUltima = null;
            $dataVencimento = null;
            $baseMedicao = null;

            if ($ultima) {
                $alvo = $veiculo->tipo_hr ? (int) $ultima->horimetro_proximo : (int) $ultima->quilometragem_nova;
                $baseMedicao = $veiculo->tipo_hr ? (int) $ultima->horimetro_atual : (int) $ultima->quilometragem_atual;
                $dataUltima = $ultima->data_conclusao?->format('Y-m-d');
                if ($ultima->data_de_vencimento && $ultima->data_de_vencimento->format('Y') > 1900) {
                    $dataVencimento = $ultima->data_de_vencimento->format('Y-m-d');
                }
            }

            $distancia = $alvo - $medicaoAtual;
            $liberado  = $distancia <= $margem;
            if ($liberado) $ciclosLiberados[] = (int) $periodo;

            // Progresso percentual
            $progresso = 0;
            if ($ultima && $baseMedicao !== null) {
                $totalPercorrer = $alvo - $baseMedicao;
                $jaPercorrido   = $medicaoAtual - $baseMedicao;
                if ($totalPercorrer > 0) $progresso = ($jaPercorrido / $totalPercorrer) * 100;
            } elseif ($periodo > 0) {
                $progresso = ($medicaoAtual / $periodo) * 100;
            }
            $progresso = (float) max(0, min(100, $progresso));

            $statusDosCiclos[(int) $periodo] = [
                'periodo'         => (int) $periodo,
                'alvo'            => $alvo,
                'distancia'       => $distancia,
                'liberado'        => $liberado,
                'data_ultima'     => $dataUltima,
                'data_vencimento' => $dataVencimento,
                'progresso'       => round($progresso, 1),
                'qtd_itens'       => $itensDoCiclo->count(),
            ];
        }

        $cicloMestre = !empty($ciclosLiberados) ? max($ciclosLiberados) : null;

        // Determina o estado final de cada ciclo: liberado e mestre, ou bloqueado
        foreach ($statusDosCiclos as $periodo => &$st) {
            if ($st['liberado'] && $periodo === $cicloMestre) {
                $st['estado']  = 'mestre';
                $st['bloqueio'] = null;
            } elseif ($st['liberado']) {
                $st['estado']  = 'bloqueado_por_maior';
                $st['bloqueio'] = 'Realize a OS de ' . number_format($cicloMestre, 0, ',', '.');
            } elseif ($st['distancia'] < 0) {
                $st['estado']  = 'vencido';
                $unidade = $veiculo->tipo_hr ? 'hr' : 'km';
                $st['bloqueio'] = 'Excedido em ' . number_format(abs($st['distancia']), 0, ',', '.') . " {$unidade}";
            } else {
                $st['estado']  = 'aguardando';
                $unidade = $veiculo->tipo_hr ? 'hr' : 'km';
                $st['bloqueio'] = 'Faltam ' . number_format($st['distancia'], 0, ',', '.') . " {$unidade}";
            }
        }
        unset($st);

        return [
            'medicao_atual' => $medicaoAtual,
            'unidade'       => $veiculo->tipo_hr ? 'hr' : 'km',
            'margem'        => $margem,
            'ciclo_mestre'  => $cicloMestre,
            'ciclos'        => array_values($statusDosCiclos),
        ];
    }

    /** Fator GHG simplificado (kg CO2 por litro) */
    protected function calcularEmissaoCO2(string $combustivel, float $quantidade): float
    {
        $c = mb_strtolower(trim($combustivel));
        $fator = match (true) {
            str_contains($c, 'diesel') || str_contains($c, 's10') || str_contains($c, 's500') => 2.384,
            str_contains($c, 'gasolina') => 2.212,
            str_contains($c, 'etanol') || str_contains($c, 'alco') => 0.0,
            default => 0.0,
        };
        return round($quantidade * $fator, 2);
    }

    public function edit(Veiculo $veiculo): InertiaResponse
    {
        $veiculo->load('imagens');

        $subcategorias = $veiculo->id_categoria
            ? VeiculoSubCategoria::where('id_categoria', $veiculo->id_categoria)
                ->orderBy('nome_subcategoria')
                ->get(['id', 'nome_subcategoria', 'id_categoria'])
            : collect();

        return Inertia::render('Admin/Frota/Veiculos/Form', [
            'veiculo'       => $veiculo,
            'subcategorias' => $subcategorias,
            'lookups'       => $this->lookups(),
        ]);
    }

    public function update(UpdateVeiculoRequest $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $request->validated();
        $data['user_edit'] = Auth::user()?->email;

        $imagem = $request->file('imagem');
        unset($data['imagem']);

        $veiculo->update($data);

        if ($imagem) {
            $veiculo->update(['imagem' => $this->saveMainImage($veiculo, $imagem)]);
        }

        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veículo atualizado.');
    }

    public function destroy(Veiculo $veiculo): RedirectResponse
    {
        $veiculo->delete();

        return redirect()->route('admin.frota.veiculos.index')
            ->with('success', 'Veículo removido.');
    }

    /**
     * AJAX: lista as subcategorias de uma categoria, usado pelo cascade
     * select do Form (Categoria -> Subcategoria).
     */
    public function pesquisarSubcategoria(VeiculoCategoria $categoria): JsonResponse
    {
        $subcategorias = VeiculoSubCategoria::where('id_categoria', $categoria->id)
            ->orderBy('nome_subcategoria')
            ->get(['id', 'nome_subcategoria', 'id_categoria']);

        return response()->json($subcategorias);
    }

    /**
     * Upload de uma ou mais imagens para a galeria do veiculo (OneDrive).
     */
    public function storeImage(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $request->validate([
            'imagens'     => 'required|array|min:1',
            'imagens.*'   => 'file|image|max:5120',
            'descricao'   => 'nullable|string|max:191',
        ]);

        foreach ($request->file('imagens') as $file) {
            $path = $this->uploadOneDrive($file, $veiculo->id, 'galeria');
            if (!$path) continue;

            VeiculoImagem::create([
                'veiculo_id'  => $veiculo->id,
                'arquivo'     => $path,
                'descricao'   => $request->input('descricao'),
                'user_create' => Auth::user()?->email,
            ]);
        }

        return back()->with('success', 'Imagem(s) adicionada(s).');
    }

    /**
     * Remove uma imagem da galeria (apaga registro + arquivo no OneDrive).
     */
    public function deleteImage(VeiculoImagem $imagem): RedirectResponse
    {
        if ($imagem->arquivo) {
            try {
                $encoded = implode('/', array_map('rawurlencode', explode('/', $imagem->arquivo)));
                FileUploadHelper::deleteFile($encoded);
            } catch (\Throwable $e) {
                Log::warning('Falha ao deletar imagem no OneDrive', [
                    'path' => $imagem->arquivo,
                    'ex'   => $e->getMessage(),
                ]);
            }
        }

        $imagem->delete();

        return back()->with('success', 'Imagem removida.');
    }

    /**
     * Download de toda a documentação do veículo no OneDrive em ZIP.
     * Usa o FileUploadHelper::downloadFolderAsZip que percorre recursivamente
     * a pasta veiculos/{id}/ no SharePoint e empacota num arquivo zip local.
     */
    public function downloadZipDocs(Veiculo $veiculo)
    {
        try {
            return FileUploadHelper::downloadFolderAsZip("veiculos/{$veiculo->id}");
        } catch (\Throwable $e) {
            Log::error('Falha ao gerar ZIP de docs do veículo', [
                'veiculo_id' => $veiculo->id,
                'ex'         => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Falha ao gerar ZIP de documentação: ' . $e->getMessage()]);
        }
    }

    /**
     * Caderno Histórico de Manutenção — preventivas agrupadas por ciclo
     * + corretivas em timeline lateral. Suporta filtros por data e
     * fornecedor.
     *
     * As corretivas têm campo `descricao` com HTML (nicEdit no legado).
     * O front renderiza via dangerouslySetInnerHTML.
     */
    public function historicoMnt(Request $request, Veiculo $veiculo): InertiaResponse
    {
        $filtros = [
            'data_inicio'   => $request->input('data_inicio'),
            'data_fim'      => $request->input('data_fim'),
            'fornecedor_id' => $request->input('fornecedor_id'),
            'q'             => $request->input('q'),
        ];

        // ===== CORRETIVAS =====
        $corQuery = $veiculo->manutencoes()
            ->with('fornecedor:id,nome_fantasia,razao_social')
            ->whereNotNull('data_conclusao');

        if ($filtros['data_inicio']) $corQuery->whereDate('data_conclusao', '>=', $filtros['data_inicio']);
        if ($filtros['data_fim'])    $corQuery->whereDate('data_conclusao', '<=', $filtros['data_fim']);
        if ($filtros['fornecedor_id']) $corQuery->where('fornecedor_id', $filtros['fornecedor_id']);
        if ($filtros['q']) {
            $corQuery->where(function ($w) use ($filtros) {
                $w->where('descricao', 'like', "%{$filtros['q']}%")
                  ->orWhere('tipo', 'like', "%{$filtros['q']}%");
            });
        }

        $corretivas = $corQuery->orderByDesc('data_conclusao')->get();

        // ===== PREVENTIVAS =====
        $prevQuery = $veiculo->preventivasRealizadas()
            ->with(['preventiva:id,nome_preventiva', 'motorista:id,nome'])
            ->whereNotNull('data_conclusao');

        if ($filtros['data_inicio']) $prevQuery->whereDate('data_conclusao', '>=', $filtros['data_inicio']);
        if ($filtros['data_fim'])    $prevQuery->whereDate('data_conclusao', '<=', $filtros['data_fim']);
        if ($filtros['fornecedor_id']) $prevQuery->where('fornecedor_id', $filtros['fornecedor_id']);

        $preventivas = $prevQuery->orderByDesc('data_conclusao')->get();

        // Agrupa preventivas por ciclo (campo_calc_km ou campo_cal_hr)
        $tipoHr = (bool) $veiculo->tipo_hr;
        $unidade = $tipoHr ? 'hr' : 'km';

        $preventivasPorCiclo = [];
        foreach ($preventivas as $p) {
            $ciclo = (int) ($tipoHr ? $p->campo_cal_hr : $p->campo_calc_km);
            if (!isset($preventivasPorCiclo[$ciclo])) {
                $preventivasPorCiclo[$ciclo] = [
                    'ciclo' => $ciclo,
                    'itens' => [],
                ];
            }
            $preventivasPorCiclo[$ciclo]['itens'][] = [
                'id'              => $p->id,
                'data'            => optional($p->data_conclusao)->format('Y-m-d'),
                'medicao'         => $tipoHr ? $p->horimetro_atual : $p->quilometragem_atual,
                'nome_preventiva' => $p->preventiva?->nome_preventiva ?? 'Ciclo básico',
                'motorista'       => $p->motorista?->nome,
                'valor'           => $p->total_valor_servico,
                'nf_pecas'        => $p->nf_pecas,
                'nf_mao_obra'     => $p->nf_mao_obra,
                'descricao'       => $p->descricao,
            ];
        }
        // ordena cicloss decrescente (maiores primeiro)
        krsort($preventivasPorCiclo);
        $preventivasPorCiclo = array_values($preventivasPorCiclo);

        // ===== Corretivas no formato React =====
        $corretivasFmt = $corretivas->map(function ($c) use ($tipoHr) {
            return [
                'id'              => $c->id,
                'data'            => optional($c->data_conclusao)->format('Y-m-d'),
                'data_execucao'   => optional($c->data_de_execucao)->format('Y-m-d'),
                'medicao'         => $tipoHr ? $c->horimetro_atual : $c->quilometragem_nova,
                'fornecedor'      => $c->fornecedor?->nome_fantasia ?? $c->fornecedor?->razao_social ?? 'Próprio/Interno',
                'descricao_html'  => $c->descricao, // HTML do nicEdit (renderizar com dangerouslySetInnerHTML)
                'tipo'            => $c->tipo,
                'valor'           => $c->valor_do_servico,
                'tem_anexo'       => !empty($c->arquivo),
            ];
        });

        // ===== Linha do tempo cronológica =====
        $timeline = collect();
        foreach ($corretivas as $c) {
            $timeline->push([
                'id'          => 'c-' . $c->id,
                'tipo'        => 'Corretiva',
                'data'        => optional($c->data_conclusao)->format('Y-m-d'),
                'km_hr'       => $tipoHr ? $c->horimetro_atual : $c->quilometragem_nova,
                'responsavel' => $c->fornecedor?->nome_fantasia ?? $c->fornecedor?->razao_social ?? 'Próprio/Interno',
                'descricao'   => strip_tags((string) $c->descricao), // texto puro na timeline
                'custo'       => $c->valor_do_servico,
            ]);
        }
        foreach ($preventivas as $p) {
            $ciclo = (int) ($tipoHr ? $p->campo_cal_hr : $p->campo_calc_km);
            $timeline->push([
                'id'          => 'p-' . $p->id,
                'tipo'        => 'Preventiva',
                'data'        => optional($p->data_conclusao)->format('Y-m-d'),
                'km_hr'       => $tipoHr ? $p->horimetro_atual : $p->quilometragem_atual,
                'responsavel' => $p->preventiva?->nome_preventiva ?? 'Próprio/Interno',
                'descricao'   => $ciclo ? "Ciclo de {$ciclo} {$unidade}" : 'Ciclo básico',
                'custo'       => $p->total_valor_servico,
            ]);
        }
        $timeline = $timeline->sortByDesc('data')->values();

        $totalCorretivas  = $corretivas->sum('valor_do_servico');
        $totalPreventivas = $preventivas->sum('total_valor_servico');

        $fornecedores = \App\Models\Fornecedor::orderBy('nome_fantasia')
            ->get(['id', 'nome_fantasia']);

        return Inertia::render('Admin/Frota/Veiculos/HistoricoMnt', [
            'veiculo'              => $veiculo->only(['id', 'prefixo', 'placa', 'marca', 'modelo', 'ano', 'tipo_hr', 'nun_serie_chassi']),
            'corretivas'           => $corretivasFmt,
            'preventivas_por_ciclo' => $preventivasPorCiclo,
            'timeline'             => $timeline,
            'unidade'              => $unidade,
            'total_corretivas'     => $totalCorretivas,
            'total_preventivas'    => $totalPreventivas,
            'qtd_corretivas'       => $corretivas->count(),
            'qtd_preventivas'      => $preventivas->count(),
            'fornecedores'         => $fornecedores,
            'filtros'              => $filtros,
        ]);
    }

    /**
     * Cria uma OS preventiva (registro em veiculo_preventivas_itens_realizadas)
     * a partir do card "Cadastrar OS" do Dashboard de Ciclos.
     */
    public function storeOsPreventiva(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $request->validate([
            'periodo'             => 'required|integer|min:0',
            'medicao_proxima'     => 'required|integer|min:0',
            'data_de_execucao'    => 'required|date',
            'data_conclusao'      => 'nullable|date|after_or_equal:data_de_execucao',
            'data_de_vencimento'  => 'nullable|date',
            'fornecedor_id'       => 'nullable|exists:fornecedores,id',
            'id_motorista'        => 'nullable|exists:funcionarios,id',
            'nf_pecas'            => 'nullable|string|max:60',
            'nf_mao_obra'         => 'nullable|string|max:60',
            'valor_do_servico'    => 'nullable|numeric|min:0',
            'valor_da_mao_obra'   => 'nullable|numeric|min:0',
            'tipo'                => 'nullable|string|max:30',
            'descricao'           => 'nullable|string',
            'anexo'               => 'nullable|file|max:10240',
        ]);

        $tipoHr = (bool) $veiculo->tipo_hr;

        // Medicao atual = ultimo registro de horimetro ou km
        $medicaoAtual = $tipoHr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        // Resolve id_preventiva: usa o primeiro plano que tem item com esse periodo
        $idPreventiva = $veiculo->preventivasItens()
            ->where('periodo_maq_vei', $data['periodo'])
            ->value('id_preventiva');

        $valorTotal = (float) ($data['valor_do_servico'] ?? 0) + (float) ($data['valor_da_mao_obra'] ?? 0);

        $registro = \App\Models\Frota\VeiculoPreventivaItemRealizada::create([
            'id_veiculo'            => $veiculo->id,
            'id_preventiva'         => $idPreventiva,
            'fornecedor_id'         => $data['fornecedor_id'] ?? null,
            'id_motorista'          => $data['id_motorista'] ?? null,
            'tipo'                  => $data['tipo'] ?? null,
            'nf_pecas'              => $data['nf_pecas'] ?? null,
            'nf_mao_obra'           => $data['nf_mao_obra'] ?? null,
            'valor_do_servico'      => $data['valor_do_servico'] ?? 0,
            'valor_da_mao_obra'     => $data['valor_da_mao_obra'] ?? 0,
            'total_valor_servico'   => $valorTotal,
            'quilometragem_atual'   => $tipoHr ? null : $medicaoAtual,
            'quilometragem_nova'    => $tipoHr ? null : $data['medicao_proxima'],
            'campo_calc_km'         => $tipoHr ? null : $data['periodo'],
            'horimetro_atual'       => $tipoHr ? $medicaoAtual : null,
            'horimetro_proximo'     => $tipoHr ? $data['medicao_proxima'] : null,
            'campo_cal_hr'          => $tipoHr ? $data['periodo'] : null,
            'data_de_execucao'      => $data['data_de_execucao'],
            'data_conclusao'        => $data['data_conclusao'] ?? null,
            'data_de_vencimento'    => $data['data_de_vencimento'] ?? null,
            'descricao'             => $data['descricao'] ?? null,
            'status_realizado'      => $data['data_conclusao'] ? '3' : '2', // 3=Concluido, 2=Em Execucao
            'user_create'           => Auth::user()?->email,
        ]);

        if ($request->hasFile('anexo')) {
            $path = $this->uploadOneDrive($request->file('anexo'), $veiculo->id, "preventivas/{$registro->id}");
            // grava o path no campo descricao se nao houver outro lugar; reservado para futura coluna 'arquivo'
            if ($path) {
                $registro->update(['descricao' => trim(($registro->descricao ?? '') . "\n[anexo] {$path}")]);
            }
        }

        return back()->with('success', 'OS preventiva cadastrada.');
    }

    /**
     * Stream da imagem da galeria direto do OneDrive (rota proxy).
     * Permite usar em <img src> sem expor o token Graph.
     */
    public function viewImagem(Veiculo $veiculo, VeiculoImagem $imagem)
    {
        if ($imagem->veiculo_id !== $veiculo->id) abort(404);
        return $this->streamArquivoOneDrive($imagem->arquivo);
    }

    /** Stream da imagem principal do veiculo. */
    public function viewImagemPrincipal(Veiculo $veiculo)
    {
        if (!$veiculo->imagem) {
            return $this->placeholderImagemResponse();
        }
        return $this->streamArquivoOneDrive($veiculo->imagem);
    }

    /**
     * Devolve um SVG placeholder ("sem foto") com 200 OK, para que <img> no
     * front mostre algo decente em vez de quebrar com 404 no console.
     */
    protected function placeholderImagemResponse()
    {
        $svg = '<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">
  <rect width="200" height="140" fill="#f3f4f6"/>
  <circle cx="100" cy="55" r="18" fill="none" stroke="#9ca3af" stroke-width="2.5"/>
  <path d="M40 125 Q40 90 70 90 L130 90 Q160 90 160 125" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="100" y="18" font-family="Arial" font-size="11" fill="#9ca3af" text-anchor="middle">sem foto</text>
</svg>';
        return response($svg, 200, [
            'Content-Type'  => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    /* =========================================================
     * Helpers
     * ========================================================= */

    protected function lookups(): array
    {
        return [
            'obras'       => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'categorias'  => VeiculoCategoria::orderBy('nome_categoria')->get(['id', 'nome_categoria']),
            'marcas'      => MarcaMaquina::orderBy('marca')->get(['id', 'marca']),
            'modelos'     => ModeloMaquina::orderBy('modelo')->get(['id', 'modelo', 'marca_id']),
            'preventivas' => VeiculoPreventiva::orderBy('nome_preventiva')->get(['id', 'nome_preventiva']),
            'tipos'       => TiposVeiculo::orderBy('nome')->get(['id', 'nome', 'codigo']),
            'situacoes'   => ['Ativo', 'Inativo', 'Manutenção', 'Vendido', 'Baixado'],
        ];
    }

    protected function saveMainImage(Veiculo $veiculo, $file): ?string
    {
        return $this->uploadOneDrive($file, $veiculo->id, 'principal');
    }

    /**
     * Upload generico de um arquivo para o OneDrive sob veiculos/{id}/{subfolder}.
     * Retorna o path relativo (a SGA-Engeativos) que vai pro banco, ou null em falha.
     *
     * O nome do arquivo eh renormalizado com slug + sufixo aleatorio para evitar
     * colisoes entre uploads do mesmo veiculo.
     */
    protected function uploadOneDrive(UploadedFile $file, int $veiculoId, string $subfolder): ?string
    {
        $ext  = $file->getClientOriginalExtension() ?: 'bin';
        $base = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safe = Str::slug($base, '_') . '_' . Str::random(6) . '.' . $ext;

        // Reembrulha como UploadedFile para mudar o nome visto pelo helper.
        $renamed = new UploadedFile(
            $file->getRealPath(),
            $safe,
            $file->getClientMimeType(),
            null,
            true
        );

        $folderName = "{$veiculoId}/{$subfolder}";
        try {
            $resp = FileUploadHelper::uploadFilesToFolder($folderName, $renamed, 'veiculos');
            $primeiro = $resp[0] ?? [];
            if (($primeiro['status'] ?? '') !== 'success') {
                Log::error('Falha no upload OneDrive', ['veiculo' => $veiculoId, 'resp' => $primeiro]);
                return null;
            }
        } catch (\Throwable $e) {
            Log::error('Excecao no upload OneDrive', ['veiculo' => $veiculoId, 'ex' => $e->getMessage()]);
            return null;
        }

        return "veiculos/{$folderName}/{$safe}";
    }

    /* =========================================================
     * CRUDs aninhados (Manutencoes, IPVA, Seguros, Docs)
     * ========================================================= */

    public function storeManutencao(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarManutencao($request);
        $data['veiculo_id']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $registro = VeiculoManutencao::create($data + ['arquivo' => null]);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, "manutencoes/{$registro->id}");
            $registro->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Manutenção cadastrada.');
    }

    public function updateManutencao(Request $request, VeiculoManutencao $manutencao): RedirectResponse
    {
        $data = $this->validarManutencao($request);
        $data['user_edit'] = Auth::user()?->email;
        $manutencao->update($data);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $manutencao->veiculo_id, "manutencoes/{$manutencao->id}");
            $manutencao->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Manutenção atualizada.');
    }

    public function destroyManutencao(VeiculoManutencao $manutencao): RedirectResponse
    {
        $manutencao->delete();
        return back()->with('success', 'Manutenção removida.');
    }

    public function storeIpva(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarIpva($request);
        $data['veiculo_id']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $registro = VeiculoIpva::create($data + ['nome_anexo_ipva' => null]);
        if ($request->hasFile('anexo')) {
            $path = $this->uploadOneDrive($request->file('anexo'), $veiculo->id, "ipvas/{$registro->id}");
            $registro->update(['nome_anexo_ipva' => $path, 'extensao' => pathinfo($path ?? '', PATHINFO_EXTENSION)]);
        }
        return back()->with('success', 'IPVA cadastrado.');
    }

    public function updateIpva(Request $request, VeiculoIpva $ipva): RedirectResponse
    {
        $data = $this->validarIpva($request);
        $data['user_edit'] = Auth::user()?->email;
        $ipva->update($data);
        if ($request->hasFile('anexo')) {
            $path = $this->uploadOneDrive($request->file('anexo'), $ipva->veiculo_id, "ipvas/{$ipva->id}");
            $ipva->update(['nome_anexo_ipva' => $path, 'extensao' => pathinfo($path ?? '', PATHINFO_EXTENSION)]);
        }
        return back()->with('success', 'IPVA atualizado.');
    }

    public function destroyIpva(VeiculoIpva $ipva): RedirectResponse
    {
        $ipva->delete();
        return back()->with('success', 'IPVA removido.');
    }

    public function storeSeguro(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarSeguro($request);
        $data['veiculo_id']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        VeiculoSeguro::create($data);
        return back()->with('success', 'Seguro cadastrado.');
    }

    public function updateSeguro(Request $request, VeiculoSeguro $seguro): RedirectResponse
    {
        $data = $this->validarSeguro($request);
        $data['user_edit'] = Auth::user()?->email;
        $seguro->update($data);
        return back()->with('success', 'Seguro atualizado.');
    }

    public function destroySeguro(VeiculoSeguro $seguro): RedirectResponse
    {
        $seguro->delete();
        return back()->with('success', 'Seguro removido.');
    }

    public function storeDocLegal(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarDoc($request);
        $data['id_veiculo']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $registro = VeiculoDocLegal::create($data + ['arquivo' => null]);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, "docs_legais/{$registro->id}");
            $registro->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Documento legal cadastrado.');
    }

    public function updateDocLegal(Request $request, VeiculoDocLegal $doc): RedirectResponse
    {
        $data = $this->validarDoc($request);
        $data['user_edit'] = Auth::user()?->email;
        $doc->update($data);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $doc->id_veiculo, "docs_legais/{$doc->id}");
            $doc->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Documento atualizado.');
    }

    public function destroyDocLegal(VeiculoDocLegal $doc): RedirectResponse
    {
        $doc->delete();
        return back()->with('success', 'Documento removido.');
    }

    public function storeDocTecnico(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarDoc($request);
        $data['id_veiculo']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $registro = VeiculoDocTecnico::create($data + ['arquivo' => null]);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, "docs_tecnicos/{$registro->id}");
            $registro->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Documento técnico cadastrado.');
    }

    public function updateDocTecnico(Request $request, VeiculoDocTecnico $doc): RedirectResponse
    {
        $data = $this->validarDoc($request);
        $data['user_edit'] = Auth::user()?->email;
        $doc->update($data);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $doc->id_veiculo, "docs_tecnicos/{$doc->id}");
            $doc->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Documento atualizado.');
    }

    public function destroyDocTecnico(VeiculoDocTecnico $doc): RedirectResponse
    {
        $doc->delete();
        return back()->with('success', 'Documento removido.');
    }

    /** Stream genérico de anexos das abas (PDF inline / imagem). */
    public function viewAnexo(string $tipo, int $id)
    {
        $registro = match ($tipo) {
            'manutencao'    => VeiculoManutencao::findOrFail($id),
            'ipva'          => VeiculoIpva::findOrFail($id),
            'doc-legal'     => VeiculoDocLegal::findOrFail($id),
            'doc-tecnico'   => VeiculoDocTecnico::findOrFail($id),
            default         => abort(404),
        };
        $path = match ($tipo) {
            'ipva' => $registro->nome_anexo_ipva,
            default => $registro->arquivo,
        };
        if (!$path) abort(404);
        return $this->streamArquivoOneDrive($path);
    }

    protected function validarManutencao(Request $request): array
    {
        return $request->validate([
            'fornecedor_id'         => 'nullable|exists:fornecedores,id',
            'id_obra'               => 'nullable|exists:obras,id',
            'tipo'                  => 'nullable|string|max:50',
            'valor_do_servico'      => 'nullable|numeric|min:0',
            'quilometragem_atual'   => 'nullable|integer|min:0',
            'quilometragem_nova'    => 'nullable|integer|min:0',
            'horimetro_atual'       => 'nullable|integer|min:0',
            'horimetro_proximo'     => 'nullable|integer|min:0',
            'data_de_execucao'      => 'nullable|date',
            'data_previsao_termino' => 'nullable|date',
            'data_conclusao'        => 'nullable|date',
            'data_de_vencimento'    => 'nullable|date',
            'descricao'             => 'nullable|string',
            'situacao'              => 'required|integer|in:1,2,3,4',
            'arquivo'               => 'nullable|file|max:10240',
        ]);
    }

    protected function validarIpva(Request $request): array
    {
        return $request->validate([
            'referencia_ano'     => 'required|string|max:10',
            'valor'              => 'nullable|numeric|min:0',
            'data_de_pagamento'  => 'nullable|date',
            'data_de_vencimento' => 'nullable|date',
            'anexo'              => 'nullable|file|max:10240',
        ]);
    }

    protected function validarSeguro(Request $request): array
    {
        return $request->validate([
            'nome_seguradora'  => 'required|string|max:191',
            'carencia_inicial' => 'nullable|date',
            'carencia_final'   => 'nullable|date|after_or_equal:carencia_inicial',
            'valor'            => 'nullable|numeric|min:0',
        ]);
    }

    protected function validarDoc(Request $request): array
    {
        return $request->validate([
            'nome_documento' => 'required|string|max:191',
            'data_documento' => 'nullable|date',
            'data_validade'  => 'nullable|date',
            'status'         => 'nullable|string|max:30',
            'arquivo'        => 'nullable|file|max:10240',
        ]);
    }

    /**
     * Stream binario de um arquivo no OneDrive para o response,
     * com Content-Type inferido pela extensao.
     */
    protected function streamArquivoOneDrive(string $relPath)
    {
        $body = FileUploadHelper::openFileStream($relPath);
        if (!$body) {
            // Arquivo não encontrado no OneDrive: devolve SVG "sem foto" com
            // 200 OK para evitar avalanche de 404 no console e barrar erros
            // no Service Worker (que aborta cache em response 404).
            return $this->placeholderImagemResponse();
        }

        $ext  = strtolower(pathinfo($relPath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            'bmp'         => 'image/bmp',
            'pdf'         => 'application/pdf',
            default       => 'application/octet-stream',
        };

        return response()->stream(function () use ($body) {
            while (!$body->eof()) {
                echo $body->read(8192);
            }
        }, 200, [
            'Content-Type'  => $mime,
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
