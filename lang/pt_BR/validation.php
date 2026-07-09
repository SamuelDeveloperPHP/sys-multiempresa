<?php

/*
|--------------------------------------------------------------------------
| Linhas de Validação (pt_BR)
|--------------------------------------------------------------------------
|
| Laravel 12 não traz arquivos de tradução por padrão — sem este arquivo o
| validador devolvia a CHAVE crua ("validation.required"). Mensagens padrão
| brasileiras + custom messages e nomes de atributos amigáveis (foco atual:
| login e frota; demais módulos podem ganhar attributes depois).
|
*/

return [
    'accepted'             => 'O campo :attribute deve ser aceito.',
    'accepted_if'          => 'O campo :attribute deve ser aceito quando :other for :value.',
    'active_url'           => 'O campo :attribute não é uma URL válida.',
    'after'                => 'O campo :attribute deve ser uma data posterior a :date.',
    'after_or_equal'       => 'O campo :attribute deve ser uma data posterior ou igual a :date.',
    'alpha'                => 'O campo :attribute deve conter apenas letras.',
    'alpha_dash'           => 'O campo :attribute deve conter apenas letras, números, hífens e sublinhados.',
    'alpha_num'            => 'O campo :attribute deve conter apenas letras e números.',
    'array'                => 'O campo :attribute deve ser um conjunto.',
    'ascii'                => 'O campo :attribute deve conter apenas caracteres e símbolos alfanuméricos.',
    'before'               => 'O campo :attribute deve ser uma data anterior a :date.',
    'before_or_equal'      => 'O campo :attribute deve ser uma data anterior ou igual a :date.',
    'between'              => [
        'array'   => 'O campo :attribute deve ter entre :min e :max itens.',
        'file'    => 'O campo :attribute deve ter entre :min e :max kilobytes.',
        'numeric' => 'O campo :attribute deve ser entre :min e :max.',
        'string'  => 'O campo :attribute deve ter entre :min e :max caracteres.',
    ],
    'boolean'              => 'O campo :attribute deve ser verdadeiro ou falso.',
    'confirmed'            => 'A confirmação do campo :attribute não confere.',
    'current_password'     => 'A senha está incorreta.',
    'date'                 => 'O campo :attribute não é uma data válida.',
    'date_equals'          => 'O campo :attribute deve ser uma data igual a :date.',
    'date_format'          => 'O campo :attribute não corresponde ao formato :format.',
    'decimal'              => 'O campo :attribute deve ter :decimal casas decimais.',
    'declined'             => 'O campo :attribute deve ser recusado.',
    'declined_if'          => 'O campo :attribute deve ser recusado quando :other for :value.',
    'different'            => 'Os campos :attribute e :other devem ser diferentes.',
    'digits'               => 'O campo :attribute deve ter :digits dígitos.',
    'digits_between'       => 'O campo :attribute deve ter entre :min e :max dígitos.',
    'dimensions'           => 'O campo :attribute tem dimensões de imagem inválidas.',
    'distinct'             => 'O campo :attribute tem um valor duplicado.',
    'doesnt_end_with'      => 'O campo :attribute não pode terminar com um dos seguintes: :values.',
    'doesnt_start_with'    => 'O campo :attribute não pode começar com um dos seguintes: :values.',
    'email'                => 'O campo :attribute deve ser um endereço de e-mail válido.',
    'ends_with'            => 'O campo :attribute deve terminar com um dos seguintes: :values.',
    'enum'                 => 'O valor selecionado para :attribute é inválido.',
    'exists'               => 'O valor selecionado para :attribute é inválido.',
    'file'                 => 'O campo :attribute deve ser um arquivo.',
    'filled'               => 'O campo :attribute é obrigatório.',
    'gt'                   => [
        'array'   => 'O campo :attribute deve ter mais de :value itens.',
        'file'    => 'O campo :attribute deve ser maior que :value kilobytes.',
        'numeric' => 'O campo :attribute deve ser maior que :value.',
        'string'  => 'O campo :attribute deve ter mais de :value caracteres.',
    ],
    'gte'                  => [
        'array'   => 'O campo :attribute deve ter :value itens ou mais.',
        'file'    => 'O campo :attribute deve ser maior ou igual a :value kilobytes.',
        'numeric' => 'O campo :attribute deve ser maior ou igual a :value.',
        'string'  => 'O campo :attribute deve ter :value caracteres ou mais.',
    ],
    'image'                => 'O campo :attribute deve ser uma imagem.',
    'in'                   => 'O valor selecionado para :attribute é inválido.',
    'in_array'             => 'O campo :attribute não existe em :other.',
    'integer'              => 'O campo :attribute deve ser um número inteiro.',
    'ip'                   => 'O campo :attribute deve ser um endereço de IP válido.',
    'ipv4'                 => 'O campo :attribute deve ser um endereço de IPv4 válido.',
    'ipv6'                 => 'O campo :attribute deve ser um endereço de IPv6 válido.',
    'json'                 => 'O campo :attribute deve ser um JSON válido.',
    'lowercase'            => 'O campo :attribute deve estar em minúsculas.',
    'lt'                   => [
        'array'   => 'O campo :attribute deve ter menos de :value itens.',
        'file'    => 'O campo :attribute deve ser menor que :value kilobytes.',
        'numeric' => 'O campo :attribute deve ser menor que :value.',
        'string'  => 'O campo :attribute deve ter menos de :value caracteres.',
    ],
    'lte'                  => [
        'array'   => 'O campo :attribute não deve ter mais que :value itens.',
        'file'    => 'O campo :attribute deve ser menor ou igual a :value kilobytes.',
        'numeric' => 'O campo :attribute deve ser menor ou igual a :value.',
        'string'  => 'O campo :attribute deve ter :value caracteres ou menos.',
    ],
    'mac_address'          => 'O campo :attribute deve ser um endereço MAC válido.',
    'max'                  => [
        'array'   => 'O campo :attribute não deve ter mais que :max itens.',
        'file'    => 'O campo :attribute não deve ter mais que :max kilobytes.',
        'numeric' => 'O campo :attribute não deve ser maior que :max.',
        'string'  => 'O campo :attribute não deve ter mais que :max caracteres.',
    ],
    'max_digits'           => 'O campo :attribute não deve ter mais que :max dígitos.',
    'mimes'                => 'O campo :attribute deve ser um arquivo do tipo: :values.',
    'mimetypes'            => 'O campo :attribute deve ser um arquivo do tipo: :values.',
    'min'                  => [
        'array'   => 'O campo :attribute deve ter no mínimo :min itens.',
        'file'    => 'O campo :attribute deve ter no mínimo :min kilobytes.',
        'numeric' => 'O campo :attribute deve ser no mínimo :min.',
        'string'  => 'O campo :attribute deve ter no mínimo :min caracteres.',
    ],
    'min_digits'           => 'O campo :attribute deve ter no mínimo :min dígitos.',
    'missing'              => 'O campo :attribute deve estar ausente.',
    'missing_if'           => 'O campo :attribute deve estar ausente quando :other for :value.',
    'missing_unless'       => 'O campo :attribute deve estar ausente a menos que :other seja :value.',
    'missing_with'         => 'O campo :attribute deve estar ausente quando :values estiver presente.',
    'missing_with_all'     => 'O campo :attribute deve estar ausente quando :values estiverem presentes.',
    'multiple_of'          => 'O campo :attribute deve ser um múltiplo de :value.',
    'not_in'               => 'O valor selecionado para :attribute é inválido.',
    'not_regex'            => 'O formato do campo :attribute é inválido.',
    'numeric'              => 'O campo :attribute deve ser um número.',
    'password'             => [
        'letters'       => 'O campo :attribute deve conter ao menos uma letra.',
        'mixed'         => 'O campo :attribute deve conter ao menos uma letra maiúscula e uma minúscula.',
        'numbers'       => 'O campo :attribute deve conter ao menos um número.',
        'symbols'       => 'O campo :attribute deve conter ao menos um símbolo.',
        'uncompromised' => 'O :attribute informado apareceu em um vazamento de dados. Escolha outro :attribute.',
    ],
    'present'              => 'O campo :attribute deve estar presente.',
    'prohibited'           => 'O campo :attribute é proibido.',
    'prohibited_if'        => 'O campo :attribute é proibido quando :other for :value.',
    'prohibited_unless'    => 'O campo :attribute é proibido a menos que :other esteja em :values.',
    'prohibits'            => 'O campo :attribute proíbe que :other esteja presente.',
    'regex'                => 'O formato do campo :attribute é inválido.',
    'required'             => 'O campo :attribute é obrigatório.',
    'required_array_keys'  => 'O campo :attribute deve conter entradas para: :values.',
    'required_if'          => 'O campo :attribute é obrigatório quando :other for :value.',
    'required_if_accepted' => 'O campo :attribute é obrigatório quando :other for aceito.',
    'required_unless'      => 'O campo :attribute é obrigatório a menos que :other esteja em :values.',
    'required_with'        => 'O campo :attribute é obrigatório quando :values está presente.',
    'required_with_all'    => 'O campo :attribute é obrigatório quando :values estão presentes.',
    'required_without'     => 'O campo :attribute é obrigatório quando :values não está presente.',
    'required_without_all' => 'O campo :attribute é obrigatório quando nenhum de :values está presente.',
    'same'                 => 'Os campos :attribute e :other devem coincidir.',
    'size'                 => [
        'array'   => 'O campo :attribute deve conter :size itens.',
        'file'    => 'O campo :attribute deve ter :size kilobytes.',
        'numeric' => 'O campo :attribute deve ser :size.',
        'string'  => 'O campo :attribute deve ter :size caracteres.',
    ],
    'starts_with'          => 'O campo :attribute deve começar com um dos seguintes: :values.',
    'string'               => 'O campo :attribute deve ser um texto.',
    'timezone'             => 'O campo :attribute deve ser um fuso horário válido.',
    'unique'               => 'O :attribute já está em uso.',
    'uploaded'             => 'Falha no upload do :attribute.',
    'uppercase'            => 'O campo :attribute deve estar em maiúsculas.',
    'url'                  => 'O campo :attribute deve ser uma URL válida.',
    'ulid'                 => 'O campo :attribute deve ser um ULID válido.',
    'uuid'                 => 'O campo :attribute deve ser um UUID válido.',

    /*
    |--------------------------------------------------------------------------
    | Mensagens personalizadas (campo.regra)
    |--------------------------------------------------------------------------
    */
    'custom' => [
        'password' => [
            'required' => 'Informe sua senha.',
        ],
        'email' => [
            'required' => 'Informe seu e-mail.',
            'email'    => 'Informe um e-mail válido.',
        ],
        // OBS: a validação de doc PDF-only tem mensagens inline no
        // VeiculoController::validarDoc. Aqui NÃO fixamos "arquivo" como PDF
        // porque outros anexos (NF/comprovante) aceitam PDF OU imagem — a
        // mensagem genérica de :values já informa os tipos aceitos.
    ],

    /*
    |--------------------------------------------------------------------------
    | Nomes de atributos amigáveis (foco: login + frota)
    |--------------------------------------------------------------------------
    */
    'attributes' => [
        // Login / conta
        'email'                 => 'e-mail',
        'password'              => 'senha',
        'password_confirmation' => 'confirmação de senha',
        'current_password'      => 'senha atual',
        'remember'              => 'lembrar-me',

        // Frota — documentos
        'nome_documento'        => 'nome do documento',
        'data_documento'        => 'data do documento',
        'data_validade'         => 'data de validade',
        'arquivo'               => 'arquivo',
        'status'                => 'status',
        'obsoleto'              => 'obsoleto',

        // Frota — veículo
        'prefixo'               => 'prefixo',
        'placa'                 => 'placa',
        'marca'                 => 'marca',
        'modelo'                => 'modelo',
        'ano'                   => 'ano',
        'obra_id'               => 'obra',
        'id_categoria'          => 'categoria',
        'id_subcategoria'       => 'subcategoria',
        'id_preventiva'         => 'plano de preventiva',
        'tipo'                  => 'tipo',
        'valor_fipe'            => 'valor FIPE',
        'valor_aquisicao'       => 'valor de aquisição',
        'valor_mercado'         => 'valor de mercado',
        'codigo_fipe'           => 'código FIPE',
        'nun_serie_chassi'      => 'nº de série / chassi',
        'renavam'               => 'renavam',
        'horimetro_inicial'     => 'horímetro inicial',
        'quilometragem_inicial' => 'quilometragem inicial',
        'observacao'            => 'observação',
        'situacao'              => 'situação',
        'imagem'                => 'imagem',

        // Frota — corretivas / documentos financeiros
        'fornecedor_id'         => 'fornecedor',
        'valor_do_servico'      => 'valor do serviço',
        'data_de_execucao'      => 'data de execução',
        'data_conclusao'        => 'data de conclusão',
        'data_de_vencimento'    => 'data de vencimento',
        'descricao'             => 'descrição',
    ],
];
