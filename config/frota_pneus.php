<?php

/**
 * Configuracao da Gestao de Pneus da Frota.
 *
 * - layouts: mapa de posicoes por configuracao de eixos. O veiculo escolhe um
 *   layout (coluna veiculos.config_pneus); a montagem de pneu usa os codigos.
 *   Codigo de posicao: {eixo}{lado}{ext/int}. Ex.: 2EE = eixo 2, Esquerdo Externo.
 *   Cada posicao tambem carrega a GEOMETRIA p/ o mapa visual do chassi:
 *     - eixo: linha (1 = dianteiro), da frente para tras.
 *     - lane: coluna dentro do eixo. Da esquerda p/ a direita:
 *         EE (ext. esq.) · EI (int. esq.) · E (unico esq.) | chassi |
 *         D (unico dir.) · DI (int. dir.) · DE (ext. dir.) · ESTEPE (a parte).
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
                ['codigo' => '1E', 'label' => 'Dianteiro Esq.', 'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D', 'label' => 'Dianteiro Dir.', 'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2E', 'label' => 'Traseiro Esq.',  'eixo' => 2, 'lane' => 'E'],
                ['codigo' => '2D', 'label' => 'Traseiro Dir.',  'eixo' => 2, 'lane' => 'D'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe', 'eixo' => 99, 'lane' => 'ESTEPE'],
            ],
        ],
        'caminhao_toco' => [
            'label'    => 'Caminhão Toco (4x2, traseiro duplo)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.',         'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.',         'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2EE', 'label' => 'Traseiro Esq. Externo',  'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Traseiro Esq. Interno',  'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Traseiro Dir. Interno',  'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Traseiro Dir. Externo',  'eixo' => 2, 'lane' => 'DE'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe', 'eixo' => 99, 'lane' => 'ESTEPE'],
            ],
        ],
        'caminhao_truck' => [
            'label'    => 'Caminhão Truck (6x2 / 6x4)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.',      'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.',      'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2EE', 'label' => 'Eixo 2 Esq. Externo', 'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Eixo 2 Esq. Interno', 'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Eixo 2 Dir. Interno', 'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Eixo 2 Dir. Externo', 'eixo' => 2, 'lane' => 'DE'],
                ['codigo' => '3EE', 'label' => 'Eixo 3 Esq. Externo', 'eixo' => 3, 'lane' => 'EE'],
                ['codigo' => '3EI', 'label' => 'Eixo 3 Esq. Interno', 'eixo' => 3, 'lane' => 'EI'],
                ['codigo' => '3DI', 'label' => 'Eixo 3 Dir. Interno', 'eixo' => 3, 'lane' => 'DI'],
                ['codigo' => '3DE', 'label' => 'Eixo 3 Dir. Externo', 'eixo' => 3, 'lane' => 'DE'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe', 'eixo' => 99, 'lane' => 'ESTEPE'],
            ],
        ],
        'carreta_3_eixos' => [
            'label'    => 'Carreta / Reboque (3 eixos)',
            'posicoes' => [
                ['codigo' => '1EE', 'label' => 'Eixo 1 Esq. Externo', 'eixo' => 1, 'lane' => 'EE'],
                ['codigo' => '1EI', 'label' => 'Eixo 1 Esq. Interno', 'eixo' => 1, 'lane' => 'EI'],
                ['codigo' => '1DI', 'label' => 'Eixo 1 Dir. Interno', 'eixo' => 1, 'lane' => 'DI'],
                ['codigo' => '1DE', 'label' => 'Eixo 1 Dir. Externo', 'eixo' => 1, 'lane' => 'DE'],
                ['codigo' => '2EE', 'label' => 'Eixo 2 Esq. Externo', 'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Eixo 2 Esq. Interno', 'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Eixo 2 Dir. Interno', 'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Eixo 2 Dir. Externo', 'eixo' => 2, 'lane' => 'DE'],
                ['codigo' => '3EE', 'label' => 'Eixo 3 Esq. Externo', 'eixo' => 3, 'lane' => 'EE'],
                ['codigo' => '3EI', 'label' => 'Eixo 3 Esq. Interno', 'eixo' => 3, 'lane' => 'EI'],
                ['codigo' => '3DI', 'label' => 'Eixo 3 Dir. Interno', 'eixo' => 3, 'lane' => 'DI'],
                ['codigo' => '3DE', 'label' => 'Eixo 3 Dir. Externo', 'eixo' => 3, 'lane' => 'DE'],
            ],
        ],
        'maquina_4_pneus' => [
            'label'    => 'Máquina 4 pneus (retro / pá — linha amarela)',
            'posicoes' => [
                ['codigo' => 'DE', 'label' => 'Dianteiro Esq.', 'eixo' => 1, 'lane' => 'E'],
                ['codigo' => 'DD', 'label' => 'Dianteiro Dir.', 'eixo' => 1, 'lane' => 'D'],
                ['codigo' => 'TE', 'label' => 'Traseiro Esq.',  'eixo' => 2, 'lane' => 'E'],
                ['codigo' => 'TD', 'label' => 'Traseiro Dir.',  'eixo' => 2, 'lane' => 'D'],
            ],
        ],
        'onibus' => [
            'label'    => 'Ônibus (6x2)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.',        'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.',        'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2EE', 'label' => 'Traseiro Esq. Externo', 'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Traseiro Esq. Interno', 'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Traseiro Dir. Interno', 'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Traseiro Dir. Externo', 'eixo' => 2, 'lane' => 'DE'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe', 'eixo' => 99, 'lane' => 'ESTEPE'],
            ],
        ],
        'caminhao_6x2' => [
            'label'    => 'Caminhão 6x2 (trativo duplo + eixo simples)',
            'posicoes' => [
                ['codigo' => '1E',  'label' => 'Dianteiro Esq.',        'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D',  'label' => 'Dianteiro Dir.',        'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2EE', 'label' => 'Trativo Esq. Externo',  'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Trativo Esq. Interno',  'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Trativo Dir. Interno',  'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Trativo Dir. Externo',  'eixo' => 2, 'lane' => 'DE'],
                ['codigo' => '3E',  'label' => 'Eixo simples Esq.',     'eixo' => 3, 'lane' => 'E'],
                ['codigo' => '3D',  'label' => 'Eixo simples Dir.',     'eixo' => 3, 'lane' => 'D'],
                ['codigo' => 'ESTEPE', 'label' => 'Estepe', 'eixo' => 99, 'lane' => 'ESTEPE'],
            ],
        ],
        'motoniveladora' => [
            'label'    => 'Motoniveladora (2 dianteiros + 4 traseiros)',
            'posicoes' => [
                ['codigo' => '1E', 'label' => 'Dianteiro Esq.',  'eixo' => 1, 'lane' => 'E'],
                ['codigo' => '1D', 'label' => 'Dianteiro Dir.',  'eixo' => 1, 'lane' => 'D'],
                ['codigo' => '2E', 'label' => 'Traseiro 1 Esq.', 'eixo' => 2, 'lane' => 'E'],
                ['codigo' => '2D', 'label' => 'Traseiro 1 Dir.', 'eixo' => 2, 'lane' => 'D'],
                ['codigo' => '3E', 'label' => 'Traseiro 2 Esq.', 'eixo' => 3, 'lane' => 'E'],
                ['codigo' => '3D', 'label' => 'Traseiro 2 Dir.', 'eixo' => 3, 'lane' => 'D'],
            ],
        ],
        // Aproximação: rolo pneumático tem os pneus em fila ao longo da largura;
        // aqui modelamos 4 dianteiros + 4 traseiros (slots clicáveis para o CPK).
        'rolo_pneumatico' => [
            'label'    => 'Rolo Pneumático (pneus lisos)',
            'posicoes' => [
                ['codigo' => '1EE', 'label' => 'Dianteiro Esq. Ext.', 'eixo' => 1, 'lane' => 'EE'],
                ['codigo' => '1EI', 'label' => 'Dianteiro Esq. Int.', 'eixo' => 1, 'lane' => 'EI'],
                ['codigo' => '1DI', 'label' => 'Dianteiro Dir. Int.', 'eixo' => 1, 'lane' => 'DI'],
                ['codigo' => '1DE', 'label' => 'Dianteiro Dir. Ext.', 'eixo' => 1, 'lane' => 'DE'],
                ['codigo' => '2EE', 'label' => 'Traseiro Esq. Ext.',  'eixo' => 2, 'lane' => 'EE'],
                ['codigo' => '2EI', 'label' => 'Traseiro Esq. Int.',  'eixo' => 2, 'lane' => 'EI'],
                ['codigo' => '2DI', 'label' => 'Traseiro Dir. Int.',  'eixo' => 2, 'lane' => 'DI'],
                ['codigo' => '2DE', 'label' => 'Traseiro Dir. Ext.',  'eixo' => 2, 'lane' => 'DE'],
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
