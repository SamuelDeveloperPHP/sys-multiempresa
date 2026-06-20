<?php

namespace App\Services\Tcpo;

/**
 * Parser do HTML do TCPOweb (resultados de busca e detalhe de composição).
 */
class TcpoParser
{
    /**
     * Extrai metadados + linhas da página de resultados.
     * Retorna: ['total'=>int, 'paginas'=>int, 'rows'=>[ ['codigo'=>..,'target'=>..], ... ]]
     */
    public function resultados(string $html): array
    {
        $total = 0;
        $paginas = 1;
        if (preg_match('/\(\s*(\d+)\s*itens?\s*\)\s*-\s*Página\s+\d+\s+de\s+(\d+)/iu', $html, $m)) {
            $total   = (int) $m[1];
            $paginas = (int) $m[2];
        } elseif (preg_match('/\(\s*(\d+)\s*itens?\s*\)/iu', $html, $m)) {
            $total = (int) $m[1];
        }

        // Cada linha: <a ... href="javascript:__doPostBack(&#39;TARGET&#39;,&#39;&#39;)">CODIGO</a>
        $rows = [];
        if (preg_match_all(
            '/__doPostBack\(&#39;(ctl00\$MainContent\$gvServicos\$ctl\d+\$lnkBtnCodigo)&#39;,&#39;&#39;\)"[^>]*>\s*((?:\d[A-Z])(?:\s*\d{2})+)\s*<\/a>/u',
            $html,
            $mm,
            PREG_SET_ORDER
        )) {
            foreach ($mm as $r) {
                $rows[] = [
                    'target' => html_entity_decode($r[1], ENT_QUOTES | ENT_HTML5),
                    'codigo' => preg_replace('/\s+/', ' ', trim($r[2])),
                ];
            }
        }

        return ['total' => $total, 'paginas' => $paginas, 'rows' => $rows];
    }

    /**
     * Parseia a página de detalhe (aba Composição) de um serviço.
     * Retorna a estrutura de uma composição (sem memorial — fica em outra aba).
     */
    public function detalhe(string $html): array
    {
        $comp = [
            'codigo' => null, 'codigo_alt' => null, 'tipo' => null,
            'unidade' => null, 'descricao' => null,
            'total_sem_taxas' => null, 'total_mod' => null, 'total_mat' => null, 'total_eqp' => null,
            'itens' => [],
        ];

        // --- Cabeçalho (lblDescricaoServico*) ---
        if (preg_match('/lblDescricaoServico\d*"[^>]*>(.*?)<\/span>/su', $html, $m)) {
            $h = $m[1];
            $h = preg_replace('/<br\s*\/?>/i', "\n", $h);
            $h = html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5);
            $h = str_replace("\xC2\xA0", ' ', $h);              // &nbsp;
            $h = preg_replace('/[ \t]+/', ' ', $h);

            if (preg_match('/Código:\s*(.+?)\s+-\s+/u', $h, $mm)) $comp['codigo'] = trim($mm[1]);
            if (preg_match('/-\s+(SERVIÇO[^-\n]*?)\s+-\s+Unidade/iu', $h, $mm)) $comp['tipo'] = trim($mm[1]);
            if (preg_match('/Unidade:\s*(.+?)\s+-\s+/u', $h, $mm)) $comp['unidade'] = trim($mm[1]);
            if (preg_match('/([0-9][0-9.]*\.[A-Z]{2,4})\b/u', $h, $mm)) $comp['codigo_alt'] = trim($mm[1]);
            if (preg_match('/Descrição:\s*(.+)$/su', $h, $mm)) $comp['descricao'] = trim(preg_replace('/\s+/', ' ', $mm[1]));
        }

        // --- Itens (gvComposicao_ctlNN_*) ---
        $campos = [
            'codigo'    => '/gvComposicao_(ctl\d+)_lblCodigo2"[^>]*>(.*?)<\/span>/su',
            'descricao' => '/gvComposicao_(ctl\d+)_lblDescricao2"[^>]*>(.*?)<\/span>/su',
            'unidade'   => '/gvComposicao_(ctl\d+)_lblUnidade2"[^>]*>(.*?)<\/span>/su',
            'classe'    => '/gvComposicao_(ctl\d+)_lblClass2"[^>]*>(.*?)<\/span>/su',
            'coef'      => '/gvComposicao_(ctl\d+)_lblCoef2"[^>]*>(.*?)<\/span>/su',
            'total'     => '/gvComposicao_(ctl\d+)_lblPrecoTotal2"[^>]*>(.*?)<\/span>/su',
            'consumo'   => '/gvComposicao_(ctl\d+)_lblConsumo2"[^>]*>(.*?)<\/span>/su',
            'preco'     => '/gvComposicao\$(ctl\d+)\$txtPrecoUnit2"[^>]*value="([^"]*)"/su',
        ];
        $linhas = [];
        foreach ($campos as $nome => $rx) {
            if (preg_match_all($rx, $html, $mm, PREG_SET_ORDER)) {
                foreach ($mm as $r) {
                    $row = $r[1];
                    $val = html_entity_decode(strip_tags($r[2]), ENT_QUOTES | ENT_HTML5);
                    $linhas[$row][$nome] = trim(str_replace("\xC2\xA0", ' ', $val));
                }
            }
        }
        ksort($linhas, SORT_NATURAL);
        $somaMod = $somaMat = $somaEqp = $soma = 0.0;
        foreach ($linhas as $row) {
            if (empty($row['codigo'])) continue;
            $classe = strtoupper($row['classe'] ?? '');
            $totalNum = $this->num($row['total'] ?? null) ?? 0;
            $soma += $totalNum;
            if ($classe === 'MOD') $somaMod += $totalNum;
            elseif ($classe === 'MAT') $somaMat += $totalNum;
            elseif ($classe === 'EQP') $somaEqp += $totalNum;
            $comp['itens'][] = [
                'codigo'         => $row['codigo'],
                'descricao'      => $row['descricao'] ?? null,
                'unidade'        => $row['unidade'] ?? null,
                'classe'         => $classe ?: null,
                'coeficiente'    => $row['coef'] ?? null,
                'preco_unitario' => $row['preco'] ?? null,
                'total'          => $row['total'] ?? null,
                'consumo'        => $row['consumo'] ?? null,
            ];
        }
        $comp['total_sem_taxas'] = round($soma, 4);
        $comp['total_mod'] = round($somaMod, 4);
        $comp['total_mat'] = round($somaMat, 4);
        $comp['total_eqp'] = round($somaEqp, 4);

        return $comp;
    }

    /** Converte número PT-BR para float. */
    protected function num($v): ?float
    {
        if ($v === null || $v === '') return null;
        $s = str_replace(["\xC2\xA0", ' ', 'R$'], '', (string) $v);
        if (is_numeric($s)) return (float) $s;
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
        return is_numeric($s) ? (float) $s : null;
    }

    /** Texto puro de um HTML (tags viram espaço, entidades decodificadas). */
    public function textoPuro(string $html): string
    {
        $t = preg_replace('/<(script|style)[^>]*>.*?<\/\1>/is', ' ', $html);
        $t = preg_replace('/<[^>]+>/', ' ', $t);
        $t = html_entity_decode($t, ENT_QUOTES | ENT_HTML5);
        return preg_replace('/[ \t]+/', ' ', $t);
    }
}
