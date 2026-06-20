<?php

namespace App\Http\Controllers\Admin\Estoque;

use App\Helpers\CompanyContext;
use App\Http\Controllers\Controller;
use App\Models\Estoque\Devolucao;
use App\Models\Estoque\Movimentacao;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Comprovantes imprimíveis (HTML standalone + @media print).
 *
 * Não usa Inertia/React — devolve blade puro porque:
 *   - Janela de impressão precisa ser auto-contida (sem layout do app).
 *   - O usuário usa Ctrl+P para salvar como PDF se quiser.
 *   - Não há nova dependência (sem dompdf).
 *
 * Tipos:
 *   - movimentacao(Movimentacao): 1 movimentação (saída ou devolução)
 *   - lote(Request): N saídas (uso típico: retirada rápida)
 *   - devolucao(Devolucao): registro de devolução do workflow
 */
class ComprovanteController extends Controller
{
    /**
     * GET /admin/estoque/comprovantes/movimentacao/{movimentacao}
     * Comprovante para uma única movimentação (SAIDA ou DEVOLUCAO).
     */
    public function movimentacao(Movimentacao $movimentacao): View
    {
        $this->ensureCompany($movimentacao->company_id);

        $movimentacao->load([
            'produto:id,sku,nome,unidade,imagem,tipo_item',
            'obra:id,codigo_obra,nome_fantasia',
            'retiranteFuncionario:id,nome,matricula,cpf,imagem_usuario',
            'retirante:id,name,email',
            'origem:id,tipo,data_movimento,quantidade',
            'variante:id,cor,tamanho',
            'lote:id,numero_ca,numero_lote,validade,especificacao_tecnica',
        ]);

        return view('estoque.comprovantes.movimentacao', [
            'mov'      => $movimentacao,
            'operador' => Auth::user(),
            'empresa'  => CompanyContext::current(),
            'titulo'   => $this->tituloPorTipo($movimentacao->tipo),
        ]);
    }

    /**
     * GET /admin/estoque/comprovantes/lote?ids=1,2,3
     * Múltiplas movimentações no mesmo papel (usado pelo fluxo de retirada rápida).
     */
    public function lote(Request $request): View
    {
        $ids = collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn ($x) => (int) trim($x))
            ->filter()->unique()->values()->all();

        abort_if(empty($ids), 404, 'Nenhum comprovante para listar.');

        $companyId = CompanyContext::current()?->id;

        $movs = Movimentacao::query()
            ->whereIn('id', $ids)
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->with([
                'produto:id,sku,nome,unidade',
                'obra:id,codigo_obra,nome_fantasia',
                'retiranteFuncionario:id,nome,matricula,cpf',
                'retirante:id,name,email',
                'variante:id,cor,tamanho',
                'lote:id,numero_ca,numero_lote,validade',
            ])
            ->orderBy('id')
            ->get();

        abort_if($movs->isEmpty(), 404, 'Comprovantes não encontrados.');

        return view('estoque.comprovantes.lote', [
            'movs'     => $movs,
            'operador' => Auth::user(),
            'empresa'  => CompanyContext::current(),
        ]);
    }

    /**
     * GET /admin/estoque/comprovantes/devolucao/{devolucao}
     * Comprovante específico do registro de Devolução (modelo do workflow).
     */
    public function devolucao(Devolucao $devolucao): View
    {
        $this->ensureCompany($devolucao->company_id);

        $devolucao->load([
            'produto:id,sku,nome,unidade,imagem',
            'obra:id,codigo_obra,nome_fantasia',
            'funcionarioObra:id,nome,matricula,cpf',
            'funcionario:id,name,email',
            'aprovador:id,name,email',
            'movimentacaoSaida:id,data_movimento,quantidade',
            'movimentacaoGerada:id,tipo,quantidade,data_movimento',
        ]);

        return view('estoque.comprovantes.devolucao', [
            'dev'      => $devolucao,
            'operador' => Auth::user(),
            'empresa'  => CompanyContext::current(),
        ]);
    }

    /* ===================================================================== */

    protected function ensureCompany(?int $companyId): void
    {
        $current = CompanyContext::current()?->id;
        abort_if($current && $companyId && $current !== (int) $companyId, 403);
    }

    protected function tituloPorTipo(string $tipo): string
    {
        return match ($tipo) {
            Movimentacao::TIPO_SAIDA      => 'COMPROVANTE DE RETIRADA',
            Movimentacao::TIPO_DEVOLUCAO  => 'COMPROVANTE DE DEVOLUÇÃO',
            Movimentacao::TIPO_ENTRADA    => 'COMPROVANTE DE ENTRADA',
            Movimentacao::TIPO_TRANSF_OUT => 'COMPROVANTE DE TRANSFERÊNCIA (SAÍDA)',
            Movimentacao::TIPO_TRANSF_IN  => 'COMPROVANTE DE TRANSFERÊNCIA (ENTRADA)',
            default                        => 'COMPROVANTE DE MOVIMENTAÇÃO',
        };
    }
}
