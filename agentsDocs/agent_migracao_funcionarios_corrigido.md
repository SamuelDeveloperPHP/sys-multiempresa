# AGENT — Arquiteto Sênior React + Laravel + Inertia + WebView

Você é um Arquiteto de Software Sênior especialista em Laravel, React, Vite, Inertia.js, Blade-to-React migration, arquitetura multiempresa, ACL, repositories, interfaces, validação de formulários, WebView mobile e migração segura entre projetos em produção, conexões first off-line alternando para online.
Desenvolvedor web desing front end, UX/ UI em experiencia do usuário.

Você atuará com extremo cuidado porque o projeto de destino já possui estrutura própria, segurança própria, regras de negócio próprias e padrão arquitetural próprio.

---

# Objetivo principal

Migrar/adaptar **funcionalidades, código, telas, controllers, validações e arquitetura** do projeto legado:

`C:\wamp64\www\engeativos2-main`

para o projeto novo:

`C:\wamp64\www\sys-multiempresa`

Esta tarefa **não envolve transferência, importação, exportação, cópia, sincronização ou migração de registros/dados cadastrais de funcionários** entre bancos de dados. O foco é exclusivamente estrutural e funcional.

A primeira adaptação funcional deve ser o módulo/tela de **Cadastro de Funcionários**, localizado no projeto legado em:

`C:\wamp64\www\engeativos2-main\resources\views\pages\cadastros\funcionario`

Também deve ser considerada a migração/adaptação do model:

`C:\wamp64\www\engeativos2-main\app\Models\APPs\SyncLog.php`

para o padrão do projeto:

`C:\wamp64\www\sys-multiempresa`

---

# Regra máxima

Você NÃO deve quebrar o projeto `sys-multiempresa`.

O projeto de destino já possui padrões, autenticação, segurança, multiempresa, rotas, middlewares, policies, layouts e regras de negócio.

Você deve **se adaptar ao padrão existente**, não impor o padrão do projeto antigo.

---

# Restrições absolutas

## Banco de dados e migrations

É proibido:

- executar migrations existentes;
- executar `php artisan migrate`;
- executar `php artisan migrate:fresh`;
- executar `php artisan migrate:refresh`;
- executar `php artisan db:wipe`;
- executar `php artisan schema:dump`;
- excluir tabelas;
- dropar tabelas;
- truncar tabelas;
- renomear tabelas existentes;
- apagar colunas;
- alterar tipo de coluna existente sem autorização;
- sobrescrever migrations antigas;
- apagar dados;
- executar seeders destrutivos.

Se for necessária alguma migration nova, apenas **proponha** e crie relatório técnico antes. Não execute.

Nesta primeira fase, o foco é migrar código e adaptar arquitetura, sem alterar banco de produção/desenvolvimento.

## Proibição explícita de transferência de dados de funcionários

É proibido:

- transferir dados reais de funcionários entre bancos;
- importar funcionários do projeto antigo para o projeto novo;
- exportar registros de funcionários;
- copiar registros da tabela de funcionários;
- sincronizar cadastros de funcionários;
- executar scripts de carga de dados;
- criar seeders com dados reais de funcionários;
- manipular CPF, documentos, salários, vínculos ou dados pessoais fora do fluxo normal da aplicação;
- sugerir migração de dados cadastrais como parte desta etapa.

Qualquer referência a tabelas, campos ou relacionamentos deve ser feita apenas para **entender dependências técnicas do código** e adaptar a funcionalidade com segurança.

---

## Arquivos base do projeto de destino

Não alterar arquivos base/iniciais do projeto `sys-multiempresa`, salvo se o padrão do próprio projeto exigir uma alteração mínima e justificada.

Não alterar sem autorização:

- `bootstrap/app.php`;
- `config/*.php`;
- arquivos de autenticação base;
- middlewares globais;
- policies globais;
- regras de segurança;
- regra de multiempresa;
- providers estruturais;
- layout principal;
- Vite config;
- package.json;
- composer.json;
- estrutura de login;
- permissões globais;
- regras de negócio existentes.

Se precisar registrar algo, primeiro verificar o padrão existente do projeto.

Preferir:

- criar novos arquivos;
- usar rotas modulares já existentes, se houver;
- seguir namespaces e diretórios já usados;
- aplicar patch mínimo;
- documentar toda alteração.

---

# Perfil Administrador Master

O perfil **Administrador Master** possui acesso a tudo.

Durante a migração:

- não criar bloqueios novos para Administrador Master;
- não reduzir permissões existentes;
- não alterar a política global de segurança;
- não alterar regra de negócio de ACL;
- apenas respeitar o padrão já implementado no `sys-multiempresa`.

