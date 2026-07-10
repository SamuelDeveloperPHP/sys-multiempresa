<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use App\Models\Frota\Combustivel;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Funcionario;
use App\Models\Obra;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class VeiculoAbastecimentoController extends Controller
{
    /**
     * PAINEL do gerente (layout do diário): gastos e CO₂ da frota por veículo,
     * com curva ABC (os que mais gastam / mais emitem). Toda a frota com
     * abastecimento; filtros opcionais (GET): busca textual e obra (locação
     * ativa, data_fim NULL, id_obraDestino). CRUD de lançamento preservado.
     */
    public function index(Request $request): InertiaResponse
    {
        $termo  = trim((string) $request->input('q', ''));
        $obraId = (int) $request->input('obra_id') ?: null;

        // Conjunto de veículos considerado (para o filtro de busca/obra).
        // Sem filtro, todos; a agregação restringe naturalmente aos com dados.
        $restringir = null; // null = sem restrição
        if ($termo !== '' || $obraId) {
            $vq = Veiculo::query();
            if ($obraId) {
                $vq->whereHas('locacoes', fn ($q) => $q->whereNull('data_fim')->where('id_obraDestino', $obraId));
            }
            if ($termo !== '') {
                $like = '%' . $termo . '%';
                $vq->where(function ($q) use ($like) {
                    $q->where('prefixo', 'like', $like)->orWhere('placa', 'like', $like)
                        ->orWhere('modelo', 'like', $like)->orWhere('marca', 'like', $like)
                        ->orWhere('veiculo', 'like', $like)->orWhere('nun_serie_chassi', 'like', $like);
                });
            }
            $restringir = $vq->pluck('id')->all();
        }

        // Agregação por (veículo, combustível): litros/gasto/CO₂ dependem do fator.
        $combById = Combustivel::all()->keyBy('id');
        $agg = VeiculoAbastecimento::query()
            ->whereNotNull('veiculo_id')
            ->when($restringir !== null, fn ($q) => $q->whereIn('veiculo_id', $restringir ?: [0]))
            ->selectRaw('veiculo_id, id_combustivel, combustivel, SUM(quantidade) litros, SUM(valor_total) gasto, COUNT(*) n')
            ->groupBy('veiculo_id', 'id_combustivel', 'combustivel')
            ->get();

        $porVeic = [];
        foreach ($agg as $r) {
            $vid = $r->veiculo_id;
            [$ff, $bb] = $this->co2Abastecimento($r->id_combustivel, $r->combustivel, (float) $r->litros, $combById);
            $porVeic[$vid] ??= ['litros' => 0.0, 'gasto' => 0.0, 'n' => 0, 'co2_fossil' => 0.0, 'co2_bio' => 0.0];
            $porVeic[$vid]['litros']     += (float) $r->litros;
            $porVeic[$vid]['gasto']      += (float) $r->gasto;
            $porVeic[$vid]['n']          += (int) $r->n;
            $porVeic[$vid]['co2_fossil'] += $ff;
            $porVeic[$vid]['co2_bio']    += $bb;
        }

        $infos = Veiculo::whereIn('id', array_keys($porVeic) ?: [0])
            ->get(['id', 'prefixo', 'placa', 'marca', 'modelo', 'veiculo', 'nun_serie_chassi'])->keyBy('id');

        $veiculos = collect($porVeic)->map(function ($v, $id) use ($infos) {
            $inf = $infos->get($id);
            return [
                'id'           => (int) $id,
                'prefixo'      => $inf?->prefixo ?? '—',
                'veiculo'      => $inf?->veiculo ?: (trim(($inf?->marca ?? '') . ' ' . ($inf?->modelo ?? '')) ?: '—'),
                'placa_chassi' => $inf?->placa ?: ($inf?->nun_serie_chassi ?: '—'),
                'litros'       => round($v['litros'], 2),
                'gasto'        => round($v['gasto'], 2),
                'abastecimentos' => $v['n'],
                'co2_fossil'   => round($v['co2_fossil'], 2),
                'co2_bio'      => round($v['co2_bio'], 2),
            ];
        })->values();

        $totais = [
            'veiculos'   => $veiculos->count(),
            'litros'     => round($veiculos->sum('litros'), 2),
            'gasto'      => round($veiculos->sum('gasto'), 2),
            'co2_fossil' => round($veiculos->sum('co2_fossil'), 2),
            'co2_bio'    => round($veiculos->sum('co2_bio'), 2),
            'registros'  => (int) $veiculos->sum('abastecimentos'),
        ];

        return Inertia::render('Admin/Frota/Abastecimentos/Index', [
            'veiculos' => $veiculos,
            'totais'   => $totais,
            'obras'    => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia', 'code']),
            'filtros'  => ['q' => $termo, 'obra_id' => $obraId],
            'agora'    => now()->format('d/m/Y H:i:s'),
        ]);
    }

    /** CO₂ [fóssil, biogênico] de um volume de combustível (kg). */
    private function co2Abastecimento(?int $idComb, ?string $nome, float $litros, $combById): array
    {
        if ($idComb && ($c = $combById->get($idComb))) {
            return [$c->co2FossilPorLitro() * $litros, $c->co2BiogenicoPorLitro() * $litros];
        }
        // Fallback p/ registros legados sem vínculo (fator simplificado por texto).
        $t = mb_strtolower(trim((string) $nome));
        $f = (str_contains($t, 'diesel') || str_contains($t, 's10') || str_contains($t, 's500')) ? 2.384
            : (str_contains($t, 'gasolina') ? 2.212 : 0.0);
        return [$litros * $f, 0.0];
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Abastecimentos/Form', [
            'abastecimento' => null,
            'veiculos'      => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'tipo_hr', 'tipo_km']),
            'obras'         => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios'  => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validar($request);
        $data['id_local'] = $data['id_local'] ?? (string) Str::uuid();
        VeiculoAbastecimento::create($data);
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento registrado.');
    }

    public function edit(VeiculoAbastecimento $abastecimento): InertiaResponse
    {
        return Inertia::render('Admin/Frota/Abastecimentos/Form', [
            'abastecimento' => $abastecimento,
            'veiculos'      => Veiculo::orderBy('prefixo')->get(['id', 'prefixo', 'placa', 'tipo_hr', 'tipo_km']),
            'obras'         => Obra::orderBy('nome_fantasia')->get(['id', 'nome_fantasia']),
            'funcionarios'  => Funcionario::orderBy('nome')->get(['id', 'nome']),
        ]);
    }

    public function update(Request $request, VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        $abastecimento->update($this->validar($request));
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento atualizado.');
    }

    public function destroy(VeiculoAbastecimento $abastecimento): RedirectResponse
    {
        $abastecimento->delete();
        return redirect()->route('admin.frota.abastecimentos.index')->with('success', 'Abastecimento removido.');
    }

    protected function validar(Request $request): array
    {
        return $request->validate([
            'veiculo_id'         => 'required|exists:veiculos,id',
            'id_obra'            => 'nullable|exists:obras,id',
            'id_funcionario'     => 'nullable|exists:funcionarios,id',
            'data_abastecimento' => 'required|date',
            'km_anterior'        => 'nullable|integer|min:0',
            'km_atual'           => 'nullable|integer|min:0',
            'hr_anterior'        => 'nullable|integer|min:0',
            'hr_atual'           => 'nullable|integer|min:0',
            'fornecedor'         => 'nullable|string|max:191',
            'combustivel'        => 'nullable|string|max:60',
            'tipo'               => 'nullable|string|max:30',
            'quantidade'         => 'required|numeric|min:0',
            'valor_do_litro'     => 'required|numeric|min:0',
            'valor_total'        => 'required|numeric|min:0',
            'arquivo_app'        => 'nullable|string|max:255',
        ]);
    }
}
