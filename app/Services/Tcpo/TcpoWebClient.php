<?php

namespace App\Services\Tcpo;

use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use RuntimeException;

/**
 * Cliente HTTP para o TCPOweb (ASP.NET WebForms). Autentica via login-replay
 * e executa postbacks (full, não AJAX) parseando o HTML retornado.
 *
 * Uso típico:
 *   $c = new TcpoWebClient();
 *   $c->login();
 *   $html = $c->get('/PesqServicosTreeView.aspx');
 *   $resultadoHtml = $c->postback('/PesqServicosTreeView.aspx', $html, [
 *       'ctl00$MainContent$txtBusca' => '06.101',
 *       'ctl00$MainContent$imgBtnPesquisaServico.x' => '10',
 *       'ctl00$MainContent$imgBtnPesquisaServico.y' => '10',
 *   ]);
 */
class TcpoWebClient
{
    protected Client $http;
    protected CookieJar $jar;
    protected string $baseUrl;
    protected int $delayMs;

    /** Última resposta (para diagnóstico). */
    public string $lastBody = '';

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('tcpo.base_url'), '/');
        $this->delayMs = (int) config('tcpo.delay_ms', 900);

        // Sessão única no TCPOweb → persiste o cookie em disco e reusa entre
        // execuções (resume) em vez de relogar (o que conflita com a sessão ativa).
        $cookieFile = (string) (config('tcpo.cookie_file') ?: storage_path('app/tcpo/cookies.json'));
        if (!is_dir(dirname($cookieFile))) {
            @mkdir(dirname($cookieFile), 0775, true);
        }
        $this->jar = new \GuzzleHttp\Cookie\FileCookieJar($cookieFile, true);

        $this->http = new Client([
            'base_uri'        => $this->baseUrl . '/',
            'cookies'         => $this->jar,
            'timeout'         => (int) config('tcpo.timeout', 60),
            'http_errors'     => false,
            'verify'          => config('tcpo.ca_bundle') ?: true,
            'allow_redirects' => ['max' => 5, 'referer' => true, 'track_redirects' => true],
            'headers'         => [
                'User-Agent'      => (string) config('tcpo.user_agent'),
                'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'pt-BR,pt;q=0.9',
            ],
        ]);
    }

    /** Autentica. Lança RuntimeException se faltar credencial ou login falhar. */
    public function login(): void
    {
        $usuario = trim((string) config('tcpo.usuario'));
        $senha   = trim((string) config('tcpo.senha'));
        if ($usuario === '' || $senha === '') {
            throw new RuntimeException('Credenciais ausentes. Defina TCPO_USUARIO e TCPO_SENHA no .env.');
        }

        $homeHtml = $this->request('GET', 'home/home.aspx');

        $resp = $this->request('POST', 'home/home.aspx', [
            'form_params' => array_merge($this->hiddenFields($homeHtml), [
                '__EVENTTARGET'                 => '',
                '__EVENTARGUMENT'               => '',
                'ctl00$header1$txtUsuario'      => $usuario,
                'ctl00$header1$txtSenha'        => $senha,
                'ctl00$header1$btnAcessar'      => 'Entrar',
            ]),
        ]);

        if (stripos($resp, 'Acesso negado') !== false && stripos($resp, 'outro navegador') !== false) {
            throw new RuntimeException(
                'SESSÃO ÚNICA: já há uma sessão ativa desta conta (navegador ou execução anterior). '
                . 'Saia do TCPOweb no navegador (Sair) e aguarde a sessão anterior expirar antes de raspar.'
            );
        }
        if (!$this->estaLogado($resp)) {
            throw new RuntimeException('Login falhou — verifique TCPO_USUARIO/TCPO_SENHA (ou o formulário mudou).');
        }
    }

    /**
     * Garante sessão ativa: reusa o cookie persistido se ainda válido; só
     * reloga se a sessão tiver caído. Evita o erro de "sessão única".
     */
    public function ensureAuth(): void
    {
        try {
            $html = $this->get('PesqServicosTreeView.aspx');
            if (stripos($html, 'txtBusca') !== false && stripos($html, 'txtSenha') === false) {
                return; // sessão reaproveitada
            }
        } catch (\Throwable $e) {
            // cai pro login
        }
        $this->login();
    }

    /** Encerra a sessão no servidor (libera a sessão única). */
    public function logout(): void
    {
        try {
            $this->get('Logout.aspx');
        } catch (\Throwable $e) {
            // best-effort
        }
    }

    /** Heurística: logado se há "Sair" / Logout e não há mais o botão de login. */
    public function estaLogado(string $html): bool
    {
        $temLogout = stripos($html, 'Logout.aspx') !== false || preg_match('/>\s*Sair\s*</i', $html);
        $temLogin  = stripos($html, 'btnAcessar') !== false || stripos($html, 'txtSenha') !== false;
        return $temLogout && !$temLogin;
    }

    /** GET simples de uma página, retorna o HTML. */
    public function get(string $path): string
    {
        return $this->request('GET', ltrim($path, '/'));
    }

    /**
     * Executa um postback (full) na página: reusa os hidden fields do HTML atual
     * e mescla os campos extras (__EVENTTARGET/__EVENTARGUMENT, txtBusca, etc).
     */
    public function postback(string $path, string $currentHtml, array $extra): string
    {
        $form = array_merge(
            $this->hiddenFields($currentHtml),
            ['__EVENTTARGET' => '', '__EVENTARGUMENT' => ''],
            $extra
        );
        return $this->request('POST', ltrim($path, '/'), ['form_params' => $form]);
    }

    /** Extrai __VIEWSTATE, __VIEWSTATEGENERATOR e __EVENTVALIDATION do HTML. */
    public function hiddenFields(string $html): array
    {
        $campos = [];
        foreach (['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION'] as $nome) {
            if (preg_match('/id="' . preg_quote($nome, '/') . '"[^>]*value="([^"]*)"/s', $html, $m)
                || preg_match('/name="' . preg_quote($nome, '/') . '"[^>]*value="([^"]*)"/s', $html, $m)) {
                $campos[$nome] = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5);
            }
        }
        if (!isset($campos['__VIEWSTATE'])) {
            throw new RuntimeException('Não encontrei __VIEWSTATE na página (sessão caiu ou layout mudou).');
        }
        return $campos;
    }

    /** Faz a requisição com pausa de cortesia e devolve o corpo. */
    protected function request(string $method, string $path, array $options = []): string
    {
        if ($this->delayMs > 0) {
            usleep($this->delayMs * 1000);
        }
        $resp = $this->http->request($method, $path, $options);
        $this->lastBody = (string) $resp->getBody();
        return $this->lastBody;
    }
}
