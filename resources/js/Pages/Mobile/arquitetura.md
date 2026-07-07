# ARQUITETURA — PWA Offline-First (WebView / Android / iOS)

> Documento de especificação para retomada do desenvolvimento no Claude Code.
> Decisão atual: **PWA (Progressive Web App)** como base — app 100% web,
> instalável, funcionando offline via Service Worker.
> Leia este arquivo por completo antes de iniciar a implementação.

---

## 1. Objetivo do projeto

Aplicativo **PWA offline-first** capaz de operar **sem dependência de internet**.
O usuário grava dados localmente, decide quando sincronizar (envio assíncrono
manual) e pode alternar entre modo online/offline.

### Requisitos funcionais (definidos pelo cliente)

1. **Login offline-first.** O usuário escolhe login online ou offline. O
   **primeiro acesso é obrigatoriamente online** (valida no servidor e
   provisiona credenciais locais). Acessos seguintes podem ser offline.
2. **Armazenamento offline-first.** Todo dado é gravado primeiro no IndexedDB.
3. **Envio manual.** O usuário decide quando enviar, via botão "Enviar Dados".
   Apenas registros pendentes são sincronizados.
4. **Envio assíncrono.** A sincronização não bloqueia a UI; usa fila com retry.
5. **Toggle de conexão + banner.** O usuário pode ligar/desligar o "modo online"
   do app. Ao desligar, a UI exibe exclusivamente dados do banco local.
6. **Independência de internet.** O app funciona 100% sem rede após o primeiro
   acesso. A fonte de verdade da UI é sempre o banco local.

---

## 2. Stack definida (PWA)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Base | React (ou Vue/Svelte) + Vite | SPA moderna, bundle otimizado |
| Offline (assets) | **Service Worker via Workbox** | Cache do app shell, precache, estratégias prontas |
| Banco local | **IndexedDB via Dexie.js** | API simples, robusta, transacional |
| Alternativa BD | RxDB (sobre IndexedDB) | Se precisar de reatividade/replicação embutida |
| Credenciais | IndexedDB + **Web Crypto API** | Hash e criptografia no browser |
| Hash de senha | **PBKDF2 (Web Crypto)** ou Argon2 via WASM | Validação offline segura |
| Detecção de rede | `navigator.onLine` + eventos `online`/`offline` | Nativo do browser |
| Background sync | **Background Sync API** (Android/Chrome) | ⚠️ NÃO funciona no iOS — ver §7 |
| Instalável | `manifest.json` + Service Worker | Add to Home Screen (Android e iOS) |

### Limitações conhecidas (decisões conscientes)

- **iOS não tem Background Sync nem Push confiável.** Envio em background só no
  Android. No iOS, o envio ocorre com o app aberto (estratégia em §7).
- **iOS pode limpar storage** de PWAs não usados por várias semanas
  (política do Safari). Mitigação: solicitar `navigator.storage.persist()`.
- **Sem Keychain/Keystore.** Credenciais ficam em IndexedDB criptografado com
  Web Crypto. Nível de proteção inferior ao Secure Enclave nativo — aceito
  para este projeto. Se virar bloqueio, empacotar o mesmo PWA com **Capacitor**
  (plano B documentado em §11).

---

## 3. Arquitetura geral

```
┌────────────────────────────────────────────────┐
│              UI (SPA — React/Vite)              │
│   lê/escreve de forma reativa e instantânea     │
└───────────────┬────────────────────────────────┘
                │  (fonte de verdade)
                ▼
┌────────────────────────────────────────────────┐
│           IndexedDB (via Dexie.js)              │
│   sempre disponível offline · marca pendências  │
└───────────────┬────────────────────────────────┘
                │  registros sync_status = pendente
                ▼
┌────────────────────────────────────────────────┐
│   Sync Engine  ──[botão "Enviar"]──► fila async │
│   retry + backoff exponencial + idempotência    │
└───────────────┬────────────────────────────────┘
                │
                ├── Android/Chrome: Background Sync API (bônus)
                ▼
                API (endpoint idempotente por UUID)

┌────────────────────────────────────────────────┐
│  Service Worker (Workbox)                       │
│  precache do app shell → app abre sem internet  │
└────────────────────────────────────────────────┘
```