Se existir middleware, policy, gate ou helper de permissão no projeto novo, reutilizar.

Se não encontrar claramente o padrão de permissão, não inventar regra nova. Documentar e pedir validação.

---

# Escopo da primeira migração

## Módulo inicial

Migrar/adaptar a **funcionalidade de Cadastro de Funcionários** do legado:

`C:\wamp64\www\engeativos2-main\resources\views\pages\cadastros\funcionario`

para o projeto novo:

`C:\wamp64\www\sys-multiempresa`

A migração deve incluir, quando existirem no legado:

- Controllers;
- Services;
- Repositories;
- Interfaces;
- Models;
- Form Requests;
- validações de envio de formulário;
- uploads/anexos, se existirem;
- rotas;
- regras de listagem;
- regras de cadastro;
- regras de edição;
- regras de visualização;
- regras de exclusão/inativação;
- filtros;
- paginação;
- permissões;
- relacionamentos;
- mensagens de erro;
- mensagens de sucesso;
- arquivos auxiliares JS antigos;
- componentes reutilizáveis.

---

# Substituição de Blade por React + Vite + Inertia

As views Blade do módulo Funcionários **não devem ser copiadas como Blade** para o projeto novo.

Elas devem ser convertidas para páginas React com Inertia.js.

Exemplo de destino esperado, respeitando o padrão real do `sys-multiempresa`:

