<?php

/**
 * Parametros padrao de depreciacao da Frota.
 *
 * Sao FALLBACKS: cada veiculo/maquina pode sobrescrever (colunas
 * vida_util_anos, vida_util_horas, valor_residual, metodo_depreciacao,
 * taxa_depreciacao_anual em `veiculos`). O contador confirma a
 * classificacao fiscal — estes valores seguem as taxas usuais da
 * Receita (IN RFB): veiculos 5 anos (20% a.a.), maquinas e
 * equipamentos 10 anos (10% a.a.).
 */
return [

    // Percentual do valor de aquisicao que sobra ao fim da vida util
    // (valor de revenda/sucata). Base do "valor depreciavel".
    'residual_pct' => [
        'rodoviario' => 0.10, // carros/caminhoes: ~10%
        'maquina'    => 0.20, // linha amarela retem mais valor: ~20%
    ],

    // Vida util em ANOS (metodos linear / saldo decrescente).
    'vida_util_anos' => [
        'rodoviario' => 5,   // 20% a.a.
        'maquina'    => 10,  // 10% a.a.
    ],

    // Vida util em HORAS (metodo horimetro — linha amarela).
    // Horas de vida economica tipica de equipamento de construcao.
    'vida_util_horas' => [
        'default'        => 10000,
    ],

    // Metodo padrao quando o ativo nao define um explicitamente.
    // A selecao automatica ainda prioriza:
    //   ativo horimetrado (tipo_hr)      -> 'horimetro'
    //   possui valor de mercado/FIPE     -> 'mercado'
    //   caso contrario                   -> 'linear'
    'metodo_padrao' => 'linear',

    // Metodos suportados (para validacao).
    'metodos' => ['horimetro', 'linear', 'saldo_decrescente', 'mercado'],
];
