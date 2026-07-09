# Checklist de Deploy — sys-multiempresa

Este documento lista o que **VOCÊ** (devops/infra) precisa fazer no servidor de produção. Os itens de **código** já foram resolvidos no repositório.

## ✅ Bloqueadores resolvidos no código

- [x] **DOMPurify** instalado e aplicado em todos `dangerouslySetInnerHTML` (17 arquivos)
- [x] **FormRequests** com validação rigorosa em todos endpoints `/api/mobile/*`
- [x] **Filtro `company_id` defensivo** em todos os endpoints mobile + verificação de ownership do veículo
- [x] **Rate limiting**: `/api/mobile/*` (120 req/min) + `/login` (5 tentativas/min/IP)
- [x] **Sanitização de label** na paginação (`safeLabel`)
- [x] **Service Worker** funcionando com path rewrite (HTTPS necessário)

## 🔴 Bloqueadores que dependem de infra

### 1. HTTPS obrigatório

> O Service Worker e o PWA **não funcionam** em HTTP. Sem isso o motorista não tem offline.

Opções:
- **Let's Encrypt** + Certbot (gratuito) no nginx/Apache
- **Cloudflare** SSL flexible/full
- **AWS ACM** se estiver na AWS
- Hospedagem que já entregue HTTPS (Forge, Vapor, Cloudways…)

Teste: `curl -I https://seu-host.com.br` → deve responder `HTTP/2 200`.

### 2. `.env` de produção

```bash
# === Obrigatório em prod ===
APP_NAME="SGA Engeativos"
APP_ENV=production
APP_KEY=base64:...           # se vazio, rode `php artisan key:generate`
APP_DEBUG=false              # ⚠️ NUNCA true em prod
APP_URL=https://seu-host.com.br

LOG_CHANNEL=daily
LOG_LEVEL=warning            # info gera log demais; debug expõe queries

# === Sessão (PWA + HTTPS) ===
SESSION_DRIVER=database
SESSION_LIFETIME=480         # 8h (motorista usa remember_token p/ longa duração)
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true   # ⚠️ HTTPS only
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax        # 'strict' quebra OAuth/redirects; lax é seguro
SESSION_DOMAIN=.seu-host.com.br  # se usar subdomínios

# === DB ===
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

# === Cache/Queue ===
CACHE_STORE=database         # ou redis em alto volume
QUEUE_CONNECTION=database    # ou redis
BROADCAST_CONNECTION=null

# === Email (alertas de frota) ===
MAIL_MAILER=smtp
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=naoresponda@engetecnica.com.br
MAIL_FROM_NAME="${APP_NAME}"

# === OneDrive (Microsoft Graph) ===
# Galeria de veículos + uploads do módulo Frota.
# ⚠️ Nomes das chaves são MS_GRAPH_* (NÃO ONEDRIVE_*). Sem elas o upload
#    falha — não há mais fallback hardcoded no código (segurança).
# ⚠️ ROTACIONE o client_secret no Azure: o valor antigo esteve versionado
#    no git e deve ser considerado comprometido.
MS_GRAPH_TENANT_ID=...
MS_GRAPH_CLIENT_ID=...
MS_GRAPH_CLIENT_SECRET=...          # secret NOVO (rotacionado)
MS_GRAPH_SITE_ID=...
MS_GRAPH_ROOT_FOLDER=SGA-Engeativos
```

### 3. Permissões de arquivo

```bash
sudo chown -R www-data:www-data /var/www/sys-multiempresa
sudo chmod -R 755 /var/www/sys-multiempresa
sudo chmod -R 775 /var/www/sys-multiempresa/storage
sudo chmod -R 775 /var/www/sys-multiempresa/bootstrap/cache
```

### 4. Migrations + backup

```bash
# 1. Backup ANTES de tudo
mysqldump -u USER -p NOME_BANCO > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Migrations (incluindo a pendente de funcionários — Task #5)
php artisan migrate --force

# 3. Seeds de módulos/permissões (se for primeira vez)
php artisan db:seed --class=ModulesPermissionsSeeder --force
```

### 5. Build de produção

