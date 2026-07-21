# SMOKE — Service Worker offline / catch-handler (PWA mobile)

Checklist manual de validação da correção do Service Worker (migração
`generateSW → injectManifest`, app-shell no `setCatchHandler`, reload no
`controllerchange`, isolamento por troca de usuário).

- **Origem:** parecer Enterprise QA Architect (matriz de testes bloqueantes).
- **Automação equivalente:** `tests/pwa/offline-sw.spec.js` (Playwright).
- **Quando rodar:** (A) antes de liberar, num build de produção; (B) logo após
  cada deploy (seção "Smoke pós-deploy"); (C) qualquer bump de Vite/Workbox.

---

## 0. Pré-requisitos (obrigatórios)

| # | Requisito | Por quê |
|---|-----------|---------|
| 0.1 | **Build de produção** (`npm run build`) servido com `APP_ENV=production`. | O SW só é registrado no bloco `@production` do `app.blade.php`. Em dev, `/sw.js` é um kill-switch. |
| 0.2 | Acesso por **`http://127.0.0.1:<porta>`** ou **HTTPS**. | Service Worker e `crypto.subtle` (login offline) exigem *secure context*. IP de LAN em http quebra os dois. |
| 0.3 | Usuário **mobile-capable** (motorista/admin/manager) com **empresa/obra já selecionada**. | Sem empresa ativa, `/mobile/*` redireciona para `/companies/select`. |
| 0.4 | Chrome/Edge com **DevTools → Application** e **Network** disponíveis. | Toggle offline e inspeção de SW/Cache. |

> Dica: para um estado limpo, DevTools → Application → Storage → **Clear site data**
> antes de começar (equivale a um device novo).

---

## 1. Instalação e ativação do SW

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1.1 | Abrir o app logado, ir a `/mobile/veiculos`. | Página carrega normal. |
| 1.2 | DevTools → **Application → Service Workers**. | 1 SW com fonte `/sw.js`, status **activated and is running**. Sem erro vermelho no registro. |
| 1.3 | Conferir o conteúdo do SW (link "sw.js" ou abrir `/sw.js` no browser). | Contém `setCatchHandler` e a lógica de `getAppShell` (`APP_SHELL_URL = '/mobile/veiculos'`). **NÃO** contém `NavigationRoute` (o loop antigo). |
| 1.4 | DevTools → **Application → Cache Storage**. | Precache do Workbox presente (~195 entradas), incluindo **`/offline.html`**. Após navegar, aparecem `mobile-pages-v3` e `auth-shell`. |
| 1.5 | Console ao registrar. | `[PWA] SW registrado /` (debug). Nenhum `no-response` / erro não tratado. |

---

## 2. SW-N-01 (BLOQUEANTE) — offline em rota /mobile NÃO-aquecida → **app-shell**

Este é o bug corrigido: antes estourava `no-response` e a navegação morria.

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 2.1 | Online, visitar `/mobile/veiculos` (garante o **shell** cacheado) e aguardar ~3 s (warmup em background). | `mobile-pages-v3` contém `/mobile/veiculos`. |
| 2.2 | DevTools → **Network → Offline** (ou **Application → Service Workers → Offline**). | Banner de rede do app muda para "sem conexão". |
| 2.3 | Na barra de endereço, ir a uma rota **nunca aberta**, ex. `/mobile/veiculos/999999`, e **Enter** (navegação real). | A página **monta o hub de Veículos** (header, busca, bottom-nav). **NÃO** aparece o `offline.html`; **NÃO** aparece a tela de "sem resposta" do browser. |
| 2.4 | Confiretir a origem da resposta: Network → linha do documento. | Servido **from ServiceWorker**, status 200 (é o shell `/mobile/veiculos`). |
| 2.5 | Repetir com o app **fechado e reaberto** (ícone PWA instalado) offline. | Abre direto no shell/veículos, sem beco-sem-saída. |

> Se cair no `offline.html` neste passo: o **shell ainda não estava cacheado**
> (usuário nunca abriu `/mobile/veiculos` online). É o fallback esperado, não um
> bug — mas repita 2.1 antes de reprovar.

---

## 3. SW-P-01 (BLOQUEANTE) — offline em rota AQUECIDA → **página real**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 3.1 | Online, visitar `/mobile/abastecimentos` (aquece a rota). | `mobile-pages-v3` contém `/mobile/abastecimentos`. |
| 3.2 | Network → **Offline**. | — |
| 3.3 | Recarregar (**F5**) `/mobile/abastecimentos`. | Renderiza a **própria página de Abastecimentos** (do cache full-page dela), **não** o shell de Veículos e **não** o `offline.html`. |
| 3.4 | Repetir com `/mobile/diario-bordo` e `/mobile/checklists` (também no warmup). | Cada uma serve a própria página offline. |

---

## 4. SW-P-02 (BLOQUEANTE) — regressão ONLINE (sem loop / sem flash de offline)

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 4.1 | Online (Network normal), navegar por `/mobile/veiculos`, `/mobile/abastecimentos`, deep-link direto e **F5**. | Tudo carrega normal via rede (NetworkFirst). |
| 4.2 | Observar durante as navegações. | **Nenhum flash** do `offline.html`. **Nenhum loop** de reload (a URL não fica "piscando"/recarregando sozinha). |
| 4.3 | Console. | Sem `no-response`, sem erro de navegação. |

---

## 5. SW-S-01 (BLOQUEANTE) — isolamento: XHR Inertia offline falha LIMPO

