<?php

namespace App\Services\Funcionario;

use App\Models\FuncionarioFuncao;
use App\Models\FuncionarioSetor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;
use Symfony\Component\Process\Process;

/**
 * Extrai os dados do cadastro de funcionário a partir da
 * "Ficha de Registro de Empregado" (página 1 do kit de documentos),
 * SEM usar IA.
 *
 * Fontes suportadas:
 *  - PDF com camada de texto  -> smalot/pdfparser (PHP puro)
 *  - Imagem / foto / scan      -> Tesseract OCR (binário externo)
 *
 * Devolve um array no formato:
 *  [
 *    'ok'        => bool,                 // qualidade adequada p/ preencher?
 *    'fonte'     => 'pdf_texto'|'ocr',
 *    'qualidade' => ['adequada'=>bool, 'confianca'=>float, 'nivel'=>string, 'problemas'=>[]],
 *    'campos'    => ['nome'=>['valor'=>..,'confianca'=>..,'encontrado'=>..], ...],
 *  ]
 */
class FichaRegistroExtractor
{
    private PdfParser $pdf;

    public function __construct()
    {
        $this->pdf = new PdfParser();
    }

    public function extrair(UploadedFile $file): array
    {
        $ext  = strtolower($file->getClientOriginalExtension());
        $mime = (string) $file->getMimeType();
        $isPdf = $ext === 'pdf' || str_contains($mime, 'pdf');

        if ($isPdf) {
            $texto = $this->lerPdf($file);

            if ($this->textoInsuficiente($texto)) {
                // PDF escaneado/imagem (sem camada de texto): rasteriza e lê por OCR.
                $ocr = $this->lerPdfOcr($file->getRealPath());

                if (is_array($ocr) && isset($ocr['erro'])) {
                    return $this->respostaErro('ocr', $ocr['erro']);
                }
                if ($ocr === null) {
                    return $this->respostaErro(
                        'ocr',
                        'Este PDF não possui texto (é escaneado/imagem) e o OCR não está disponível no servidor. '
                        . 'Instale o Tesseract OCR (idioma "por") + um rasterizador (Ghostscript ou Poppler), '
                        . 'ou envie a Ficha de Registro como PDF digital (com texto).'
                    );
                }

                $texto   = $ocr['texto'];
                $confOcr = $ocr['confianca'];
                $fonte   = 'ocr';
            } else {
                $fonte   = 'pdf_texto';
                $confOcr = null;
            }
        } else {
            // Imagem -> OCR
            $ocr = $this->lerImagemOcr($file);
            if ($ocr === null) {
                return $this->respostaErro(
                    'ocr',
                    'OCR indisponível: o Tesseract não está instalado/configurado no servidor. '
                    . 'Instale o Tesseract OCR (pacote de idioma "por") ou envie a Ficha como PDF digital.'
                );
            }
            $texto   = $ocr['texto'];
            $confOcr = $ocr['confianca']; // 0..1
            $fonte   = 'ocr';
        }

        $campos    = $this->parseFicha($texto, $fonte, $confOcr);
        $qualidade = $this->avaliarQualidade($texto, $campos, $fonte, $confOcr);

        return [
            'ok'        => $qualidade['adequada'],
            'fonte'     => $fonte,
            'qualidade' => $qualidade,
            'campos'    => $campos,
        ];
    }

    // ----------------------------------------------------------------- LEITURA

    /** Lê o texto de TODAS as páginas do PDF (a Ficha costuma ser a pág. 1). */
    private function lerPdf(UploadedFile $file): string
    {
        try {
            $doc = $this->pdf->parseFile($file->getRealPath());
            return $this->normalizarEspacos((string) $doc->getText());
        } catch (\Throwable $e) {
            Log::warning('func_import.pdf_parse_falhou', ['msg' => $e->getMessage()]);
            return '';
        }
    }

    /** OCR de uma imagem enviada pelo usuário. */
    private function lerImagemOcr(UploadedFile $file): ?array
    {
        return $this->ocrEmImagem($file->getRealPath());
    }

