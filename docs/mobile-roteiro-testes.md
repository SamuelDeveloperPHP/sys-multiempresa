# Roteiro de Testes Manuais — Mobile PWA Offline-First

> Complementa a suíte automatizada (`tests/Feature/Mobile/` — roda com
> `./vendor/bin/phpunit tests/Feature/Mobile/`). O que segue **exige device
> físico** (Android e iPhone) e deve ser executado a cada release relevante
> do módulo mobile. Espec: `resources/js/Pages/Mobile/arquitetura.md`.

## Pré-requisitos

- Build de produção no servidor de teste: `npm run build` + `APP_ENV=production`
  (o Service Worker só registra em produção — ver `app.blade.php`).
- HTTPS (ou `localhost`) — Service Worker e Background Sync exigem contexto seguro.
- Usuário de teste tipo `motorista` com veículo + checklist cadastrados.
- `php artisan migrate` aplicado (coluna `client_uuid`) e `php artisan storage:link`.

---

## T1 — Primeiro acesso online (provisionamento)

1. Abra o navegador do device (Chrome no Android / Safari no iOS) e faça login **online**.
2. ✅ Deve redirecionar para `/mobile/veiculos` com a lista de veículos.
3. DevTools remoto → Application → IndexedDB → `sga_engeativos_offline`:
   - ✅ tabela `credenciais` tem 1 registro (hash + salt — **sem senha em texto**);
   - ✅ `meta` tem `offline_session` com `expires_at` ~7 dias à frente.
4. Navegue por Veículos → um veículo → Checklist (aquece o cache do SW).

## T2 — Instalação (A2HS)

- **Android**: ✅ prompt de instalação aparece (ou menu ⋮ → "Instalar app").
- **iOS**: Safari → Compartilhar → "Adicionar à Tela de Início".
  ✅ o app abre em `standalone` (sem barra do navegador).

## T3 — Uso offline

1. **Modo avião** no device. Abra o PWA instalado.
2. ✅ Auto-redirect: banner "sessão offline ativa" → app abre em Veículos.
3. Navegue: veículo → Checklist → iniciar template.
4. Preencha: um item **Conforme**, um **Não conforme** — ✅ exige observação
   (bloqueia salvar sem descrever) — tire **foto** pela câmera.
5. Salve. ✅ volta ao índice com o registro marcado **Pendente**.
6. Abra o registro salvo: ✅ foto aparece (base64 local).

## T4 — Login offline com senha

1. Ainda em modo avião: menu → **Sair**.
2. ✅ volta ao `/login` (servido do cache) SEM auto-redirect (sessão encerrada).
3. Tente entrar com **senha errada** 5x:
   ✅ mensagens de tentativas restantes → lockout de 5 min na 5ª.
   (Para não esperar: teste o lockout por último, ou limpe `meta.offline_login_attempts` no DevTools.)
4. Entre com a **senha correta** → ✅ app abre em Veículos, dados locais intactos.

## T5 — Reconexão e sincronização manual

1. Desligue o modo avião. Abra o app → botão **Sincronizar** (nuvem).
2. ✅ progresso → "1 enviado(s)"; badge Pendente some do registro.
3. Confira no **admin web** (outra máquina): execução de checklist presente,
   **foto visível** (armazenada em `storage/.../checklist_servicos/`, não no JSON).
4. Toque **Sincronizar** de novo: ✅ "Nada a sincronizar" — **sem duplicatas**
   (idempotência por `client_uuid`).

## T6 — Rejeição e triagem

1. No device A, abra um ciclo (checklist ABERTURA) **offline** no veículo X.
2. Antes de sincronizar, no admin/outro device, abra um ciclo do MESMO usuário
   no veículo Y.
3. Sincronize o device A: ✅ item vira **rejeitado** (não fica retentando);
   painel vermelho no botão Sincronizar mostra o erro do servidor.
4. Feche o ciclo do veículo Y e toque **Tentar novamente** → ✅ enviado.
5. (Alternativa) **Descartar** → registro local removido, fila limpa.

## T7 — Background Sync (só Android/Chrome)

1. Modo avião → crie um checklist → **feche o app completamente** (swipe).
2. Desligue o modo avião. Aguarde ~1–5 min **sem abrir o app**.
3. ✅ Confira no admin: o registro chegou (SW enviou em background).
4. Abra o app: ✅ registro aparece como sincronizado (reconciliação na abertura).
5. DevTools → Application → Service Workers → ✅ sem erros no console do SW.

## T8 — Específicos Safari/iOS (limitações aceitas — spec §2)

1. **Sem Background Sync**: repita T7 no iPhone → o registro NÃO chega sozinho.
   ✅ ao ABRIR o app com internet, o envio manual/automático funciona. (Esperado.)
2. **Storage persistente**: Safari → Ajustes do site — o app pede
   `navigator.storage.persist()` no primeiro acesso; iOS pode limpar storage de
   PWA sem uso por semanas. ✅ documente o comportamento observado.
3. **Câmera**: captura de foto no checklist funciona no Safari standalone.
4. **Login offline**: T4 completo no iPhone (Web Crypto/PBKDF2 no Safari).

---

## Registro de execução

| Data | Device/OS | Testes | Resultado | Observações |
|------|-----------|--------|-----------|-------------|
|      |           | T1–T8  |           |             |
