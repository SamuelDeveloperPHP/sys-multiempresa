<?php

namespace App\Console\Commands\Tcpo;

use Illuminate\Console\Command;

/**
 * Parseia uma pasta de planilhas .xlsx exportadas do TCPOweb ("Exportar para
 * Excel") e gera o JSON de colheita consumido por `tcpo:importar`.
 *
 * Cada export contém UMA composição: cabeçalho (código, descrição, região,
 * data, unidade via Quantidade), a tabela de itens (Código | Descrição | Class
 * | Un | Coef | Preço unitário | Total | Consumo), os totais e o Memorial
 * Descritivo. NÃO traz código EAP alternativo nem o tipo — esses ficam nulos
 * (são preenchidos quando a colheita é feita pelo navegador, que lê o
 * cabeçalho da tela).
 *
 * Usa apenas ZipArchive + SimpleXML (xlsx é um zip) — sem PhpSpreadsheet.
 *
 * Uso:
 *   php artisan tcpo:colher-xlsx storage/app/tcpo
 *   php artisan tcpo:colher-xlsx storage/app/tcpo --out=storage/app/tcpo/cap06.json --escopo="Capítulo 06 - Alvenarias"
 */
class ColherXlsx extends Command
{
    protected $signature = 'tcpo:colher-xlsx
                            {pasta              : Pasta com os .xlsx exportados do TCPOweb}
                            {--out=             : JSON de saída (default: <pasta>/harvest.json)}
                            {--base=TCPO        : Base de origem}
                            {--escopo=          : Rótulo do escopo (ex.: "Capítulo 06 - Alvenarias")}';

    protected $description = 'Parseia exports xlsx do TCPOweb (pasta) → JSON de colheita para tcpo:importar';