    /**
     * Lê um PDF-imagem (escaneado) por OCR: rasteriza as primeiras páginas e
     * lê cada uma, parando assim que reconhece a Ficha de Registro.
     * Retorna ['texto','confianca'], null (sem Tesseract) ou ['erro'=>msg].
     */
    private function lerPdfOcr(string $pdfPath): null|array
    {
        // Sem Tesseract não há OCR possível.
        if ($this->resolverTesseractBin(config('funcionario_import.tesseract.bin', 'tesseract')) === null) {
            return null;
        }

        $max  = max(1, (int) config('funcionario_import.ocr_max_paginas', 3));
        $pngs = $this->rasterizarPdf($pdfPath, $max);

        if (empty($pngs)) {
            return ['erro' => 'O PDF é uma imagem (escaneado) e não há rasterizador disponível para o OCR. '
                . 'Instale o Ghostscript ou o Poppler (pdftoppm) no servidor.'];
        }

        try {
            $melhor = null;
            foreach ($pngs as $png) {
                $ocr = $this->ocrEmImagem($png);
                if ($ocr === null) {
                    continue;
                }
                if ($this->contemAncora($ocr['texto'])) {
                    return $ocr; // achou a página da Ficha
                }
                if ($melhor === null || $ocr['confianca'] > $melhor['confianca']) {
                    $melhor = $ocr;
                }
            }
            return $melhor;
        } finally {
            foreach ($pngs as $png) {
                if (is_file($png)) {
                    @unlink($png);
                }
            }
        }
    }

    /**
     * OCR via Tesseract sobre um caminho de imagem. Pré-trata com GD
     * (cinza + upscale) e usa a saída TSV para calcular a confiança média.
     * Retorna ['texto'=>string, 'confianca'=>float] ou null se o binário falhar.
     */
    private function ocrEmImagem(string $imgPath): ?array
    {
        $cfg = config('funcionario_import.tesseract');
        $bin = $this->resolverTesseractBin($cfg['bin'] ?? 'tesseract');
        if ($bin === null) {
            return null;
        }

        $entrada = $this->preTratarImagem($imgPath);

        try {
            $args = [
                $bin, $entrada, 'stdout',
                '-l', (string) ($cfg['lang'] ?? 'por'),
                '--psm', (string) ($cfg['psm'] ?? '4'),
                'tsv',
            ];

            $proc = new Process($args);
            $proc->setTimeout((float) ($cfg['timeout'] ?? 60));
            $proc->run();

            if (! $proc->isSuccessful()) {
                Log::warning('func_import.tesseract_falhou', [
                    'exit'   => $proc->getExitCode(),
                    'stderr' => $proc->getErrorOutput(),
                ]);
                return null;
            }

            return $this->parseTsv($proc->getOutput());
        } catch (\Throwable $e) {
            Log::warning('func_import.tesseract_excecao', ['msg' => $e->getMessage()]);
            return null;
        } finally {
            if ($entrada !== $imgPath && is_file($entrada)) {
                @unlink($entrada);
            }
        }
    }

    /** Rasteriza as primeiras $max páginas do PDF em PNG. Devolve os caminhos. */
    private function rasterizarPdf(string $pdfPath, int $max): array
    {
        $cfg    = config('funcionario_import.rasterizador');
        $raster = $this->resolverRasterizador($cfg['bin'] ?? '');
        if ($raster === null) {
            return [];
        }

        $dpi     = (int) ($cfg['dpi'] ?? 300);
        $timeout = (float) ($cfg['timeout'] ?? 120);

        // Prefixo de saída exclusivo (sem extensão).
        $prefixo = tempnam(sys_get_temp_dir(), 'pdfras_');
        @unlink($prefixo);

        try {
            if ($raster['tipo'] === 'pdftoppm') {
                $args = [
                    $raster['bin'], '-png', '-r', (string) $dpi,
                    '-f', '1', '-l', (string) $max, $pdfPath, $prefixo,
                ];
            } else { // ghostscript
                $args = [
                    $raster['bin'], '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER',
                    '-sDEVICE=png16m', '-r' . $dpi,
                    '-dFirstPage=1', '-dLastPage=' . $max,
                    '-sOutputFile=' . $prefixo . '-%d.png', $pdfPath,
                ];
            }

            $proc = new Process($args);
            $proc->setTimeout($timeout);
            $proc->run();

            if (! $proc->isSuccessful()) {
                Log::warning('func_import.raster_falhou', [
                    'tipo'   => $raster['tipo'],
                    'stderr' => $proc->getErrorOutput(),
                ]);
                return [];
            }

            $saidas = glob(str_replace('\\', '/', $prefixo) . '*.png') ?: [];
            sort($saidas);
            return array_slice($saidas, 0, $max);
        } catch (\Throwable $e) {
            Log::warning('func_import.raster_excecao', ['msg' => $e->getMessage()]);
            return [];
        }
    }

