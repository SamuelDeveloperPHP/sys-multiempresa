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
    'onedrive' => [
        'tenant_id'     => env('MS_GRAPH_TENANT_ID', '3e11ccfe-ac2d-406b-9305-0f217a096f66'),
        'client_id'     => env('MS_GRAPH_CLIENT_ID', '58f96824-8212-4e33-979e-31dbaf9f50b7'),
        'client_secret' => env('MS_GRAPH_CLIENT_SECRET', 'U-J8Q~LPMiOTxdZ3OKukdaIR3U_QMRj-~.GiYcXF'),
        'site_id'       => env('MS_GRAPH_SITE_ID', '4ca1f317-1e25-4523-ad97-3e244d17e63e'),
        'root_folder'   => env('MS_GRAPH_ROOT_FOLDER', 'SGA-Engeativos'),
    ],

];
