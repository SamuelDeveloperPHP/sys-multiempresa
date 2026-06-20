<?php

namespace App\Services\Tcpo;

use Illuminate\Support\Facades\DB;
use ZipArchive;

/**
 * Gera um .xlsx da base TCPO completa, em duas abas, no formato do modelo PINI:
 *   - "Por composição": blocos (linha do serviço + tabela de insumos 8 colunas)
 *   - "Itens (flat)":    uma linha por item, com colunas do serviço + do insumo
 *
 * Escreve o OOXML na mão (ZipArchive) — sem PhpSpreadsheet. As abas são geradas
 * em STREAMING (fwrite em arquivo temporário) para não estourar memória com
 * ~28 mil linhas. Números vão como célula numérica (somável; o Excel pt-BR
 * exibe com vírgula); textos como inlineStr.
 */
class TcpoXlsxExport
{
    public function gerar(?string $base = null): string
    {
        @ini_set('memory_limit', '768M');

        // ----- Dados -----
        $comps = DB::table('tcpo_composicoes')
            ->when($base, fn ($q) => $q->where('base', $base))
            ->orderBy('codigo_alt')->orderBy('codigo')
            ->get(['id', 'codigo', 'codigo_alt', 'descricao', 'unidade', 'tipo', 'categoria_id', 'total_sem_taxas']);

        $itensPorComp = [];
        foreach (DB::table('tcpo_composicao_itens')->orderBy('composicao_id')->orderBy('ordem')
            ->get(['composicao_id', 'codigo', 'descricao', 'classe', 'unidade', 'coeficiente', 'preco_unitario', 'total', 'consumo']) as $it) {
            $itensPorComp[$it->composicao_id][] = $it;
        }

        $caminho = $this->mapaCaminhos();

        // ----- Aba 1: Por composição (blocos) -----
        [$f1, $p1] = $this->abrirSheet();
        $r = 0;
        $this->row($f1, ++$r, $this->linha(['Código', 'Descrição', 'Class', 'Un', 'Coef', 'Preço unitário (R$) sem taxas', 'Total (R$) sem taxas', 'Consumo'], 1));
        foreach ($comps as $c) {
            $this->row($f1, ++$r, [
                $this->cs($c->codigo_alt ?: $c->codigo, 2), $this->cs($c->descricao, 2), $this->cs('', 2), $this->cs($c->unidade, 2),
                $this->cs('', 2), $this->cs('', 2), $this->cn($c->total_sem_taxas, 2), $this->cs('', 2),
            ]);
            foreach ($itensPorComp[$c->id] ?? [] as $it) {
                $this->row($f1, ++$r, [
                    $this->cs($it->codigo), $this->cs($it->descricao), $this->cs($it->classe), $this->cs($it->unidade),
                    $this->cn($it->coeficiente), $this->cn($it->preco_unitario), $this->cn($it->total), $this->cn($it->consumo),
                ]);
            }
            $this->row($f1, ++$r, []); // branco entre blocos
        }
        $this->fecharSheet($f1);

        // ----- Aba 2: Itens (flat) -----
        [$f2, $p2] = $this->abrirSheet();
        $r = 0;
        $this->row($f2, ++$r, $this->linha([
            'Serviço (Cód)', 'Serviço (Cód EAP)', 'Serviço (Descrição)', 'Serviço (Un)', 'Categoria',
            'Insumo (Cód)', 'Insumo (Descrição)', 'Class', 'Un', 'Coef', 'Preço unitário (R$)', 'Total (R$)', 'Consumo',
        ], 1));
        foreach ($comps as $c) {
            $cat = $c->categoria_id ? ($caminho[$c->categoria_id] ?? '') : '';
            foreach ($itensPorComp[$c->id] ?? [] as $it) {
                $this->row($f2, ++$r, [
                    $this->cs($c->codigo), $this->cs($c->codigo_alt), $this->cs($c->descricao), $this->cs($c->unidade), $this->cs($cat),
                    $this->cs($it->codigo), $this->cs($it->descricao), $this->cs($it->classe), $this->cs($it->unidade),
                    $this->cn($it->coeficiente), $this->cn($it->preco_unitario), $this->cn($it->total), $this->cn($it->consumo),
                ]);
            }
        }
        $this->fecharSheet($f2);

        // ----- Empacota -----
        $tmp = tempnam(sys_get_temp_dir(), 'tcpo_xlsx_');
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', $this->contentTypes());
        $zip->addFromString('_rels/.rels', $this->rootRels());
        $zip->addFromString('xl/workbook.xml', $this->workbook(['Por composição', 'Itens (flat)']));
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRels(2));
        $zip->addFromString('xl/styles.xml', $this->styles());
        $zip->addFile($p1, 'xl/worksheets/sheet1.xml');
        $zip->addFile($p2, 'xl/worksheets/sheet2.xml');
        $zip->close();
        @unlink($p1);
        @unlink($p2);

