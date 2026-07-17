#!/usr/bin/env bash
#
# deploy.sh — passos de PRODUÇÃO que rodam NO SERVIDOR (hospedagem sem git/npm).
# O build do front e o upload dos arquivos são feitos ANTES, na sua máquina
# (veja o passo-a-passo que o dev te passou). Aqui só rodamos PHP/artisan.
#
# Uso (via SSH, na raiz do projeto no servidor):
#   bash deploy.sh
# Se o binário do PHP não for 'php' (comum em hospedagem, ex.: php82, ea-php82):
#   PHP=php82 bash deploy.sh
#
set -euo pipefail
cd "$(dirname "$0")"

PHP="${PHP:-php}"
log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# valida que o PHP CLI funciona e é o artisan certo
if ! "$PHP" -v >/dev/null 2>&1; then
  echo "ERRO: '$PHP' nao encontrado. Rode assim: PHP=php82 bash deploy.sh (ajuste a versao)."; exit 1
fi
[ -f artisan ] || { echo "ERRO: rode na raiz do projeto (arquivo 'artisan' nao encontrado)."; exit 1; }

log "Limpando caches engessados do bootstrap (evita boot quebrado por dep de DEV, ex.: Pail)"
# Feito com 'rm' porque, se o cache referenciar um provider ausente em produção,
# o próprio artisan não sobe. Laravel redescobre a partir do vendor real no boot.
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php bootstrap/cache/config.php bootstrap/cache/routes-*.php bootstrap/cache/events.php

log "Modo manutenção ON"
"$PHP" artisan down || true
finish() { "$PHP" artisan up >/dev/null 2>&1 || true; }   # tira do modo manutenção mesmo se falhar
trap finish EXIT

log "Migrations (aplica só as PENDENTES)"
# Política do projeto: NUNCA migrate:fresh. As migrations de create são idempotentes,
# então 'migrate --force' roda só o que falta. Revisar antes: $PHP artisan migrate:status
"$PHP" artisan migrate --force

log "Recache de config / rotas / views (há configs novas: frota_pneus, frota_depreciacao)"
"$PHP" artisan config:clear
"$PHP" artisan route:clear
"$PHP" artisan view:clear
# rebuild de cache é otimização — não-fatal (route:cache quebra se houver rota via closure)
"$PHP" artisan config:cache || true
"$PHP" artisan route:cache  || echo "  (route:cache pulado — provavelmente há rota via closure; ok)"
"$PHP" artisan view:cache   || true

log "Storage link (idempotente)"
"$PHP" artisan storage:link || true

log "Reiniciar filas (se usar workers em background)"
"$PHP" artisan queue:restart || true

log "Deploy concluído ✔ — o modo manutenção será desligado agora."