Objetivo: o SW nunca devolve HTML para um XHR do Inertia (senão o Inertia
engasga esperando JSON) e nunca serve página de outro contexto.

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 5.1 | Logado e online, Network → **Offline**. | — |
| 5.2 | No app (já montado), clicar num **link interno** do Inertia para uma tela ainda não visitada (navegação SPA = XHR com header `X-Inertia`). | A navegação SPA **falha de forma controlada** (o Inertia trata o erro/mostra estado offline). **Não** injeta HTML na tela como se fosse dados. |
| 5.3 | (Opcional, Console) rodar: `fetch('/mobile/__qa__',{headers:{'X-Inertia':'true'}}).then(()=>'RESOLVEU').catch(e=>'REJEITOU:'+e.name)` | Deve imprimir **`REJEITOU:TypeError`** (Response.error), nunca `RESOLVEU`. |

---

## 6. Isolamento multiempresa — troca de usuário no device (decisão do dono: 1 device = 1 usuário)

Gate `ensureLocalDataOwner` + boot gate `ready` no MobileLayout.

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 6.1 | Logar com **usuário A**, abrir `/mobile/veiculos`, sincronizar dados. | Dados de A no IndexedDB (DevTools → Application → IndexedDB). |
| 6.2 | Logout e logar com **usuário B** (outra empresa) **online** no mesmo device. | Ao entrar em `/mobile/*`, aparece brevemente "Carregando…" (gate) e então o módulo de B. |
| 6.3 | DevTools → IndexedDB, inspecionar tabelas de dados (veículos, abastecimentos). | Contêm apenas dados de **B** — o gate apagou os de A na troca de dono. **Nenhum** dado de A visível para B. |
| 6.4 | (Mesmo usuário) logout offline comum e reentrada. | Dados **preservados** (logout comum não faz wipe do Dexie → sem perda de dados). |

---

## 7. Passo U — SW-U-01 / SW-U-02: atualização sem prender/quebrar o cliente

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 7.1 (U-01) | Device limpo (Clear site data), abrir o app pela 1ª vez. | O SW instala e assume o controle, **sem** recarregar a página sozinho (sem loop). Guard `hadController`. |
| 7.2 (U-02) | Com uma aba **aberta** do app, fazer um **novo deploy** (novo `sw.js`/assets) e então **navegar/interagir** na aba antiga. | A aba **recarrega uma única vez** ao novo SW assumir (`controllerchange`), voltando funcional. **Sem** tela branca e **sem** loop de reload. |
| 7.3 (U-02) | Após o reload, navegar para telas com lazy-load (ex.: scanner OCR, PDF). | Chunks carregam (sem **404** de asset antigo removido). |

> **Interação com `prune-build.php`:** se o deploy rodar `php scripts/prune-build.php --apply`
> (remove assets órfãos), o passo 7.3 é crítico — é onde uma aba presa em bundle
> antigo apareceria como 404/tela branca. Se ocorrer, adiar o prune 1 ciclo de
> deploy **ou** confirmar que o reload de `controllerchange` disparou.

---

## 8. Smoke pós-deploy (rodar em 1 device logo após `artisan up`)

1. **Application → Service Workers:** `sw.js` **activated and running**, sem erro no registro; fonte tem `setCatchHandler`+shell e **não** tem `NavigationRoute`.
2. **Application → Cache Storage:** precache (~195) com `/offline.html`; `mobile-pages-v3`/`auth-shell` surgem ao navegar.
3. **Network → Offline:** F5 em rota aquecida = página real; navegar a rota nunca vista = **shell de veículos** (não `offline.html`); voltar **online** → `offline.html` (se aparecer) pinga `/health/ping` e redireciona sozinho.
4. **Online:** F5/deep-link em `/mobile/*` = normal, **sem** `offline.html`, **sem** loop.
5. **`/sw.js` via HTTP:** responde `200` + `application/javascript`; abrir 2–3 URLs de import que ele referencia (`/build/workbox-*.js`, `/build/assets/*.js`) e confirmar **200** (regex de reescrita não quebrou).
6. **Logout:** caches autenticados (`mobile-pages-v3`, `auth-shell`, `veiculos-imgs`) esvaziam.

---

## 9. Monitoramento 24–48 h (gatilhos de alerta)

| Sinal | Onde | O que significa |
|-------|------|-----------------|
| Pico de **404 em `/build/*`** ou `/sw.js` | Logs do servidor web | Cliente preso em bundle antigo / reescrita do `/sw.js` quebrada (F4). |
| Volume anômalo em **`/health/ping`** | Logs / APM | Possível loop de `offline.html` re-pingando. |
| Reclamações "**app não atualiza**" / "**tela branca ao atualizar**" | Suporte | `controllerchange`/reload não disparou; ver Passo U. |
| Erros de **chunk load** no client | (lacuna) não há beacon hoje | **Recomendação:** instrumentar um beacon de erro para `ChunkLoadError`. |

---

## 10. Assinatura de liberação

| Caso | Status | Evidência (print/URL) | Responsável | Data |
|------|--------|-----------------------|-------------|------|
| SW-N-01 (shell offline) | ☐ pass ☐ fail | | | |
| SW-P-01 (rota aquecida) | ☐ pass ☐ fail | | | |
| SW-P-02 (online s/ regressão) | ☐ pass ☐ fail | | | |
| SW-S-01 (XHR limpo) | ☐ pass ☐ fail | | | |
| Isolamento troca de usuário | ☐ pass ☐ fail | | | |
| SW-U-01 (1º install s/ reload) | ☐ pass ☐ fail | | | |
| SW-U-02 (update reload 1x) | ☐ pass ☐ fail | | | |
| Smoke pós-deploy (6 itens) | ☐ pass ☐ fail | | | |

**Gate de liberação:** todos os BLOQUEANTES em **pass**. Qualquer **fail** em
SW-N-01 / SW-P-02 / SW-S-01 = **não liberar**.
