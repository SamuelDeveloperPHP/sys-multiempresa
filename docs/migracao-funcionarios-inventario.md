# Migração Funcionários — Inventário

## Projeto origem
`C:\wamp64\www\engeativos2-main`

## Projeto destino
`C:\wamp64\www\sys-multiempresa`

## Arquivos encontrados no módulo legado

### Controllers relacionados
- `app/Http/Controllers/CadastroFuncionarioController.php`
- `app/Http/Controllers/CadastroFolgaFuncionariosController.php`
- `app/Http/Controllers/CadastroFuncionarioDocumentoController.php`
- `app/Http/Controllers/CadastroFuncionarioSetorController.php`
- `app/Http/Controllers/FolgaFuncionarioController.php`
- `app/Http/Controllers/FuncaoFuncionarioController.php`
- `app/Http/Controllers/FuncionarioDocumentoZipController.php`
- `app/Http/Controllers/FuncionarioPublicController.php`
- `app/Http/Controllers/RelatorioFuncionarioController.php`
- `app/Http/Controllers/TransferenciaFuncionariosController.php`

### Models relacionados
- `app/Models/CadastroFuncionario.php`
- `app/Models/CadastroFuncionarioDoc.php`
- `app/Models/CadastroFuncionarioSetor.php`
- `app/Models/FuncaoFuncionario.php`
- `app/Models/FuncionarioMotivoAfastamento.php`
- `app/Models/FuncionarioQualificacao.php`
- `app/Models/Funcionarios/FuncionariosBancoHora.php`
- `app/Models/Funcionarios/FuncionariosEscala.php`
- `app/Models/Funcionarios/FuncionariosFerias.php`
- `app/Models/Funcionarios/FuncionariosFolga.php`
- `app/Models/Funcionarios/FuncionariosRegistroPonto.php`
- `app/Models/AnexoFuncionario.php`
- `app/Models/APPs/SyncLog.php`

### Repositories relacionados
- `app/Repositories/CadastroFuncionarioDocRepository.php`
- `app/Repositories/CadastroFuncionarioSetorRepository.php`
- `app/Services/FuncionarioService.php`

### Interfaces relacionadas
- `app/Interfaces/CadastroFuncionarioDocRepositoryInterface.php`
- `app/Interfaces/CadastroFuncionarioSetorRepositoryInterface.php`

### Requests/validações relacionadas
- `app/Http/Requests/FuncionarioRequest.php`

### Views Blade encontradas
Localizadas em `resources/views/pages/cadastros/funcionario/` (e em vários subdiretórios):
- `index.blade.php`
- `form.blade.php`
- `show.blade.php`
- `detalhes_funcionario.blade.php`
- Múltiplos subdiretórios identificados: `departamentoPessoal`, `documentos`, `folgas`, `funcoes`, `setores`, `relatorios`, etc.

### Scripts JS encontrados
Misturados nas blades ou em public/js associado. O projeto legado usava intensivamente requisições jQuery/Ajax acopladas na View.

### Rotas encontradas
Rotas espalhadas em `routes/web.php` e `routes/api-app.php`, apontando para os referidos controllers de `CadastroFuncionario` e associados.

### Tabelas usadas
- `funcionarios`
- `cadastro_funcionario_docs`
- `funcionarios_setor`
- `funcionarios_funcoes`
- `funcionarios_funcao_qualificacoes`
- `funcionarios_motivo_afastamento`
- `funcionarios_obs_cargos_salarios`
- `funcionarios_qualificacoes`
- `funcionarios_transferencia`
- `funcionario_funcao_epi`
- `funcionario_funcao_epi_justificar`
- `sync_logs`

### Relacionamentos usados
- Obra (`CadastroObra`)
- Vínculo de Usuário (`CadastroUsuariosVinculo`)
- Função (`FuncaoFuncionario`)
- Qualificação (`FuncionarioQualificacao`)
- Setor (`CadastroFuncionarioSetor`)
- Anexos (`AnexoFuncionario`)
- Motivo Afastamento (`FuncionarioMotivoAfastamento`)

### Uploads/anexos encontrados
- Imagem de usuário (`imagem_usuario` na tabela `funcionarios`)
- Documentos de funcionários e qualificações (`AnexoFuncionario` e controllers específicos de upload).

### Permissões/ACL encontradas
O legado utilizava controle de acesso do Laravel atrelado ao `CadastroUsuariosVinculo`.

---

## Padrão equivalente no projeto novo

### Arquivos que serão criados
- **Controllers:** `app/Http/Controllers/Admin/FuncionarioController.php` (novo padrão aglutinará lógicas básicas).
- **Requests:** `app/Http/Requests/Admin/StoreFuncionarioRequest.php`, `UpdateFuncionarioRequest.php`.
- **Views (React):**
  - `resources/js/Pages/Admin/Funcionarios/Index.jsx`
  - `resources/js/Pages/Admin/Funcionarios/Create.jsx`
  - `resources/js/Pages/Admin/Funcionarios/Edit.jsx`
  - `resources/js/Pages/Admin/Funcionarios/Show.jsx`

### Arquivos que precisarão de alteração mínima
- **Models:** Os models equivalentes no destino já existem (`App\Models\Funcionario`, `App\Models\FuncionarioFuncao`, `App\Models\FuncionarioSetor`). Eles utilizam a trait `Tenantable` para controle multiempresa. Adaptaremos apenas se precisarem de novos fillables ou relationships.
- **SyncLog:** No destino já possuímos a estrutura de `AuditLog` (bastante parecida, porém voltada a auditoria). Caso a tabela `sync_logs` do SyncLog legado seja exclusiva de aparelhos Mobile, deveremos manter um model isolado `APPs\SyncLog` no destino sem alterar regras nativas.

### Riscos
- **Diferença de Estrutura de Models:** `CadastroFuncionario` possui atributos que talvez não existam atualmente no fillable do `App\Models\Funcionario`.
- **Anexos e Documentos:** Necessário padronizar a lógica de arquivos (armazenamento na AWS S3 / Local `storage` usando validação Multipart via Inertia).
- Resposta: os anexos são enviados para o Onedrive via Microsoft Graph API utilizando o arquivo C:\wamp64\www\engeativos2-main\app\Helpers\FileUploadHelper.php


### Itens que NÃO serão alterados
- Estrutura base de tabelas do banco de dados (todas as operações adaptarão leitura e escrita à estrutura atual, sem `php artisan migrate`).
Resposta: não execute `php artisan migrate` ou `php artisan migrate:fresh, use para a migration específica.

- Layout `AuthenticatedLayout.jsx` base do Inertia.
- Traits do projeto (`Tenantable`).
- Regras e Middlewares globais de controle de sessão/empresa.
- O model `App\Models\User.php`.