**Princípios inegociáveis:**
- A UI **nunca** bloqueia esperando a rede.
- Toda escrita vai **primeiro** ao IndexedDB, depois entra na fila de envio.
- App shell 100% precacheado pelo Service Worker no primeiro acesso.
- IDs gerados no device (UUID v4) para criação offline e deduplicação no servidor.
- Solicitar storage persistente: `navigator.storage.persist()`.

---

## 4. Service Worker (Workbox)

- **Precache** de todo o app shell (HTML, JS, CSS, ícones, fontes) no primeiro acesso.
- Estratégia **Cache First** para assets estáticos.
- Estratégia **Network Only com fallback** apenas para chamadas de API
  (a UI nunca depende delas para renderizar — lê do IndexedDB).
- Versionamento de cache para atualizações limpas do app.

```javascript
// sw.js (conceito, com Workbox)
import { precacheAndRoute } from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST); // app shell completo

// Background Sync (Android/Chrome — ignorado no iOS)
self.addEventListener('sync', (event) => {
  if (event.tag === 'enviar-pendentes') {
    event.waitUntil(processarFilaPendentes());
  }
});
```

---

## 5. Login Offline-First (PWA)

### Fluxo

```
Primeiro acesso  → OBRIGATÓRIO online
                 → valida credenciais no servidor
                 → deriva hash local da senha (PBKDF2 + salt)
                 → grava {user, hash, salt, token} no IndexedDB (criptografado)

Acessos seguintes → usuário escolhe (toggle na tela de login):
   • Online:  valida no servidor, renova token
   • Offline: deriva PBKDF2 da senha digitada e compara com hash local
```

### Regras

- **Nunca** armazenar senha em texto puro.
- PBKDF2 com salt aleatório e ≥ 310.000 iterações (Web Crypto API), ou
  Argon2id via WASM se optar por proteção maior.
- Sem credencial local + tentativa offline → mensagem:
  "Faça o primeiro acesso online".

### Esboço

```javascript
async function derivarHash(senha, salt, iteracoes = 310000) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iteracoes, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return new Uint8Array(bits);
}

async function login(user, senha, modo) {
  if (modo === 'online') {
    const res = await api.login(user, senha);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivarHash(senha, salt);
    await db.credenciais.put({ id: 'atual', user, hash, salt, token: res.token });
    return res;
  } else {
    const cred = await db.credenciais.get('atual');
    if (!cred) throw new Error('Faça o primeiro acesso online');
    const hash = await derivarHash(senha, cred.salt);
    if (!igualConstante(hash, cred.hash)) throw new Error('Senha inválida');
    return { user: cred.user, offline: true };
  }
}
```

---

## 6. Modelo de dados (Dexie.js / IndexedDB)

```javascript
// db.js
import Dexie from 'dexie';

export const db = new Dexie('appOfflineFirst');
db.version(1).stores({
  registros: 'id, sync_status, criado_em',   // id = UUID v4
  credenciais: 'id',
  config: 'chave'                             // ex.: modoOffline
});
```

| Campo (registros) | Tipo | Descrição |
|-------------------|------|-----------|
| `id` | string (UUID v4) | Gerado no device (`crypto.randomUUID()`) |
| `dados` | object | Payload do registro |
| `sync_status` | int | 0=pendente, 1=enviando, 2=enviado, 3=erro |
| `criado_em` | number | Timestamp |
| `atualizado_em` | number | Timestamp |

---

## 7. Camada de sincronização (envio manual e assíncrono)

Estratégia definida: **envio manual com app aberto** (funciona em iOS E Android)
+ **Background Sync como bônus no Android** (fila persiste com app fechado).

