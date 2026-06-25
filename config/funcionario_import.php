<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Importação de cadastro de funcionário por documento (sem IA)
    |--------------------------------------------------------------------------
    | Lê a "Ficha de Registro de Empregado" (PDF digital ou foto/scan) e
    | devolve os campos do cadastro para o usuário conferir antes de salvar.
    |
    | - PDF com camada de texto  -> smalot/pdfparser (PHP puro, sem binário)
    | - Imagem / foto / scan      -> Tesseract OCR (binário externo)
    */

    // Tamanho máximo do arquivo aceito (MB).
    'max_file_mb' => (int) env('FUNC_IMPORT_MAX_MB', 20),

    // Confiança média mínima (0..1) do OCR para considerar a leitura "adequada".
    'min_confianca_ocr' => (float) env('FUNC_IMPORT_MIN_CONF', 0.55),

    // Campos que PRECISAM ser lidos para o documento ser aceito.
    // Se algum faltar, a leitura é marcada como "qualidade inadequada".
    'campos_criticos' => ['nome', 'cpf'],

    // Âncoras que identificam que o arquivo é mesmo uma Ficha de Registro.
    'ancoras_ficha' => [
        'Ficha de Registro de Empregado',
        'Dados do Empregado',
        'Registro de Empregado',
    ],

    // Quantas páginas (a partir da 1ª) rasterizar/ler por OCR num PDF-imagem.
    // A Ficha costuma ser a 1ª página; o restante são anexos. A leitura para
    // assim que encontra a Ficha.
    'ocr_max_paginas' => (int) env('FUNC_IMPORT_OCR_PAGS', 3),

    /*
    |--------------------------------------------------------------------------
    | Tesseract OCR
    |--------------------------------------------------------------------------
    | bin: caminho do executável. No Windows o instalador padrão coloca em
    |      "C:\\Program Files\\Tesseract-OCR\\tesseract.exe".
    | lang: pacote de idioma ('por' = português; precisa do por.traineddata).
    | psm:  Page Segmentation Mode (4 = coluna de texto de tamanhos variados).
    */
    'tesseract' => [
        'bin'     => env('TESSERACT_BIN', 'tesseract'),
        'lang'    => env('TESSERACT_LANG', 'por'),
        'psm'     => env('TESSERACT_PSM', '4'),
        'timeout' => (int) env('TESSERACT_TIMEOUT', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Rasterizador de PDF (para PDF-imagem / escaneado, antes do OCR)
    |--------------------------------------------------------------------------
    | Converte páginas do PDF em PNG. Suporta Poppler (pdftoppm) e Ghostscript.
    | bin vazio => autodetecta (pdftoppm -> gswin64c -> gs).
    | Ex. Windows: "C:\\Program Files\\poppler\\bin\\pdftoppm.exe" ou
    |              "C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe".
    */
    'rasterizador' => [
        'bin'     => env('PDF_RASTER_BIN', ''),
        'dpi'     => (int) env('PDF_RASTER_DPI', 300),
        'timeout' => (int) env('PDF_RASTER_TIMEOUT', 120),
    ],

];
