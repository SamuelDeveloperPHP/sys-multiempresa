<?php

namespace App\Services\LeroyMerlin;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Encapsula chamadas à API pública da Leroy Merlin + Algolia.
 *
 * NÃO faz acesso ao banco — o Job orquestra persistência. Aqui só
 * é HTTP + parsing puro, facilita testar.
 *
 * Endpoints usados:
 *  - /api/v3/categories/tree                                  (árvore raiz)
 *  - /api/boitata/v1/modularContents/{id}/modules             (subníveis)
 *  - /api/boitata/v1/categories/{id}/products                 (produtos diretos)
 *  - Algolia: POST em /1/indexes/(asterisco)/queries          (fallback paginado)
 */
class LeroyMerlinScraper
{
    private string $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
    private string $algoliaAppId = '1CF3ZT43ZU';
    private string $algoliaApiKey = '150c68d1c61fc1835826a57a203dab72';
    private string $algoliaIndex = 'production_products';
    private string $algoliaHost = 'https://1cf3zt43zu-dsn.algolia.net';
    private int $perPageAlgolia = 250;
    private int $sleepMs = 1000; // entre requests
    private int $timeout = 60;
    private string $regiao = 'curitiba';

    public function __construct(array $overrides = [])
    {
        // Credenciais vêm do config (env) — a Leroy rotaciona a api_key.
        $this->algoliaAppId  = (string) config('leroy.algolia.app_id', $this->algoliaAppId);
        $this->algoliaApiKey = (string) config('leroy.algolia.api_key', $this->algoliaApiKey);
        $this->algoliaIndex  = (string) config('leroy.algolia.index', $this->algoliaIndex);
        $this->regiao        = (string) config('leroy.algolia.regiao', $this->regiao);
        // Host do Algolia é derivado do app_id (DSN em minúsculas).
        $this->algoliaHost   = 'https://' . strtolower($this->algoliaAppId) . '-dsn.algolia.net';

        foreach ($overrides as $k => $v) {
            if (property_exists($this, $k)) {
                $this->$k = $v;
            }
        }
    }

    /* ----------------------------------------------------------------------
     * Endpoints
     * --------------------------------------------------------------------*/

    /**
     * Lê a árvore raiz de categorias da Leroy.
     *
     * @return array<int, array{leroy_id:string,nome:string}>
     */
    public function fetchCategoryTree(): array
    {
        $url = 'https://www.leroymerlin.com.br/api/v3/categories/tree';
        $data = $this->getJson($url);
        $this->sleep();

        $resultados = [];
        if (!isset($data['data']['results']) || !is_array($data['data']['results'])) {
            return $resultados;
        }

        foreach ($data['data']['results'] as $grupo) {
            if (!isset($grupo['items']) || !is_array($grupo['items'])) {
                continue;
            }
            foreach ($grupo['items'] as $item) {
                if (!isset($item['id'])) continue;
                $resultados[] = [
                    'leroy_id' => (string) $item['id'],
                    'nome'     => $item['name'] ?? 'Sem Nome',
                ];
            }
        }
        return $resultados;
    }

    /**
     * Lê as primárias filhas de uma categoria principal.
     *
     * @return array<int, array{leroy_id:string,nome:string}>
     */
    public function fetchPrimariasOf(string $leroyPrincipalId): array
    {
        return $this->fetchSubcategoriaModular($leroyPrincipalId);
    }

    /**
     * Lê as secundárias filhas de uma primária.
     *
     * @return array<int, array{leroy_id:string,nome:string}>
     */
    public function fetchSecundariasOf(string $leroyPrimariaId): array
    {
        return $this->fetchSubcategoriaModular($leroyPrimariaId);
    }

