# Jarvis Stage 1 - Instalação e integração

## 1) Copie os arquivos
Copie as pastas e arquivos deste pacote para o seu projeto Laravel.

## 2) Registre o provider e o middleware
Aplique o patch descrito em `docs/bootstrap-app.patch.md`.

## 3) Registre as rotas
Aplique os patches descritos em `docs/routes.patch.md` e `docs/web-route.patch.md`.

## 4) Comandos de migration

```bash
php artisan migrate
```

Se você quiser conferir o status:

```bash
php artisan migrate:status
```

Se estiver em homologação e quiser rodar tudo do zero:

```bash
php artisan migrate:fresh --seed
```

## 5) Otimização recomendada

```bash
php artisan optimize
php artisan config:clear
php artisan route:clear
```

## 6) Frontend React + Tailwind

### Instalar dependências
```bash
npm install
```

### Rodar em desenvolvimento
```bash
npm run dev
```

### Gerar build
```bash
npm run build
```

## 7) Teste rápido do módulo

1. autentique-se no sistema;
2. acesse a página React do Jarvis;
3. crie uma conversa;
4. envie:
   `/tool system.healthcheck {}`
5. envie:
   `/tool ferramental.consultar_disponiveis {"limit":5}`

## 8) Como plugar no seu sistema de produção

### Permissões
Garanta estas permissions no seu ACL:
- `jarvis.access`
- `jarvis.system.healthcheck`
- `jarvis.ferramental.list`

### Aprovação
Substitua `NoOpApprovalGateway` por um adapter chamando seu fluxo de approval real.

### Auditoria
Substitua `NoOpAuditGateway` por um adapter que grave no seu `audit_logs`.

### LLM
Substitua `HeuristicLlmClient` por um adapter real do provedor que você escolher.