```bash
# Frontend
npm ci --omit=dev
npm run build           # gera public/build/ com SW

# Backend (caches)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

⚠️ **Toda vez que você der pull de código novo, refaça:**
```bash
php artisan config:clear && php artisan route:clear && php artisan view:clear
npm ci --omit=dev && npm run build
php artisan config:cache && php artisan route:cache
```

### 6. Cron jobs

Adicionar no crontab do `www-data`:

```cron
* * * * * cd /var/www/sys-multiempresa && php artisan schedule:run >> /dev/null 2>&1
```

Esse cron executa o `AlertarPreventivasFrota` (08:00 BRT) e qualquer outro schedule.

### 7. Supervisor (queue worker) — opcional mas recomendado

`/etc/supervisor/conf.d/sga-queue.conf`:
```ini
[program:sga-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/sys-multiempresa/artisan queue:work database --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/sga-queue.log
```

```bash
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start sga-queue:*
```

## 🟡 Recomendações importantes (pós-deploy inicial)

### Conflict resolution no sync queue

Hoje, se dois motoristas editarem o **mesmo registro offline**, ao sincronizar o último sobrescreve o primeiro. Para evitar: adicionar coluna `version` (int) ou usar `updated_at` no UPDATE com check.

```sql
-- Sugestão de migration futura
ALTER TABLE veiculo_abastecimentos ADD COLUMN version INT DEFAULT 1 AFTER hr_atual;
ALTER TABLE veiculos_diario_bordo ADD COLUMN version INT DEFAULT 1 AFTER hr_atual;
ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN version INT DEFAULT 1;
```

### Monitoramento

- **Sentry** (`composer require sentry/sentry-laravel`) para erros do backend
- **Sentry Browser SDK** para erros do PWA no celular dos motoristas
- **UptimeRobot** ou similar para health-check `/up`

### Logs do PWA no celular

Como inspecionar logs do motorista em campo:
1. Habilitar **chrome://inspect** via USB
2. Ou implementar endpoint `/api/mobile/client-error` que recebe POST do front em erros

## 🚀 Roteiro de subida (primeira vez)

```bash
# 1. Clone/pull
git clone REPO /var/www/sys-multiempresa
cd /var/www/sys-multiempresa
git checkout feature/migracao-veiculos  # ou main

# 2. PHP deps
composer install --optimize-autoloader --no-dev

# 3. .env (copiar do exemplo + editar conforme item 2 acima)
cp .env.example .env
nano .env
php artisan key:generate

# 4. Permissões
sudo chown -R www-data:www-data .
sudo chmod -R 775 storage bootstrap/cache

# 5. Migrations + seeds
php artisan migrate --force
php artisan db:seed --class=ModulesPermissionsSeeder --force

# 6. Cria super_admin inicial (via tinker)
php artisan tinker
> User::create([
>   'name' => 'Samuel Melo',
>   'email' => 'samuel.melo@engetecnica.com.br',
>   'password' => Hash::make('senha_forte_aqui'),
>   'type' => 'super_admin',
>   'is_active' => 1,
>   'email_verified_at' => now(),
> ]);

# 7. Build front + cache backend
npm ci --omit=dev
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 8. Cron + queue worker (itens 6 e 7 acima)

# 9. Configurar nginx/Apache com HTTPS apontando para public/
```

## 📋 Smoke tests pós-deploy

```bash
# Health-check
curl -I https://seu-host.com.br/up
# → HTTP/2 200

# Login funciona
curl -X POST https://seu-host.com.br/login \
  -d "email=samuel.melo@..&password=..&_token=..."

# Mobile API responde (depois de logado, com cookie de sessão)
curl https://seu-host.com.br/api/mobile/ping -b "laravel_session=..."
# → {"ok":true,...}

# SW carrega corretamente
curl -I https://seu-host.com.br/sw.js
# → Content-Type: application/javascript
# → Service-Worker-Allowed: /

# Manifest
curl https://seu-host.com.br/manifest.webmanifest
# → JSON do manifest

# Lighthouse PWA audit
# Chrome DevTools → Lighthouse → PWA category
# → score > 90
```

## 🆘 Rollback

Se algo der errado após deploy:

```bash
# 1. Reverter código
git reset --hard HEAD~1
composer install --no-dev
npm ci --omit=dev && npm run build

# 2. Reverter migration (se for o caso)
php artisan migrate:rollback --step=1

# 3. Caches
php artisan config:cache && php artisan route:cache

# 4. Se DB corrompeu, restaurar backup
mysql -u USER -p NOME_BANCO < backup_YYYYMMDD_HHMMSS.sql
```

## 📱 Roteiro para motoristas (entregar junto)

1. Abra `https://seu-host.com.br/m` no navegador do celular
2. Logue com seu e-mail e senha
3. Aceite o banner **"Instalar SGA no celular"** (Android Chrome) ou:
   - **iOS Safari**: Compartilhar → Adicionar à Tela de Início
4. O ícone SGA aparece na tela inicial — abra por aí
5. Funciona offline após o primeiro carregamento
6. Use o botão ☁️ Sincronizar no menu (☰) quando voltar a ter internet
