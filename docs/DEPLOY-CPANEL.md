# Deploy em cPanel / hospedagem compartilhada

> Para servidores que **NÃO têm `composer` nem `npm`** disponíveis no SSH (típico em hospedagem compartilhada).
>
> A estratégia: **buildar localmente na sua máquina** e fazer upload de um ZIP completo.

## 🎯 Pré-requisitos LOCAIS (Windows com WAMP)

Já está OK na sua máquina:
- ✅ Composer (`/c/composer/composer`)
- ✅ Node 22.x (`/c/Program Files/nodejs`)
- ✅ npm
- ✅ PHP 8.2

## 🚀 Processo completo (uso do dia a dia)

### 1. Builde local

Abra **PowerShell** na pasta do projeto e rode:

```powershell
.\scripts\deploy-build.ps1
```

Ou dê duplo-clique em `scripts\deploy-build.bat`.

O script faz:
1. `composer install --no-dev --optimize-autoloader`
2. `npm ci`
3. `npm run build`
4. Limpa caches Laravel
5. Cria `_release/release_AAAA-MM-DD_HHMMSS.zip` (~50-80 MB)

### 2. Upload no cPanel

**Opção A — File Manager (mais fácil):**
1. cPanel → **File Manager**
2. Navegue até `~/newsga/` (ou onde está o projeto no servidor)
3. Clique em **Upload** → selecione o ZIP do passo 1
4. Volte ao File Manager → clique direito no ZIP → **Extract**
5. Confirme sobrescrever arquivos existentes

**Opção B — SFTP (mais rápido para repetir):**
- FileZilla / WinSCP apontando para `seu-host.com.br:22` (porta SSH-FTP)
- Login: usuário cPanel + senha
- Arraste e solte o ZIP para `~/newsga/`
- No SSH: `cd ~/newsga && unzip -o release_*.zip && rm release_*.zip`

### 3. `.env` no servidor

O ZIP **não inclui o `.env`** (por segurança). Crie pela primeira vez via cPanel → File Manager → New File:

```bash
# Pelo SSH:
cd ~/newsga
cp .env.example .env
nano .env  # editar conforme docs/DEPLOY.md (seção 2)

# Gera APP_KEY se ainda nao tem:
php artisan key:generate
```

⚠️ Veja `docs/DEPLOY.md` (seção "2. .env de produção") para os valores corretos.

### 4. Migrations + cache via SSH

```bash
cd ~/newsga

# Roda migrations no banco de prod
php artisan migrate --force

# (Primeira vez apenas) Popula modulos/permissões base
php artisan db:seed --class=ModulesPermissionsSeeder --force

# Caches de produção (regerar a cada deploy)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### 5. Permissões

```bash
chmod -R 775 storage bootstrap/cache
# cPanel geralmente já está correto, mas se der erro "Permission denied":
find storage -type d -exec chmod 755 {} \;
find storage -type f -exec chmod 644 {} \;
```

### 6. Apontar o web-root para `public/`

cPanel padrão serve a partir de `~/public_html`. Você tem 3 opções:

**Opção 1 — Subdomínio dedicado (recomendado, mais seguro):**
- cPanel → **Subdomains** → crie `app.seudominio.com.br`
- Document Root: `/home/seuuser/newsga/public`
- O cPanel cria essa pasta automaticamente, mas você pode mudar
- Apontar diretamente para a pasta `public/` do Laravel

**Opção 2 — Domínio principal apontando para `public/`:**
- cPanel → **Domains** → edite o domínio principal
- Document Root: mude de `~/public_html` para `~/newsga/public`

**Opção 3 — `.htaccess` na raiz (gambiarra, não recomendado):**
- Suba o projeto INTEIRO em `~/public_html/`
- Crie `~/public_html/.htaccess`:
  ```apache
  <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteRule ^(.*)$ public/$1 [L]
  </IfModule>
  ```
- **Risco**: expõe `.env`, `vendor/`, etc. ao público se o `.htaccess` falhar.

### 7. HTTPS

cPanel → **SSL/TLS Status** → **Run AutoSSL** (Let's Encrypt gratuito).

Após emitir o certificado, edite o `.env`:
```bash
APP_URL=https://app.seudominio.com.br
SESSION_SECURE_COOKIE=true
```

### 8. Cron job (alertas de preventivas, etc.)

cPanel → **Cron Jobs** → adicione:

```
* * * * * cd /home/seuuser/newsga && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

## ⚡ Deploys futuros (rotina)

Toda vez que tiver mudança de código:

```powershell
# Local (PowerShell)
.\scripts\deploy-build.ps1
```

Upload o ZIP → Extract → SSH:

```bash
cd ~/newsga
php artisan migrate --force          # se tiver migration nova
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 🔧 Atalhos via SSH (.bash_aliases)

Crie `~/.bash_aliases` no servidor:

```bash
alias sga='cd ~/newsga'
alias sga-migrate='cd ~/newsga && php artisan migrate --force'
alias sga-cache='cd ~/newsga && php artisan config:cache && php artisan route:cache && php artisan view:cache'
alias sga-clear='cd ~/newsga && php artisan config:clear && php artisan route:clear && php artisan view:clear'
alias sga-deploy='cd ~/newsga && unzip -o release_*.zip && rm release_*.zip && php artisan migrate --force && php artisan config:cache && php artisan route:cache'
```

Depois `source ~/.bash_aliases` (ou abrir sessão SSH nova). Aí basta `sga-deploy` após upload.

## ❓ FAQ

**P: O ZIP fica gigante (>100MB)?**
R: Provavelmente `node_modules` ou `_release/` está sendo incluído. O script exclui, mas confira o `.gitignore` se tem coisas grandes.

**P: cPanel reclama de timeout no extract?**
R: Use SSH: `cd ~/newsga && unzip -o release_*.zip`.

**P: Como ver logs em prod?**
R: `tail -f ~/newsga/storage/logs/laravel.log` via SSH.

**P: Como instalar composer/npm no servidor cPanel?**
R: Geralmente não dá em shared hosting (precisa root). Solução: ou trocar para VPS, ou usar este fluxo de build-local.

**P: Service Worker não funciona em prod?**
R: Confirme HTTPS ativo. Sem HTTPS, navegador bloqueia SW.

**P: Posso usar GitHub Actions / CI?**
R: Sim. O `deploy-build.ps1` pode ser convertido para `deploy-build.yml` GitHub Actions que builda e faz upload via SFTP automaticamente.
