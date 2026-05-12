# Migração Engeativos → sys-multiempresa (Fase 1 + Fase 2)

Guia operacional para executar a primeira metade do plano: fundação (multi-empresa, sanctum, módulos) + domínio Frota completo.

## Pré-requisitos

- PHP 8.2+
- MySQL/MariaDB com o banco antigo `engeativos` ainda acessível
- Composer instalado
- Node 20+ e npm
- WAMP rodando

## 1) Preparar o banco do sys-multiempresa

```powershell
# 1.1 Criar banco vazio
mysql -u root -e "CREATE DATABASE sys_multiempresa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 1.2 Configurar .env do sys-multiempresa
# Editar c:/wamp64/www/sys-multiempresa/.env e ajustar:
#   DB_DATABASE=sys_multiempresa
#   DB_USERNAME=root
#   DB_PASSWORD=
```

## 2) Instalar dependências e rodar migrations

```powershell
cd c:/wamp64/www/sys-multiempresa

composer install
php artisan key:generate
php artisan migrate

# Sanctum (se ainda não estiver instalado)
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# Frontend
npm install
npm run build   # ou `npm run dev` para desenvolvimento
```

## 3) Aplicar patches manuais

### 3.1 Registrar `routes/api-app.php`

Editar `bootstrap/app.php`:

```php
->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api-app.php',   // <--
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
```

### 3.2 Adicionar rotas admin/frota em `routes/web.php`

Veja `docs/migration/routes-frota.patch.md` — copie o bloco de `Route::resource('veiculos', ...)` e cole dentro do grupo `auth + company` existente.

### 3.3 Garantir guard `sanctum` em `config/auth.php`

```php
'guards' => [
    'web'     => ['driver' => 'session', 'provider' => 'users'],
    'sanctum' => ['driver' => 'sanctum', 'provider' => 'users'],
],
```

### 3.4 Token Sanctum no User

Editar `app/Models/User.php` para usar `HasApiTokens`:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasFactory, Notifiable, HasApiTokens;
    // ...
}
```

## 4) Cadastrar módulos (seeder)

```powershell
php artisan db:seed --class=Database\\Seeders\\ModulesFrotaSeeder
```

Esperado:
```
Modulos Frota/SMS/Sincronizacao cadastrados/atualizados.
```

## 5) Criar a empresa inicial

Acesse o admin (http://localhost/sys-multiempresa/admin) e cadastre:

1. Uma **Company** (ex.: "Engetecnica SGA").
2. Pelo menos uma **Obra** vinculada a essa Company.
3. Um **User** admin vinculado a essa Company e Obra via `obra_user`.

Anote o `id` da Company — vai ser usado no ETL.

## 6) Migrar dados do banco antigo (ETL)

### 6.1 Backup defensivo
```powershell
"C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe" -u root engeativos > c:/backup_engeativos.sql
```

### 6.2 Ajustar @company_id no script ETL

Editar `docs/migration/etl-engeativos-to-sys-multiempresa.sql`:

```sql
SET @company_id := 1;   -- TROCAR pelo ID real da Company criada no passo 5
```

### 6.3 Executar ETL

```powershell
cd c:/wamp64/www/sys-multiempresa
mysql -u root sys_multiempresa < docs/migration/etl-engeativos-to-sys-multiempresa.sql
```

A última query do script mostra a contagem por tabela — confirme que os números fazem sentido.

## 7) Testar a API mobile

### 7.1 Login

```bash
curl -X POST http://localhost/sys-multiempresa/api/app_login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"senha"}'
```

Esperado:
```json
{
  "token": "1|abcdef...",
  "user": { "id": 1, "name": "Admin", ... },
  "modulosPermitidos": [...]
}
```

### 7.2 Download

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost/sys-multiempresa/api/download/veiculos
```

Esperado: lista filtrada pelas obras do usuário.

### 7.3 Upload

```bash
curl -X POST -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost/sys-multiempresa/api/upload/veiculo_abastecimentos \
  -d '{
    "registros":[
      {
        "id_local":"test-uuid-1",
        "veiculo_id":1,
        "id_obra":1,
        "data_abastecimento":"2026-05-12 10:00:00",
        "quantidade":50.5,
        "valor_do_litro":7.19,
        "valor_total":362.85
      }
    ]
  }'
```

Esperado:
```json
{
  "status":"success",
  "registros_sincronizados":[
    {"uuid_local":"test-uuid-1","id_servidor":1234,...}
  ]
}
```

Re-executar o mesmo POST não duplica (UPSERT por `id_local`).

## 8) Validar o admin Frota (web)

Acesse `http://localhost/sys-multiempresa/admin/frota/veiculos` — deve listar os veículos migrados, com busca e CRUD funcionando.

## 9) Estrutura final esperada

