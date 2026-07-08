<?php

/*
|--------------------------------------------------------------------------
| Linhas de Autenticação (pt_BR)
|--------------------------------------------------------------------------
|
| Usadas no login (LoginRequest::authenticate lança trans('auth.failed') e
| trans('auth.throttle')).
|
*/

return [
    'failed'   => 'Essas credenciais não correspondem aos nossos registros.',
    'password' => 'A senha informada está incorreta.',
    'throttle' => 'Muitas tentativas de acesso. Tente novamente em :seconds segundos.',
];
