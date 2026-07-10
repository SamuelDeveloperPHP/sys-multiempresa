<?php

/**
 * Configuracao da Gestao de Pneus da Frota.
 *
 * - layouts: mapa de posicoes por configuracao de eixos. O veiculo escolhe um
 *   layout (coluna veiculos.config_pneus); a montagem de pneu usa os codigos.
 *   Codigo de posicao: {eixo}{lado}{ext/int}. Ex.: 2EE = eixo 2, Esquerdo Externo.
 * - limites: gatilhos de alerta (sulco/pressao).
 */
return [

    // Profundidade de sulco (mm)
    'sulco' => [
        'minimo_legal' => 1.6,  // limite legal (CONTRAN) — abaixo disso e infracao
        'alerta'       => 3.0,  // aviso preventivo p/ programar troca/recapagem
        'novo_padrao'  => 16.0, // sulco de um pneu novo (referencia p/ % de desgaste)
    ],

    // Layouts de posicoes por configuracao de eixos.
    'layouts' => [
        'passeio_4x2' => [
            'label'    => 'Passeio / Utilitário (4x2)',
            'posicoes' => [
                ['codigo' => '1E', 'label' => 'Dianteiro Esq.'],
                ['codigo' => '1D', 'label' => 'Dianteiro Dir.'],
                ['codigo' => '2E', 'label' => 'Traseiro Esq.'],
                ['codigo' => '2D', 'label' => 'Traseiro Dir.'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe'],
            ],
        ],
        'caminhao_toco' => [
            'label'    => 'Caminhão Toco (4x2, traseiro duplo)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.'],
                ['codigo' => '2EE', 'label' => 'Traseiro Esq. Externo'],
                ['codigo' => '2EI', 'label' => 'Traseiro Esq. Interno'],
                ['codigo' => '2DI', 'label' => 'Traseiro Dir. Interno'],
                ['codigo' => '2DE', 'label' => 'Traseiro Dir. Externo'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe'],
            ],
        ],
        'caminhao_truck' => [
            'label'    => 'Caminhão Truck (6x2 / 6x4)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.'],
                ['codigo' => '2EE', 'label' => 'Eixo 2 Esq. Externo'],
                ['codigo' => '2EI', 'label' => 'Eixo 2 Esq. Interno'],
                ['codigo' => '2DI', 'label' => 'Eixo 2 Dir. Interno'],
                ['codigo' => '2DE', 'label' => 'Eixo 2 Dir. Externo'],
                ['codigo' => '3EE', 'label' => 'Eixo 3 Esq. Externo'],
                ['codigo' => '3EI', 'label' => 'Eixo 3 Esq. Interno'],
                ['codigo' => '3DI', 'label' => 'Eixo 3 Dir. Interno'],
                ['codigo' => '3DE', 'label' => 'Eixo 3 Dir. Externo'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe'],
            ],
        ],
        'carreta_3_eixos' => [
            'label'    => 'Carreta / Reboque (3 eixos)',
            'posicoes' => [
                ['codigo' => '1EE', 'label' => 'Eixo 1 Esq. Externo'],
                ['codigo' => '1EI', 'label' => 'Eixo 1 Esq. Interno'],
                ['codigo' => '1DI', 'label' => 'Eixo 1 Dir. Interno'],
                ['codigo' => '1DE', 'label' => 'Eixo 1 Dir. Externo'],
                ['codigo' => '2EE', 'label' => 'Eixo 2 Esq. Externo'],
                ['codigo' => '2EI', 'label' => 'Eixo 2 Esq. Interno'],
                ['codigo' => '2DI', 'label' => 'Eixo 2 Dir. Interno'],
                ['codigo' => '2DE', 'label' => 'Eixo 2 Dir. Externo'],
                ['codigo' => '3EE', 'label' => 'Eixo 3 Esq. Externo'],
                ['codigo' => '3EI', 'label' => 'Eixo 3 Esq. Interno'],
                ['codigo' => '3DI', 'label' => 'Eixo 3 Dir. Interno'],
                ['codigo' => '3DE', 'label' => 'Eixo 3 Dir. Externo'],
            ],
        ],
        'maquina_4_pneus' => [
            'label'    => 'Máquina 4 pneus (retro / pá — linha amarela)',
            'posicoes' => [
                ['codigo' => 'DE', 'label' => 'Dianteiro Esq.'],
                ['codigo' => 'DD', 'label' => 'Dianteiro Dir.'],
                ['codigo' => 'TE', 'label' => 'Traseiro Esq.'],
                ['codigo' => 'TD', 'label' => 'Traseiro Dir.'],
            ],
        ],
        'onibus' => [
            'label'    => 'Ônibus (6x2)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.'],
                ['codigo' => '2EE', 'label' => 'Traseiro Esq. Externo'],
                ['codigo' => '2EI', 'label' => 'Traseiro Esq. Interno'],
                ['codigo' => '2DI', 'label' => 'Traseiro Dir. Interno'],
                ['codigo' => '2DE', 'label' => 'Traseiro Dir. Externo'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe'],
            ],
        ],
    ],

    // Estados do pneu
    'situacoes' => ['estoque', 'montado', 'recapadora', 'conserto', 'sucata'],

    // Tipos de movimentacao (ledger)
    'movimentacoes' => ['compra', 'montagem', 'desmontagem', 'rodizio', 'recapagem', 'conserto', 'sucateamento'],

    // Desenhos/banda comuns
    'desenhos' => ['Borrachudo', 'Misto', 'Liso (trativo)', 'Direcional', 'OTR (linha amarela)'],
];
