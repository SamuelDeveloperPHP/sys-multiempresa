<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoPreventiva;
use App\Models\Frota\VeiculoPreventivaItem;
use App\Models\Frota\VeiculoPreventivaItemRealizada;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Plano de manutencao preventiva = cabecalho (veiculo + nome) + N linhas de servico.
 * Cada linha tem periodo/tipo/situacao proprios (importado do legado engeativos2).
 */
class VeiculoPreventivaController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $query = VeiculoPreventiva::query()
            ->with('veiculo:id,prefixo,placa')
            ->withCount(['itens', 'itensRealizados']);
        if ($v = $request->input('veiculo_id'))  $query->where('id_veiculo', $v);
        if ($q = $request->string('q')->value())  $query->where('nome_preventiva', 'like', "%{$q}%");

        return Inertia::render('Admin/Frota/Preventivas/Index', [
            'preventivas' => $query->orderBy('nome_preventiva')->paginate(20)->withQueryString(),
            'veiculos'    => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
            'filtros'     => $request->only(['veiculo_id', 'q']),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Form', [
            'preventiva' => null,
            'veiculos'   => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);

        DB::transaction(function () use ($data) {
            $preventiva = VeiculoPreventiva::create([
                'id_veiculo'      => $data['id_veiculo'] ?? null,
                'nome_preventiva' => $data['nome_preventiva'],
                'situacao'        => $data['situacao'] ?? 'Ativo',
                'user_create'     => Auth::user()?->email,
            ]);

            $this->sincronizarItens($preventiva, $data['itens']);
        });

        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva cadastrada.');
    }

    public function show(VeiculoPreventiva $preventiva): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Show', [
            'preventiva' => $preventiva->load(['veiculo:id,prefixo,placa', 'itens']),
            'historico'  => VeiculoPreventivaItemRealizada::where('id_preventiva', $preventiva->id)
                ->orderByDesc('data_de_execucao')->get(),
        ]);
    }

    public function edit(VeiculoPreventiva $preventiva): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Preventivas/Form', [
            'preventiva' => $preventiva->load('itens'),
            'veiculos'   => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa']),
        ]);
    }

    public function update(Request $request, VeiculoPreventiva $preventiva): RedirectResponse
    {
        $data = $this->validar($request);

        DB::transaction(function () use ($preventiva, $data) {
            $preventiva->update([
                'id_veiculo'      => $data['id_veiculo'] ?? null,
                'nome_preventiva' => $data['nome_preventiva'],
                'situacao'        => $data['situacao'] ?? $preventiva->situacao,
                'user_edit'       => Auth::user()?->email,
            ]);

            $this->sincronizarItens($preventiva, $data['itens']);
        });

        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva atualizada.');
    }

    public function destroy(VeiculoPreventiva $preventiva): RedirectResponse
    {
        $preventiva->delete();
        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva removida.');
    }

    /**
     * Duplica o plano (cabecalho + itens) com sufixo "_copia".
     */
    public function duplicar(VeiculoPreventiva $preventiva): RedirectResponse
    {
        DB::transaction(function () use ($preventiva) {
            $preventiva->loadMissing('itens');

            $nova = $preventiva->replicate(['user_edit', 'data_sincronizacao']);
            $nova->nome_preventiva = $preventiva->nome_preventiva . '_copia';
            $nova->situacao        = 'Ativo';
            $nova->sync_status     = 0;
            $nova->user_create     = Auth::user()?->email;
            $nova->save();

            foreach ($preventiva->itens as $item) {
                $novoItem = $item->replicate(['user_edit']);
                $novoItem->id_preventiva = $nova->id;
                $novoItem->user_create   = Auth::user()?->email;
                $novoItem->save();
            }
        });

        return redirect()->route('admin.frota.preventivas.index')->with('success', 'Preventiva duplicada.');
    }

    /**
     * Sincroniza as linhas de servico do plano:
     *   - id presente e pertencente ao plano  -> atualiza
     *   - sem id                               -> cria
     *   - id existente ausente no payload      -> soft-delete (removido na UI)
     */
    protected function sincronizarItens(VeiculoPreventiva $preventiva, array $itens): void
    {
        $enviadosComId = collect($itens)->pluck('id')->filter()->all();

        // Remove os que sairam da tela.
        $preventiva->itens()
            ->when($enviadosComId, fn ($q) => $q->whereNotIn('id', $enviadosComId))
            ->delete();

        foreach ($itens as $it) {
            $payload = [
                'id_veiculo'      => $preventiva->id_veiculo,
                'nome_servico'    => $it['nome_servico'],
                'situacao'        => $it['situacao'],
                'periodo_maq_vei' => $it['periodo_maq_vei'] ?? null,
                'alerta_venci'    => $it['alerta_venci'] ?? null,
                'tipo_itens'      => $it['tipo_itens'],
                'periodo_mes'     => $it['periodo_mes'] ?? null,
                'alert_venc_mes'  => $it['alert_venc_mes'] ?? null,
            ];

            $existente = ! empty($it['id'])
                ? $preventiva->itens()->whereKey($it['id'])->first()
                : null;

            if ($existente) {
                $existente->update($payload + ['user_edit' => Auth::user()?->email]);
            } else {
                $preventiva->itens()->create($payload + ['user_create' => Auth::user()?->email]);
            }
        }
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'id_veiculo'             => 'nullable|exists:veiculos,id',
            'nome_preventiva'        => 'required|string|max:191',
            'situacao'               => 'nullable|string|max:30',

            'itens'                  => 'required|array|min:1',
            'itens.*.id'             => 'nullable|integer',
            'itens.*.nome_servico'   => 'required|string|max:250',
            'itens.*.situacao'       => 'required|in:1,2,3',
            'itens.*.tipo_itens'     => 'required|in:km,hr,tmp',
            'itens.*.periodo_maq_vei'=> 'nullable|integer|min:0',
            'itens.*.alerta_venci'   => 'nullable|integer|min:0',
            'itens.*.periodo_mes'    => 'nullable|integer|min:0',
            'itens.*.alert_venc_mes' => 'nullable|integer|min:0',
        ], [
            'itens.required'             => 'Adicione ao menos um serviço.',
            'itens.*.nome_servico.required' => 'O nome do serviço é obrigatório.',
            'itens.*.situacao.required'  => 'Selecione a situação do serviço.',
            'itens.*.tipo_itens.required'=> 'Selecione o tipo do serviço.',
        ]);
    }
}