    /** Resolve o rasterizador (config -> PATH -> caminhos comuns). Tipo: pdftoppm|ghostscript. */
    private function resolverRasterizador(string $bin): ?array
    {
        $tipoDe = fn (string $b) => str_contains(strtolower(basename($b)), 'pdftoppm') ? 'pdftoppm' : 'ghostscript';

        if ($bin !== '' && is_file($bin)) {
            return ['bin' => $bin, 'tipo' => $tipoDe($bin)];
        }

        $candidatos = [
            'pdftoppm' => 'pdftoppm',
            'gswin64c' => 'ghostscript',
            'gswin32c' => 'ghostscript',
            'gs'       => 'ghostscript',
        ];
        foreach ($candidatos as $cmd => $tipo) {
            if ($achado = $this->localizarNoPath($cmd)) {
                return ['bin' => $achado, 'tipo' => $tipo];
            }
        }

        // Caminhos comuns no Windows (barra normal funciona no PHP/Windows; glob não é recursivo).
        $padroesWin = [
            'C:/Program Files/poppler*/Library/bin/pdftoppm.exe' => 'pdftoppm',
            'C:/Program Files/poppler*/bin/pdftoppm.exe'         => 'pdftoppm',
            'C:/Program Files/gs/gs*/bin/gswin64c.exe'           => 'ghostscript',
            'C:/Program Files/gs/gs*/bin/gswin32c.exe'           => 'ghostscript',
        ];
        foreach ($padroesWin as $padrao => $tipo) {
            foreach (glob($padrao) ?: [] as $achado) {
                return ['bin' => $achado, 'tipo' => $tipo];
            }
        }

        return null;
    }

    /** Localiza o executável do Tesseract (config -> PATH -> caminho padrão Windows). */
    private function resolverTesseractBin(string $bin): ?string
    {
        if (($bin !== 'tesseract') && is_file($bin)) {
            return $bin;
        }

        if ($achado = $this->localizarNoPath($bin)) {
            return $achado;
        }

        $padrao = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
        return is_file($padrao) ? $padrao : null;
    }

    /** Procura um executável no PATH (where no Windows, which no *nix). */
    private function localizarNoPath(string $cmd): ?string
    {
        $localizador = stripos(PHP_OS, 'WIN') === 0 ? 'where' : 'which';
        try {
            $p = new Process([$localizador, $cmd]);
            $p->run();
            $saida = trim($p->getOutput());
            if ($p->isSuccessful() && $saida !== '') {
                return strtok($saida, "\r\n");
            }
        } catch (\Throwable $e) {
            // ignora
        }
        return null;
    }

