@php
    $funcNome = $dev->funcionarioObra?->nome ?? $dev->funcionario?->name;
    $funcDoc  = $dev->funcionarioObra
        ? ('Matr. ' . ($dev->funcionarioObra->matricula ?? '—') .
           ($dev->funcionarioObra->cpf ? ' · CPF ' . $dev->funcionarioObra->cpf : ''))
        : ($dev->funcionario?->email ?? '');

    $estadoMap = [
        'NOVO'     => 'Novo',
        'USADO_OK' => 'Usado – em condições',
        'AVARIADO' => 'Avariado',
    ];
    $statusMap = [
        'PENDENTE'  => ['Pendente', '#fff3cd', '#664d03'],
        'APROVADA'  => ['Aprovada', '#d1e7dd', '#0f5132'],
        'REJEITADA' => ['Rejeitada', '#f8d7da', '#842029'],
    ];
    [$statusLabel, $statusBg, $statusFg] = $statusMap[$dev->status] ?? [$dev->status, '#eee', '#333'];

    $valorTotal = (float) $dev->quantidade * (float) $dev->valor_unitario;
@endphp

@extends('estoque.comprovantes._layout')

@section('titulo', 'Comprovante de Devolução')

@section('corpo')
<div class="page">
    {{-- Cabeçalho --}}
    <div class="header">
        <div>
            <h1>COMPROVANTE DE DEVOLUÇÃO</h1>
            <div class="sub">{{ $empresa?->name ?? 'Empresa' }}</div>
        </div>
        <div class="right">
            <div><strong>Nº:</strong> {{ $dev->numero }}</div>
            <div><strong>Data:</strong> {{ optional($dev->data_criacao)->format('d/m/Y') ?? '—' }}</div>
            <div>
                <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;
                             background:{{ $statusBg }};color:{{ $statusFg }};font-size:11px">
                    {{ $statusLabel }}
                </span>
            </div>
        </div>
    </div>

    {{-- Identificação --}}
    <div class="grid-2">
        <div class="box">
            <h3>Obra</h3>
            <div class="kv"><span class="l">Código</span><span class="v">{{ $dev->obra?->codigo_obra ?? '—' }}</span></div>
            <div class="kv"><span class="l">Nome fantasia</span><span class="v">{{ $dev->obra?->nome_fantasia ?? '—' }}</span></div>
        </div>

        <div class="box">
            <h3>Funcionário que devolveu</h3>
            @if ($funcNome)
                <div class="kv"><span class="l">Nome</span><span class="v">{{ $funcNome }}</span></div>
                @if ($funcDoc)
                    <div class="kv"><span class="l">Identificação</span><span class="v">{{ $funcDoc }}</span></div>
                @endif
                <div class="kv">
                    <span class="l">Tipo</span>
                    <span class="v">
                        {{ $dev->funcionarioObra ? 'Funcionário de obra (sem login)' : 'Usuário do sistema' }}
                    </span>
                </div>
            @endif
        </div>
    </div>

    {{-- Itens --}}
    <table class="itens">
        <thead>
            <tr>
                <th style="width:120px">SKU</th>
                <th>Produto</th>
                <th class="num" style="width:90px">Qtd</th>
                <th style="width:50px">Un.</th>
                <th class="num" style="width:100px">Unit.</th>
                <th class="num" style="width:120px">Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="font-family:monospace">{{ $dev->produto?->sku ?? '—' }}</td>
                <td>{{ $dev->produto?->nome ?? '—' }}</td>
                <td class="num">{{ number_format((float) $dev->quantidade, 3, ',', '.') }}</td>
                <td>{{ $dev->produto?->unidade ?? '' }}</td>
                <td class="num">{{ number_format((float) $dev->valor_unitario, 2, ',', '.') }}</td>
                <td class="num">R$ {{ number_format($valorTotal, 2, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Detalhes --}}
    <div class="grid-2">
        <div class="box">
            <h3>Detalhes da devolução</h3>
            <div class="kv">
                <span class="l">Estado do material</span>
                <span class="v">{{ $estadoMap[$dev->estado_material] ?? $dev->estado_material }}</span>
            </div>
            <div class="kv">
                <span class="l">Motivo</span>
                <span class="v">{{ $dev->motivo ?? '—' }}</span>
            </div>
            @if ($dev->movimentacaoSaida)
                <div class="kv">
                    <span class="l">Saída original</span>
                    <span class="v">
                        #{{ str_pad($dev->movimentacaoSaida->id, 8, '0', STR_PAD_LEFT) }}
                        ({{ optional($dev->movimentacaoSaida->data_movimento)->format('d/m/Y') }})
                    </span>
                </div>
            @endif
            @if ($dev->movimentacaoGerada)
                <div class="kv">
                    <span class="l">Movimentação gerada</span>
                    <span class="v">#{{ str_pad($dev->movimentacaoGerada->id, 8, '0', STR_PAD_LEFT) }}</span>
                </div>
            @endif
        </div>

        <div class="box">
            <h3>Aprovação / Auditoria</h3>
            @if ($dev->status === 'APROVADA' && $dev->aprovador)
                <div class="kv"><span class="l">Aprovador</span><span class="v">{{ $dev->aprovador->name }}</span></div>
                <div class="kv"><span class="l">Em</span><span class="v">{{ optional($dev->data_aprovacao)->format('d/m/Y H:i') ?? '—' }}</span></div>
            @elseif ($dev->status === 'REJEITADA')
                <div class="kv"><span class="l">Motivo da rejeição</span><span class="v">{{ $dev->motivo_rejeicao ?? '—' }}</span></div>
            @else
                <div class="kv"><span class="l">Status</span><span class="v">Aguardando aprovação</span></div>
            @endif
        </div>
    </div>

    @if ($dev->observacao)
        <div class="box" style="margin-bottom:14px">
            <h3>Observação</h3>
            <div style="font-size:12.5px;color:#333">{{ $dev->observacao }}</div>
        </div>
    @endif

    {{-- Assinaturas --}}
    <div class="assinaturas">
        <div class="ass">
            <div class="nome">{{ $funcNome ?? '_________________________' }}</div>
            <div class="papel">Funcionário que devolveu</div>
        </div>
        <div class="ass">
            <div class="nome">{{ $dev->aprovador?->name ?? $operador?->name ?? '_________________________' }}</div>
            <div class="papel">{{ $dev->aprovador ? 'Aprovador' : 'Almoxarife / Operador' }}</div>
        </div>
    </div>

    <div class="footer">
        <span>Documento gerado em {{ now()->format('d/m/Y H:i:s') }}</span>
        <span>Ref. devolução {{ $dev->numero }}</span>
    </div>
</div>
@endsection
