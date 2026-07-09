<?php

namespace App\Http\Controllers\Admin\Frota;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Proxy para a API pública da tabela FIPE (veiculos.fipe.org.br), usado pela
 * cascata Marca → Modelo → Ano → Valor no formulário de veículo.
 *
 * Portado do legado engeativos2 (FipeController), com duas melhorias:
 *  - a tabela de referência (que muda todo mês) deixa de ser hardcoded (311):
 *    buscamos a mais recente e cacheamos por 12h;
 *  - usa o Http client do Laravel em vez de instanciar Guzzle direto.
 *
 * A API não tem chave; o SSL do host costuma exigir withoutVerifying().
 */
class FipeController extends Controller
{
    private const BASE = 'https://veiculos.fipe.org.br/api/veiculos';

    /** POST no endpoint FIPE; devolve o JSON decodificado ou null em erro.
     *  O host bloqueia (403) requisições sem Referer/User-Agent de browser. */
    private function fipe(string $endpoint, array $payload): ?array
    {
        try {
            $res = Http::withoutVerifying()
                ->timeout(20)
                ->asJson()
                ->withHeaders([
                    'Referer'    => 'https://veiculos.fipe.org.br',
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                ])
                ->post(self::BASE . '/' . $endpoint, $payload);

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }

    /** Código da tabela de referência mais recente (cacheado 12h). */
    private function codigoTabelaAtual(): ?int
    {
        return Cache::remember('fipe:tabela_referencia_atual', now()->addHours(12), function () {
            $tabelas = $this->fipe('ConsultarTabelaDeReferencia', []);
            // A lista já vem da mais recente para a mais antiga.
            return $tabelas[0]['Codigo'] ?? null;
        });
    }

    /** Resolve o código da tabela: usa o enviado, senão a atual. */
    private function tabela(Request $request): ?int
    {
        return $request->filled('codigoTabelaReferencia')
            ? (int) $request->input('codigoTabelaReferencia')
            : $this->codigoTabelaAtual();
    }

    public function tabelaReferencia(): JsonResponse
    {
        return response()->json(['codigo' => $this->codigoTabelaAtual()]);
    }

    public function marcas(Request $request): JsonResponse
    {
        $data = $this->fipe('ConsultarMarcas', [
            'codigoTabelaReferencia' => $this->tabela($request),
            'codigoTipoVeiculo'      => (int) $request->input('codigoTipoVeiculo'),
        ]);
        return response()->json($data ?? [], $data === null ? 502 : 200);
    }

    public function modelos(Request $request): JsonResponse
    {
        $data = $this->fipe('ConsultarModelos', [
            'codigoTabelaReferencia' => $this->tabela($request),
            'codigoTipoVeiculo'      => (int) $request->input('codigoTipoVeiculo'),
            'codigoMarca'            => (int) $request->input('codigoMarca'),
        ]);
        return response()->json($data ?? ['Modelos' => []], $data === null ? 502 : 200);
    }

    public function anos(Request $request): JsonResponse
    {
        $data = $this->fipe('ConsultarAnoModelo', [
            'codigoTabelaReferencia' => $this->tabela($request),
            'codigoTipoVeiculo'      => (int) $request->input('codigoTipoVeiculo'),
            'codigoMarca'            => (int) $request->input('codigoMarca'),
            'codigoModelo'           => (int) $request->input('codigoModelo'),
        ]);
        return response()->json($data ?? [], $data === null ? 502 : 200);
    }

    /**
     * Valor + descrição. O "ano" da FIPE vem como "AnoModelo-CodigoCombustivel"
     * (ex.: "2015-3"); o último dígito é o tipo de combustível. Mesmo desmembramento
     * do legado.
     */
    public function valor(Request $request): JsonResponse
    {
        $ano = (string) $request->input('ano');
        $tipos = [1 => 'carro', 2 => 'moto', 3 => 'caminhao'];
        $codTipo = (int) $request->input('codigoTipoVeiculo');

        $data = $this->fipe('ConsultarValorComTodosParametros', [
            'codigoTabelaReferencia' => $this->tabela($request),
            'codigoTipoVeiculo'      => $codTipo,
            'codigoMarca'            => (int) $request->input('codigoMarca'),
            'codigoModelo'           => (int) $request->input('codigoModelo'),
            'ano'                    => $ano,
            'codigoTipoCombustivel'  => (int) (substr($ano, -1) ?: 1),
            'anoModelo'              => (int) substr($ano, 0, 4),
            'tipoVeiculo'            => $tipos[$codTipo] ?? 'carro',
            'tipoConsulta'           => 'tradicional',
        ]);
        return response()->json($data ?? [], $data === null ? 502 : 200);
    }
}
