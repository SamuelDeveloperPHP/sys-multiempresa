@php
    $isSaida     = $mov->tipo === \App\Models\Estoque\Movimentacao::TIPO_SAIDA;
    $isDevolucao = $mov->tipo === \App\Models\Estoque\Movimentacao::TIPO_DEVOLUCAO;
    $isEntrada   = $mov->tipo === \App\Models\Estoque\Movimentacao::TIPO_ENTRADA;

    $retiranteNome = $mov->retiranteFuncionario?->nome ?? $mov->retirante?->name;
    $retiranteDoc  = $mov->retiranteFuncionario
        ? ('Matr. ' . ($mov->retiranteFuncionario->matricula ?? '—') .
           ($mov->retiranteFuncionario->cpf ? ' · CPF ' . $mov->retiranteFuncionario->cpf : ''))
        : ($mov->retirante?->email ?? '');

    // EPI: variante (cor/tamanho) e dados do lote/CA/validade
    $varianteRotulo = $mov->variante
        ? collect([$mov->variante->cor, $mov->variante->tamanho])->filter()->implode(' · ')
        : null;
    $temDadosEpi = $mov->lote || $varianteRotulo;
@endphp

@extends('estoque.comprovantes._layout')

@section('titulo', $titulo)

@section('corpo')
<div class="page">
    {{-- Cabeçalho --}}
    <div class="header">
        <div>
            <h1>{{ $titulo }}</h1>
            <div class="sub">{{ $empresa?->name ?? 'Empresa' }}</div>
        </div>
        <div class="right">
            <div><strong>Nº:</strong> {{ str_pad($mov->id, 8, '0', STR_PAD_LEFT) }}</div>
            <div><strong>Data:</strong> {{ optional($mov->data_movimento)->format('d/m/Y') ?? '—' }}</div>
            <div>Emitido em {{ now()->format('d/m/Y H:i') }}</div>
        </div>
    </div>

    {{-- Caixas de identificação --}}
    <div class="grid-2">
        <div class="box">
            <h3>Obra</h3>
            <div class="kv"><span class="l">Código</span><span class="v">{{ $mov->obra?->codigo_obra ?? '—' }}</span></div>
            <div class="kv"><span class="l">Nome fantasia</span><span class="v">{{ $mov->obra?->nome_fantasia ?? '—' }}</span></div>
        </div>

        <div class="box">
            <h3>{{ $isEntrada ? 'Recebido por' : 'Retirante' }}</h3>
            @if ($retiranteNome)
                <div class="kv"><span class="l">Nome</span><span class="v">{{ $retiranteNome }}</span></div>
                @if ($retiranteDoc)
                    <div class="kv"><span class="l">Identificação</span><span class="v">{{ $retiranteDoc }}</span></div>
                @endif
                <div class="kv">
                    <span class="l">Tipo</span>
                    <span class="v">
                        {{ $mov->retiranteFuncionario ? 'Funcionário de obra (sem login)' : 'Usuário do sistema' }}
                    </span>
                </div>
            @else
                <div class="kv"><span class="l">—</span><span class="v">Não aplicável</span></div>
            @endif
        </div>
    </div>

    {{-- Tabela do item --}}
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
                <td style="font-family:monospace">{{ $mov->produto?->sku ?? '—' }}</td>
                <td>
                    {{ $mov->produto?->nome ?? '—' }}
                    @if ($varianteRotulo)
                        <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:bold;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;padding:1px 6px">{{ $varianteRotulo }}</span>
                    @endif
                </td>
                <td class="num">{{ number_format((float) $mov->quantidade, 3, ',', '.') }}</td>
                <td>{{ $mov->produto?->unidade ?? '' }}</td>
                <td class="num">{{ number_format((float) $mov->valor_unitario, 2, ',', '.') }}</td>
                <td class="num">R$ {{ number_format((float) $mov->valor_total, 2, ',', '.') }}</td>
            </tr>
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align:right">Total geral</td>
                <td class="num">R$ {{ number_format((float) $mov->valor_total, 2, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    {{-- Certificação EPI (CA / lote / validade / variante) --}}
    @if ($temDadosEpi)
        @php
            $validade = $mov->lote?->validade;
            $diasVenc = $validade ? (int) now()->startOfDay()->diffInDays($validade, false) : null;
        @endphp
        <div class="box" style="border-color:#fde68a;background:#fffbeb;margin-bottom:10px">
            <h3 style="color:#92400e">Equipamento de Proteção — Certificação</h3>
            <div class="grid-2" style="gap:6px 24px">
                @if ($varianteRotulo)
                    <div class="kv"><span class="l">Variante</span><span class="v">{{ $varianteRotulo }}</span></div>
                @endif
                <div class="kv">
                    <span class="l">C.A. (Cert. Aprovação)</span>
                    <span class="v">{{ $mov->lote?->numero_ca ?: '— não informado —' }}</span>
                </div>
                <div class="kv">
                    <span class="l">Lote</span>
                    <span class="v">{{ $mov->lote?->numero_lote ?: ('#' . ($mov->lote?->id ?? '—')) }}</span>
                </div>
                <div class="kv">
                    <span class="l">Validade</span>
                    <span class="v">
                        {{ $validade ? $validade->format('d/m/Y') : 'sem validade' }}
                        @if ($diasVenc !== null)
                            @if ($diasVenc < 0)
                                <strong style="color:#b91c1c">(VENCIDO)</strong>
                            @elseif ($diasVenc <= 30)
                                <strong style="color:#b45309">(vence em {{ $diasVenc }}d)</strong>
                            @endif
                        @endif
                    </span>
                </div>
            </div>
            @if ($mov->lote?->especificacao_tecnica)
                <div class="kv" style="margin-top:6px">
                    <span class="l">Especificação técnica</span>
                    <span class="v">{{ $mov->lote->especificacao_tecnica }}</span>
                </div>
            @endif
            <div style="margin-top:8px;font-size:11px;color:#78716c;border-top:1px dashed #e7d9a8;padding-top:6px">
                Declaro ter recebido o equipamento de proteção descrito acima, em perfeitas condições de uso,
                ciente da obrigatoriedade do seu uso e conservação (NR-6).
            </div>
        </div>
    @endif

    {{-- Detalhes adicionais --}}
    <div class="grid-2">
        <div class="box">
            <h3>Auditoria</h3>
            <div class="kv"><span class="l">Operador</span><span class="v">{{ $mov->user_create ?? '—' }}</span></div>
            @if ($mov->validacao_method)
                <div class="kv">
                    <span class="l">Método de validação</span>
                    <span class="v">
                        @switch($mov->validacao_method)
                            @case('SENHA_FUNC')    Senha do funcionário @break
                            @case('SENHA')         Senha do usuário @break
                            @case('BIOMETRIA_FUNC') Biometria do funcionário @break
                            @case('BIOMETRIA')     Biometria (WebAuthn) @break
                            @default {{ $mov->validacao_method }}
                        @endswitch
                    </span>
                </div>
                <div class="kv">
                    <span class="l">Validado em</span>
                    <span class="v">{{ optional($mov->validado_em)->format('d/m/Y H:i:s') ?? '—' }}</span>
                </div>
            @endif
            @if ($mov->origem)
                <div class="kv">
                    <span class="l">Origem (saída)</span>
                    <span class="v">#{{ str_pad($mov->origem->id, 8, '0', STR_PAD_LEFT) }}</span>
                </div>
            @endif
        </div>

        <div class="box">
            <h3>Observação</h3>
            <div style="font-size:12.5px;color:#333;min-height:42px">
                {{ $mov->observacao ?? '—' }}
            </div>
        </div>
    </div>

    {{-- Assinaturas --}}
    @if ($isSaida || $isDevolucao)
        <div class="assinaturas">
            <div class="ass">
                <div class="nome">{{ $retiranteNome ?? '_________________________' }}</div>
                <div class="papel">{{ $isDevolucao ? 'Funcionário que devolveu' : 'Funcionário retirante' }}</div>
            </div>
            <div class="ass">
                <div class="nome">{{ $operador?->name ?? '_________________________' }}</div>
                <div class="papel">Almoxarife / Operador</div>
            </div>
        </div>
    @endif

    <div class="footer">
        <span>Documento gerado automaticamente em {{ now()->format('d/m/Y H:i:s') }}</span>
        <span>Ref. mov #{{ $mov->id }}</span>
    </div>
</div>
@endsection