```
sys-multiempresa/
├── app/
│   ├── Http/Controllers/
│   │   ├── Admin/Frota/VeiculoController.php       ← novo (template)
│   │   └── Api/
│   │       ├── AppAuthController.php               ← novo
│   │       └── SyncController.php                  ← novo (~400 linhas)
│   └── Models/
│       ├── User.php                                ← atualizado (4 campos)
│       ├── Obra.php                                ← atualizado (accessors)
│       ├── Funcionario.php                         ← novo
│       ├── FuncionarioFuncao.php                   ← novo
│       ├── FuncionarioSetor.php                    ← novo
│       ├── Traits/Syncable.php                     ← novo
│       └── Frota/                                  ← novo namespace (13 models)
│           ├── Veiculo.php
│           ├── VeiculoLocacao.php
│           ├── VeiculoChecklist.php
│           ├── VeiculoChecklistItem.php
│           ├── VeiculoChecklistServico.php
│           ├── VeiculoChecklistRealizado.php
│           ├── VeiculoChecklistEvidencia.php
│           ├── VeiculoHorimetro.php
│           ├── VeiculoQuilometragem.php
│           ├── VeiculoAbastecimento.php
│           ├── VeiculoDiarioBordo.php
│           ├── VeiculoPreventiva.php
│           ├── VeiculoPreventivaItemRealizada.php
│           └── TipoVeiculo.php
├── database/
│   ├── migrations/
│   │   ├── 2026_05_12_000001_add_app_fields_to_users_table.php
│   │   ├── 2026_05_12_000002_add_app_fields_to_obras_table.php
│   │   ├── 2026_05_12_000003_create_funcionarios_tables.php
│   │   ├── 2026_05_12_000010_create_frota_core_tables.php
│   │   ├── 2026_05_12_000011_create_frota_checklist_tables.php
│   │   ├── 2026_05_12_000012_create_frota_operacao_tables.php
│   │   ├── 2026_05_12_000013_create_frota_preventivas_tables.php
│   │   └── 2026_05_12_000020_create_sync_infrastructure.php
│   └── seeders/
│       └── ModulesFrotaSeeder.php
├── resources/js/Pages/Admin/Frota/Veiculos/
│   ├── Index.jsx
│   └── Form.jsx
├── routes/
│   └── api-app.php                                 ← novo
└── docs/migration/
    ├── README.md                                   ← este arquivo
    ├── routes-frota.patch.md
    └── etl-engeativos-to-sys-multiempresa.sql
```

## 10) Validações pós-migração

| Check | Como verificar |
|---|---|
| Migrations rodaram OK | `php artisan migrate:status` (todas Yes) |
| Módulos seedados | `SELECT slug FROM modules WHERE slug LIKE 'frota.%';` |
| Dados migrados | Última query do ETL mostra contagens |
| API responde | Curl do passo 7 retorna 200 |
| Admin frontend | `npm run dev` + navegar /admin/frota/veiculos |
| Multi-tenant funciona | Logar com user de outra Company → não vê veículos da Company 1 |

## 11) Próximos passos (depois desta Fase)

| Fase | Escopo | Estimativa |
|---|---|---|
| **2.2** | Replicar Controller+Pages para Abastecimento, Diário, Horímetro, etc. (template já existe) | 1-2 sem |
| **3** | Domínio SMS (modelos `sms_*` + Controllers + Pages) | 2-3 sem |
| **4** | Capacitor (mobile): SQLite local + `syncService` portado de RN para Web | 3-4 sem |
| **5** | Publicação App Store + Play Store | 2 sem |

Detalhes no diff técnico anterior (`docs/migration/diff-engeativos2-vs-sys-multiempresa.md` — gerar quando começar Fase 3).

## 12) Rollback de emergência

Se algo dar muito errado:

```powershell
# 1) Reverter as migrations desta entrega
php artisan migrate:rollback --step=8

# 2) Restaurar o banco antigo (se necessário)
mysql -u root engeativos < c:/backup_engeativos.sql
```

A migration do `users` (`add_app_fields_to_users_table`) só **adiciona** colunas — rollback é seguro. As migrations de Frota criam tabelas novas — rollback simplesmente drop.

## 13) Erros conhecidos / FAQ

**Q: Linter PHP do VSCode reclama de `Undefined type 'Illuminate\\...'`**
A: Falso positivo do analisador estático local. Composer resolve os namespaces. Rodar `composer dump-autoload` se incomodar.

**Q: API retorna `Tabela 'sys_multiempresa.veiculos' doesn't exist`**
A: Migrations não rodaram. Veja passo 2.

**Q: `Auth::user()` retorna null no SyncController**
A: Token Sanctum não foi enviado no header `Authorization: Bearer ...`. Conferir middleware `auth:sanctum` na rota.

**Q: Multi-tenant não filtra**
A: O `Tenantable` trait depende do `CompanyContext`. Em rota API sem cookie de sessão, o middleware `company` não popula o contexto — o `SyncController` resolve isso lendo `company_id` do header `X-Company-Id` ou da relação do user. Conferir que o mobile envia o header `X-Company-Id: 1`.
