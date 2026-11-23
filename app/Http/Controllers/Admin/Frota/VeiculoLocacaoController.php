<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Helpers\FileUploadHelper;
use App\Http\Controllers\Controller;
use App\Models\Funcionario;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoLocacao;
use App\Models\Obra;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Helpers\CompanyContext;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Locação de Veículos — port do legacy (legado/VeiculoLocacaoController).
 *
 * Diferenças vs. legacy:
 *   - Inertia/React em vez de blade.
 *   - Imagens privadas servidas por rotas autenticadas.
 *     em vez de asset() direto.
 *   - Tenancy: relações já são filtradas pelo trait Tenantable nos models.
 */
class VeiculoLocacaoController extends Controller
{
    /**
     * Listagem por VEÍCULO (1 linha = 1 veículo) com a `locacaoAtual`,
     * espelhando o index do legacy. Mantém filtros de busca livre.
     */
    public function index(Request $request): InertiaResponse
    {
        $search = trim((string) $request->input('search', ''));
        $obraDestino = $request->input('id_obraDestino');

        $veiculos = Veiculo::query()
            ->with([
                'locacaoAtual.obraOrigem:id,nome_fantasia,codigo_obra',
                'locacaoAtual.obraDestino:id,nome_fantasia,codigo_obra',
                'locacaoAtual.funcionario:id,nome',
                'locacaoAtual.funcionarioDestino:id,nome',
            ])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('prefixo', 'like', "%{$search}%")
                      ->orWhere('placa',   'like', "%{$search}%")
                      ->orWhere('marca',   'like', "%{$search}%")
                      ->orWhere('modelo',  'like', "%{$search}%")
                      ->orWhere('tipo',    'like', "%{$search}%")
                      ->orWhere('veiculo', 'like', "%{$search}%");
                });
            })
            ->when($obraDestino, function ($q) use ($obraDestino) {
                $q->whereHas('locacaoAtual', fn ($w) => $w->where('id_obraDestino', $obraDestino));
            })
            ->orderBy('prefixo')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Frota/Locacoes/Index', [
            'veiculos' => $veiculos,
            'obras'    => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'codigo_obra']),
            'filtros'  => [
                'search'         => $search,
                'id_obraDestino' => $obraDestino ?? '',
            ],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Locacoes/Form', [
            'locacao'      => null,
            'veiculos'     => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'nun_serie_chassi', 'veiculo', 'marca', 'modelo', 'tipo', 'tipo_hr', 'imagem']),
            'obras'        => auth()->user()->obrasForCompany(CompanyContext::id())->orderBy('nome_fantasia')->get(['obras.id', 'nome_fantasia', 'codigo_obra']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome', 'imagem_usuario']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->salvar($request);
        return redirect()->route('admin.frota.locacoes.index')->with('success', 'Locação criada com sucesso.');
    }

    public function edit(VeiculoLocacao $locacao): InertiaResponse
    {
        $this->autorizarObras($locacao);
        $locacao->load(['veiculo', 'obraOrigem', 'obraDestino', 'funcionario', 'funcionarioDestino']);

        return Inertia::render('Admin/Frota/Locacoes/Form', [
            'locacao'      => $locacao,
            'veiculos'     => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'nun_serie_chassi', 'veiculo', 'marca', 'modelo', 'tipo', 'tipo_hr', 'imagem']),
            'obras'        => auth()->user()->obrasForCompany(CompanyContext::id())->orderBy('nome_fantasia')->get(['obras.id', 'nome_fantasia', 'codigo_obra']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome', 'imagem_usuario']),
        ]);
    }

    public function update(Request $request, VeiculoLocacao $locacao): RedirectResponse
    {
        $this->salvar($request, $locacao);
        return redirect()->route('admin.frota.locacoes.index')->with('success', 'Locação atualizada com sucesso.');
    }

    public function destroy(VeiculoLocacao $locacao): RedirectResponse
    {
        DB::transaction(function () use ($locacao) {
            $registro = VeiculoLocacao::lockForUpdate()->findOrFail($locacao->id);
            $this->autorizarObras($registro);
            $registro->delete();
        }, 3);
        Log::info('Locação excluída.', ['locacao_id' => $locacao->id, 'usuario_id' => Auth::id()]);
        return back()->with('success', 'Locação removida com sucesso.');
    }

    /**
     * Histórico de locações de UM veículo, com `dias_em_manutencao` e
     * cálculo de dias em locação/em obra (mesmo formato do legacy show).
     */
    public function show(Veiculo $veiculo): InertiaResponse
    {
        $locacoes = VeiculoLocacao::query()
            ->with([
                'obraOrigem:id,nome_fantasia,codigo_obra',
                'obraDestino:id,nome_fantasia,codigo_obra',
                'funcionario:id,nome',
                'funcionarioDestino:id,nome',
                'manutencoes:id,veiculo_id,data_de_execucao,data_conclusao,descricao',
            ])
            ->withDiasManutencao()
            ->where('veiculo_id', $veiculo->id)
            ->orderBy('data_inicio', 'desc')
            ->get();

        return Inertia::render('Admin/Frota/Locacoes/Show', [
            'veiculo'  => $veiculo->only([
                'id', 'prefixo', 'placa', 'modelo', 'marca', 'veiculo',
                'nun_serie_chassi', 'imagem',
            ]),
            'locacoes' => $locacoes,
        ]);
    }

    /**
     * AJAX — espelha pesquisar_placa_modelo do legacy.
     * Devolve dados do veículo p/ preencher os campos read-only do form.
     */
    public function pesquisarVeiculo(Request $request): JsonResponse
    {
        $request->validate(['id' => 'required|integer']);

        $veiculo = Veiculo::find($request->input('id'));
        if (!$veiculo) {
            return response()->json(['error' => 'Veículo não encontrado'], 404);
        }

        return response()->json([
            'id'                => $veiculo->id,
            'prefixo'           => $veiculo->prefixo,
            'placa'             => $veiculo->placa,
            'nun_serie_chassi'  => $veiculo->nun_serie_chassi,
            'veiculo'           => $veiculo->veiculo ?? 'sem reg.',
            'tipo'              => $veiculo->tipo,
            'tipo_hr'           => (bool) $veiculo->tipo_hr,
            'marca'             => $veiculo->marca,
            'modelo'            => $veiculo->modelo,
            'imagem'            => $veiculo->imagem,
            'imagem_url'        => route('admin.frota.veiculos.imagem-principal', $veiculo->id),
        ]);
    }

    /**
     * AJAX — espelha pesquisar_condutor do legacy.
     */
    public function pesquisarCondutor(Request $request): JsonResponse
    {
        $request->validate(['id' => 'required|integer']);

        $condutor = Funcionario::find($request->input('id'));
        if (!$condutor) {
            return response()->json(['error' => 'Condutor não encontrado'], 404);
        }

        return response()->json([
            'id'         => $condutor->id,
            'nome'       => $condutor->nome,
            'imagem_url' => route('admin.frota.locacoes.funcionario-foto', $condutor->id),
        ]);
    }

    /**
     * Serve a foto privada do funcionário ou um placeholder SVG.
     * Mantém a mesma estética do streamer de imagens de veículo.
     */
    public function funcionarioFoto(Funcionario $funcionario)
    {
        if (!$funcionario->imagem_usuario) {
            return $this->placeholderUsuarioSvg();
        }

        return FileUploadHelper::serve($funcionario->imagem_usuario, false, "funcionarios/{$funcionario->id}");
    }

    protected function placeholderUsuarioSvg()
    {
        $svg = '<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f3f4f6"/>
  <circle cx="100" cy="80" r="32" fill="none" stroke="#9ca3af" stroke-width="3"/>
  <path d="M40 180 Q40 120 100 120 Q160 120 160 180" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linejoin="round"/>
  <text x="100" y="25" font-family="Arial" font-size="13" fill="#9ca3af" text-anchor="middle">sem foto</text>
</svg>';
        return response($svg, 200, [
            'Content-Type'  => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private function autorizarObras(VeiculoLocacao $registro): void
    {
        foreach (array_unique([$registro->id_obra, $registro->id_obraDestino]) as $obra) {
            abort_if($obra && !Auth::user()->obrasForCompany(CompanyContext::id())->whereKey($obra)->exists(), 403);
        }
    }

    private function salvar(Request $request, ?VeiculoLocacao $locacao = null): void
    {
        $empresa = CompanyContext::id();
        abort_unless($empresa, 403);
        $referencia = fn ($tabela) => Rule::exists($tabela, 'id')->where('company_id', $empresa)->withoutTrashed();
        $data = $request->validate([
            'veiculo_id' => ['required', 'integer', $referencia('veiculos')],
            'id_obra' => ['nullable', 'integer', $referencia('obras')],
            'id_obraDestino' => ['nullable', 'integer', $referencia('obras')],
            'id_funcionario' => ['nullable', 'integer', $referencia('funcionarios')],
            'id_funcionario_destino' => ['nullable', 'integer', $referencia('funcionarios')],
            'tipo_veiculo' => 'nullable|string|max:30',
            'data_inicio' => 'required|date_format:Y-m-d',
            'data_prevista' => 'nullable|date_format:Y-m-d|after_or_equal:data_inicio',
            'data_fim' => 'nullable|date_format:Y-m-d|after_or_equal:data_inicio',
        ]);
        $salva = DB::transaction(function () use ($locacao, $data, $empresa) {
            $registro = $locacao ? VeiculoLocacao::lockForUpdate()->findOrFail($locacao->id) : new VeiculoLocacao();
            $this->autorizarObras($registro);
            $registro->fill($data);
            $this->autorizarObras($registro);
            $veiculo = Veiculo::where('company_id', $empresa)->lockForUpdate()->findOrFail($registro->veiculo_id);
            $inicio = $registro->data_inicio->toDateString();
            $fim = $registro->data_fim?->toDateString();
            if (($fim && $fim < $inicio) || ($registro->data_prevista && $registro->data_prevista->toDateString() < $inicio)) {
                throw ValidationException::withMessages(['data_inicio' => 'A retirada deve anteceder ou coincidir com as datas de retorno.']);
            }
            $conflito = VeiculoLocacao::where('veiculo_id', $veiculo->id)
                ->when($registro->exists, fn ($q) => $q->where('id', '!=', $registro->id))
                ->where(fn ($q) => $q->whereNull('data_fim')->orWhere('data_fim', '>', $inicio))
                ->when($fim, fn ($q) => $q->where(fn ($datas) => $datas->whereNull('data_inicio')->orWhere('data_inicio', '<', $fim)))
                ->lockForUpdate()->first(['id']);
            if ($conflito) {
                throw ValidationException::withMessages(['data_inicio' => 'O veículo já possui uma locação nesse período.']);
            }
            $registro->company_id = $empresa;
            $registro->save();
            return $registro;
        }, 3);
        Log::info($locacao ? 'Locação atualizada.' : 'Locação criada.', [
            'locacao_id' => $salva->id, 'veiculo_id' => $salva->veiculo_id, 'usuario_id' => Auth::id(),
        ]);
    }
}
