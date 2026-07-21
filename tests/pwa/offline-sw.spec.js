// tests/pwa/offline-sw.spec.js
// =============================================================================
// QA — Service Worker offline / catch-handler (parecer Enterprise QA Architect)
// -----------------------------------------------------------------------------
// Cobre os casos BLOQUEANTES da matriz de testes, adaptados ao comportamento
// JÁ IMPLEMENTADO (app-shell no catch handler + reload no controllerchange):
//
//   SW-N-01  Offline + rota /mobile NÃO-aquecida  -> monta o app pelo SHELL
//            (/mobile/veiculos cacheado). NÃO offline.html, NÃO "no-response".
//   SW-P-01  Offline + rota AQUECIDA               -> serve a página REAL dela
//            (cache full-page próprio), não o shell nem offline.html.
//   SW-P-02  Online, sem regressão                 -> navegação normal via
//            NetworkFirst, sem flash de offline.html e sem loop de reload.
//   SW-S-01  XHR Inertia (X-Inertia) offline        -> Response.error() (fetch
//            rejeita); o SW nunca devolve HTML para um XHR (Inertia não engasga).
//   SW-U-01  1º install                            -> NÃO recarrega (guard
//            hadController evita o loop de reload no primeiro controllerchange).
//   SW-U-02  Update (deploy)                        -> recarrega EXATAMENTE 1x
//            (flag refreshing evita loop).
//
// -----------------------------------------------------------------------------
// PRÉ-REQUISITOS (LEIA — sem isto os testes não têm sentido):
//   1. BUILD DE PRODUÇÃO servido com APP_ENV=production. O Service Worker só é
//      registrado no bloco @production do app.blade.php; em dev o /sw.js é um
//      kill-switch e NADA aqui vai passar. Rode antes:
//         npm run build
//         (servidor com APP_ENV=production apontando para public/build)
//   2. ORIGEM SEGURA: use http://127.0.0.1:<porta> ou https://. Service Worker
//      E crypto.subtle (login offline) exigem secure context; um IP de LAN em
//      http quebra os dois. 127.0.0.1/localhost contam como seguros.
//   3. USUÁRIO DE TESTE mobile-capable (motorista/admin/manager/super_admin) COM
//      empresa/obra já selecionada — senão /mobile/* redireciona para
//      /companies/select e o boot falha. Passe as credenciais por env (nunca
//      commite senha):
//         SGA_BASE_URL   (default http://127.0.0.1:8000)
//         SGA_TEST_EMAIL
//         SGA_TEST_PASSWORD
//
// -----------------------------------------------------------------------------
// COMO INSTALAR E RODAR (o projeto ainda NÃO tem Playwright):
//   npm i -D @playwright/test
//   npx playwright install chromium
//   # PowerShell (Windows):
//   $env:SGA_TEST_EMAIL="motorista@empresa.com"; $env:SGA_TEST_PASSWORD="senha"; `
//     npx playwright test tests/pwa/offline-sw.spec.js --project=chromium
//   # bash:
//   SGA_TEST_EMAIL=... SGA_TEST_PASSWORD=... npx playwright test tests/pwa/offline-sw.spec.js
//
// Roda sem playwright.config.js (usa o projeto chromium default). Se preferir um
// config dedicado, crie tests/pwa/playwright.config.js com, no mínimo:
//   import { defineConfig } from '@playwright/test';
//   export default defineConfig({ testDir: '.', use: { headless: true },
//     projects: [{ name: 'chromium', use: { browserName: 'chromium' } }] });
//
// NOTA: package.json é "type":"module" -> este arquivo é ESM (import, não require).
// =============================================================================

import { test, expect } from '@playwright/test';

