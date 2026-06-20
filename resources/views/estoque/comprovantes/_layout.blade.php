{{--
  Layout base dos comprovantes de estoque.
  HTML auto-contido (sem app shell), CSS para impressão.

  Slots:
    @yield('titulo')   - título no cabeçalho (e <title>)
    @yield('corpo')    - corpo do comprovante
--}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('titulo', 'Comprovante') · {{ $empresa?->name ?? 'Estoque' }}</title>
    <style>
        /* ============ Reset enxuto ============ */
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#222;background:#f3f4f6}

        /* ============ Página ============ */
        .page{
            max-width:780px;margin:24px auto;background:#fff;padding:28px 32px;
            border:1px solid #ddd;border-radius:8px;
        }
        .header{
            border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px;
            display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;
        }
        .header h1{margin:0;font-size:20px;letter-spacing:.5px}
        .header .sub{font-size:11px;color:#666;margin-top:2px}
        .header .right{text-align:right;font-size:11px;color:#444}

        /* ============ Caixas e KV ============ */
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .box{
            border:1px solid #e2e2e2;border-radius:6px;padding:10px 12px;background:#fafafa;
        }
        .box h3{
            margin:0 0 6px 0;font-size:11px;text-transform:uppercase;
            letter-spacing:.6px;color:#555;font-weight:700;
        }
        .kv{display:flex;justify-content:space-between;font-size:13px;padding:2px 0;border-bottom:1px dashed #eee}
        .kv:last-child{border-bottom:0}
        .kv .l{color:#666}
        .kv .v{font-weight:600;text-align:right;max-width:60%}

        /* ============ Tabela de itens ============ */
        table.itens{
            width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;
        }
        table.itens th,table.itens td{
            border:1px solid #e2e2e2;padding:6px 8px;text-align:left;
        }
        table.itens thead th{background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
        table.itens td.num{text-align:right;font-variant-numeric:tabular-nums}
        table.itens tfoot td{font-weight:700;background:#fafafa}

        /* ============ Assinatura ============ */
        .assinaturas{
            margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:60px;
        }
        .assinaturas .ass{
            border-top:1px solid #333;padding-top:6px;text-align:center;font-size:12px;
        }
        .assinaturas .ass .nome{font-weight:700;color:#111}
        .assinaturas .ass .papel{color:#666;font-size:11px}

        /* ============ Rodapé ============ */
        .footer{
            margin-top:24px;border-top:1px dashed #ccc;padding-top:10px;
            font-size:10.5px;color:#666;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;
        }

        /* ============ Botão de imprimir (escondido na impressão) ============ */
        .toolbar{
            max-width:780px;margin:14px auto 0;display:flex;justify-content:flex-end;gap:8px;
        }
        .toolbar button,.toolbar a{
            border:1px solid #333;background:#111;color:#fff;
            padding:7px 14px;border-radius:6px;text-decoration:none;font-size:13px;cursor:pointer;
        }
        .toolbar a.alt{background:#fff;color:#111}

        /* ============ Print rules ============ */
        @media print {
            html,body{background:#fff}
            .toolbar{display:none !important}
            .page{margin:0;border:0;border-radius:0;box-shadow:none;max-width:none;padding:14px 18px}
            .no-print{display:none !important}
            /* Forçar cores de fundo (caso o usuário queira o badge) */
            *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <a href="javascript:window.history.back()" class="alt">← Voltar</a>
        <button type="button" onclick="window.print()">🖨 Imprimir</button>
    </div>

    @yield('corpo')

    @if (request()->boolean('auto_print'))
        <script>setTimeout(() => window.print(), 250);</script>
    @endif
</body>
</html>