    public function handle(): int
    {
        $pasta = $this->resolverPasta((string) $this->argument('pasta'));
        if (!$pasta) {
            $this->error('Pasta não encontrada: ' . $this->argument('pasta'));
            return self::FAILURE;
        }

        $arquivos = glob(rtrim($pasta, '/\\') . DIRECTORY_SEPARATOR . '*.xlsx') ?: [];
        // ignora artefatos temporários (ex.: ~$arquivo.xlsx)
        $arquivos = array_values(array_filter($arquivos, fn ($f) => !str_starts_with(basename($f), '~$')));

        if (empty($arquivos)) {
            $this->error("Nenhum .xlsx em {$pasta}");
            return self::FAILURE;
        }

        $this->info('=== Colheita xlsx → JSON ===');
        $this->line("Pasta: <info>{$pasta}</info> (" . count($arquivos) . ' arquivos)');

        $composicoes = [];
        $regiao = null;
        $data = null;
        $falhas = 0;

        $bar = $this->output->createProgressBar(count($arquivos));
        $bar->start();
        foreach ($arquivos as $arq) {
            try {
                $comp = $this->parseXlsx($arq);
                if ($comp && $comp['codigo'] !== '') {
                    $composicoes[] = $comp;
                    $regiao = $regiao ?? ($comp['preco_regiao'] ?? null);
                    $data = $data ?? ($comp['preco_data'] ?? null);
                } else {
                    $falhas++;
                }
            } catch (\Throwable $e) {
                $falhas++;
                $this->newLine();
                $this->warn('Falha em ' . basename($arq) . ': ' . $e->getMessage());
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        $saida = [
            'base'         => (string) $this->option('base'),
            'preco_regiao' => $regiao,
            'preco_data'   => $data,
            'escopo'       => $this->option('escopo') ?: null,
            'gerado_de'    => 'xlsx',
            'categorias'   => [],
            'composicoes'  => $composicoes,
        ];

        $out = $this->option('out')
            ? $this->resolverSaida((string) $this->option('out'))
            : rtrim($pasta, '/\\') . DIRECTORY_SEPARATOR . 'harvest.json';

        file_put_contents($out, json_encode($saida, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $this->info('=== Colheita concluída ===');
        $this->line('  Composições: <info>' . count($composicoes) . '</info>' . ($falhas ? ", <comment>{$falhas} falhas</comment>" : ''));
        $this->line('  JSON: <info>' . $out . '</info>');
        $this->newLine();
        $this->line('Próximo passo: <comment>php artisan tcpo:importar ' . $out . ' --dry-run</comment>');

        return self::SUCCESS;
    }

    // -----------------------------------------------------------------------

    /** Lê um xlsx do TCPOweb e devolve a estrutura de uma composição. */
    protected function parseXlsx(string $arquivo): ?array
    {
        $grid = $this->lerGrid($arquivo);
        if (empty($grid)) {
            return null;
        }

        $comp = [
            'codigo'            => '',
            'codigo_alt'        => null,
            'tipo'              => null,
            'unidade'           => null,
            'descricao'         => '',
            'categoria_path'    => null,
            'preco_regiao'      => null,
            'preco_data'        => null,
            'total_sem_taxas'   => null,
            'total_com_taxas'   => null,
            'total_mod'         => null,
            'total_mat'         => null,
            'total_eqp'         => null,
            'memorial_conteudo' => null,
            'memorial_criterio' => null,
            'memorial_normas'   => null,
            'itens'             => [],
        ];

        $headerRow = null;
        $maxRow = max(array_keys($grid));

        for ($r = 1; $r <= $maxRow; $r++) {
            $a = $this->cell($grid, $r, 'A');
            $f = $this->cell($grid, $r, 'F');

            if ($a !== '') {
                if ($this->comecaCom($a, 'Código:')) {
                    $comp['codigo'] = $this->depoisDosDoisPontos($a);
                } elseif ($this->comecaCom($a, 'Descrição:')) {
                    $comp['descricao'] = $this->depoisDosDoisPontos($a);
                } elseif ($this->comecaCom($a, 'Região de preços:')) {
                    $comp['preco_regiao'] = $this->depoisDosDoisPontos($a);
                } elseif ($this->comecaCom($a, 'Data de referência de preços:')) {
                    $comp['preco_data'] = $this->depoisDosDoisPontos($a);
                } elseif ($this->comecaCom($a, 'Quantidade:')) {
                    // "Quantidade: 1m²    LS(%): 130   BDI(%): 0"
                    if (preg_match('/Quantidade:\s*[\d.,]+\s*([^\s]+)/u', $a, $m)) {
                        $comp['unidade'] = trim($m[1]);
                    }
                } elseif ($a === 'Código' && $this->cell($grid, $r, 'B') === 'Descrição') {
                    $headerRow = $r;
                } elseif ($a === 'CONTEÚDO DO SERVIÇO') {
                    $comp['memorial_conteudo'] = $this->cell($grid, $r + 1, 'A') ?: null;
                } elseif ($a === 'CRITÉRIO DE MEDIÇÃO') {
                    $comp['memorial_criterio'] = $this->cell($grid, $r + 1, 'A') ?: null;
                } elseif ($a === 'NORMAS TÉCNICAS') {
                    $comp['memorial_normas'] = $this->cell($grid, $r + 1, 'A') ?: null;
                } elseif ($this->comecaCom($a, 'Com taxas:')) {
                    $comp['total_com_taxas'] = $this->cell($grid, $r, 'B');
                }
            }

            if ($f !== '') {
                if ($this->comecaCom($f, 'Total mão-de-obra')) {
                    $comp['total_mod'] = $this->cell($grid, $r, 'G');
                } elseif ($this->comecaCom($f, 'Total outros itens')) {
                    $comp['total_mat'] = $this->cell($grid, $r, 'G'); // material + equipamento
                } elseif ($this->comecaCom($f, 'Total geral')) {
                    $comp['total_sem_taxas'] = $this->cell($grid, $r, 'G');
                }
            }
        }

        // Itens: linhas após o cabeçalho da tabela, enquanto a coluna A tiver código.
        if ($headerRow !== null) {
            $classeAtual = null;
            for ($r = $headerRow + 1; $r <= $maxRow; $r++) {
                $codigo = $this->cell($grid, $r, 'A');
                $coef   = $this->cell($grid, $r, 'E');
                if ($codigo === '' || $coef === '') {
                    break; // fim do bloco de itens (totais começam aqui)
                }
                $classe = $this->cell($grid, $r, 'C');
                if ($classe !== '') {
                    $classeAtual = $classe;
                }
                $comp['itens'][] = [
                    'codigo'         => $codigo,
                    'descricao'      => $this->cell($grid, $r, 'B'),
                    'classe'         => $classe !== '' ? $classe : $classeAtual,
                    'unidade'        => $this->cell($grid, $r, 'D'),
                    'coeficiente'    => $coef,
                    'preco_unitario' => $this->cell($grid, $r, 'F'),
                    'total'          => $this->cell($grid, $r, 'G'),
                    'consumo'        => $this->cell($grid, $r, 'H'),
                ];
            }
        }

        return $comp;
    }

    /** Lê o xlsx num grid [linha][coluna] => texto. */
    protected function lerGrid(string $arquivo): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($arquivo) !== true) {
            throw new \RuntimeException('não consegui abrir o zip');
        }

        // shared strings
        $shared = [];
        $ss = $zip->getFromName('xl/sharedStrings.xml');
        if ($ss !== false) {
            $xml = new \SimpleXMLElement($ss);
            foreach ($xml->si as $si) {
                // concatena todos os <t> (texto simples ou rich-text com runs)
                $txt = '';
                foreach ($si->xpath('.//*[local-name()="t"]') as $t) {
                    $txt .= (string) $t;
                }
                $shared[] = $txt;
            }
        }

        // primeira planilha
        $sheetName = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $nome = $zip->getNameIndex($i);
            if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $nome)) {
                $sheetName = $nome;
                break;
            }
        }
        if (!$sheetName) {
            $zip->close();
            throw new \RuntimeException('planilha não encontrada no xlsx');
        }
        $sheetXml = new \SimpleXMLElement($zip->getFromName($sheetName));
        $zip->close();

