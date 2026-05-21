<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Alerta de preventivas</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:24px; color:#333;">
    <table style="max-width:720px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08);" cellpadding="0" cellspacing="0">
        <tr>
            <td style="background:#0d6efd; padding:18px 24px; color:#fff;">
                <h2 style="margin:0; font-size:20px;">⚠ Alerta de Preventivas da Frota</h2>
                <p style="margin:4px 0 0; font-size:13px; opacity:.85;">{{ count($resumo) }} veículo(s) com ciclos vencidos ou prontos para execução.</p>
            </td>
        </tr>

        <tr>
            <td style="padding:24px;">
                @foreach ($resumo as $item)
                    @php $v = $item['veiculo']; $ciclos = $item['ciclos']; @endphp

                    <div style="border:1px solid #e5e7eb; border-radius:6px; margin-bottom:16px;">
                        <div style="padding:12px 16px; background:#f9fafb; border-bottom:1px solid #e5e7eb;">
                            <strong style="font-size:15px;">{{ $v->prefixo }}</strong>
                            @if ($v->placa)
                                <span style="font-family:monospace; background:#fff; border:1px solid #d1d5db; padding:1px 6px; border-radius:4px; margin-left:6px; font-size:12px;">{{ $v->placa }}</span>
                            @endif
                            <span style="color:#6b7280; font-size:13px;"> &middot; {{ $v->marca }} {{ $v->modelo }}</span>
                            @if ($v->obra)
                                <span style="color:#6b7280; font-size:13px;"> &middot; {{ $v->obra->nome_fantasia ?? '' }}</span>
                            @endif
                        </div>
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f3f4f6; text-align:left; font-size:12px; color:#4b5563;">
                                    <th style="padding:8px 12px;">Ciclo</th>
                                    <th style="padding:8px 12px;">Estado</th>
                                    <th style="padding:8px 12px;">Situação</th>
                                    <th style="padding:8px 12px;">Última exec.</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($ciclos as $c)
                                    <tr style="border-top:1px solid #e5e7eb; font-size:13px;">
                                        <td style="padding:8px 12px;"><strong>{{ number_format($c['periodo'], 0, ',', '.') }}</strong></td>
                                        <td style="padding:8px 12px;">
                                            @if ($c['estado'] === 'vencido')
                                                <span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600;">VENCIDO</span>
                                            @elseif ($c['estado'] === 'mestre')
                                                <span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600;">PRONTO P/ EXECUTAR</span>
                                            @else
                                                <span style="background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600;">AGUARDANDO</span>
                                            @endif
                                        </td>
                                        <td style="padding:8px 12px; color:#374151;">{{ $c['bloqueio'] ?? '—' }}</td>
                                        <td style="padding:8px 12px; color:#6b7280;">
                                            {{ $c['data_ultima'] ? \Carbon\Carbon::parse($c['data_ultima'])->format('d/m/Y') : '—' }}
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endforeach

                <p style="margin-top:24px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:16px;">
                    Esse email é gerado automaticamente pelo SGA-Engeativos. Para desativar os alertas, ajuste a variável
                    <code style="background:#f3f4f6; padding:1px 4px; border-radius:3px;">FROTA_ALERTAS_EMAIL</code> no servidor.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