    /**
     * Lê os produtos de uma categoria secundária.
     * Tenta primeiro a API boitata; se vazio E houver categoryPageId, cai pro Algolia.
     *
     * @return array<int, array{leroy_id:string,nome:string,marca:?string,valor:float,unidade:string,imagem_url:?string}>
     */
    public function fetchProductsOf(string $leroySecundariaId): array
    {
        $url = "https://www.leroymerlin.com.br/api/boitata/v1/categories/{$leroySecundariaId}/products?perPage=300&page=1&sort=best-seller";
        $data = $this->getJson($url);
        $this->sleep();

        $lista = $data['products'] ?? $data['items'] ?? $data['results'] ?? $data['data']['results'] ?? [];

        // Caminho 1: boitata retornou produtos diretos
        if (!empty($lista)) {
            return array_values(array_filter(array_map(
                fn ($p) => $this->normalizeProductFromBoitata($p),
                $lista
            )));
        }

        // Caminho 2: boitata vazio mas tem categoryPageId → Algolia paginado
        if (!isset($data['categoryPageId'])) {
            return [];
        }

        $caminhoCategoria = trim(str_replace(['categoryPageId: ', '"'], '', $data['categoryPageId']));
        return $this->fetchProductsViaAlgolia($caminhoCategoria);
    }

    /**
     * Baixa imagem do produto e salva em storage/app/public/{destDir}/{filename}.
     *
     * @return string|null path relativo (sem o "public/") ou null se falhar.
     */
    public function downloadImage(?string $url, string $destDir): ?string
    {
        if (!$url) return null;

        try {
            $filename = strtok(basename($url), '?');
            $relativePath = trim($destDir, '/') . '/' . $filename;

            // Cache: se já existe não baixa de novo
            if (Storage::disk('public')->exists($relativePath)) {
                return $relativePath;
            }

            $response = Http::withOptions(['verify' => false])
                ->timeout(15)
                ->withUserAgent($this->userAgent)
                ->get($url);

            if (!$response->successful()) {
                return null;
            }

            Storage::disk('public')->put($relativePath, $response->body());
            return $relativePath;
        } catch (\Throwable $e) {
            Log::warning('Falha ao baixar imagem Leroy', ['url' => $url, 'erro' => $e->getMessage()]);
            return null;
        }
    }

    /* ----------------------------------------------------------------------
     * Internas
     * --------------------------------------------------------------------*/

    private function fetchSubcategoriaModular(string $leroyId): array
    {
        $url = "https://www.leroymerlin.com.br/api/boitata/v1/modularContents/{$leroyId}/modules?page=1&device=desktop";
        $data = $this->getJson($url);
        $this->sleep();

        $items = $data['results'][0]['items'] ?? [];
        $out = [];
        foreach ($items as $item) {
            if (!isset($item['id'])) continue;
            $out[] = [
                'leroy_id' => (string) $item['id'],
                'nome'     => $item['name'] ?? 'Sem Nome',
            ];
        }
        return $out;
    }

    private function fetchProductsViaAlgolia(string $caminhoCategoria): array
    {
        $produtos = [];
        $page = 0;
        $totalPaginas = 1;

        do {
            try {
                $response = Http::withOptions(['verify' => false])
                    ->timeout($this->timeout)
                    ->withHeaders([
                        'x-algolia-application-id' => $this->algoliaAppId,
                        'x-algolia-api-key'        => $this->algoliaApiKey,
                        'Content-Type'             => 'application/json',
                        'Accept'                   => 'application/json',
                        'User-Agent'               => $this->userAgent,
                    ])
                    ->post("{$this->algoliaHost}/1/indexes/*/queries", [
                        'requests' => [[
                            'indexName'   => $this->algoliaIndex,
                            'hitsPerPage' => $this->perPageAlgolia,
                            'page'        => $page,
                            'query'       => '',
                            'filters'     => "regionalAttributes.{$this->regiao}.available=1 AND categoryPageId: \"{$caminhoCategoria}\"",
                            'facets'      => ['*'],
                        ]],
                    ]);

                $data = $response->json();
                $totalPaginas = $data['results'][0]['nbPages'] ?? 1;
                $hits = $data['results'][0]['hits'] ?? [];

                foreach ($hits as $hit) {
                    $normalizado = $this->normalizeProductFromAlgolia($hit);
                    if ($normalizado) $produtos[] = $normalizado;
                }

                unset($data, $hits);
                gc_collect_cycles();
                $page++;
                $this->sleep();
            } catch (\Throwable $e) {
                Log::warning('Falha página Algolia', ['categoria' => $caminhoCategoria, 'page' => $page, 'erro' => $e->getMessage()]);
                break;
            }
        } while ($page < $totalPaginas);

        return $produtos;
    }