    /** Pré-processa a imagem com GD para melhorar o OCR. Devolve caminho temporário (ou o original). */
    private function preTratarImagem(string $caminho): string
    {
        if (! function_exists('imagecreatefromstring')) {
            return $caminho;
        }

        $dados = @file_get_contents($caminho);
        $img   = $dados !== false ? @imagecreatefromstring($dados) : false;
        if ($img === false) {
            return $caminho;
        }

        $w = imagesx($img);
        $h = imagesy($img);

        // Upscale quando a imagem é pequena (ajuda muito o OCR).
        $escala = 1.0;
        if ($w < 1600) {
            $escala = min(2.5, 1600 / max(1, $w));
        }
        if ($escala > 1.01) {
            $nw  = (int) round($w * $escala);
            $nh  = (int) round($h * $escala);
            $novo = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($novo, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $novo;
        }

        imagefilter($img, IMG_FILTER_GRAYSCALE);
        imagefilter($img, IMG_FILTER_CONTRAST, -15);

        $tmp = tempnam(sys_get_temp_dir(), 'ocr_') . '.png';
        imagepng($img, $tmp);
        imagedestroy($img);

        return $tmp;
    }

    /** Converte o TSV do Tesseract em texto por linhas + confiança média (0..1). */
    private function parseTsv(string $tsv): array
    {
        $linhas = preg_split('/\r\n|\r|\n/', trim($tsv));
        $cabecalho = array_shift($linhas); // descarta header
        unset($cabecalho);

        $confs   = [];
        $buffer  = [];     // texto agrupado por (block,par,line)
        $atual   = null;

        foreach ($linhas as $linha) {
            $cols = explode("\t", $linha);
            if (count($cols) < 12) {
                continue;
            }
            $conf = (float) $cols[10];
            $txt  = trim($cols[11]);

            if ($txt === '') {
                continue;
            }

            $chave = $cols[2] . '/' . $cols[3] . '/' . $cols[4]; // block/par/line
            if ($chave !== $atual) {
                $buffer[] = "\n";
                $atual = $chave;
            }
            $buffer[] = $txt . ' ';

            if ($conf >= 0) {
                $confs[] = $conf;
            }
        }

        $texto    = $this->normalizarEspacos(implode('', $buffer));
        $confMedia = empty($confs) ? 0.0 : (array_sum($confs) / count($confs)) / 100.0;

        return ['texto' => $texto, 'confianca' => round($confMedia, 3)];
    }

    // -------------------------------------------------------------- PARSING

    /** Faz o parse dos campos a partir do texto bruto da Ficha de Registro. */
    private function parseFicha(string $texto, string $fonte, ?float $confOcr): array
    {
        // Recorta os blocos relevantes para reduzir falsos positivos.
        // (?!r) evita casar "Dados do Empregador/Empregador" (bloco do EMPREGADOR).
        $empregado = $this->trecho($texto, ['Dados do Empregado(?!r)'], ['Cadastro de Estrangeiro', 'Contrato de Trabalho']);
        $contrato  = $this->trecho($texto, ['Contrato de Trabalho'], ['Ficha Familiar', 'Data da dispensa']);

        // Se não achou os blocos (ex.: OCR bagunçado), usa o texto inteiro.
        if (trim($empregado) === '') {
            $empregado = $texto;
        }
        if (trim($contrato) === '') {
            $contrato = $texto;
        }

        $out = [];

        $out['nome']     = $this->capturar($empregado, ['Nome'], ['C[óo]digo', 'Nr\.?\s*Recibo', 'Pai', 'M[ãa]e']);
        $out['nome_mae'] = $this->capturar($empregado, ['M[ãa]e', 'Nome da m[ãa]e', 'Filia[çc][ãa]o'], ['Nascimento', 'Sexo', 'Pai']);
        $out['matricula'] = $this->capturar($empregado, ['C[óo]digo', 'Matr[íi]cula'], ['Nr\.?\s*Recibo', 'Pai', 'M[ãa]e']);

        // Sexo / gênero
        $sexo = $this->capturar($empregado, ['Sexo'], ['Est\.?\s*Civil', 'Ra[çc]a', 'Data', 'Nacionalidade']);
        $out['genero'] = $this->mapearGenero($sexo['valor']);
        $out['genero']['confianca'] = $sexo['confianca'];
        $out['genero']['encontrado'] = $sexo['encontrado'] && $out['genero']['valor'] !== '';

        // Estado civil
        $ec = $this->capturar($empregado, ['Est\.?\s*Civil', 'Estado Civil'], ['Ra[çc]a', 'Nacionalidade', 'Naturalidade', 'Sexo']);
        $out['estado_civil'] = $this->mapearEstadoCivil($ec['valor']);
        $out['estado_civil']['confianca'] = $ec['confianca'];
        $out['estado_civil']['encontrado'] = $ec['encontrado'] && $out['estado_civil']['valor'] !== '';

        // Endereço (pode vir "Rua X, 123") -> separa número
        $end = $this->capturar($empregado, ['Endere[çc]o'], ['Bairro', 'CEP', 'Munic[íi]pio', 'Complemento']);
        [$logr, $num] = $this->separarNumero($end['valor']);
        $out['endereco'] = ['valor' => $logr, 'confianca' => $end['confianca'], 'encontrado' => $end['encontrado'] && $logr !== ''];
        $out['numero']   = ['valor' => $num, 'confianca' => $end['confianca'], 'encontrado' => $num !== ''];

        $out['bairro'] = $this->capturar($empregado, ['Bairro'], ['CEP', 'Munic[íi]pio', 'Cidade']);
        $out['cep']    = $this->capturarPadrao($empregado, ['CEP'], '(\d{2}\.?\d{3}-?\d{3})');

        // Município "Cidade - UF"
        $mun = $this->capturar($empregado, ['Munic[íi]pio', 'Cidade'], ['CPF', 'RG', 'Estado', 'Naturalidade']);
        [$cidade, $uf] = $this->separarCidadeUf($mun['valor']);
        $out['cidade'] = ['valor' => $cidade, 'confianca' => $mun['confianca'], 'encontrado' => $mun['encontrado'] && $cidade !== ''];
        $out['estado'] = ['valor' => $uf, 'confianca' => $mun['confianca'], 'encontrado' => $uf !== ''];

        $out['cpf'] = $this->capturarPadrao($empregado, ['CPF'], '(\d{3}\.?\d{3}\.?\d{3}-?\d{2})');
        $out['rg']  = $this->capturarPadrao($empregado, ['RG', 'Registro Geral', 'DOC\.?\s*IDENT'], '([\dXx][\dXx.\-\/]{4,15})');
        $out['pis'] = $this->capturarPadrao($empregado, ['PIS', 'PIS/PASEP', 'NIT'], '(\d{3}\.?\d{4,5}\.?\d{2}-?\d)');

        // Contrato de trabalho
        $out['data_adminssao'] = $this->capturarData($contrato, ['Admiss[ãa]o', 'Data de Admiss[ãa]o', 'Data Admiss[ãa]o']);
        $out['data_demissao']  = $this->capturarData($texto, ['Data da dispensa', 'Demiss[ãa]o', 'Data de Demiss[ãa]o']);

        // Cargo -> casa com a tabela de funções
        $cargo = $this->capturar($contrato, ['Cargo', 'Fun[çc][ãa]o'], ['CBO', 'Organograma', 'Tipo', 'Sal[áa]rio', 'Remunera']);
        $out['id_funcao'] = $this->casarFuncao($cargo);

        // Organograma/Setor -> casa com a tabela de setores
        // (sem "Departamento": casaria dentro de cargos como "Analista de Departamento Pessoal")
        $org = $this->capturar($contrato, ['Organograma', 'Setor'], ['Remunera', 'Modo', 'Per[íi]odo', 'Escala', 'CBO']);
        $out['id_setor'] = $this->casarSetor($org);

        // Status derivado: se houver data de demissão preenchida -> Inativo
        $temDemissao = $out['data_demissao']['encontrado'] ?? false;
        $out['status'] = [
            'valor'      => $temDemissao ? 'Inativo' : 'Ativo',
            'confianca'  => 1.0,
            'encontrado' => true,
        ];

        return $out;
    }

    // ----------------------------------------------------- HELPERS DE CAPTURA

    /**
     * Captura o valor textual após um rótulo, parando no próximo rótulo
     * conhecido, em " - " de outro campo ou no fim da linha.
     */
    private function capturar(string $texto, array $rotulos, array $proximos = []): array
    {
        $vazio = ['valor' => '', 'confianca' => 0.0, 'encontrado' => false];
        if (trim($texto) === '') {
            return $vazio;
        }

        $rot  = '(?:' . implode('|', $rotulos) . ')';
        $stop = $proximos
            ? '(?=' . implode('|', array_map(fn ($p) => "\\s{2,}{$p}\\s*:|\\b{$p}\\s*:", $proximos)) . '|\n|$)'
            : '(?=\n|$)';

        // Delimitador "~" (e não "/") porque rótulos podem conter "/" (ex.: PIS/PASEP).
        $regex = "~{$rot}\\s*:?\\s*(.+?)\\s*{$stop}~iu";

        if (preg_match($regex, $texto, $m)) {
            $valor = $this->limpar($m[1]);
            if ($valor !== '' && ! $this->pareceRotulo($valor)) {
                return ['valor' => $valor, 'confianca' => 1.0, 'encontrado' => true];
            }
        }

        return $vazio;
    }

    /**
     * Captura um valor que casa um padrão (CPF, CEP, PIS...) perto de um rótulo.
     * $padrao é o CORPO da regex (com 1 grupo de captura), SEM delimitadores.
     */
    private function capturarPadrao(string $texto, array $rotulos, string $padrao): array
    {
        $vazio = ['valor' => '', 'confianca' => 0.0, 'encontrado' => false];
        $rot   = '(?:' . implode('|', $rotulos) . ')';

        // Procura o padrão logo após o rótulo. Delimitador "~" por causa de "/" nos rótulos.
        if (preg_match("~{$rot}\\s*:?\\s*.{0,5}?{$padrao}~iu", $texto, $m)) {
            return ['valor' => trim($m[1]), 'confianca' => 1.0, 'encontrado' => true];
        }
        return $vazio;
    }

    /** Captura e normaliza uma data (dd/mm/aaaa -> aaaa-mm-dd para input date). */
    private function capturarData(string $texto, array $rotulos): array
    {
        $r = $this->capturarPadrao($texto, $rotulos, '(\d{2}\/\d{2}\/\d{4})');
        if (! $r['encontrado']) {
            return ['valor' => '', 'confianca' => 0.0, 'encontrado' => false];
        }
        [$d, $mes, $a] = explode('/', $r['valor']);
        return ['valor' => "{$a}-{$mes}-{$d}", 'confianca' => $r['confianca'], 'encontrado' => true];
    }

    private function mapearGenero(string $sexo): array
    {
        $s = $this->semAcento(mb_strtolower(trim($sexo)));
        $valor = '';
        if ($s !== '') {
            if (str_starts_with($s, 'm')) $valor = 'M';
            elseif (str_starts_with($s, 'f')) $valor = 'F';
        }
        return ['valor' => $valor, 'confianca' => $valor ? 1.0 : 0.0, 'encontrado' => $valor !== ''];
    }

    private function mapearEstadoCivil(string $ec): array
    {
        $s = $this->semAcento(mb_strtolower(trim($ec)));
        $mapa = [
            'solteiro' => 'Solteiro(a)',
            'casado'   => 'Casado(a)',
            'divorciado' => 'Divorciado(a)',
            'viuvo'    => 'Viúvo(a)',
            'separado' => 'Divorciado(a)',
            'uniao'    => 'Casado(a)',
        ];
        foreach ($mapa as $chave => $valor) {
            if (str_contains($s, $chave)) {
                return ['valor' => $valor, 'confianca' => 1.0, 'encontrado' => true];
            }
        }
        return ['valor' => '', 'confianca' => 0.0, 'encontrado' => false];
    }

    /** "Rua das Acácias, 2355" -> ["Rua das Acácias", "2355"] */
    private function separarNumero(string $endereco): array
    {
        $end = trim($endereco);
        if ($end === '') {
            return ['', ''];
        }
        if (preg_match('/^(.*?)[,\s]+(\d+[A-Za-z]?)\s*$/u', $end, $m)) {
            return [trim(rtrim($m[1], ', ')), trim($m[2])];
        }
        return [$end, ''];
    }

    /** "Araucária - PR" -> ["Araucária", "PR"] */
    private function separarCidadeUf(string $municipio): array
    {
        $v = trim($municipio);
        if ($v === '') {
            return ['', ''];
        }
        if (preg_match('/^(.*?)[\s\-\/]+([A-Za-z]{2})\s*$/u', $v, $m)) {
            return [trim($m[1]), mb_strtoupper($m[2])];
        }
        return [$v, ''];
    }

    // ----------------------------------------------------- CASAMENTO FK

    private function casarFuncao(array $cargo): array
    {
        $base = ['valor' => '', 'confianca' => 0.0, 'encontrado' => false, 'sugestao' => $cargo['valor'] ?? ''];
        if (empty($cargo['valor'])) {
            return $base;
        }
        $match = $this->melhorMatch($cargo['valor'], $this->todos(FuncionarioFuncao::class), 'funcao');
        if ($match) {
            return [
                'valor'      => $match['id'],
                'rotulo'     => $match['label'],
                'confianca'  => $match['confianca'],
                'encontrado' => true,
                'sugestao'   => $cargo['valor'],
            ];
        }
        return $base;
    }

    private function casarSetor(array $org): array
    {
        $base = ['valor' => '', 'confianca' => 0.0, 'encontrado' => false, 'sugestao' => $org['valor'] ?? ''];
        if (empty($org['valor'])) {
            return $base;
        }
        $match = $this->melhorMatch($org['valor'], $this->todos(FuncionarioSetor::class), 'nome_setor');
        if ($match) {
            return [
                'valor'      => $match['id'],
                'rotulo'     => $match['label'],
                'confianca'  => $match['confianca'],
                'encontrado' => true,
                'sugestao'   => $org['valor'],
            ];
        }
        return $base;
    }

    /** Acha o registro cujo nome mais se aproxima do texto lido. */
    private function melhorMatch(string $texto, $colecao, string $campo): ?array
    {
        $alvo = $this->normalizarComparacao($texto);
        if ($alvo === '') {
            return null;
        }

        $melhor = null;
        foreach ($colecao as $item) {
            $nome = (string) ($item->{$campo} ?? '');
            $cmp  = $this->normalizarComparacao($nome);
            if ($cmp === '') {
                continue;
            }

            if ($cmp === $alvo) {
                return ['id' => $item->id, 'label' => $nome, 'confianca' => 1.0];
            }

            $conf = 0.0;
            if (str_contains($cmp, $alvo) || str_contains($alvo, $cmp)) {
                $conf = 0.85;
            } else {
                similar_text($alvo, $cmp, $pct);
                $conf = $pct / 100.0;
            }

            if ($melhor === null || $conf > $melhor['confianca']) {
                $melhor = ['id' => $item->id, 'label' => $nome, 'confianca' => round($conf, 2)];
            }
        }

        // Só aceita se a semelhança for razoável.
        return ($melhor && $melhor['confianca'] >= 0.80) ? $melhor : null;
    }

    /** Catálogo (função/setor) tolerante a falha de BD — devolve coleção vazia se indisponível. */
    private function todos(string $model)
    {
        try {
            return $model::all();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    // ----------------------------------------------------- QUALIDADE

    private function avaliarQualidade(string $texto, array $campos, string $fonte, ?float $confOcr): array
    {
        $problemas = [];
        $criticos  = config('funcionario_import.campos_criticos', ['nome', 'cpf']);

        // Confiança base
        $confianca = $fonte === 'pdf_texto' ? 0.99 : (float) ($confOcr ?? 0.0);

        // É mesmo uma Ficha de Registro?
        $ehFicha = $this->contemAncora($texto);
        if (! $ehFicha) {
            $problemas[] = 'O arquivo não foi reconhecido como "Ficha de Registro de Empregado". '
                . 'Confira se enviou a página correta.';
        }

        // Campos críticos lidos?
        foreach ($criticos as $c) {
            if (empty($campos[$c]['encontrado'])) {
                $rotulo = $this->rotuloCampo($c);
                $problemas[] = "Não foi possível ler o campo obrigatório: {$rotulo}.";
            }
        }

        // OCR com confiança baixa
        $min = (float) config('funcionario_import.min_confianca_ocr', 0.55);
        if ($fonte === 'ocr' && $confianca < $min) {
            $pct = (int) round($confianca * 100);
            $problemas[] = "Qualidade de leitura baixa ({$pct}%). Reenvie uma foto mais nítida, "
                . 'bem enquadrada e sem reflexos.';
        }

        $adequada = empty($problemas);

        $nivel = match (true) {
            $confianca >= 0.85 => 'boa',
            $confianca >= $min => 'regular',
            default            => 'ruim',
        };

        return [
            'adequada'  => $adequada,
            'confianca' => round($confianca, 3),
            'nivel'     => $nivel,
            'problemas' => $problemas,
        ];
    }

    private function contemAncora(string $texto): bool
    {
        $alvo = $this->semAcento(mb_strtolower($texto));
        foreach ((array) config('funcionario_import.ancoras_ficha', []) as $ancora) {
            if (str_contains($alvo, $this->semAcento(mb_strtolower($ancora)))) {
                return true;
            }
        }
        return false;
    }

    // ----------------------------------------------------- UTIL

    private function textoInsuficiente(string $texto): bool
    {
        return mb_strlen(trim($texto)) < 30;
    }

    private function normalizarEspacos(string $texto): string
    {
        $texto = str_replace(["\t"], ' ', $texto);
        // Colapsa espaços (mantém quebras de linha).
        $texto = preg_replace('/[ \x{00A0}]{2,}/u', '  ', $texto);
        $texto = preg_replace('/\n{2,}/', "\n", $texto);
        return trim($texto);
    }

    private function limpar(string $v): string
    {
        $v = trim($v);
        $v = preg_replace('/\s{2,}/', ' ', $v);
        return trim($v, " \t\n\r\0\x0B:-");
    }

    /** Evita capturar lixo: valores que são só pontuação ou parecem outro rótulo. */
    private function pareceRotulo(string $v): bool
    {
        return $v === '' || preg_match('/^[\s:\-.]+$/', $v) === 1 || mb_strlen($v) < 2;
    }

    private function rotuloCampo(string $campo): string
    {
        return [
            'nome'           => 'Nome',
            'cpf'            => 'CPF',
            'rg'             => 'RG',
            'pis'            => 'PIS',
            'data_adminssao' => 'Admissão',
        ][$campo] ?? ucfirst($campo);
    }

    private function semAcento(string $s): string
    {
        $de   = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
        $para = 'aaaaaeeeeiiiiooooouuuucn';
        return strtr($s, mb_str_split($de) === false ? [] : array_combine(
            mb_str_split($de),
            mb_str_split($para)
        ));
    }

    private function normalizarComparacao(string $s): string
    {
        $s = $this->semAcento(mb_strtolower(trim($s)));
        // Remove sufixos de senioridade comuns e ruído.
        $s = preg_replace('/\s*[-\/]\s*(sr|jr|pl|i{1,3}|iv)\b.*$/i', '', $s);
        $s = preg_replace('/[^a-z0-9 ]+/i', ' ', $s);
        $s = preg_replace('/\s{2,}/', ' ', $s);
        return trim($s);
    }

    /**
     * Recorta o trecho do texto entre o primeiro rótulo de $inicio e o
     * primeiro rótulo de $fim (ou até o final).
     */
    private function trecho(string $texto, array $inicio, array $fim): string
    {
        $ini = $this->posicaoPrimeiro($texto, $inicio);
        if ($ini === null) {
            return '';
        }
        $resto = mb_substr($texto, $ini);
        $end = $this->posicaoPrimeiro($resto, $fim, 5); // ignora ocorrência logo no começo
        if ($end !== null) {
            $resto = mb_substr($resto, 0, $end);
        }
        return $resto;
    }

    private function posicaoPrimeiro(string $texto, array $marcadores, int $minPos = 0): ?int
    {
        $melhor = null;
        foreach ($marcadores as $m) {
            if (preg_match('~' . $m . '~iu', $texto, $hit, PREG_OFFSET_CAPTURE)) {
                // offset em bytes -> converte p/ chars
                $pos = mb_strlen(substr($texto, 0, $hit[0][1]));
                if ($pos >= $minPos && ($melhor === null || $pos < $melhor)) {
                    $melhor = $pos;
                }
            }
        }
        return $melhor;
    }

    private function respostaErro(string $fonte, string $mensagem): array
    {
        return [
            'ok'        => false,
            'fonte'     => $fonte,
            'qualidade' => [
                'adequada'  => false,
                'confianca' => 0.0,
                'nivel'     => 'ruim',
                'problemas' => [$mensagem],
            ],
            'campos'    => [],
        ];
    }
}
