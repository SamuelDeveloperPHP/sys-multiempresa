<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $funcionario->nome }} — Identificação</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
            max-width: 420px;
            width: 100%;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff5205 0%, #ff7838 100%);
            padding: 24px;
            text-align: center;
            color: white;
        }
        .header .logo {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 4px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .header h1 {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 2px;
        }
        .photo {
            display: flex;
            justify-content: center;
            padding: 32px 0 16px;
            background: white;
        }
        .photo img,
        .photo .placeholder {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            border: 4px solid #ff5205;
            object-fit: cover;
            background: #f3f4f6;
        }
        .photo .placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 56px;
            font-weight: 700;
            color: #9ca3af;
        }
        .info {
            padding: 16px 32px 32px;
            text-align: center;
        }
        .info .name {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            line-height: 1.2;
        }
        .info .role {
            font-size: 16px;
            font-weight: 600;
            color: #ff5205;
            margin-bottom: 2px;
        }
        .info .sector {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
        }
        .details {
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            text-align: left;
        }
        .details .item .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #9ca3af;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .details .item .value {
            font-size: 13px;
            color: #1f2937;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #ecfdf5;
            color: #047857;
            margin-bottom: 16px;
        }
        .footer {
            background: #f9fafb;
            padding: 12px 32px;
            text-align: center;
            font-size: 11px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .footer strong { color: #ff5205; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo">ENGETÉCNICA</div>
            <h1>IDENTIFICAÇÃO</h1>
        </div>

        <div class="photo">
            @if ($funcionario->imagem_usuario)
                <img src="{{ asset($funcionario->imagem_usuario) }}" alt="{{ $funcionario->nome }}">
            @else
                <div class="placeholder">{{ mb_strtoupper(mb_substr($funcionario->nome, 0, 1)) }}</div>
            @endif
        </div>

        <div class="info">
            <span class="status-badge">{{ $funcionario->status }}</span>
            <div class="name">{{ $funcionario->nome }}</div>
            <div class="role">{{ $funcionario->funcao->funcao ?? 'Sem função registrada' }}</div>
            <div class="sector">{{ $funcionario->setor->nome_setor ?? 'Sem setor registrado' }}</div>

            <div class="details">
                @if ($funcionario->matricula)
                <div class="item">
                    <div class="label">Matrícula</div>
                    <div class="value">{{ $funcionario->matricula }}</div>
                </div>
                @endif

                @if ($funcionario->obra)
                <div class="item">
                    <div class="label">Obra</div>
                    <div class="value">{{ $funcionario->obra->nome_fantasia ?? $funcionario->obra->code }}</div>
                </div>
                @endif

                @if ($funcionario->company)
                <div class="item">
                    <div class="label">Empresa</div>
                    <div class="value">{{ $funcionario->company->nome_fantasia ?? $funcionario->company->name }}</div>
                </div>
                @endif

                @if ($funcionario->data_adminssao)
                <div class="item">
                    <div class="label">Admissão</div>
                    <div class="value">{{ \Carbon\Carbon::parse($funcionario->data_adminssao)->format('d/m/Y') }}</div>
                </div>
                @endif
            </div>
        </div>

        <div class="footer">
            Página pública de identificação — <strong>www.engetecnica.com.br</strong>
        </div>
    </div>
</body>
</html>