        $grid = [];
        foreach ($sheetXml->sheetData->row as $row) {
            $rNum = (int) $row['r'];
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];            // ex.: "B10"
                $col = preg_replace('/\d+/', '', $ref);
                $tipo = (string) $c['t'];
                $val = '';
                if ($tipo === 's') {
                    $idx = (int) $c->v;
                    $val = $shared[$idx] ?? '';
                } elseif ($tipo === 'inlineStr') {
                    $val = (string) ($c->is->t ?? '');
                } else {
                    $val = (string) $c->v;
                }
                $grid[$rNum][$col] = trim($val);
            }
        }
        return $grid;
    }

    protected function cell(array $grid, int $row, string $col): string
    {
        return $grid[$row][$col] ?? '';
    }

    protected function comecaCom(string $haystack, string $needle): bool
    {
        return str_starts_with($haystack, $needle);
    }

    /** "Código:   3R 05 12..." => "3R 05 12...". */
    protected function depoisDosDoisPontos(string $s): string
    {
        $pos = strpos($s, ':');
        return $pos === false ? trim($s) : trim(substr($s, $pos + 1));
    }

    protected function resolverPasta(string $arg): ?string
    {
        foreach ([$arg, base_path($arg), storage_path($arg)] as $cand) {
            if (is_dir($cand)) {
                return $cand;
            }
        }
        return null;
    }

    protected function resolverSaida(string $arg): string
    {
        // Se for caminho absoluto/existente-relativo, usa; senão relativo à raiz.
        if (preg_match('#^[A-Za-z]:[\\\\/]#', $arg) || str_starts_with($arg, '/')) {
            return $arg;
        }
        return base_path($arg);
    }
}