    /**
     * Faz GET com retry exponencial leve (3 tentativas) e retorna JSON decodificado.
     */
    private function getJson(string $url): array
    {
        $response = $this->http()
            ->retry(3, 1000, function ($exception, $request) {
                return $exception instanceof \Illuminate\Http\Client\ConnectionException
                    || ($exception instanceof \Illuminate\Http\Client\RequestException
                        && in_array($exception->response->status(), [429, 500, 502, 503, 504], true));
            })
            ->get($url);

        if (!$response->successful()) {
            throw new \RuntimeException("HTTP {$response->status()} em {$url}");
        }

        $json = $response->json();
        return is_array($json) ? $json : [];
    }

    private function http(): PendingRequest
    {
        return Http::withOptions(['verify' => false])
            ->timeout($this->timeout)
            ->withUserAgent($this->userAgent)
            ->withHeaders(['Accept' => 'application/json, text/plain, */*']);
    }

    private function sleep(): void
    {
        if ($this->sleepMs > 0) {
            usleep($this->sleepMs * 1000);
        }
    }

    private function normalizeProductFromBoitata(array $p): ?array
    {
        if (!isset($p['id'])) return null;
        return [
            'leroy_id'   => (string) $p['id'],
            'nome'       => $p['name'] ?? 'Produto sem nome',
            'marca'      => $this->extrairMarca($p),
            'valor'      => $this->parsePrice($p['price']['from'] ?? $p['price'] ?? 0),
            'unidade'    => $p['unit'] ?? 'UN',
            'imagem_url' => $p['picture'] ?? null,
        ];
    }

    private function normalizeProductFromAlgolia(array $p): ?array
    {
        $id = $p['objectID'] ?? $p['id'] ?? null;
        if (!$id) return null;

        $preco = $p['regionalAttributes'][$this->regiao]['promotionalPrice']
              ?? $p['regionalAttributes'][$this->regiao]['price']
              ?? $p['medianPromotionalPrice']
              ?? $p['averagePromotionalPrice']
              ?? $p['price']
              ?? 0;

        return [
            'leroy_id'   => (string) $id,
            'nome'       => $p['name'] ?? 'Produto sem nome',
            'marca'      => $this->extrairMarca($p),
            'valor'      => $this->parsePrice($preco),
            'unidade'    => $p['unit'] ?? 'UN',
            'imagem_url' => $p['pictures']['normal']
                         ?? $p['pictures']['big']
                         ?? $p['picture']
                         ?? $p['defaultImageUrl']
                         ?? null,
        ];
    }

    private function extrairMarca(array $p): ?string
    {
        if (isset($p['attributes']['Marca'][0])) return (string) $p['attributes']['Marca'][0];
        if (isset($p['brand']['name']))          return (string) $p['brand']['name'];
        if (isset($p['brand']) && !is_array($p['brand'])) return (string) $p['brand'];
        return null;
    }

    /**
     * Aceita: numero direto, ['integers'=>x,'decimals'=>y], ['default'=>x], ['from'=>...]
     */
    private function parsePrice(mixed $price): float
    {
        if (is_numeric($price)) return (float) $price;
        if (!is_array($price))  return 0.0;

        if (isset($price['integers'])) {
            return floatval(($price['integers'] ?? '0') . '.' . ($price['decimals'] ?? '00'));
        }
        if (isset($price['default'])) {
            return (float) $price['default'];
        }
        if (isset($price['from'])) {
            return is_array($price['from']) ? $this->parsePrice($price['from']) : (float) $price['from'];
        }
        return 0.0;
    }
}
