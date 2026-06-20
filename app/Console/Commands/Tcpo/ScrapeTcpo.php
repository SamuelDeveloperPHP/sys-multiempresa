<?php

namespace App\Console\Commands\Tcpo;

use App\Services\Tcpo\TcpoWebClient;
use Illuminate\Console\Command;

/**
 * Scraper server-side do TCPOweb (PINI). Login-replay (Guzzle) + postbacks.
 *
 * Construído em estágios para de-riscar:
 *   php artisan tcpo:scrape --test-login           # só autentica
 *   php artisan tcpo:scrape --test-search=06.101   # autentica + busca + conta
 *
 * (A varredura completa + parse de detalhe + harvest entram depois que estes
 *  estágios validarem o protocolo contra o site real.)
 *
 * Credenciais no .env (TCPO_USUARIO / TCPO_SENHA).
 */
class ScrapeTcpo extends Command
{
    protected $signature = 'tcpo:scrape
                            {--test-login   : Apenas autentica e reporta}
                            {--test-search= : Autentica, busca o termo/código e conta os resultados}
                            {--test-detail= : Busca o termo, abre a 1a composição e salva o HTML do detalhe}
                            {--termo=       : Varre 1 termo de busca (grupo/código) por inteiro → harvest}
                            {--out=         : JSON de saída (default: storage/app/tcpo/scrape/<termo>.json)}
                            {--limite=      : Limita N composições (teste)}';

    protected $description = 'Raspa composições/insumos do TCPOweb (server-side, login-replay)';