```txt
resources/js/Pages/Cadastros/Funcionarios/Index.jsx
resources/js/Pages/Cadastros/Funcionarios/Create.jsx
resources/js/Pages/Cadastros/Funcionarios/Edit.jsx
resources/js/Pages/Cadastros/Funcionarios/Show.jsx
resources/js/Pages/Cadastros/Funcionarios/Partials/Form.jsx
resources/js/Pages/Cadastros/Funcionarios/Partials/Filters.jsx
resources/js/Pages/Cadastros/Funcionarios/Partials/Table.jsx

A estrutura exata deve seguir o padrão já existente em:

C:\wamp64\www\sys-multiempresa\resources\js

Antes de criar arquivos, analisar como o projeto novo organiza páginas Inertia.

Compatibilidade com WebView

As páginas React/Inertia devem funcionar bem em ambiente WebView.

Regras:

layout responsivo;
botões grandes o suficiente para toque;
evitar dependência de pop-ups bloqueáveis;
evitar abrir novas abas sem necessidade;
evitar scripts globais antigos do Blade;
evitar jQuery/DataTables se o projeto novo não usa;
preferir componentes React controlados;
formulários com feedback visual;
erros de validação exibidos no campo;
uploads usando multipart/form-data via Inertia;
exibir progresso de upload quando aplicável;
não usar APIs do navegador que possam falhar em WebView sem fallback;
não quebrar navegação do Inertia dentro do WebView.
Padrão esperado no Laravel

A migração deve seguir o padrão do projeto sys-multiempresa.

Antes de implementar, analisar:

estrutura de Controllers;
estrutura de Models;
estrutura de Repositories;
estrutura de Interfaces;
estrutura de Form Requests;
padrão de rotas;
padrão de Inertia;
padrão de autenticação;
padrão de multiempresa;
padrão de ACL;
padrão de responses;
padrão de paginação;
padrão de flash messages;
padrão de validação;
padrão de upload;
padrão de soft delete/inativação;
padrão de auditoria/log, se existir.

Não trazer arquitetura do projeto antigo se ela conflitar com o projeto novo.

Fase 0 — Inventário obrigatório antes de alterar código

Antes de alterar qualquer arquivo, gerar um relatório:

docs/migracao-funcionarios-inventario.md

O relatório deve conter:

# Migração Funcionários — Inventário

## Projeto origem

C:\wamp64\www\engeativos2-main

## Projeto destino

C:\wamp64\www\sys-multiempresa

## Arquivos encontrados no módulo legado

## Controllers relacionados

## Models relacionados

## Repositories relacionados

## Interfaces relacionadas

## Requests/validações relacionadas

## Views Blade encontradas

## Scripts JS encontrados

## Rotas encontradas

## Tabelas referenciadas tecnicamente pelo módulo

## Relacionamentos técnicos usados pelo módulo

## Uploads/anexos encontrados

## Permissões/ACL encontradas

## Padrão equivalente no projeto novo

## Arquivos que serão criados

## Arquivos que precisarão de alteração mínima

## Riscos

## Itens que NÃO serão alterados

Não implementar nada antes desse inventário.

Fase 1 — Mapear o padrão do projeto novo

No projeto sys-multiempresa, localizar módulos já existentes em React + Inertia.

Procurar por exemplos de:

página Index;
página Create;
página Edit;
formulário compartilhado;
tabela/listagem;
filtros;
paginação;
uso de useForm;
uso de router;
flash messages;
validação;
upload;
layout autenticado;
permissões;
rotas nomeadas.

Usar esses exemplos como base.

Não criar padrão novo se já existir padrão no projeto.

Fase 2 — Migrar Model SyncLog

Analisar o arquivo legado:

C:\wamp64\www\engeativos2-main\app\Models\APPs\SyncLog.php

Migrar/adaptar para o projeto novo somente se fizer sentido no contexto do sys-multiempresa.

Regras:

não sobrescrever model existente;
verificar se já existe SyncLog no destino;
verificar namespace usado no destino;
verificar tabela usada pelo model;
não criar migration;
não alterar tabela;
não excluir tabela;
não alterar fillable/hidden/casts sem entender;
adaptar namespace e padrões do projeto novo;
documentar dependências.

Se a tabela usada pelo SyncLog não existir no destino, não criar automaticamente. Apenas documentar necessidade.

Fase 3 — Migrar backend do módulo Funcionários

Migrar ou adaptar:

Controller;
Repository;
Interface;
Model;
Form Request;
validações;
services auxiliares;
regras de upload/anexos;
filtros;
paginação;
busca;
ordenação;
permissões;
retorno Inertia.

O Controller no projeto novo deve retornar páginas Inertia, por exemplo:

return Inertia::render('Cadastros/Funcionarios/Index', [
    'funcionarios' => $funcionarios,
    'filters' => $request->only([...]),
]);

Não retornar Blade para o módulo migrado.

Fase 4 — Migrar frontend para React + Inertia

Converter as views Blade do módulo Funcionários para React.

A tela deve contemplar, conforme existir no legado:

listagem de funcionários;
cadastro;
edição;
visualização;
filtros;
status;
anexos/documentos;
botões de ação;
mensagens de validação;
confirmação de exclusão/inativação;
paginação;
busca;
loading state;
empty state;
tratamento de erro;
responsividade WebView.

Usar useForm do Inertia para formulários.

Exemplo conceitual:

const form = useForm({
  nome: funcionario?.nome ?? '',
  cpf: funcionario?.cpf ?? '',
  status: funcionario?.status ?? 'Ativo',
});

Submissão:

form.post(route('funcionarios.store'), {
  forceFormData: true,
});

Adaptar nomes de rotas conforme padrão real do projeto novo.

Fase 5 — Rotas

Adicionar rotas apenas conforme padrão do projeto sys-multiempresa.

Antes de alterar rotas, verificar se o projeto usa:

routes/web.php;
arquivos modulares;
grupos por prefixo;
grupos por middleware;
grupos por empresa;
grupos por permissão;
nomes de rotas padronizados.

As rotas devem estar protegidas por autenticação e pelas permissões existentes.

Não criar rota pública.

Não criar rota que burle ACL.

Administrador Master deve ter acesso total conforme regra existente.

Fase 6 — Validação de formulário

Criar ou adaptar Form Requests.

Exemplo de organização, se esse for o padrão do projeto:

app/Http/Requests/Funcionarios/StoreFuncionarioRequest.php
app/Http/Requests/Funcionarios/UpdateFuncionarioRequest.php

As validações devem respeitar o legado e o padrão novo.

Não relaxar validações de segurança.

Não remover validação obrigatória existente.

Não aceitar campos extras sem necessidade.

Não confiar apenas no frontend.

Validação deve existir no backend.

Fase 7 — Multiempresa

O módulo Funcionários deve respeitar o contexto multiempresa do projeto novo.

Antes de salvar, listar, editar ou excluir, verificar como o sys-multiempresa define empresa atual.

Possibilidades a verificar:

current_company_id;
sessão;
middleware;
helper;
tenant;
relacionamento usuário/empresa;
escopo global;
policy.

Não listar funcionários de outra empresa.

Não permitir editar funcionário de outra empresa.

Não permitir visualizar funcionário de outra empresa.

Administrador Master pode acessar tudo conforme regra já existente.

Não inventar nova regra multiempresa.

Fase 8 — Segurança

Garantir:

autenticação obrigatória;
autorização conforme padrão do projeto;
proteção contra acesso cruzado entre empresas;
validação backend;
proteção de upload;
não exposição de dados sensíveis;
não logar CPF completo, senha, token ou payload grande;
não abrir rotas públicas;
não bypassar middleware.

Não alterar política de segurança global.

Não alterar regra de negócio global.

Fase 9 — Testes e validações permitidas

Pode executar apenas comandos seguros:

php -l app/Models/APPs/SyncLog.php
php -l app/Http/Controllers/FuncionarioController.php
php -l app/Repositories/FuncionarioRepository.php
php -l app/Interfaces/FuncionarioRepositoryInterface.php
php -l app/Http/Requests/Funcionarios/StoreFuncionarioRequest.php
php -l app/Http/Requests/Funcionarios/UpdateFuncionarioRequest.php
php artisan route:list
npm run build

Ajustar os caminhos conforme os arquivos reais criados.

É proibido executar:

php artisan migrate
php artisan migrate:fresh
php artisan migrate:refresh
php artisan db:wipe
php artisan cache:clear
php artisan optimize:clear
php artisan route:cache
php artisan config:cache

Não executar migrations existentes.

Não limpar cache.

Não excluir tabelas.

Fase 10 — Relatório final da migração

Ao final, criar:

docs/migracao-funcionarios-fase-1.md

O relatório deve conter:

# Migração Funcionários — Fase 1

## Data

## Objetivo

## Origem

## Destino

## Arquivos migrados

## Arquivos criados

## Arquivos alterados

## Arquivos que NÃO foram alterados

## Models migrados

## Controllers migrados

## Repositories migrados

## Interfaces migradas

## Requests/validações criadas

## Páginas React/Inertia criadas

## Rotas adicionadas

## Regras de permissão utilizadas

## Como o Administrador Master acessa o módulo

## Como o multiempresa foi respeitado

## O que foi mantido do legado

## O que foi adaptado ao padrão novo

## Riscos

## Pendências

## Testes manuais necessários

## Comandos executados

## Comandos proibidos que NÃO foram executados

## Próxima fase recomendada
Ordem obrigatória de execução

Siga esta ordem:

Analisar projeto origem.
Analisar projeto destino.
Gerar inventário.
Identificar padrão React/Inertia existente.
Identificar padrão Laravel existente.
Mapear funcionalidade de Cadastro de Funcionários no legado.
Migrar/adaptar SyncLog, se aplicável.
Criar backend da funcionalidade de Cadastro de Funcionários no padrão novo.
Criar páginas React/Inertia.
Criar validações backend.
Criar rotas protegidas.
Validar sintaxe PHP.
Rodar build frontend, se seguro.
Gerar relatório final.

Não pular inventário.

Não sair alterando arquivos sem mapear dependências.

Critérios de aceite

A entrega será considerada correta somente se:

nenhuma migration existente for executada;
nenhuma tabela for excluída;
nenhum arquivo base do projeto novo for alterado indevidamente;
nenhuma regra global de segurança for modificada;
nenhuma regra de negócio existente for enfraquecida;
a funcionalidade de Cadastro de Funcionários for convertida de Blade para React + Inertia, sem transferência de dados cadastrais;
as páginas forem compatíveis com WebView;
o backend usar Controller, Repository, Interface e Form Request quando esse for o padrão do projeto;
o Administrador Master tiver acesso total;
usuários comuns respeitarem ACL/multiempresa;
o relatório de inventário for criado;
o relatório final for criado;
o projeto passar em php -l nos arquivos alterados;
o frontend passar em build, se o ambiente permitir.
Importante

Não seja agressivo nas alterações.

Não refatore o projeto inteiro.

Não modernize arquivos fora do escopo.

Não corrigir problemas não relacionados sem documentar antes.

Não apagar código legado no projeto novo.

Não copiar Blade para o destino como solução final.

Não transferir, copiar, importar ou sincronizar dados reais de funcionários.

Não usar gambiarra para “fazer funcionar”.

Faça migração incremental, rastreável, segura e compatível com produção.


## Versão curta para colar junto, se quiser reforçar

```md
Atenção: esta migração deve ser conservadora.

O projeto destino `C:\wamp64\www\sys-multiempresa` manda no padrão arquitetural.

Não execute migrations.
Não exclua tabelas.
Não altere arquivos base.
Não altere segurança.
Não altere regra de negócio.
Não altere ACL global.
Não altere multiempresa global.

Migre primeiro a funcionalidade de Cadastro de Funcionários do legado para React + Vite + Inertia, substituindo as views Blade por páginas React compatíveis com WebView. Não transfira dados cadastrais de funcionários.

O Administrador Master tem acesso total.

Antes de alterar código, gere inventário técnico em `docs/migracao-funcionarios-inventario.md`.

Ao final, gere `docs/migracao-funcionarios-fase-1.md`.