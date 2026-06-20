<!DOCTYPE html>
<html lang="pt-BR">
@php
    $f = $dados['funcionario'] ?? [];
    $epis = $dados['epis'] ?? [];
    $fmtQtd = fn ($v) => rtrim(rtrim(number_format((float) $v, 3, ',', '.'), '0'), ',');
@endphp
<head>
    <meta charset="utf-8">
    <title>Ficha de EPI — {{ $f['nome'] ?? '' }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1f2937; margin: 0; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 8px; }
        .header h1 { font-size: 16px; margin: 0; }
        .header .sub { font-size: 12px; color: #6b7280; }
        .header .right { text-align: right; font-size: 11px; color: #374151; }
        .integ { display: inline-block; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 999px; margin-bottom: 12px; }
        .integ.ok { background: #dcfce7; color: #15803d; }
        .integ.bad { background: #fee2e2; color: #b91c1c; }
        .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
        .box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 0 0 8px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 24px; }
        .kv .l { display: block; font-size: 10px; text-transform: uppercase; color: #9ca3af; }
        .kv .v { font-size: 12.5px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; }
        td.num { text-align: right; }
        .venc { color: #b91c1c; font-weight: bold; }
        .termo { font-size: 11px; color: #374151; border: 1px dashed #d1d5db; border-radius: 6px; padding: 10px 12px; margin: 14px 0; line-height: 1.5; }
        .rodape { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-top: 28px; }
        .assinaturas { flex: 1; display: flex; gap: 40px; }
        .ass { flex: 1; text-align: center; }
        .ass .img { height: 56px; margin-bottom: 2px; }
        .ass .img img { max-height: 56px; max-width: 100%; }
        .ass .linha { border-top: 1px solid #111827; padding-top: 4px; font-size: 11px; }
        .verif { width: 180px; text-align: center; font-size: 9px; color: #6b7280; }
        .verif svg { width: 120px; height: 120px; }
        .hashbox { font-family: monospace; font-size: 9px; color: #6b7280; word-break: break-all; border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 6px; }
        .toolbar { text-align: right; margin-bottom: 12px; }
        .btn { background: #2563eb; color: #fff; border: 0; border-radius: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer; }
        @media print { .toolbar { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="toolbar"><button class="btn" onclick="window.print()">🖨 Imprimir</button></div>

    <div class="header">
        <div>
            <h1>FICHA DE CONTROLE DE ENTREGA DE EPI</h1>
            <div class="sub">{{ $dados['empresa'] ?? 'Empresa' }} · Norma Regulamentadora NR-6</div>
        </div>
        <div class="right">
            <div>Emitida em {{ $dados['emitida_em'] ?? '—' }}</div>
            <div>Por: {{ $dados['emitida_por'] ?? '—' }}</div>
            <div>Funcionário #{{ str_pad($f['id'] ?? 0, 5, '0', STR_PAD_LEFT) }}</div>
        </div>
    </div>

    @if ($integro)
        <span class="integ ok">✓ Documento íntegro — confere com o registro {{ $ficha->codigo }}</span>
    @else
        <span class="integ bad">✗ Conteúdo divergente do registro original — possível adulteração</span>
    @endif

    <div class="box">
        <h3>Identificação do funcionário</h3>
        <div class="grid">
            <div class="kv"><span class="l">Nome</span><span class="v">{{ $f['nome'] ?? '—' }}</span></div>
            <div class="kv"><span class="l">Matrícula</span><span class="v">{{ $f['matricula'] ?? '—' }}</span></div>
            <div class="kv"><span class="l">CPF</span><span class="v">{{ $f['cpf'] ?? '—' }}</span></div>
            <div class="kv"><span class="l">Função</span><span class="v">{{ $f['funcao'] ?? '—' }}</span></div>
            <div class="kv"><span class="l">Obra</span><span class="v">{{ $f['obra'] ?? '—' }}</span></div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:70px">Entrega</th>
                <th>Equipamento (EPI)</th>
                <th style="width:80px">Variação</th>
                <th style="width:70px">C.A.</th>
                <th style="width:80px">Lote</th>
                <th style="width:70px">Validade</th>
                <th class="num" style="width:52px">Qtd</th>
                <th style="width:150px">Confirmação de recebimento</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($epis as $e)
                <tr>
                    <td>{{ $e['data'] ?? '—' }}</td>
                    <td>{{ $e['produto'] }}<div style="font-size:10px;color:#9ca3af;font-family:monospace">{{ $e['sku'] }}</div></td>
                    <td>{{ $e['variacao'] ?? '—' }}</td>
                    <td>{{ $e['numero_ca'] ?? '—' }}</td>
                    <td>{{ $e['numero_lote'] ?? '—' }}</td>
                    <td>{{ $e['validade'] ?? '—' }}</td>
                    <td class="num">{{ $fmtQtd($e['em_posse']) }} {{ $e['unidade'] }}</td>
                    <td style="font-size:10px;color:#374151">
                        {{ $e['metodo'] ?? '—' }}
                        @if (!empty($e['validado_em']))<div style="color:#9ca3af">em {{ $e['validado_em'] }}</div>@endif
                    </td>
                </tr>
            @empty
                <tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:18px">Nenhum EPI em posse.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="termo">
        Declaro ter recebido gratuitamente os Equipamentos de Proteção Individual (EPIs) acima discriminados,
        em perfeitas condições de uso, comprometendo-me a: usá-los apenas para a finalidade a que se destinam;
        responsabilizar-me por sua guarda e conservação; comunicar qualquer alteração que os torne impróprios;
        e devolvê-los quando solicitado. Ciente de que o descumprimento da NR-6 constitui ato faltoso (art. 158 da CLT).
    </div>

    <div class="rodape">
        <div class="assinaturas">
            <div class="ass">
                <div class="img">
                    @if ($ficha->assinatura)<img src="{{ $ficha->assinatura }}" alt="assinatura">@endif
                </div>
                <div class="linha">
                    {{ $f['nome'] ?? '—' }}<br>Funcionário
                    @if ($ficha->assinatura_tipo === 'manuscrita_digital')<br><span style="font-size:9px;color:#9ca3af">(assinatura eletrônica capturada)</span>@endif
                </div>
            </div>
            <div class="ass">
                <div class="img"></div>
                <div class="linha">{{ $dados['emitida_por'] ?? 'Responsável' }}<br>Responsável / Almoxarife</div>
            </div>
        </div>
        <div class="verif">
            @if ($qrSvg){!! $qrSvg !!}@endif
            <div>Verificação online</div>
            <div style="font-family:monospace">{{ $ficha->codigo }}</div>
        </div>
    </div>

    <div class="hashbox">
        Código de verificação: {{ $ficha->codigo }} ·
        Hash (HMAC-SHA256): {{ $ficha->hash }}<br>
        Verifique em: {{ $url }}
    </div>

    @if (request()->boolean('auto_print'))
        <script>window.addEventListener('load', () => window.print());</script>
    @endif
</body>
</html>