```javascript
async function enviarDados() {
  if (!navigator.onLine || (await modoOfflineAtivo())) {
    banner('Sem conexão. Ative o modo online para enviar.');
    return;
  }

  const pendentes = await db.registros.where('sync_status').equals(0).toArray();

  for (const reg of pendentes) {
    await db.registros.update(reg.id, { sync_status: 1 });
    try {
      await enviarComRetry(reg, { tentativas: 3, backoff: 'exponencial' });
      await db.registros.update(reg.id, { sync_status: 2 });
    } catch {
      await db.registros.update(reg.id, { sync_status: 3 }); // reprocessável
    }
  }
  atualizarUI();
}

// Bônus Android/Chrome: fila persistente em background
async function registrarBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('enviar-pendentes'); // ignorado no iOS
  }
}
```

**Robustez:**
- Envio em **lotes** para grandes volumes.
- **Retry com backoff exponencial**.
- Endpoint **idempotente** no servidor (deduplica pelo UUID).
- Registros com erro (`sync_status = 3`) reaparecem como pendentes reprocessáveis.

---

## 8. Toggle de conexão + banner

> O PWA **não desliga o rádio do device** (restrição do SO/browser).
> O botão controla o **modo do app**.

| Opção | O que faz |
|-------|-----------|
| Modo Offline (app) | Flag em `db.config`: app ignora rede e lê só do IndexedDB |
| Conexão real | Detectada via `navigator.onLine` + eventos |

```javascript
async function toggleConexao() {
  const atual = (await db.config.get('modoOffline'))?.valor ?? false;
  await db.config.put({ chave: 'modoOffline', valor: !atual });
  banner(!atual ? 'Modo offline ativo' : 'Modo online');
  renderizarDados(); // sempre lê do IndexedDB
}

window.addEventListener('offline', () => banner('Você está offline'));
window.addEventListener('online',  () => banner('Conexão restabelecida'));
```

---

## 9. Instalabilidade (manifest.json)

```json
{
  "name": "App Offline First",
  "short_name": "AppOffline",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f62fe",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- Android: prompt de instalação automático (`beforeinstallprompt`).
- iOS: instalação manual via "Adicionar à Tela de Início" (orientar o usuário na UI).

---

## 10. Checklist de implementação

- [x] Setup SPA (React + Vite) com plugin PWA (vite-plugin-pwa/Workbox)
- [x] manifest.json + ícones + orientação de instalação no iOS
- [x] Service Worker com precache do app shell
- [x] `navigator.storage.persist()` no primeiro acesso (offline/offlineAuth.js → ensurePersistentStorage, chamado no MobileLayout)
- [x] Dexie.js: schema (transacionais + credenciais + meta; ver offline/db.js v1–v4)
- [x] Tela de login com toggle online/offline
- [x] Login online (primeiro acesso) + provisionamento local (PBKDF2 + salt) — Pages/Auth/Login.jsx + offline/offlineAuth.js
- [x] Login offline com comparação de hash em tempo constante (+ lockout 5 tentativas/5 min)
- [x] CRUD local gravando no IndexedDB (UUID por registro: client_uuid em localCreate)
- [x] Botão "Enviar Dados" + fila assíncrona com retry/backoff exponencial e triagem de rejeitados
- [ ] Background Sync no Android (bônus) — degradação limpa no iOS
- [x] Toggle de conexão + banners de status (useOnlineStatus: forcedOffline + NetworkStatusBar)
- [x] Endpoint idempotente no servidor (deduplicação por client_uuid nos stores mobile)
- [ ] Testes: primeiro acesso online → uso offline → reconexão → sincronização
- [ ] Teste no Safari/iOS: storage, instalação, comportamento sem rede

---

## 11. Plano B documentado: Capacitor

Se as limitações do PWA virarem bloqueio (background sync no iOS, storage
seguro nativo, presença nas lojas), o **mesmo código PWA** pode ser empacotado
com **Capacitor** sem reescrita:

- Ganha: Keychain/Keystore, Background Runner, App Store / Play Store.
- Mantém: todo o código web, Service Worker, Dexie/IndexedDB.

---

## 12. Notas de decisão (histórico)

- v1: Ionic + Capacitor (WebView) considerado.
- v2: React Native + WatermelonDB escolhido por robustez ("parrudo").
- **v3 (atual): PWA puro** — prioridade para base 100% web, instalável,
  offline via Service Worker. Limitações do iOS aceitas e documentadas (§2, §7),
  com Capacitor como plano B sem reescrita (§11).