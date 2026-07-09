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
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Frota\VeiculoCategoria;
use App\Models\Frota\VeiculoDocLegal;
use App\Models\Frota\VeiculoDocTecnico;
use App\Models\Frota\VeiculoHorimetro;
use App\Models\Frota\VeiculoImagem;
use App\Models\Frota\VeiculoIpva;
use App\Models\Frota\VeiculoManutencao;
use App\Models\Frota\VeiculoPreventiva;
use App\Models\Frota\VeiculoPreventivaItem;
use App\Models\Frota\VeiculoPreventivaItemRealizada;
use App\Models\Frota\VeiculoPreventivaItemServico;
use App\Models\Frota\VeiculoQuilometragem;
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
            'locacaoAtual.obraOrigem:id,nome_fantasia,code,codigo_obra',
            'locacaoAtual.obraDestino:id,nome_fantasia,code,codigo_obra',
            'locacaoAtual.funcionarioDestino:id,nome,celular,imagem_usuario',
            'locacoes' => fn ($q) => $q->orderBy('data_inicio')
                ->with([
                    'obraOrigem:id,nome_fantasia,codigo_obra',
                    'obraDestino:id,nome_fantasia,codigo_obra',
                    'funcionarioDestino:id,nome',
                ]),
        ]);

        // Aba Corretivas: carregada sob demanda pela própria aba
        // (GET paginado + busca por fornecedor/tipo/descrição) — ver listManutencoes.

        // Abas Seguros / IPVA / Abastecimentos / Medições / Docs: carregadas
        // sob demanda pelas próprias abas (GET paginado + busca) —
        // ver listSeguros / listIpvas / listAbastecimentos / listMedicoes / listDocs*.

        // Aba: Preventivas (catalogo do veiculo)
        $preventivas = $veiculo->preventivas()->orderBy('nome_preventiva')->get();

        // Lookups para os modais (OS preventiva + manutenção corretiva)
        $fornecedores = \App\Models\Fornecedor::where('status', 'Ativo')
            ->orderBy('nome_fantasia')
            ->get(['id', 'nome_fantasia']);

        // Obra (id_obra) e Responsável (id_usuario → funcionário) da corretiva
        $obras = Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']);
        $funcionarios = \App\Models\Funcionario::where('status', 'Ativo')
            ->orderBy('nome')
            ->get(['id', 'nome']);

        // ---- DASHBOARD DE CICLOS ----
        $dashboardCiclos = app(CalculadorCiclosPreventiva::class)->montar($veiculo);

        // Histórico de OS preventivas: carregado sob demanda pela aba
        // (GET paginado + busca) — ver listServicosPreventiva.

        /* =========================================================
         * KPI Medição (porta `$maiorValor` do legacy detalhes.blade)
         * - tipo_hr: maior horimetro_novo
         * - tipo_km: maior quilometragem_nova
         * ========================================================= */
        $maiorValor = [
            'horimetro_novo'      => (float) ($veiculo->horimetros()->max('horimetro_novo') ?? 0),
            'quilometragem_nova'  => (float) ($veiculo->quilometragens()->max('quilometragem_nova') ?? 0),
            'tempo_novo'          => 0,
        ];

        /* =========================================================
         * Datasets dos gráficos de manutenção (legacy detalhes.blade):
         *   - $totalManutencaoVeiculo  → qtd corretivas por ano
         *   - $custoAnualManutencao    → custo por mês-ano (todos anos)
         *   - $dataSets/$mesesFormatados → custo mensal do ano atual
         * ========================================================= */
        $manutAgg = $veiculo->manutencoes()
            ->whereNotNull('data_de_execucao')
            ->get(['data_de_execucao', 'valor_do_servico']);

        // (a) Qtd corretivas/ano
        $totalManutencaoVeiculo = $manutAgg
            ->groupBy(fn ($m) => optional($m->data_de_execucao)->format('Y'))
            ->map(fn ($g, $ano) => ['ano' => (string) $ano, 'total' => $g->count()])
            ->sortKeys()
            ->values();

        // (b) Custo anual (chave: "mm/YYYY", valor: somatório)
        $custoAnualManutencao = $manutAgg
            ->groupBy(fn ($m) => optional($m->data_de_execucao)->format('m/Y'))
            ->map(fn ($g, $key) => [
                'mesCustoAnoManut' => (string) $key,
                'custoAnoManut'    => round((float) $g->sum('valor_do_servico'), 2),
            ])
            ->sortBy(function ($r) {
                [$m, $y] = explode('/', $r['mesCustoAnoManut']);
                return sprintf('%04d-%02d', (int) $y, (int) $m);
            })
            ->values();

        // (c) Custo mensal — ano atual (12 buckets)
        $anoAtual = now()->year;
        $mesesFormatados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        $totaisMes = array_fill(0, 12, 0.0);
        foreach ($manutAgg as $m) {
            $d = $m->data_de_execucao;
            if (!$d || $d->year !== $anoAtual) continue;
            $totaisMes[$d->month - 1] += (float) $m->valor_do_servico;
        }
        $custoMensalAnoAtual = [
            'label' => 'Custo Mensal ' . $anoAtual,
            'data'  => array_map(fn ($v) => round($v, 2), $totaisMes),
        ];

        return Inertia::render('Admin/Frota/Veiculos/Show', [
            'veiculo'                  => $veiculo,
            'preventivas'              => $preventivas,
            'dashboard_ciclos'         => $dashboardCiclos,
            'fornecedores'             => $fornecedores,
            'obras'                    => $obras,
            'funcionarios'             => $funcionarios,
            // Porting `detalhes.blade.php`
            'maior_valor'              => $maiorValor,
            'meses_formatados'         => $mesesFormatados,
            'total_manutencao_veiculo' => $totalManutencaoVeiculo,
            'custo_anual_manutencao'   => $custoAnualManutencao,
            'custo_mensal_ano_atual'   => $custoMensalAnoAtual,
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
     * Itens do plano para montar o checklist de uma OS de um ciclo, agrupados
     * por ciclo (englobamento: todos os itens com periodo_maq_vei <= periodo).
     * Cada item traz a "pendência herdada": se a última vez que o item foi
     * tratado ele ficou 'nao', devolve a justificativa/data para o front alertar.
     */
    public function osPreventivaItens(Veiculo $veiculo, Request $request): JsonResponse
    {
        $periodo = (int) $request->query('periodo', 0);
        $tipoHr  = (bool) $veiculo->tipo_hr;

        $itens = $veiculo->preventivasItens()
            ->where('periodo_maq_vei', '<=', $periodo)
            ->orderByDesc('periodo_maq_vei')
            ->orderBy('nome_servico')
            ->get();

        $pend = $this->pendenciasAbertas($veiculo, $itens->pluck('id')->all());

        $grupos = $itens->groupBy('periodo_maq_vei')->sortKeysDesc()->map(function ($grupo, $per) use ($pend) {
            return [
                'periodo' => (int) $per,
                'itens'   => $grupo->map(function ($it) use ($pend) {
                    $p = $pend->get($it->id);
                    return [
                        'id_servico_preventiva' => $it->id,
                        'nome_servico'          => $it->nome_servico,
                        'periodo'               => (int) $it->periodo_maq_vei,
                        'pendencia'             => $p ? [
                            'observacao' => $p->observacao,
                            'data'       => optional($p->created_at)->format('Y-m-d'),
                            'os_id'      => $p->id_manutencao,
                        ] : null,
                    ];
                })->values(),
            ];
        })->values();

        $medicaoAtual = $tipoHr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        $periodoMes = (int) ($itens->where('periodo_maq_vei', $periodo)->max('periodo_mes') ?? 0);

        return response()->json([
            'periodo'                  => $periodo,
            'unidade'                  => $tipoHr ? 'hr' : 'km',
            'medicao_atual'            => $medicaoAtual,
            'medicao_proxima_sugerida' => $medicaoAtual + $periodo,
            'periodo_mes'              => $periodoMes,
            'grupos'                   => $grupos,
        ]);
    }

    /**
     * Cria uma OS preventiva (veiculo_preventivas_itens_realizadas) + o
     * checklist de serviços executados. Uma única OS grava o ciclo mestre;
     * o englobamento dos ciclos menores é derivado pelo CalculadorCiclos
     * (nada de "OS fantasma"). Total recalculado no servidor.
     */
    public function storeOsPreventiva(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarOsPreventiva($request, false);

        $tipoHr = (bool) $veiculo->tipo_hr;
        $medicaoAtual = $tipoHr
            ? (int) ($veiculo->horimetros()->orderByDesc('id')->value('horimetro_novo') ?? 0)
            : (int) ($veiculo->quilometragens()->orderByDesc('id')->value('quilometragem_nova') ?? 0);

        $periodo = (int) $data['periodo'];
        $idPreventiva = $veiculo->preventivasItens()
            ->where('periodo_maq_vei', $periodo)
            ->value('id_preventiva');

        // Notas fiscais (lista repetível, igual à corretiva): total → total_valor_servico.
        [$notasFiscais, $totalNotas] = $this->prepararNotasFiscais($request, $veiculo->id, 'preventivas/notas');
        $situacao   = (string) $data['situacao'];
        $dataConclusao = $data['data_conclusao'] ?? null;
        if ($situacao === '3' && ! $dataConclusao) {
            $dataConclusao = now()->toDateString();
        }

        $registro = \Illuminate\Support\Facades\DB::transaction(function () use (
            $veiculo, $data, $tipoHr, $medicaoAtual, $periodo, $idPreventiva,
            $notasFiscais, $totalNotas, $situacao, $dataConclusao
        ) {
            $os = VeiculoPreventivaItemRealizada::create([
                'id_veiculo'          => $veiculo->id,
                'id_preventiva'       => $idPreventiva,
                'id_obra'             => $data['id_obra'] ?? null,
                'fornecedor_id'       => $data['fornecedor_id'] ?? null,
                'id_motorista'        => $data['id_motorista'] ?? null,
                'tipo'                => $data['tipo'] ?? null,
                'notas_fiscais'       => $notasFiscais,
                'total_valor_servico' => $totalNotas,
                'quilometragem_atual' => $tipoHr ? null : $medicaoAtual,
                'quilometragem_nova'  => $tipoHr ? null : ($data['medicao_proxima'] ?? null),
                'campo_calc_km'       => $tipoHr ? null : $periodo,
                'horimetro_atual'     => $tipoHr ? $medicaoAtual : null,
                'horimetro_proximo'   => $tipoHr ? ($data['medicao_proxima'] ?? null) : null,
                'campo_cal_hr'        => $tipoHr ? $periodo : null,
                'campo_cal_mes'       => $data['campo_cal_mes'] ?? null,
                'data_de_execucao'    => $data['data_de_execucao'],
                'data_conclusao'      => $dataConclusao,
                'data_de_vencimento'  => $data['data_de_vencimento'] ?? null,
                'descricao'           => $data['descricao'] ?? null,
                'status_realizado'    => $situacao,
                'user_create'         => Auth::user()?->email,
            ]);

            $planItens = $veiculo->preventivasItens()
                ->whereIn('id', collect($data['itens'])->pluck('id_servico_preventiva'))
                ->get()->keyBy('id');

            foreach ($data['itens'] as $it) {
                $plano = $planItens->get($it['id_servico_preventiva']);
                VeiculoPreventivaItemServico::create([
                    'id_manutencao'         => $os->id,
                    'id_servico_preventiva' => $it['id_servico_preventiva'],
                    'id_veiculo'            => $veiculo->id,
                    'id_preventiva'         => $plano?->id_preventiva ?? $idPreventiva,
                    'nome_servico'          => $plano?->nome_servico,
                    'periodo'               => $it['periodo'] ?? $plano?->periodo_maq_vei,
                    'status'                => $it['status'],
                    'observacao'            => $it['observacao'] ?? null,
                    'user_create'           => Auth::user()?->email,
                ]);
            }

            return $os;
        });

        if ($request->hasFile('anexo')) {
            $path = $this->uploadOneDrive($request->file('anexo'), $veiculo->id, "preventivas/{$registro->id}");
            if ($path) $registro->update(['arquivo' => $path]);
        }

        return back()->with('success', 'OS preventiva cadastrada.');
    }

    /** Detalhe (JSON) de uma OS preventiva — alimenta os modais Ver e Editar. */
    public function showOsPreventiva(VeiculoPreventivaItemRealizada $osPreventiva): JsonResponse
    {
        $osPreventiva->load([
            'obra:id,nome_fantasia,code',
            'fornecedor:id,nome_fantasia,razao_social',
            'motorista:id,nome',
            'preventiva:id,nome_preventiva',
            'servicos' => fn ($q) => $q->orderByDesc('periodo')->orderBy('nome_servico'),
        ]);

        return response()->json([
            'id'                  => $osPreventiva->id,
            'id_obra'             => $osPreventiva->id_obra,
            'fornecedor_id'       => $osPreventiva->fornecedor_id,
            'id_motorista'        => $osPreventiva->id_motorista,
            'tipo'                => $osPreventiva->tipo,
            'status_realizado'    => $osPreventiva->status_realizado,
            'notas_fiscais'       => array_values(array_map(fn ($n, $i) => [
                'numero'  => $n['numero'] ?? null,
                'data'    => $n['data'] ?? null,
                'valor'   => $n['valor'] ?? null,
                'arquivo' => $n['arquivo'] ?? null,
                'idx'     => $i,
            ], $osPreventiva->notas_fiscais ?? [], array_keys($osPreventiva->notas_fiscais ?? []))),
            'total_valor_servico' => $osPreventiva->total_valor_servico,
            'quilometragem_atual' => $osPreventiva->quilometragem_atual,
            'quilometragem_nova'  => $osPreventiva->quilometragem_nova,
            'horimetro_atual'     => $osPreventiva->horimetro_atual,
            'horimetro_proximo'   => $osPreventiva->horimetro_proximo,
            'campo_calc_km'       => $osPreventiva->campo_calc_km,
            'campo_cal_hr'        => $osPreventiva->campo_cal_hr,
            'campo_cal_mes'       => $osPreventiva->campo_cal_mes,
            'data_de_execucao'    => optional($osPreventiva->data_de_execucao)->toDateString(),
            'data_conclusao'      => optional($osPreventiva->data_conclusao)->toDateString(),
            'data_de_vencimento'  => optional($osPreventiva->data_de_vencimento)->toDateString(),
            'descricao'           => $osPreventiva->descricao,
            'tem_arquivo'         => ! empty($osPreventiva->arquivo),
            'obra'                => $osPreventiva->obra ? ['nome_fantasia' => $osPreventiva->obra->nome_fantasia] : null,
            'fornecedor'          => $osPreventiva->fornecedor ? ['nome_fantasia' => $osPreventiva->fornecedor->nome_fantasia ?? $osPreventiva->fornecedor->razao_social] : null,
            'motorista'           => $osPreventiva->motorista ? ['nome' => $osPreventiva->motorista->nome] : null,
            'preventiva'          => $osPreventiva->preventiva ? ['nome_preventiva' => $osPreventiva->preventiva->nome_preventiva] : null,
            'servicos'            => $osPreventiva->servicos->map(fn ($s) => [
                'id'                    => $s->id,
                'id_servico_preventiva' => $s->id_servico_preventiva,
                'nome_servico'          => $s->nome_servico,
                'periodo'               => $s->periodo,
                'status'                => $s->status,
                'observacao'            => $s->observacao,
            ])->values(),
        ]);
    }

    /** Atualiza cabeçalho + situação + status/observação das linhas do checklist. */
    public function updateOsPreventiva(Request $request, VeiculoPreventivaItemRealizada $osPreventiva): RedirectResponse
    {
        $data = $this->validarOsPreventiva($request, true);

        // Notas fiscais (lista repetível): total → total_valor_servico. A correlação
        // do PDF novo é por posição, então preserva os PDFs já enviados das linhas.
        [$notasFiscais, $totalNotas] = $this->prepararNotasFiscais($request, $osPreventiva->id_veiculo, 'preventivas/notas');
        $situacao   = (string) $data['situacao'];
        $dataConclusao = $data['data_conclusao'] ?? null;
        if ($situacao === '3' && ! $dataConclusao) {
            $dataConclusao = now()->toDateString();
        }

        // Próxima medição do ciclo (campo editável no form). Só grava quando veio
        // no payload, no eixo certo (hr x km); o ciclo em si (campo_cal_*) não muda.
        $tipoHr = (bool) optional($osPreventiva->veiculo)->tipo_hr;
        $medProx = array_key_exists('medicao_proxima', $data) && $data['medicao_proxima'] !== null
            ? (int) $data['medicao_proxima'] : null;

        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $osPreventiva, $data, $notasFiscais, $totalNotas, $situacao, $dataConclusao, $tipoHr, $medProx) {
            $osPreventiva->update([
                'id_obra'             => $data['id_obra'] ?? null,
                'fornecedor_id'       => $data['fornecedor_id'] ?? null,
                'id_motorista'        => $data['id_motorista'] ?? null,
                'tipo'                => $data['tipo'] ?? null,
                'notas_fiscais'       => $notasFiscais,
                'total_valor_servico' => $totalNotas,
                'horimetro_proximo'   => $tipoHr && $medProx !== null ? $medProx : $osPreventiva->horimetro_proximo,
                'quilometragem_nova'  => ! $tipoHr && $medProx !== null ? $medProx : $osPreventiva->quilometragem_nova,
                'campo_cal_mes'       => $data['campo_cal_mes'] ?? null,
                'data_de_execucao'    => $data['data_de_execucao'],
                'data_conclusao'      => $dataConclusao,
                'data_de_vencimento'  => $data['data_de_vencimento'] ?? null,
                'descricao'           => $data['descricao'] ?? null,
                'status_realizado'    => $situacao,
                'user_edit'           => Auth::user()?->email,
            ]);

            foreach (($data['itens'] ?? []) as $it) {
                if (empty($it['id'])) continue;
                $linha = $osPreventiva->servicos()->whereKey($it['id'])->first();
                if (! $linha) continue;
                $linha->update([
                    'status'     => $it['status'],
                    'observacao' => $it['observacao'] ?? null,
                    'user_edit'  => Auth::user()?->email,
                ]);
            }
        });

        if ($request->hasFile('anexo')) {
            $path = $this->uploadOneDrive($request->file('anexo'), $osPreventiva->id_veiculo, "preventivas/{$osPreventiva->id}");
            if ($path) $osPreventiva->update(['arquivo' => $path]);
        }

        return back()->with('success', 'OS preventiva atualizada.');
    }

    /** Altera apenas a situação (1-4) de uma OS. Concluído sem data → hoje. */
    public function updateStatusOsPreventiva(Request $request, VeiculoPreventivaItemRealizada $osPreventiva): JsonResponse
    {
        $request->validate(['situacao' => 'required|integer|in:1,2,3,4']);

        $osPreventiva->status_realizado = (string) $request->integer('situacao');
        if ($request->integer('situacao') === 3 && empty($osPreventiva->data_conclusao)) {
            $osPreventiva->data_conclusao = now()->toDateString();
        }
        $osPreventiva->user_edit = Auth::user()?->email;
        $osPreventiva->save();

        return response()->json(['ok' => true, 'situacao' => $osPreventiva->status_realizado]);
    }

    public function destroyOsPreventiva(VeiculoPreventivaItemRealizada $osPreventiva): RedirectResponse
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($osPreventiva) {
            $osPreventiva->servicos()->delete();
            $osPreventiva->delete();
        });

        return back()->with('success', 'OS preventiva removida.');
    }

    /**
     * Backlog de pendências: itens cuja ÚLTIMA linha de checklist ficou 'nao'
     * (não sanados por uma OS posterior). Alimenta a lista de manutenção
     * diferida na aba Preventivas.
     */
    public function pendenciasPreventiva(Veiculo $veiculo): JsonResponse
    {
        $pend = $this->pendenciasAbertas($veiculo);

        $data = $pend->values()->map(fn ($s) => [
            'id'                    => $s->id,
            'id_servico_preventiva' => $s->id_servico_preventiva,
            'nome_servico'          => $s->nome_servico,
            'periodo'               => $s->periodo,
            'observacao'            => $s->observacao,
            'data'                  => optional($s->created_at)->toDateString(),
            'os_id'                 => $s->id_manutencao,
        ])->sortByDesc('data')->values();

        return response()->json(['data' => $data, 'total' => $data->count()]);
    }

    /**
     * Última linha de checklist por item (do veículo) cujo status é 'nao' —
     * ou seja, pendências abertas. Retorna coleção keyed por id_servico_preventiva.
     */
    private function pendenciasAbertas(Veiculo $veiculo, ?array $itemIds = null): \Illuminate\Support\Collection
    {
        $q = VeiculoPreventivaItemServico::where('id_veiculo', $veiculo->id)
            ->whereNotNull('id_servico_preventiva');
        if ($itemIds !== null) {
            if (empty($itemIds)) return collect();
            $q->whereIn('id_servico_preventiva', $itemIds);
        }

        // mais recente primeiro: a primeira linha de cada item é a "última vez"
        $linhas = $q->orderByDesc('id')->get();

        $abertas = collect();
        foreach ($linhas->groupBy('id_servico_preventiva') as $itemId => $grupo) {
            $ultima = $grupo->first();
            if ($ultima && $ultima->status === 'nao') {
                $abertas->put((int) $itemId, $ultima);
            }
        }
        return $abertas;
    }

    /** Validação compartilhada de OS preventiva (store e update). */
    protected function validarOsPreventiva(Request $request, bool $update): array
    {
        $regras = [
            'periodo'            => ($update ? 'nullable' : 'required') . '|integer|min:0',
            'medicao_atual'      => 'nullable|integer|min:0', // medição na data do serviço (permite lançamento retroativo)
            'medicao_proxima'    => 'nullable|integer|min:0',
            'id_obra'            => 'nullable|exists:obras,id',
            'fornecedor_id'      => 'nullable|exists:fornecedores,id',
            'id_motorista'       => 'nullable|exists:funcionarios,id',
            'situacao'           => 'required|integer|in:1,2,3,4',
            'tipo'               => 'nullable|string|max:30',
            'campo_cal_mes'      => 'nullable|integer|min:0',
            'data_de_execucao'   => 'required|date',
            'data_conclusao'     => 'nullable|date',
            'data_de_vencimento' => 'nullable|date',
            // Notas fiscais (lista repetível, igual à corretiva). O PDF novo de
            // cada linha viaja em notas_fiscais.{i}.arquivo_novo (correlação por
            // posição); arquivo = path do PDF já enviado.
            'notas_fiscais'                => 'nullable|array|max:50',
            'notas_fiscais.*.numero'       => 'nullable|string|max:60',
            'notas_fiscais.*.data'         => 'nullable|date',
            'notas_fiscais.*.valor'        => 'nullable|numeric|min:0|max:99999999.99',
            'notas_fiscais.*.arquivo'      => 'nullable|string|max:255',
            'notas_fiscais.*.arquivo_novo' => 'nullable|file|mimetypes:application/pdf|mimes:pdf|max:10240',
            'descricao'          => 'nullable|string',
            // Anexo (NF/comprovante): PDF ou imagem — nunca tipo arbitrário
            // (upload irrestrito -> XSS armazenado ao servir inline via viewAnexo).
            'anexo'              => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'itens'                          => ($update ? 'nullable' : 'required') . '|array' . ($update ? '' : '|min:1'),
            'itens.*.status'                 => 'required|in:sim,nao',
            'itens.*.observacao'             => 'nullable|string|max:1000',
        ];
        // no store a chave do item é o id do plano; no update é o id da linha
        $regras[$update ? 'itens.*.id' : 'itens.*.id_servico_preventiva'] = 'required|integer';
        $regras['itens.*.periodo'] = 'nullable|integer';

        $data = $request->validate($regras);

        // Justificativa obrigatória quando o item é marcado como não realizado.
        foreach (($data['itens'] ?? []) as $i => $it) {
            if (($it['status'] ?? null) === 'nao' && trim((string) ($it['observacao'] ?? '')) === '') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    "itens.$i.observacao" => 'Justificativa obrigatória para item não realizado.',
                ]);
            }
        }

        return $data;
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
            'tipos'       => TiposVeiculo::orderBy('id')->get(['id', 'nome', 'codigo']),
            'combustiveis'=> \App\Models\Frota\Combustivel::where('ativo', true)->orderBy('ordem')->orderBy('nome')->get(['id', 'nome']),
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

    /**
     * Processa as notas fiscais: faz upload do PDF novo de cada linha (que
     * viaja em notas_fiscais.{i}.arquivo_novo — correlação por posição, imune
     * a reordenar/remover linhas), preserva o PDF já existente, descarta
     * linhas vazias e devolve [notas_limpas, total]. O total vai para
     * valor_do_servico (mantém os gráficos de custo).
     */
    private function prepararNotasFiscais(Request $request, int $veiculoId, string $subpasta = 'manutencoes/notas'): array
    {
        $entrada = (array) $request->input('notas_fiscais', []);
        $limpas = [];
        foreach ($entrada as $idx => $n) {
            $numero = trim((string) ($n['numero'] ?? '')) ?: null;
            $valor  = isset($n['valor']) && $n['valor'] !== '' ? (float) $n['valor'] : null;
            $arquivo = trim((string) ($n['arquivo'] ?? '')) ?: null; // PDF já enviado

            $novo = $request->file("notas_fiscais.$idx.arquivo_novo");
            if ($novo) {
                $arquivo = $this->uploadOneDrive($novo, $veiculoId, $subpasta);
            }

            // Linha vazia (sem número, valor nem arquivo) é descartada
            if ($numero === null && $valor === null && $arquivo === null) {
                continue;
            }
            $limpas[] = [
                'numero'  => $numero,
                'data'    => $n['data'] ?? null,
                'valor'   => $valor,
                'arquivo' => $arquivo,
            ];
        }
        $total = array_sum(array_column($limpas, 'valor'));
        return [$limpas, $total];
    }

    public function storeManutencao(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarManutencao($request);
        [$data['notas_fiscais'], $data['valor_do_servico']] = $this->prepararNotasFiscais($request, $veiculo->id);
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
        [$data['notas_fiscais'], $data['valor_do_servico']] = $this->prepararNotasFiscais($request, $manutencao->veiculo_id);
        $data['user_edit'] = Auth::user()?->email;
        $manutencao->update($data);
        if ($request->hasFile('arquivo')) {
            $path = $this->uploadOneDrive($request->file('arquivo'), $manutencao->veiculo_id, "manutencoes/{$manutencao->id}");
            $manutencao->update(['arquivo' => $path]);
        }
        return back()->with('success', 'Manutenção atualizada.');
    }

    /** Stream do PDF de uma nota fiscal específica da manutenção.
     *  A manutenção já vem company-scoped pelo Tenantable (route binding). */
    public function viewNotaArquivo(VeiculoManutencao $manutencao, int $idx)
    {
        $nota = ($manutencao->notas_fiscais ?? [])[$idx] ?? null;
        abort_if(empty($nota['arquivo']), 404, 'Nota fiscal sem arquivo.');
        return $this->streamArquivoOneDrive($nota['arquivo']);
    }

    /** Stream do PDF de uma nota fiscal específica da OS preventiva.
     *  A OS já vem company-scoped pelo Tenantable (route binding). */
    public function viewNotaArquivoPreventiva(VeiculoPreventivaItemRealizada $osPreventiva, int $idx)
    {
        $nota = ($osPreventiva->notas_fiscais ?? [])[$idx] ?? null;
        abort_if(empty($nota['arquivo']), 404, 'Nota fiscal sem arquivo.');
        return $this->streamArquivoOneDrive($nota['arquivo']);
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
        unset($data['arquivo']); // o arquivo é tratado à parte (upload OneDrive)
        $data['veiculo_id']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $seguro = VeiculoSeguro::create($data);
        if ($request->hasFile('arquivo')) {
            $seguro->update(['arquivo' => $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, "seguros/{$seguro->id}")]);
        }
        return back()->with('success', 'Seguro cadastrado.');
    }

    public function updateSeguro(Request $request, VeiculoSeguro $seguro): RedirectResponse
    {
        $data = $this->validarSeguro($request);
        unset($data['arquivo']);
        $data['user_edit'] = Auth::user()?->email;
        $seguro->update($data);
        if ($request->hasFile('arquivo')) {
            $seguro->update(['arquivo' => $this->uploadOneDrive($request->file('arquivo'), $seguro->veiculo_id, "seguros/{$seguro->id}")]);
        }
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
            $path = $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, 'docs_legais');
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
            $path = $this->uploadOneDrive($request->file('arquivo'), $doc->id_veiculo, 'docs_legais');
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
            $path = $this->uploadOneDrive($request->file('arquivo'), $veiculo->id, 'docs_tecnicos');
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
            $path = $this->uploadOneDrive($request->file('arquivo'), $doc->id_veiculo, 'docs_tecnicos');
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
            'os-preventiva' => VeiculoPreventivaItemRealizada::findOrFail($id),
            'ipva'          => VeiculoIpva::findOrFail($id),
            'seguro'        => VeiculoSeguro::findOrFail($id),
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
            'id_usuario'            => 'nullable|exists:funcionarios,id',   // responsável
            'tipo'                  => 'nullable|string|max:50',
            // Notas fiscais (lista repetível: número, data, valor). O total é
            // gravado em valor_do_servico (calculado no store/update).
            'notas_fiscais'             => 'nullable|array|max:50',
            'notas_fiscais.*.numero'    => 'nullable|string|max:60',
            'notas_fiscais.*.data'      => 'nullable|date',
            'notas_fiscais.*.valor'     => 'nullable|numeric|min:0|max:99999999.99',
            'notas_fiscais.*.arquivo'   => 'nullable|string|max:255',       // path do PDF já enviado
            'notas_fiscais.*.arquivo_novo' => 'nullable|file|mimetypes:application/pdf|mimes:pdf|max:10240',
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
            // NF/comprovante: PDF ou imagem (ver nota em storeOsPreventiva)
            'arquivo'               => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);
    }

    protected function validarIpva(Request $request): array
    {
        return $request->validate([
            'referencia_ano'     => 'required|string|max:10',
            'valor'              => 'nullable|numeric|min:0',
            'data_de_pagamento'  => 'nullable|date',
            'data_de_vencimento' => 'nullable|date',
            // Comprovante do IPVA: PDF ou imagem
            'anexo'              => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);
    }

    protected function validarSeguro(Request $request): array
    {
        return $request->validate([
            'nome_seguradora'  => 'required|string|max:191',
            'carencia_inicial' => 'nullable|date',
            'carencia_final'   => 'nullable|date|after_or_equal:carencia_inicial',
            'valor'            => 'nullable|numeric|min:0',
            // Apólice: PDF ou imagem
            'arquivo'          => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);
    }

    protected function validarDoc(Request $request): array
    {
        return $request->validate([
            'nome_documento' => 'required|string|max:191',
            'data_documento' => 'nullable|date',
            'data_validade'  => 'nullable|date',
            'status'         => 'nullable|string|max:30',
            'obsoleto'       => 'nullable|boolean',
            // Apenas PDF (regra do controle de documentos): valida MIME real e
            // extensão — evita renomear .exe/.jpg para .pdf.
            'arquivo'        => 'nullable|file|mimetypes:application/pdf|mimes:pdf|max:10240',
        ], [
            'arquivo.mimetypes' => 'O documento deve ser um arquivo PDF.',
            'arquivo.mimes'     => 'O documento deve ser um arquivo PDF.',
        ]);
    }

    /**
     * Monta a listagem paginada de documentos (técnicos ou legais) para a aba
     * do veículo. GET com busca as-you-type (?q=), filtro de obsoletos
     * (?obsoletos=0|1) e paginação fixa de 10 por página.
     *
     * Por padrão a lista mostra APENAS documentos ativos (obsoleto=false);
     * o toggle "ver obsoletos" inverte o filtro.
     */
    private function paginarDocs($query, Request $request): JsonResponse
    {
        $verObsoletos = $request->boolean('obsoletos');
        $termo = trim((string) $request->query('q', ''));

        $query->where('obsoleto', $verObsoletos);
        if ($termo !== '') {
            $query->where('nome_documento', 'like', '%' . $termo . '%');
        }

        $pagina = $query
            ->orderByDesc('data_documento')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        $pagina->getCollection()->transform(fn ($d) => [
            'id'             => $d->id,
            'nome_documento' => $d->nome_documento,
            'data_documento' => optional($d->data_documento)->toDateString(),
            'data_validade'  => optional($d->data_validade)->toDateString(),
            'diferenca_dias' => $d->diferenca_dias,
            'obsoleto'       => (bool) $d->obsoleto,
            'tem_arquivo'    => !empty($d->arquivo),
            'status'         => $d->status,
        ]);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => [
                'current_page' => $pagina->currentPage(),
                'last_page'    => $pagina->lastPage(),
                'total'        => $pagina->total(),
                'from'         => $pagina->firstItem(),
                'to'           => $pagina->lastItem(),
            ],
        ]);
    }

    /**
     * Listagem paginada das manutenções CORRETIVAS do veículo, com busca
     * as-you-type por fornecedor / tipo / descrição (?q=). Mesmo padrão dos
     * docs (GET JSON, 10 por página). Carregada sob demanda pela aba.
     */
    public function listManutencoes(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));

        $query = $veiculo->manutencoes()
            ->with('fornecedor:id,nome_fantasia,razao_social');

        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $query->where(function ($q) use ($like) {
                $q->where('tipo', 'like', $like)
                    ->orWhere('descricao', 'like', $like)
                    ->orWhereHas('fornecedor', function ($f) use ($like) {
                        $f->where('nome_fantasia', 'like', $like)
                            ->orWhere('razao_social', 'like', $like);
                    });
            });
        }

        $pagina = $query->orderByDesc('data_de_execucao')->orderByDesc('id')
            ->paginate(10)->withQueryString();

        // Devolve o conjunto completo de campos editáveis — a mesma linha é
        // usada para popular o formulário de edição.
        $pagina->getCollection()->transform(fn ($m) => [
            'id'                    => $m->id,
            'situacao'              => (int) $m->situacao,
            'tipo'                  => $m->tipo,
            'fornecedor_id'         => $m->fornecedor_id,
            'fornecedor'            => $m->fornecedor ? ['nome_fantasia' => $m->fornecedor->nome_fantasia] : null,
            'id_obra'               => $m->id_obra,
            'id_usuario'            => $m->id_usuario,
            'quilometragem_atual'   => $m->quilometragem_atual,
            'quilometragem_nova'    => $m->quilometragem_nova,
            'horimetro_atual'       => $m->horimetro_atual,
            'horimetro_proximo'     => $m->horimetro_proximo,
            'data_de_execucao'      => optional($m->data_de_execucao)->toDateString(),
            'data_previsao_termino' => optional($m->data_previsao_termino)->toDateString(),
            'data_conclusao'        => optional($m->data_conclusao)->toDateString(),
            'data_de_vencimento'    => optional($m->data_de_vencimento)->toDateString(),
            'valor_do_servico'      => $m->valor_do_servico,
            'notas_fiscais'         => $m->notas_fiscais ?? [],
            'descricao'             => $m->descricao,
            'tem_arquivo'           => !empty($m->arquivo),
        ]);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => [
                'current_page' => $pagina->currentPage(),
                'last_page'    => $pagina->lastPage(),
                'total'        => $pagina->total(),
                'from'         => $pagina->firstItem(),
                'to'           => $pagina->lastItem(),
            ],
        ]);
    }

    /** Estrutura padrão de paginação (data + meta) reutilizada pelas abas. */
    private function metaPaginacao($pagina): array
    {
        return [
            'current_page' => $pagina->currentPage(),
            'last_page'    => $pagina->lastPage(),
            'total'        => $pagina->total(),
            'from'         => $pagina->firstItem(),
            'to'           => $pagina->lastItem(),
        ];
    }

    public function listSeguros(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));
        $q = $veiculo->seguros();
        if ($termo !== '') {
            $q->where('nome_seguradora', 'like', '%' . $termo . '%');
        }
        $pagina = $q->orderByDesc('carencia_final')->orderByDesc('id')->paginate(10)->withQueryString();
        $pagina->getCollection()->transform(fn ($s) => [
            'id'               => $s->id,
            'nome_seguradora'  => $s->nome_seguradora,
            'valor'            => $s->valor,
            'carencia_inicial' => optional($s->carencia_inicial)->toDateString(),
            'carencia_final'   => optional($s->carencia_final)->toDateString(),
            'tem_arquivo'      => !empty($s->arquivo),
        ]);
        return response()->json(['data' => $pagina->items(), 'meta' => $this->metaPaginacao($pagina)]);
    }

    public function listIpvas(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));
        $q = $veiculo->ipvas();
        if ($termo !== '') {
            $q->where('referencia_ano', 'like', '%' . $termo . '%');
        }
        $pagina = $q->orderByDesc('referencia_ano')->orderByDesc('id')->paginate(10)->withQueryString();
        $pagina->getCollection()->transform(fn ($i) => [
            'id'                 => $i->id,
            'referencia_ano'     => $i->referencia_ano,
            'valor'              => $i->valor,
            'data_de_pagamento'  => optional($i->data_de_pagamento)->toDateString(),
            'data_de_vencimento' => optional($i->data_de_vencimento)->toDateString(),
            'tem_anexo'          => !empty($i->nome_anexo_ipva),
        ]);
        return response()->json(['data' => $pagina->items(), 'meta' => $this->metaPaginacao($pagina)]);
    }

    public function listAbastecimentos(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));
        $base = $veiculo->abastecimentos();
        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $base->where(fn ($q) => $q->where('fornecedor', 'like', $like)->orWhere('combustivel', 'like', $like));
        }

        // CO₂ total sobre o conjunto filtrado: fator depende do combustível de
        // cada linha, então some via calcularEmissaoCO2 (não é coluna do banco).
        $totalCo2 = (clone $base)->get(['combustivel', 'quantidade'])
            ->sum(fn ($a) => $this->calcularEmissaoCO2($a->combustivel ?? '', (float) $a->quantidade));

        // Resumo (KPIs) sobre TODO o conjunto filtrado — não só a página
        $resumo = [
            'total_litros' => (float) (clone $base)->sum('quantidade'),
            'total_gasto'  => (float) (clone $base)->sum('valor_total'),
            'total'        => (clone $base)->count(),
            'total_co2'    => round($totalCo2, 2),
        ];

        $pagina = $base->orderByDesc('data_abastecimento')->orderByDesc('id')->paginate(10)->withQueryString();
        $tipoHr = (bool) $veiculo->tipo_hr;
        $pagina->getCollection()->transform(function ($a) use ($tipoHr) {
            $inicial = $tipoHr ? ($a->hr_anterior ?? 0) : ($a->km_anterior ?? 0);
            $final   = $tipoHr ? ($a->hr_atual ?? 0)    : ($a->km_atual ?? 0);
            $percorrido = max(0, $final - $inicial);
            $qtd = (float) $a->quantidade;
            return [
                'id'              => $a->id,
                'data_abastecimento' => optional($a->data_abastecimento)->toDateString(),
                'combustivel'     => $a->combustivel,
                'fornecedor'      => $a->fornecedor,
                'medicao_inicial' => $inicial,
                'medicao_final'   => $final,
                'percorrido'      => $percorrido,
                'quantidade'      => $qtd,
                'valor_total'     => (float) $a->valor_total,
                'custo_por_litro' => $qtd > 0 ? ((float) $a->valor_total) / $qtd : 0,
                'custo_por_km'    => $percorrido > 0 ? ((float) $a->valor_total) / $percorrido : 0,
                'emissao_carbono' => $this->calcularEmissaoCO2($a->combustivel ?? '', $qtd),
                // Campos crus p/ o formulário de edição
                'valor_do_litro'  => (float) $a->valor_do_litro,
                'id_obra'         => $a->id_obra,
                'id_funcionario'  => $a->id_funcionario,
                'tipo'            => $a->tipo,
            ];
        });
        return response()->json(['data' => $pagina->items(), 'meta' => $this->metaPaginacao($pagina), 'resumo' => $resumo]);
    }

    public function listMedicoes(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));
        $tipoHr = (bool) $veiculo->tipo_hr;
        $dataCol = $tipoHr ? 'data_horimetro' : 'data_quilometragem';

        $q = $tipoHr ? $veiculo->horimetros() : $veiculo->quilometragens();
        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $q->where(fn ($sub) => $sub->where($dataCol, 'like', $like)->orWhere('user_create', 'like', $like));
        }
        $pagina = $q->orderByDesc($dataCol)->orderByDesc('id')->paginate(10)->withQueryString();
        $pagina->getCollection()->transform(fn ($m) => [
            'id'          => $m->id,
            'data'        => optional($tipoHr ? $m->data_horimetro : $m->data_quilometragem)->toDateString(),
            'anterior'    => $tipoHr ? $m->horimetro_atual : $m->quilometragem_atual,
            'novo'        => $tipoHr ? $m->horimetro_novo  : $m->quilometragem_nova,
            'id_obra'         => $m->id_obra,
            'id_funcionario'  => $m->id_funcionario,
            'user_create' => $m->user_create,
        ]);
        return response()->json(['data' => $pagina->items(), 'meta' => $this->metaPaginacao($pagina)]);
    }

    /* =========================================================
     * CRUD de Abastecimentos (a partir da aba Abastecimentos do veículo)
     * ========================================================= */

    public function storeAbastecimento(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarAbastecimento($request);
        $data['veiculo_id']  = $veiculo->id;
        $data['user_create'] = Auth::user()?->email;
        $data['id_local']    = (string) Str::uuid();
        VeiculoAbastecimento::create($data);
        return back()->with('success', 'Abastecimento registrado.');
    }

    public function updateAbastecimento(Request $request, Veiculo $veiculo, VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        abort_unless($abastecimento->veiculo_id === $veiculo->id, 404);
        $data = $this->validarAbastecimento($request);
        $data['user_edit'] = Auth::user()?->email;
        $abastecimento->update($data);
        return back()->with('success', 'Abastecimento atualizado.');
    }

    public function destroyAbastecimento(Veiculo $veiculo, VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        abort_unless($abastecimento->veiculo_id === $veiculo->id, 404);
        $abastecimento->delete();
        return back()->with('success', 'Abastecimento removido.');
    }

    protected function validarAbastecimento(Request $request): array
    {
        return $request->validate([
            'data_abastecimento' => 'required|date',
            'combustivel'        => 'nullable|string|max:60',
            'fornecedor'         => 'nullable|string|max:191',
            'tipo'               => 'nullable|string|max:30',
            'km_anterior'        => 'nullable|integer|min:0',
            'km_atual'           => 'nullable|integer|min:0',
            'hr_anterior'        => 'nullable|integer|min:0',
            'hr_atual'           => 'nullable|integer|min:0',
            'quantidade'         => 'required|numeric|min:0',
            'valor_do_litro'     => 'nullable|numeric|min:0',
            'valor_total'        => 'required|numeric|min:0',
            'id_obra'            => 'nullable|exists:obras,id',
            'id_funcionario'     => 'nullable|exists:funcionarios,id',
        ]);
    }

    /* =========================================================
     * CRUD de Medições (hodômetro/horímetro) — despacha pela flag tipo_hr
     * ========================================================= */

    public function storeMedicao(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $data = $this->validarMedicao($request);
        $comum = [
            'veiculo_id'     => $veiculo->id,
            'id_obra'        => $data['id_obra'] ?? null,
            'id_funcionario' => $data['id_funcionario'] ?? null,
            'user_create'    => Auth::user()?->email,
        ];
        if ((bool) $veiculo->tipo_hr) {
            VeiculoHorimetro::create($comum + [
                'horimetro_atual' => $data['anterior'] ?? null,
                'horimetro_novo'  => $data['novo'],
                'data_horimetro'  => $data['data'],
            ]);
        } else {
            VeiculoQuilometragem::create($comum + [
                'quilometragem_atual' => $data['anterior'] ?? null,
                'quilometragem_nova'  => $data['novo'],
                'data_quilometragem'  => $data['data'],
            ]);
        }
        return back()->with('success', 'Medição registrada.');
    }

    public function updateMedicao(Request $request, Veiculo $veiculo, int $id): RedirectResponse
    {
        $data = $this->validarMedicao($request);
        if ((bool) $veiculo->tipo_hr) {
            $veiculo->horimetros()->findOrFail($id)->update([
                'horimetro_atual' => $data['anterior'] ?? null,
                'horimetro_novo'  => $data['novo'],
                'data_horimetro'  => $data['data'],
                'id_obra'         => $data['id_obra'] ?? null,
                'id_funcionario'  => $data['id_funcionario'] ?? null,
                'user_edit'       => Auth::user()?->email,
            ]);
        } else {
            $veiculo->quilometragens()->findOrFail($id)->update([
                'quilometragem_atual' => $data['anterior'] ?? null,
                'quilometragem_nova'  => $data['novo'],
                'data_quilometragem'  => $data['data'],
                'id_obra'             => $data['id_obra'] ?? null,
                'id_funcionario'      => $data['id_funcionario'] ?? null,
                'user_edit'           => Auth::user()?->email,
            ]);
        }
        return back()->with('success', 'Medição atualizada.');
    }

    public function destroyMedicao(Veiculo $veiculo, int $id): RedirectResponse
    {
        $reg = ((bool) $veiculo->tipo_hr ? $veiculo->horimetros() : $veiculo->quilometragens())->findOrFail($id);
        $reg->delete();
        return back()->with('success', 'Medição removida.');
    }

    protected function validarMedicao(Request $request): array
    {
        return $request->validate([
            'data'           => 'required|date',
            'anterior'       => 'nullable|numeric|min:0',
            'novo'           => 'required|numeric|min:0',
            'id_obra'        => 'nullable|exists:obras,id',
            'id_funcionario' => 'nullable|exists:funcionarios,id',
        ]);
    }

    /** Histórico paginado de OS preventivas executadas (busca por responsável,
     *  plano de preventiva ou status). */
    public function listServicosPreventiva(Veiculo $veiculo, Request $request): JsonResponse
    {
        $termo = trim((string) $request->query('q', ''));
        $q = $veiculo->preventivasRealizadas()
            ->with(['motorista:id,nome', 'preventiva:id,nome_preventiva']);

        if ($termo !== '') {
            $like = '%' . $termo . '%';
            $q->where(function ($sub) use ($like) {
                $sub->where('status_realizado', 'like', $like)
                    ->orWhereHas('motorista', fn ($m) => $m->where('nome', 'like', $like))
                    ->orWhereHas('preventiva', fn ($p) => $p->where('nome_preventiva', 'like', $like));
            });
        }

        $pagina = $q->orderByDesc('data_de_execucao')->orderByDesc('id')
            ->paginate(10)->withQueryString();

        $pagina->getCollection()->transform(fn ($h) => [
            'id'                  => $h->id,
            'campo_cal_hr'        => $h->campo_cal_hr,
            'campo_calc_km'       => $h->campo_calc_km,
            'horimetro_atual'     => $h->horimetro_atual,
            'quilometragem_atual' => $h->quilometragem_atual,
            'horimetro_proximo'   => $h->horimetro_proximo,
            'quilometragem_nova'  => $h->quilometragem_nova,
            'data_de_execucao'    => optional($h->data_de_execucao)->toDateString(),
            'data_conclusao'      => optional($h->data_conclusao)->toDateString(),
            'data_de_vencimento'  => optional($h->data_de_vencimento)->toDateString(),
            'status_realizado'    => $h->status_realizado,
            'total_valor_servico' => $h->total_valor_servico,
            'motorista'           => $h->motorista ? ['nome' => $h->motorista->nome] : null,
            'preventiva'          => $h->preventiva ? ['nome_preventiva' => $h->preventiva->nome_preventiva] : null,
        ]);

        return response()->json(['data' => $pagina->items(), 'meta' => $this->metaPaginacao($pagina)]);
    }

    public function listDocsTecnicos(Veiculo $veiculo, Request $request): JsonResponse
    {
        return $this->paginarDocs($veiculo->docsTecnicos()->getQuery(), $request);
    }

    public function listDocsLegais(Veiculo $veiculo, Request $request): JsonResponse
    {
        return $this->paginarDocs($veiculo->docsLegais()->getQuery(), $request);
    }

    /**
     * Alterna o flag "obsoleto" de um documento. O front envia o estado
     * desejado (?obsoleto=0|1) para eliminar corrida de cliques — o servidor
     * apenas grava. Documento obsoleto sai da listagem principal.
     */
    public function toggleObsoletoDocTecnico(Request $request, VeiculoDocTecnico $doc): JsonResponse
    {
        return $this->gravarObsoleto($request, $doc, 'técnico');
    }

    public function toggleObsoletoDocLegal(Request $request, VeiculoDocLegal $doc): JsonResponse
    {
        return $this->gravarObsoleto($request, $doc, 'legal');
    }

    private function gravarObsoleto(Request $request, $doc, string $rotulo): JsonResponse
    {
        try {
            $doc->obsoleto  = $request->boolean('obsoleto');
            $doc->user_edit = Auth::user()->email ?? $doc->user_edit;
            $doc->save();

            Log::channel('main')->info((Auth::user()->email ?? '?')
                . " | Documento {$rotulo} {$doc->id} marcado como "
                . ($doc->obsoleto ? 'OBSOLETO' : 'ATIVO'));

            return response()->json(['ok' => true, 'id' => $doc->id, 'obsoleto' => (bool) $doc->obsoleto]);
        } catch (\Throwable $e) {
            Log::error("Erro ao alternar obsoleto do doc {$rotulo}", ['id' => $doc->id ?? null, 'error' => $e->getMessage()]);
            return response()->json(['ok' => false, 'message' => 'Falha ao atualizar o status.'], 500);
        }
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
            // inline: abre no navegador (nova aba), NUNCA força download
            'Content-Disposition' => 'inline; filename="' . basename($relPath) . '"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
