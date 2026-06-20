<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Emitir Ficha de EPI — {{ $funcionario->nome }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1f2937; margin: 0; padding: 24px; background: #f3f4f6; }
        .wrap { max-width: 900px; margin: 0 auto; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 24px; }
        .kv .l { display: block; font-size: 10px; text-transform: uppercase; color: #9ca3af; }
        .kv .v { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #f9fafb; font-size: 10px; text-transform: uppercase; color: #6b7280; }
        td.num { text-align: right; }
        .pad-wrap { border: 2px dashed #cbd5e1; border-radius: 10px; background: #fafafa; }
        canvas { width: 100%; height: 180px; touch-action: none; display: block; border-radius: 10px; cursor: crosshair; }
        .row { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .btn { border: 0; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-ghost { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .btn-amber { background: #f59e0b; color: #fff; }
        .muted { color: #9ca3af; font-size: 12px; }
        .termo { font-size: 12px; color: #374151; line-height: 1.5; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <h1>Emitir Ficha de EPI (NR-6)</h1>
        <div class="sub">{{ $empresa?->name ?? 'Empresa' }} — confira os itens, colha a assinatura do funcionário e gere a ficha.</div>
        <div class="grid">
            <div class="kv"><span class="l">Funcionário</span><span class="v">{{ $funcionario->nome }}</span></div>
            <div class="kv"><span class="l">Matrícula</span><span class="v">{{ $funcionario->matricula ?? '—' }}</span></div>
            <div class="kv"><span class="l">CPF</span><span class="v">{{ $funcionario->cpf ?? '—' }}</span></div>
            <div class="kv"><span class="l">Função</span><span class="v">{{ $funcionario->funcao?->funcao ?? '—' }}</span></div>
            <div class="kv"><span class="l">Obra</span><span class="v">{{ $funcionario->obra ? ($funcionario->obra->codigo_obra.' — '.$funcionario->obra->nome_fantasia) : '—' }}</span></div>
        </div>
    </div>

    <div class="card">
        <h3 style="margin:0 0 10px;font-size:14px">EPIs em posse ({{ $epis->count() }})</h3>
        @if ($epis->isEmpty())
            <p class="muted">Este funcionário não possui EPIs em posse. Não há o que emitir.</p>
        @else
            <table>
                <thead><tr>
                    <th>Entrega</th><th>EPI</th><th>Variação</th><th>C.A.</th><th>Lote</th><th>Validade</th><th class="num">Qtd</th><th>Confirmação</th>
                </tr></thead>
                <tbody>
                @foreach ($epis as $e)
                    <tr>
                        <td>{{ $e['data'] ? \Illuminate\Support\Carbon::parse($e['data'])->format('d/m/Y') : '—' }}</td>
                        <td>{{ $e['produto'] }}<div class="muted" style="font-family:monospace;font-size:10px">{{ $e['sku'] }}</div></td>
                        <td>{{ $e['variacao'] ?? '—' }}</td>
                        <td>{{ $e['numero_ca'] ?? '—' }}</td>
                        <td>{{ $e['numero_lote'] ?? '—' }}</td>
                        <td>{{ $e['validade'] ? \Illuminate\Support\Carbon::parse($e['validade'])->format('d/m/Y') : '—' }}</td>
                        <td class="num">{{ rtrim(rtrim(number_format($e['em_posse'],3,',','.'),'0'),',') }} {{ $e['unidade'] }}</td>
                        <td class="muted" style="font-size:11px">{{ $e['metodo'] ?? '—' }}@if($e['validado_em'])<br>{{ $e['validado_em'] }}@endif</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        @endif
    </div>

    @if ($epis->isNotEmpty())
    <div class="card">
        <h3 style="margin:0 0 8px;font-size:14px">Assinatura do funcionário</h3>
        <p class="termo">
            Declaro ter recebido gratuitamente os EPIs acima, em perfeitas condições de uso, comprometendo-me a usá-los
            corretamente, conservá-los e devolvê-los quando solicitado (NR-6 / art. 158 da CLT).
        </p>
        <div class="pad-wrap" style="margin:10px 0">
            <canvas id="pad"></canvas>
        </div>
        <div class="row">
            <button type="button" class="btn btn-ghost" onclick="limparPad()">↺ Limpar assinatura</button>
            <span class="muted">Assine com o dedo (touch) ou o mouse.</span>
        </div>

        <form method="POST" action="{{ route('admin.funcionarios.ficha-epi.gerar', $funcionario->id) }}" id="formFicha" style="margin-top:16px">
            @csrf
            <input type="hidden" name="assinatura" id="assinatura">
            <input type="hidden" name="assinatura_tipo" id="assinatura_tipo" value="impressa">
            <div class="row">
                <button type="button" class="btn btn-ghost" onclick="gerar(false)">Gerar para assinar impresso</button>
                <button type="button" class="btn btn-primary" onclick="gerar(true)">✔ Gerar ficha assinada</button>
            </div>
        </form>
    </div>
    @endif
</div>

<script>
    const canvas = document.getElementById('pad');
    let ctx, desenhou = false, desenhando = false;
    function initPad() {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        canvas.width = r.width; canvas.height = 180;
        ctx = canvas.getContext('2d');
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827';
    }
    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function start(e) { desenhando = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
    function move(e) { if (!desenhando) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); desenhou = true; e.preventDefault(); }
    function end() { desenhando = false; }
    function limparPad() { if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); desenhou = false; } }
    function gerar(comAssinatura) {
        if (comAssinatura) {
            if (!desenhou) { alert('Colha a assinatura do funcionário ou use "Gerar para assinar impresso".'); return; }
            document.getElementById('assinatura').value = canvas.toDataURL('image/png');
            document.getElementById('assinatura_tipo').value = 'manuscrita_digital';
        } else {
            document.getElementById('assinatura').value = '';
            document.getElementById('assinatura_tipo').value = 'impressa';
        }
        document.getElementById('formFicha').submit();
    }
    if (canvas) {
        initPad();
        window.addEventListener('resize', initPad);
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move);
        canvas.addEventListener('touchend', end);
    }
</script>
</body>
</html>
