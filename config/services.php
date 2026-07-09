<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | OneDrive / Microsoft Graph
    |--------------------------------------------------------------------------
    | Credenciais Azure AD usadas por FileUploadHelper para upload de anexos
    | de funcionários ao SharePoint/OneDrive corporativo.
    */
    // Microsoft Graph / OneDrive — segredos SOMENTE via .env (sem defaults
    // hardcoded: o client_secret nunca deve viver no código/git).
    'onedrive' => [
        'tenant_id'     => env('MS_GRAPH_TENANT_ID'),
        'client_id'     => env('MS_GRAPH_CLIENT_ID'),
        'client_secret' => env('MS_GRAPH_CLIENT_SECRET'),
        'site_id'       => env('MS_GRAPH_SITE_ID'),
        'root_folder'   => env('MS_GRAPH_ROOT_FOLDER', 'SGA-Engeativos'),
    ],

];