    public function handle(): int
    {
        $client = new TcpoWebClient();

        // -------- LOGIN --------
        $this->info('Autenticando no TCPOweb…');
        try {
            $client->ensureAuth();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
            $body = $client->lastBody;
            if ($body !== '') {
                $debug = storage_path('app/tcpo/login-debug.html');
                @mkdir(dirname($debug), 0775, true);
                file_put_contents($debug, $body);
                $this->newLine();
                $this->line('Diagnóstico da última resposta:');
                $this->line('  tamanho: ' . strlen($body) . ' bytes');
                $this->line('  tem "Sair"/Logout: ' . ((stripos($body, 'Logout.aspx') !== false || preg_match('/>\s*Sair\s*</i', $body)) ? 'sim' : 'não'));
                $this->line('  tem txtSenha/btnAcessar: ' . ((stripos($body, 'txtSenha') !== false || stripos($body, 'btnAcessar') !== false) ? 'sim' : 'não'));
                foreach (['inválid', 'incorret', 'senha', 'expirou', 'bloquead', 'erro'] as $pista) {
                    if (preg_match('/[^<>]{0,60}' . preg_quote($pista, '/') . '[^<>]{0,60}/i', strip_tags($body), $mm)) {
                        $this->line('  pista: …' . trim(preg_replace('/\s+/', ' ', $mm[0])) . '…');
                        break;
                    }
                }
                $this->line('  HTML salvo em: ' . $debug);
            }
            return self::FAILURE;
        }
        $this->info('✓ Login OK (sessão ativa).');

        if ($this->option('test-login')) {
            return self::SUCCESS;
        }

        // -------- BUSCA (enumeração) --------
        if ($termo = $this->option('test-search')) {
            $this->line("Abrindo a tela de busca…");
            $pagina = $client->get('/PesqServicosTreeView.aspx');

            $this->line("Buscando por <info>{$termo}</info>…");
            $resultado = $client->postback('/PesqServicosTreeView.aspx', $pagina, [
                'ctl00$MainContent$txtBusca'                 => $termo,
                'ctl00$MainContent$imgBtnPesquisaServico.x'  => '12',
                'ctl00$MainContent$imgBtnPesquisaServico.y'  => '12',
            ]);

            $amostraOut = storage_path('app/tcpo/scrape-result.html');
            @mkdir(dirname($amostraOut), 0775, true);
            file_put_contents($amostraOut, $resultado);

            $codigos = $this->extrairCodigos($resultado);
            $this->info('✓ Resultados (página 1): ' . count($codigos));
            foreach (array_slice($codigos, 0, 8) as $c) {
                $this->line('   ' . $c);
            }

            // Detecta paginação (links numéricos de página)
            $paginas = $this->contarPaginas($resultado);
            if ($paginas > 1) {
                $this->line("   Paginação detectada: ~{$paginas} páginas");
            }
            if (empty($codigos)) {
                $this->warn('Nenhum código extraído — o HTML de resultado pode ter outro formato. Salvando amostra para inspeção.');
                $amostra = storage_path('app/tcpo/scrape-debug.html');
                @mkdir(dirname($amostra), 0775, true);
                file_put_contents($amostra, $resultado);
                $this->line('   Amostra: ' . $amostra);
            }
            return self::SUCCESS;
        }

        // -------- DETALHE (abrir 1 composição) --------
        if ($termo = $this->option('test-detail')) {
            $parser = new \App\Services\Tcpo\TcpoParser();
            $pagina = $client->get('/PesqServicosTreeView.aspx');
            $resultado = $client->postback('/PesqServicosTreeView.aspx', $pagina, [
                'ctl00$MainContent$txtBusca'                 => $termo,
                'ctl00$MainContent$imgBtnPesquisaServico.x'  => '12',
                'ctl00$MainContent$imgBtnPesquisaServico.y'  => '12',
            ]);
            $info = $parser->resultados($resultado);
            $this->line("Resultados: {$info['total']} itens, {$info['paginas']} páginas, " . count($info['rows']) . ' linhas na pág.1');
            if (empty($info['rows'])) {
                $this->error('Nenhuma linha extraída.');
                return self::FAILURE;
            }
            $alvo = $info['rows'][0];
            $this->line("Abrindo: <info>{$alvo['codigo']}</info> (target: {$alvo['target']})");
            $detalhe = $client->postback('/PesqServicosTreeView.aspx', $resultado, [
                '__EVENTTARGET' => $alvo['target'],
            ]);
            $out = storage_path('app/tcpo/scrape-detail.html');
            @mkdir(dirname($out), 0775, true);
            file_put_contents($out, $detalhe);
            $this->info('✓ Detalhe salvo (' . strlen($detalhe) . ' bytes): ' . $out);
            $this->line('  tem "Exportar para Excel": ' . (stripos($detalhe, 'Exportar para Excel') !== false ? 'sim' : 'não'));
            $this->line('  tem tabela Coef/Consumo: ' . ((stripos($detalhe, 'Coef') !== false && stripos($detalhe, 'Consumo') !== false) ? 'sim' : 'não'));
            return self::SUCCESS;
        }

        // -------- VARREDURA de 1 termo --------
        if ($termo = $this->option('termo')) {
            $parser = new \App\Services\Tcpo\TcpoParser();
            $limite = $this->option('limite') ? (int) $this->option('limite') : null;

            $dir = storage_path('app/tcpo/scrape');
            @mkdir($dir, 0775, true);
            $slug = preg_replace('/[^0-9A-Za-z._-]+/', '_', $termo);
            $jsonl = "{$dir}/{$slug}.jsonl";
            $out = $this->option('out') ?: "{$dir}/{$slug}.json";

            // Resume: códigos já colhidos
            $done = [];
            if (is_file($jsonl)) {
                foreach (file($jsonl, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $ln) {
                    $o = json_decode($ln, true);
                    if (isset($o['codigo'])) $done[$o['codigo']] = true;
                }
                if ($done) $this->line('  resume: ' . count($done) . ' já colhidas (serão puladas)');
            }

            $this->info("Varrendo termo: {$termo}");
            $n = $this->crawlTermo($client, $parser, $termo, $limite, $jsonl, $done);

            // Monta o harvest JSON a partir do JSONL
            $comps = [];
            foreach (file($jsonl, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $ln) {
                $o = json_decode($ln, true);
                if ($o) $comps[] = $o;
            }
            file_put_contents($out, json_encode([
                'base'         => 'TCPO',
                'escopo'       => "Busca: {$termo}",
                'gerado_de'    => 'scrape',
                'composicoes'  => $comps,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            $this->newLine();
            $this->info("✓ Varredura concluída: {$n} novas, " . count($comps) . ' no total');
            $this->line('  JSONL (resume): ' . $jsonl);
            $this->line('  Harvest JSON:   ' . $out);
            $this->line('  Importar: <comment>php artisan tcpo:importar ' . $out . '</comment>');
            return self::SUCCESS;
        }

        $this->warn('Use --test-login, --test-search, --test-detail ou --termo=CODIGO.');
        return self::SUCCESS;
    }

    /**
     * Varre um termo de busca por inteiro: pagina o GridView e abre+parseia cada
     * composição. Append em JSONL (resumível). Retorna nº de NOVAS colhidas.
     */
    protected function crawlTermo($client, $parser, string $termo, ?int $limite, string $jsonl, array &$done): int
    {
        $pagina = $client->get('/PesqServicosTreeView.aspx');
        $pageHtml = $client->postback('/PesqServicosTreeView.aspx', $pagina, [
            'ctl00$MainContent$txtBusca'                 => $termo,
            'ctl00$MainContent$imgBtnPesquisaServico.x'  => '12',
            'ctl00$MainContent$imgBtnPesquisaServico.y'  => '12',
        ]);
        $info = $parser->resultados($pageHtml);
        $this->line("  {$info['total']} itens em {$info['paginas']} página(s)");

        $n = 0;
        for ($pg = 1; $pg <= max(1, $info['paginas']); $pg++) {
            if ($pg > 1) {
                $pageHtml = $client->postback('/PesqServicosTreeView.aspx', $pageHtml, [
                    '__EVENTTARGET'   => 'ctl00$MainContent$gvServicos',
                    '__EVENTARGUMENT' => 'Page$' . $pg,
                ]);
            }
            $rows = $parser->resultados($pageHtml)['rows'];
            foreach ($rows as $row) {
                if (isset($done[$row['codigo']])) continue;
                if ($limite !== null && $n >= $limite) return $n;
                try {
                    $detalhe = $client->postback('/PesqServicosTreeView.aspx', $pageHtml, [
                        '__EVENTTARGET' => $row['target'],
                    ]);
                    // Sessão caiu no meio? (voltou o form de login)
                    if (stripos($detalhe, 'txtSenha') !== false && stripos($detalhe, 'Coef') === false) {
                        throw new \RuntimeException('sessao_perdida');
                    }
                    $comp = $parser->detalhe($detalhe);
                    if (empty($comp['codigo'])) $comp['codigo'] = $row['codigo'];
                    file_put_contents($jsonl, json_encode($comp, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND);
                    $done[$comp['codigo']] = true;
                    $n++;
                    if ($n % 10 === 0) {
                        $this->line("    {$n} colhidas (pág {$pg}/{$info['paginas']})…");
                    }
                } catch (\Throwable $e) {
                    \Log::warning("[tcpo:scrape] falha em {$row['codigo']}: {$e->getMessage()}");
                }
            }
        }
        return $n;
    }

    /** Extrai os códigos PINI (ex.: "3R 05 12 00 00 00 00 06 18") do HTML. */
    protected function extrairCodigos(string $html): array
    {
        $texto = preg_replace('/<[^>]+>/', ' ', $html);
        $texto = html_entity_decode($texto, ENT_QUOTES | ENT_HTML5);
        preg_match_all('/\b\dR(?:\s+\d{2}){6,12}\b/', $texto, $m);
        return array_values(array_unique(array_map(fn ($s) => preg_replace('/\s+/', ' ', trim($s)), $m[0])));
    }

    /** Estima nº de páginas pela maior etiqueta de página numérica. */
    protected function contarPaginas(string $html): int
    {
        if (preg_match('/Página\s+\d+\s+de\s+(\d+)/i', $html, $m)) {
            return (int) $m[1];
        }
        return 1;
    }
}
