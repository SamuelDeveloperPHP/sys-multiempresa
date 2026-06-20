@php
    // Todos os movs devem compartilhar o mesmo retirante e obra (vêm da retirada rápida)
    $primeira      = $movs->first();
    $retirante     = $primeira->retiranteFuncionario;
    $retiranteUser = $primeira->retirante;
    $obra          = $primeira->obra;
    $totalGeral    = $movs->sum(fn ($m) => (float) $m->valor_total);
    $totalItens    = $movs->sum(fn ($m) => (float) $m->quantidade);
@endphp

@extends('estoque.comprovantes._layout')

@section('titulo', 'Comprovante de Retirada — Lote')

@section('corpo')
<div class="page">
    {{-- Cabeçalho --}}
    <div class="header">
        <div>
            <h1>COMPROVANTE DE RETIRADA</h1>
            <div class="sub">{{ $empresa?->name ?? 'Empresa' }} · Retirada rápida com {{ $movs->count() }} item(s)</div>
        </div>
        <div class="right">
            <div><strong>Lote:</strong> {{ $movs->pluck('id')->implode(', ') }}</div>
            <div><strong>Data:</strong> {{ optional($primeira->data_movimento)->format('d/m/Y') ?? '—' }}</div>
            <div>Emitido em {{ now()->format('d/m/Y H:i') }}</div>
        </div>
    </div>

    {{-- Identificação --}}
    <div class="grid-2">
        <div class="box">
            <h3>Obra</h3>
            <div class="kv"><span class="l">Código</span><span class="v">{{ $obra?->codigo_obra ?? '—' }}</span></div>
            <div class="kv"><span class="l">Nome fantasia</span><span class="v">{{ $obra?->nome_fantasia ?? '—' }}</span></div>
        </div>

        <div class="box">
            <h3>Retirante</h3>
            @if ($retirante)
                <div class="kv"><span class="l">Nome</span><span class="v">{{ $retirante->nome }}</span></div>
                <div class="kv"><span class="l">Matrícula</span><span class="v">{{ $retirante->matricula ?? '—' }}</span></div>
                <div class="kv"><span class="l">CPF</span><span class="v">{{ $retirante->cpf ?? '—' }}</span></div>
                <div class="kv"><span class="l">Tipo</span><span class="v">Funcionário de obra (sem login)</span></div>
            @elseif ($retiranteUser)
                <div class="kv"><span class="l">Nome</span><span class="v">{{ $retiranteUser->name }}</span></div>
                <div class="kv"><span class="l">E-mail</span><span class="v">{{ $retiranteUser->email }}</span></div>
                <div class="kv"><span class="l">Tipo</span><span class="v">Usuário do sistema</span></div>
            @else
                <div class="kv"><span class="l">—</span><span class="v">Não identificado</span></div>
            @endif
        </div>
    </div>

    {{-- Tabela de itens --}}
    <table class="itens">
        <thead>
            <tr>
                <th style="width:38px">#</th>
                <th style="width:110px">SKU</th>
                <th>Produto</th>
                <th class="num" style="width:90px">Qtd</th>
                <th style="width:46px">Un.</th>
                <th class="num" style="width:90px">Unit.</th>
                <th class="num" style="width:100px">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($movs as $i => $m)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td style="font-family:monospace">{{ $m->produto?->sku ?? '—' }}</td>
                    <td>
                        {{ $m->produto?->nome ?? '—' }}
                        @php $combo = collect([$m->variante?->cor, $m->variante?->tamanho])->filter()->implode(' · '); @endphp
                        @if ($combo || $m->lote)
                            <div style="font-size:10px;color:#92400e">
                                {{ $combo }}@if($m->lote?->numero_ca) · CA {{ $m->lote->numero_ca }}@endif@if($m->lote?->validade) · val {{ $m->lote->validade->format('d/m/Y') }}@endif
                            </div>
                        @endif
                    </td>
                    <td class="num">{{ number_format((float) $m->quantidade, 3, ',', '.') }}</td>
                    <td>{{ $m->produto?->unidade ?? '' }}</td>
                    <td class="num">{{ number_format((float) $m->valor_unitario, 2, ',', '.') }}</td>
                    <td class="num">{{ number_format((float) $m->valor_total, 2, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" style="text-align:right">Totais</td>
                <td class="num">{{ number_format($totalItens, 3, ',', '.') }}</td>
                <td></td>
                <td></td>
                <td class="num">R$ {{ number_format($totalGeral, 2, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    {{-- Auditoria --}}
    <div class="box" style="margin-bottom:14px">
        <h3>Auditoria</h3>
        <div class="kv"><span class="l">Operador</span><span class="v">{{ $operador?->name ?? '—' }} ({{ $operador?->email ?? '' }})</span></div>
        <div class="kv">
            <span class="l">Método de validação</span>
            <span class="v">
                @switch($primeira->validacao_method)
                    @case('SENHA_FUNC') Senha do funcionário @break
                    @case('SENHA') Senha do usuário @break
                    @case('BIOMETRIA_FUNC') Biometria do funcionário @break
                    @case('BIOMETRIA') Biometria (WebAuthn) @break
                    @default {{ $primeira->validacao_method ?? '—' }}
                @endswitch
            </span>
        </div>
        <div class="kv">
            <span class="l">Validado em</span>
            <span class="v">{{ optional($primeira->validado_em)->format('d/m/Y H:i:s') ?? '—' }}</span>
        </div>
    </div>

    {{-- Assinaturas --}}
    <div class="assinaturas">
        <div class="ass">
            <div class="nome">{{ ($retirante?->nome ?? $retiranteUser?->name) ?? '_________________________' }}</div>
            <div class="papel">Funcionário retirante</div>
        </div>
        <div class="ass">
            <div class="nome">{{ $operador?->name ?? '_________________________' }}</div>
            <div class="papel">Almoxarife / Operador</div>
        </div>
    </div>

    <div class="footer">
        <span>Documento gerado em {{ now()->format('d/m/Y H:i:s') }}</span>
        <span>{{ $movs->count() }} movimentação(ões) · {{ $empresa?->name ?? '' }}</span>
    </div>
</div>
@endsection
