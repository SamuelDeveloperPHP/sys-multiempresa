<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Fornecedor;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoDocLegal;
use App\Models\Frota\VeiculoDocTecnico;
use App\Models\Frota\VeiculoIpva;
use App\Models\Frota\VeiculoManutencao;
use App\Models\Frota\VeiculoSeguro;
use App\Models\Funcionario;
use App\Models\Obra;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * DashboardController — port do legacy `pages.dashboard.index` /
 * `pages.dashboard.partials.dashboard_admin`.
 *
 * O legacy era focado em ferramentas calibradas (Engeativos). Como o
 * sys-multiempresa não tem esse domínio, a estrutura visual foi mantida
 * (5 KPIs no topo, tabela de vencimentos, 4 gráficos) mas os dados foram
 * adaptados para o domínio de FROTA já existente.
 */
class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $currentCompanyId = session('current_company_id');
        $currentCompany   = $currentCompanyId ? Company::find($currentCompanyId) : null;

        // Empresas vinculadas ao usuário (legado: drop-down de troca de empresa)
        $companies = $user->companies()->orderBy('name')->get();

        /* ============================================================
         * KPIs (porta as 5 cards do legacy: empresas, obras,
         * funcionários, fornecedores, veículos).
         * Todos os modelos usam Tenantable → já contam só os da empresa
         * atual selecionada.
         * ============================================================ */
        $kpis = [
            'empresas'     => $user->companies()->count(),
            'obras'        => Obra::count(),
            'funcionarios' => Funcionario::count(),
            'fornecedores' => Fornecedor::count(),
            'veiculos'     => Veiculo::count(),
        ];

        /* ============================================================
         * Vencimentos próximos / vencidos (porta a tabela de calibração
         * vencida do legacy). Unifica IPVA, Seguro, Doc Legal e Doc
         * Técnico em uma única lista, com janela de 60 dias para frente
         * e qualquer item já vencido.
         * ============================================================ */
        $hoje    = now()->startOfDay();
        $janela  = $hoje->copy()->addDays(60);

        $vencimentos = collect();

        VeiculoIpva::with('veiculo:id,prefixo,placa,obra_id')
            ->whereNotNull('data_de_vencimento')
            ->where('data_de_vencimento', '<=', $janela)
            ->get()
            ->each(function ($r) use (&$vencimentos, $hoje) {
                $vencimentos->push($this->mapVencimento('IPVA', $r->veiculo, $r->data_de_vencimento, $hoje, [
                    'descricao' => 'IPVA ' . ($r->referencia_ano ?? ''),
                ]));
            });

        VeiculoSeguro::with('veiculo:id,prefixo,placa,obra_id')
            ->whereNotNull('carencia_final')
            ->where('carencia_final', '<=', $janela)
            ->get()
            ->each(function ($r) use (&$vencimentos, $hoje) {
                $vencimentos->push($this->mapVencimento('Seguro', $r->veiculo, $r->carencia_final, $hoje, [
                    'descricao' => $r->nome_seguradora ?? 'Seguro',
                ]));
            });

        VeiculoDocLegal::with('veiculo:id,prefixo,placa,obra_id')
            ->whereNotNull('data_validade')
            ->where('data_validade', '<=', $janela)
            ->get()
            ->each(function ($r) use (&$vencimentos, $hoje) {
                $vencimentos->push($this->mapVencimento('Doc Legal', $r->veiculo, $r->data_validade, $hoje, [
                    'descricao' => $r->titulo ?? 'Doc legal',
                ]));
            });

        VeiculoDocTecnico::with('veiculo:id,prefixo,placa,obra_id')
            ->whereNotNull('data_validade')
            ->where('data_validade', '<=', $janela)
            ->get()
            ->each(function ($r) use (&$vencimentos, $hoje) {
                $vencimentos->push($this->mapVencimento('Doc Técnico', $r->veiculo, $r->data_validade, $hoje, [
                    'descricao' => $r->titulo ?? 'Doc técnico',
                ]));
            });

        // Atrela nome_fantasia da obra a partir do veiculo->obra_id
        $obrasMap = Obra::pluck('nome_fantasia', 'id');
        $vencimentos = $vencimentos
            ->filter(fn ($v) => $v !== null)
            ->map(function ($v) use ($obrasMap) {
                $v['obra'] = $v['obra_id'] ? ($obrasMap[$v['obra_id']] ?? '—') : '—';
                return $v;
            })
            ->sortBy('dias_restantes')
            ->values()
            ->all();

        /* ============================================================
         * Gráfico 1 — Custo de manutenção mensal (12 meses, ano atual)
         *   Substitui o "Relatório Mensal" do legado.
         * ============================================================ */
        $anoAtual = now()->year;
        $mesesFmt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        $custoMensal = array_fill(0, 12, 0.0);

        VeiculoManutencao::whereYear('data_de_execucao', $anoAtual)
            ->get(['data_de_execucao', 'valor_do_servico'])
            ->each(function ($m) use (&$custoMensal) {
                if ($m->data_de_execucao) {
                    $custoMensal[$m->data_de_execucao->month - 1] += (float) $m->valor_do_servico;
                }
            });
        $custoMensal = array_map(fn ($v) => round($v, 2), $custoMensal);

        /* ============================================================
         * Gráfico 2 — Veículos por obra (substitui "Ferramentas por Obra")
         * ============================================================ */
        $veiculosPorObra = Veiculo::query()
            ->selectRaw('obras.nome_fantasia as obra, COUNT(veiculos.id) as total')
            ->leftJoin('obras', 'obras.id', '=', 'veiculos.obra_id')
            ->groupBy('obras.id', 'obras.nome_fantasia')
            ->orderByDesc('total')
            ->limit(12)
            ->get()
            ->map(fn ($r) => ['obra' => $r->obra ?? 'Sem obra', 'total' => (int) $r->total])
            ->all();

        /* ============================================================
         * Gráfico 3 — Distribuição de veículos por situação
         *   Substitui o doughnut "Ferramentas Calibradas".
         * ============================================================ */
        $veiculosPorSituacao = Veiculo::query()
            ->selectRaw('COALESCE(situacao, "Não informado") as situacao, COUNT(*) as total')
            ->groupBy('situacao')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['situacao' => $r->situacao, 'total' => (int) $r->total])
            ->all();

        /* ============================================================
         * Gráfico 4 — Manutenções por obra (qtd vs custo)
         *   Substitui o "Ferramentas Calibradas por Obra" (agrupado).
         * ============================================================ */
        $manutPorObra = VeiculoManutencao::query()
            ->selectRaw('obras.nome_fantasia as obra,
                         COUNT(veiculo_manutencaos.id) as qtd,
                         COALESCE(SUM(veiculo_manutencaos.valor_do_servico), 0) as custo')
            ->leftJoin('obras', 'obras.id', '=', 'veiculo_manutencaos.id_obra')
            ->groupBy('obras.id', 'obras.nome_fantasia')
            ->orderByDesc('qtd')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'obra'  => $r->obra ?? 'Sem obra',
                'qtd'   => (int) $r->qtd,
                'custo' => round((float) $r->custo, 2),
            ])
            ->all();

        return Inertia::render('Admin/Dashboard', [
            'companies'       => $companies,
            'currentCompany'  => $currentCompany,
            'kpis'            => $kpis,
            'vencimentos'     => $vencimentos,
            'charts'          => [
                'custo_mensal'         => [
                    'ano'    => $anoAtual,
                    'meses'  => $mesesFmt,
                    'valores' => $custoMensal,
                ],
                'veiculos_por_obra'    => $veiculosPorObra,
                'veiculos_por_situacao'=> $veiculosPorSituacao,
                'manutencoes_por_obra' => $manutPorObra,
            ],
        ]);
    }

    /**
     * Normaliza uma linha de vencimento em estrutura comum p/ o front.
     * Retorna null se faltar veículo ou data.
     */
    protected function mapVencimento(string $tipo, ?Veiculo $veiculo, $data, $hoje, array $extra = []): ?array
    {
        if (!$veiculo || !$data) return null;

        $dias = (int) $hoje->diffInDays($data, false);

        return array_merge([
            'tipo'             => $tipo,
            'veiculo_id'       => $veiculo->id,
            'prefixo'          => $veiculo->prefixo,
            'placa'            => $veiculo->placa,
            'obra_id'          => $veiculo->obra_id,
            'data_vencimento'  => $data->format('Y-m-d'),
            'dias_restantes'   => $dias,
        ], $extra);
    }
}
