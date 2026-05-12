@component('mail::message')
# Olá, {{ $user->name }}!

Seu acesso ao sistema foi liberado.

Você já pode acessar o painel com o seu e-mail **{{ $user->email }}**.

@component('mail::button', ['url' => config('app.url') . '/login'])
Acessar sistema
@endcomponent

Obrigado,<br>
{{ config('app.name') }}
@endcomponent