        return $tmp;
    }

    // ---- Streaming de abas ----

    private function abrirSheet(): array
    {
        $path = tempnam(sys_get_temp_dir(), 'tcpo_sht_');
        $fh = fopen($path, 'w');
        fwrite($fh, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>');
        return [$fh, $path];
    }

    private function fecharSheet($fh): void
    {
        fwrite($fh, '</sheetData></worksheet>');
        fclose($fh);
    }

    private function row($fh, int $r, array $cells): void
    {
        if (empty($cells)) {
            fwrite($fh, '<row r="' . $r . '"/>');
            return;
        }
        $buf = '<row r="' . $r . '">';
        $col = 0;
        foreach ($cells as $cell) {
            $col++;
            $ref = $this->colLetra($col) . $r;
            $s = $cell['s'] ? ' s="' . $cell['s'] . '"' : '';
            if ($cell['t'] === 'n') {
                $buf .= '<c r="' . $ref . '"' . $s . '><v>' . $cell['v'] . '</v></c>';
            } else {
                $buf .= '<c r="' . $ref . '" t="inlineStr"' . $s . '><is><t xml:space="preserve">' . $this->esc($cell['v']) . '</t></is></c>';
            }
        }
        $buf .= '</row>';
        fwrite($fh, $buf);
    }

    // ---- Células ----

    private function linha(array $valores, int $estilo = 0): array
    {
        return array_map(fn ($v) => $this->cs($v, $estilo), $valores);
    }

    private function cs($v, int $s = 0): array
    {
        return ['t' => 's', 'v' => (string) ($v ?? ''), 's' => $s];
    }

    private function cn($v, int $s = 0): array
    {
        if ($v === null || $v === '') {
            return ['t' => 's', 'v' => '', 's' => $s];
        }
        return ['t' => 'n', 'v' => (float) $v, 's' => $s];
    }

    private function colLetra(int $n): string
    {
        $s = '';
        while ($n > 0) {
            $n--;
            $s = chr(65 + ($n % 26)) . $s;
            $n = intdiv($n, 26);
        }
        return $s;
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function mapaCaminhos(): array
    {
        $byId = [];
        foreach (DB::table('tcpo_categorias')->get(['id', 'nome', 'parent_id']) as $c) {
            $byId[$c->id] = $c;
        }
        $cache = [];
        $path = function ($id) use (&$path, $byId, &$cache) {
            if (!$id || !isset($byId[$id])) {
                return '';
            }
            if (isset($cache[$id])) {
                return $cache[$id];
            }
            $c = $byId[$id];
            $pai = $c->parent_id ? $path($c->parent_id) : '';
            return $cache[$id] = ($pai ? $pai . ' > ' : '') . $c->nome;
        };
        $out = [];
        foreach ($byId as $id => $_) {
            $out[$id] = $path($id);
        }
        return $out;
    }

    // ---- Partes fixas do OOXML ----

    private function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '</Types>';
    }

    private function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbook(array $nomes): string
    {
        $sheets = '';
        foreach ($nomes as $i => $nome) {
            $n = $i + 1;
            $sheets .= '<sheet name="' . $this->esc($nome) . '" sheetId="' . $n . '" r:id="rId' . $n . '"/>';
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets>' . $sheets . '</sheets></workbook>';
    }

    private function workbookRels(int $numSheets): string
    {
        $rels = '';
        for ($i = 1; $i <= $numSheets; $i++) {
            $rels .= '<Relationship Id="rId' . $i . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' . $i . '.xml"/>';
        }
        $styleId = $numSheets + 1;
        $rels .= '<Relationship Id="rId' . $styleId . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' . $rels . '</Relationships>';
    }

    /** s=0 normal · s=1 negrito (cabeçalho) · s=2 negrito + fundo azul claro (linha do serviço). */
    private function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill></fills>'
            . '<borders count="1"><border/></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="3">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            . '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            . '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
            . '</cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>';
    }
}