const BASE_URL  = (process.env.SGA_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const EMAIL     = process.env.SGA_TEST_EMAIL || '';
const PASSWORD  = process.env.SGA_TEST_PASSWORD || '';

// Rota /mobile deliberadamente NUNCA visitada/aquecida (detalhe de veículo com id
// improvável). Offline, o servidor nunca é alcançado — o catch handler do SW
// resolve por conta própria servindo o shell. Ajuste se colidir com dados reais.
const UNWARMED_MOBILE_URL = '/mobile/veiculos/999999';
// Rota aquecida explicitamente no boot (tem cache full-page próprio).
const WARMED_MOBILE_URL   = '/mobile/abastecimentos';
// Path claramente não cacheado, usado para provar a falha limpa do XHR Inertia.
const UNCACHED_XHR_URL     = '/mobile/__qa_never_cached__';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Espera o SW registrar, ativar e ASSUMIR o controle do client atual. */
async function waitForSWControl(page) {
    await page.waitForFunction(async () => {
        if (!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready.catch(() => {});
        return navigator.serviceWorker.controller !== null;
    }, null, { timeout: 30000 });
}

/** Lê o `component` do data-page do Inertia (o que o documento servido declara). */
async function readInertiaComponent(page) {
    return page.evaluate(() => {
        const el = document.getElementById('app');
        if (!el) return null; // offline.html não tem #app
        try { return JSON.parse(el.getAttribute('data-page')).component || null; }
        catch { return null; }
    });
}

/** Navega e espera o MobileLayout montar de fato (passar do gate "Carregando…"). */
async function gotoMobile(page, url) {
    // waitUntil:'commit' — offline o ping de /health/ping nunca deixa a rede
    // "idle"; não esperamos networkidle. O <header> só aparece depois do boot
    // gate (ensureLocalDataOwner) resolver -> bom sinal de "app montou".
    const resp = await page.goto(BASE_URL + url, { waitUntil: 'commit' });
    await page.waitForSelector('header', { state: 'visible', timeout: 20000 });
    return resp;
}

/** Login ONLINE via formulário Inertia (CSRF é resolvido pelo cookie XSRF). */
async function login(page) {
    await page.goto(BASE_URL + '/login', { waitUntil: 'load' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
        page.waitForURL((u) => !u.pathname.replace(/\/+$/, '').endsWith('/login'), { timeout: 30000 }),
        page.click('button[type="submit"]'),
    ]);
}

/**
 * Boot completo para os testes offline:
 *   login -> registra o SW -> RE-navega já sob controle do SW para POPULAR o
 *   cache (a 1ª navegação que registra o SW não é interceptada por ele) ->
 *   aquece /mobile/veiculos (shell) e /mobile/abastecimentos (página real) ->
 *   estabelece a sessão offline (MobileLayout renova quando online).
 */
async function bootAndWarm(page) {
    await login(page);

    // 1ª navegação: registra o SW (esta resposta NÃO é cacheada pelo SW).
    const first = await gotoMobile(page, '/mobile/veiculos');
    expect(new URL(page.url()).pathname, 'usuário de teste precisa cair em /mobile (empresa/obra já selecionada)')
        .toContain('/mobile');
    expect(first?.status(), 'esperado 200 online em /mobile/veiculos').toBe(200);

    await waitForSWControl(page);

    // Agora sob controle do SW: re-navega para POPULAR o cache (NetworkFirst
    // grava a variante full-page, sem X-Inertia = o casco do shell).
    await gotoMobile(page, '/mobile/veiculos');       // -> shell cacheado
    await gotoMobile(page, WARMED_MOBILE_URL);        // -> página real aquecida
    // Deixa as escritas de cache assentarem.
    await page.waitForTimeout(1500);
}

// =============================================================================
// GRUPO 1 — Comportamento OFFLINE (exige login + build de produção)
// =============================================================================
test.describe('Service Worker — navegação offline (catch handler + app-shell)', () => {
    test.skip(!EMAIL || !PASSWORD,
        'Defina SGA_TEST_EMAIL e SGA_TEST_PASSWORD para os testes offline (precisam logar).');

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        await bootAndWarm(page);
    });

    test.afterEach(async ({ page }) => {
        await page.context().setOffline(false).catch(() => {});
    });

    // -------------------------------------------------------------------------
    // SW-N-01 (BLOQUEANTE) — o coração da correção.
    // Pré: shell (/mobile/veiculos) cacheado + sessão offline válida (bootAndWarm).
    // Ação: OFFLINE, navega para uma rota /mobile NÃO-aquecida.
    // Esperado (NOVO): o catch handler serve o SHELL -> React monta o hub de
    // veículos (component "Mobile/Veiculos/Index"). NÃO offline.html, NÃO erro.
    // -------------------------------------------------------------------------
    test('SW-N-01: offline em rota /mobile não-aquecida monta o shell de veículos', async ({ page }) => {
        await page.context().setOffline(true);

        const resp = await page.goto(BASE_URL + UNWARMED_MOBILE_URL, { waitUntil: 'commit' });
        // Não pode ser "no-response": o goto tem de resolver com 200 (shell do cache).
        expect(resp, 'goto não pode falhar com no-response').toBeTruthy();
        expect(resp.status(), 'shell deve responder 200 do cache').toBe(200);

        // App montou (passou do gate) e é o hub de veículos (o casco).
        await page.waitForSelector('header', { state: 'visible', timeout: 20000 });
        const component = await readInertiaComponent(page);
        expect(component, 'documento servido deve ser o shell de Veículos').toMatch(/Veiculos/i);

        // Prova negativa: não é a página offline.html neutra.
        const isOfflineHtml = await page.evaluate(() =>
            !document.getElementById('app') && /Você está offline/i.test(document.body.innerText));
        expect(isOfflineHtml, 'não pode cair no offline.html quando o shell existe').toBe(false);

        // E não foi expulso para /login (sessão offline válida deixa o app aberto).
        expect(new URL(page.url()).pathname).not.toMatch(/\/login$/);
    });

    // -------------------------------------------------------------------------
    // SW-P-01 (BLOQUEANTE) — rota aquecida serve a PÁGINA real (não o shell).
    // Ação: OFFLINE, recarrega /mobile/abastecimentos (aquecido no boot).
    // Esperado: NetworkFirst serve o cache full-page PRÓPRIO dela.
    // -------------------------------------------------------------------------
    test('SW-P-01: offline em rota aquecida serve a página real dela', async ({ page }) => {
        await page.context().setOffline(true);

        const resp = await page.goto(BASE_URL + WARMED_MOBILE_URL, { waitUntil: 'commit' });
        expect(resp?.status(), 'página aquecida deve responder 200 do cache').toBe(200);

        await page.waitForSelector('header', { state: 'visible', timeout: 20000 });
        const component = await readInertiaComponent(page);
        // A rota aquecida tem cache próprio -> NÃO cai no shell de Veículos.
        expect(component, 'deve servir a própria página aquecida (Abastecimentos)').toMatch(/Abastecimentos/i);
    });

    // -------------------------------------------------------------------------
    // SW-P-02 (BLOQUEANTE) — regressão ONLINE: sem loop, sem flash de offline.html.
    // Ação: ONLINE, sob o SW, navega/recarrega /mobile/abastecimentos 2x.
    // Esperado: página normal via NetworkFirst; controller presente; nº de loads
    // estável (o guard hadController não dispara reload em navegação normal).
    // -------------------------------------------------------------------------
    test('SW-P-02: online sob o SW navega normal, sem loop nem offline.html', async ({ page }) => {
        // Conta cada (re)load desta aba via sessionStorage (sobrevive a reload).
        await page.evaluate(() => sessionStorage.setItem('__qaLoads', '0'));
        await page.context().addInitScript(() => {
            const n = Number(sessionStorage.getItem('__qaLoads') || '0') + 1;
            sessionStorage.setItem('__qaLoads', String(n));
        });

        const r1 = await gotoMobile(page, WARMED_MOBILE_URL);
        expect(r1?.status()).toBe(200);
        expect(await readInertiaComponent(page)).toMatch(/Abastecimentos/i);

        await page.reload({ waitUntil: 'commit' });
        await page.waitForSelector('header', { state: 'visible', timeout: 20000 });
        expect(await readInertiaComponent(page)).toMatch(/Abastecimentos/i);

        // Ainda controlado pelo SW (estamos testando COM o SW ativo).
        expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

        // Sem reload-loop: exatamente os 2 loads que nós provocamos (goto + reload).
        await page.waitForTimeout(2000);
        expect(await page.evaluate(() => Number(sessionStorage.getItem('__qaLoads') || '0'))).toBe(2);
    });

    // -------------------------------------------------------------------------
    // SW-S-01 (BLOQUEANTE) — isolamento: XHR Inertia offline falha LIMPO.
    // Ação: OFFLINE, faz um fetch com header X-Inertia para rota não cacheada.
    // Esperado: o catch handler (mode != 'navigate') devolve Response.error()
    // -> o fetch REJEITA. Nunca resolve com HTML (senão o Inertia engasga).
    // -------------------------------------------------------------------------
    test('SW-S-01: XHR Inertia offline recebe Response.error (fetch rejeita), nunca HTML', async ({ page }) => {
        await page.context().setOffline(true);

        const outcome = await page.evaluate(async (url) => {
            try {
                const r = await fetch(url, {
                    headers: { 'X-Inertia': 'true', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                // Se resolveu, capturamos o tipo/ct para provar que NÃO é HTML servido.
                return { rejected: false, type: r.type, status: r.status,
                         contentType: r.headers.get('content-type') || '' };
            } catch (e) {
                return { rejected: true, name: e?.name || 'Error' };
            }
        }, BASE_URL + UNCACHED_XHR_URL);

        // Contrato: o XHR deve FALHAR (Response.error => TypeError), não devolver
        // uma página HTML mascarada de resposta Inertia.
        expect(outcome.rejected, `XHR Inertia offline deveria rejeitar; recebeu: ${JSON.stringify(outcome)}`).toBe(true);
    });
});

// =============================================================================
// GRUPO 2 — Atualização do SW (controllerchange). NÃO exige login.
// Cada teste roda em contexto ISOLADO (Playwright cria BrowserContext novo por
// teste) => começa SEM SW registrado, então hadController=false no 1º load.
// =============================================================================
test.describe('Service Worker — atualização (reload no controllerchange)', () => {

    // -------------------------------------------------------------------------
    // SW-U-01 (BLOQUEANTE) — 1º install NÃO recarrega (anti-loop).
    // No 1º load não há controller; quando o SW faz clientsClaim, dispara
    // controllerchange, MAS o guard `hadController=false` impede o reload.
    // Esperado: exatamente 1 load (nenhum reload).
    // -------------------------------------------------------------------------
    test('SW-U-01: primeiro install não dispara reload', async ({ page }) => {
        test.setTimeout(60000);
        await page.context().addInitScript(() => {
            const n = Number(sessionStorage.getItem('__qaLoads') || '0') + 1;
            sessionStorage.setItem('__qaLoads', String(n));
        });

        await page.goto(BASE_URL + '/login', { waitUntil: 'load' });
        await waitForSWControl(page); // clientsClaim aqui dispara controllerchange

        // Dá tempo de um reload indevido acontecer, se o guard estivesse quebrado.
        await page.waitForTimeout(3000);
        const loads = await page.evaluate(() => Number(sessionStorage.getItem('__qaLoads') || '0'));
        expect(loads, 'primeiro install não pode recarregar a página').toBe(1);
    });

    // -------------------------------------------------------------------------
    // SW-U-02 (BLOQUEANTE) — update recarrega EXATAMENTE 1x.
    // Estratégia: interceptamos /sw.js e servimos o SW REAL (rewritten) + um
    // comentário de versão. Trocamos o comentário e chamamos registration.update()
    // -> o browser detecta bytes novos -> instala -> skipWaiting -> clientsClaim
    // -> controllerchange -> a página (agora COM controller: hadController=true)
    // recarrega 1x; o flag `refreshing` impede loop.
    //
    // Se o runner do Playwright não interceptar o fetch de update do /sw.js
    // (versões antigas), o teste faz skip com instrução para o SMOKE manual —
    // em vez de um vermelho enganoso.
    // -------------------------------------------------------------------------
    test('SW-U-02: update do SW recarrega a página exatamente uma vez', async ({ page, context }) => {
        test.setTimeout(90000);

        let variant = 'v1';
        let realBody = null;
        await context.route('**/sw.js', async (route) => {
            if (realBody === null) {
                const resp = await route.fetch();          // busca o /sw.js REAL (já com paths reescritos)
                realBody = await resp.text();
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/javascript',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Service-Worker-Allowed': '/',
                },
                body: realBody + `\n// qa-update-bump:${variant}\n`,
            });
        });

        await context.addInitScript(() => {
            const n = Number(sessionStorage.getItem('__qaLoads') || '0') + 1;
            sessionStorage.setItem('__qaLoads', String(n));
        });

        // 1º load: instala o SW v1 (hadController=false -> sem reload).
        await page.goto(BASE_URL + '/login', { waitUntil: 'load' });
        await waitForSWControl(page);

        // Recarrega para que o PRÓXIMO load já comece COM controller
        // (hadController=true), que é a condição do reload-on-update.
        await page.reload({ waitUntil: 'load' });
        await waitForSWControl(page);
        const before = await page.evaluate(() => Number(sessionStorage.getItem('__qaLoads') || '0'));

        // Dispara o update servindo bytes diferentes (v2).
        variant = 'v2';
        const detected = await page.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration('/');
            if (!reg) return false;
            await reg.update();
            const t0 = Date.now();
            while (Date.now() - t0 < 8000) {
                if (reg.installing || reg.waiting) return true; // update detectado
                await new Promise((r) => setTimeout(r, 200));
            }
            return false;
        });
        test.skip(!detected,
            'Este runner do Playwright não interceptou o update de /sw.js. ' +
            'Valide SW-U-02 pelo SMOKE manual (Passo U — deploy real + reload 1x).');

        // controllerchange deve provocar EXATAMENTE 1 reload.
        await expect
            .poll(async () => page.evaluate(() => Number(sessionStorage.getItem('__qaLoads') || '0')),
                  { timeout: 15000 })
            .toBe(before + 1);

        // Estabilidade: nenhum reload adicional (sem loop).
        await page.waitForTimeout(3000);
        const after = await page.evaluate(() => Number(sessionStorage.getItem('__qaLoads') || '0'));
        expect(after, 'não pode haver loop de reload após o update').toBe(before + 1);
    });
});
