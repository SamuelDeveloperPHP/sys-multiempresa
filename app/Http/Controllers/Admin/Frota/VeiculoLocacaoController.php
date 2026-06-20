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
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Locação de Veículos — port do legacy (engeativos2/VeiculoLocacaoController).
 *
 * Diferenças vs. legacy:
 *   - Inertia/React em vez de blade.
 *   - Imagens via streamer OneDrive (rotas .imagem-principal e .funcionario.foto)
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
            'obras'        => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'codigo_obra']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome', 'imagem_usuario']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        try {
            $data = $this->validar($request);
            $data['user_create'] = Auth::user()?->email;

            VeiculoLocacao::create($data);

            Log::channel('main')->info(
                (Auth::user()?->email ?? 'sistema') .
                ' | CADASTRO DA LOCACAO DO VEICULO: ' . $request->input('veiculo_id')
            );

            return redirect()
                ->route('admin.frota.locacoes.index')
                ->with('success', 'Locação criada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao cadastrar locação: ', ['error' => $e->getMessage()]);
            return back()->withInput()->with('error', 'Erro ao cadastrar a locação.');
        }
    }

    public function edit(VeiculoLocacao $locacao): InertiaResponse
    {
        $locacao->load(['veiculo', 'obraOrigem', 'obraDestino', 'funcionario', 'funcionarioDestino']);

        return Inertia::render('Admin/Frota/Locacoes/Form', [
            'locacao'      => $locacao,
            'veiculos'     => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'nun_serie_chassi', 'veiculo', 'marca', 'modelo', 'tipo', 'tipo_hr', 'imagem']),
            'obras'        => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'codigo_obra']),
            'funcionarios' => Funcionario::orderBy('nome')->get(['id', 'nome', 'imagem_usuario']),
        ]);
    }

    public function update(Request $request, VeiculoLocacao $locacao): RedirectResponse
    {
        try {
            $data = $this->validar($request);
            $data['user_edit'] = Auth::user()?->email;

            $locacao->update($data);

            Log::channel('main')->info(
                'Alterado por: ' . (Auth::user()?->email ?? 'sistema') .
                ' | EDIT LOCACAO: ' . $locacao->id
            );

            return redirect()
                ->route('admin.frota.locacoes.index')
                ->with('success', 'Locação atualizada com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao editar locação: ', ['error' => $e->getMessage()]);
            return back()->withInput()->with('error', 'Erro ao editar a locação.');
        }
    }

    public function destroy(VeiculoLocacao $locacao): RedirectResponse
    {
        try {
            Log::channel('main')->info(
                'Deletado por: ' . (Auth::user()?->email ?? 'sistema') .
                ' | DELETE LOCACAO: ' . $locacao->id
            );
            $locacao->delete();
            return back()->with('success', 'Locação removida com sucesso.');
        } catch (\Throwable $e) {
            Log::error('Erro ao excluir locação: ', ['error' => $e->getMessage()]);
            return back()->with('error', 'Erro ao excluir a locação.');
        }
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
     * Stream da foto do funcionário (proxy OneDrive ou placeholder SVG).
     * Mantém a mesma estética do streamer de imagens de veículo.
     */
    public function funcionarioFoto(Funcionario $funcionario)
    {
        if (!$funcionario->imagem_usuario) {
            return $this->placeholderUsuarioSvg();
        }

        $body = FileUploadHelper::openFileStream($funcionario->imagem_usuario);
        if (!$body) {
            return $this->placeholderUsuarioSvg();
        }

        $ext  = strtolower(pathinfo($funcionario->imagem_usuario, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'gif'         => 'image/gif',
            'webp'        => 'image/webp',
            'bmp'         => 'image/bmp',
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

    protected function validar(Request $request): array
    {
        return $request->validate([
            'id_obra'                => 'nullable|exists:obras,id',
            'veiculo_id'             => 'required|exists:veiculos,id',
            'id_obraDestino'         => 'nullable|exists:obras,id',
            'id_funcionario'         => 'nullable|exists:funcionarios,id',
            'id_funcionario_destino' => 'nullable|exists:funcionarios,id',
            'tipo_veiculo'           => 'nullable|string|max:30',
            'data_inicio'            => 'nullable|date',
            'data_prevista'          => 'nullable|date',
            'data_fim'               => 'nullable|date',
        ]);
    }
}
