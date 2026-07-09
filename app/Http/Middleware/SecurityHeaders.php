<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Headers de segurança HTTP (defesa contra clickjacking, MIME sniffing,
 * vazamento de referrer e downgrade de HTTPS).
 *
 * NÃO inclui Content-Security-Policy: o CSP precisa ser calibrado com os
 * assets/inline scripts do Vite/Inertia (senão quebra a página) e fica como
 * próximo passo dedicado. Os headers abaixo são seguros e sem efeito colateral.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Evita que a página seja embutida em <iframe> de terceiros (clickjacking)
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        // Impede o browser de "adivinhar" o content-type (MIME sniffing → XSS)
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        // Não vaza a URL completa como referrer para outros domínios
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Restringe APIs sensíveis do browser por padrão
        $response->headers->set('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');

        // HSTS: só faz sentido sob HTTPS. Força o browser a usar HTTPS por 1 ano.
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
