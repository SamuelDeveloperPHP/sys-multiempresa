# Revisão sênior — Gestão de veículos e frotas

Data: 2026-10-29  
Status: revisão concluída; correções pendentes

## Escopo

Revisão somente leitura do ciclo completo Admin + PWA: cadastro do ativo, locações, diário de bordo, checklists, abastecimentos, medições, manutenção preventiva/corretiva, documentos, pneus, custos, depreciação, tenancy, autorização e testes.

## Resumo executivo

Não foi identificado P0. Foram identificados riscos P1 de autorização, segurança operacional e integridade de dados. A base tem bons componentes — tenancy por model, idempotência mobile, arquivos privados no Admin, ledger de pneus, CPK/CPH, preventiva por uso/tempo e alertas agendados — mas os contratos entre Admin, PWA e banco divergiram em pontos críticos.

Diagnóstico do banco local em 2026-10-29:

- 3 veículos com mais de uma locação ativa;
- 1 motorista com mais de um diário `ABERTO`;
- 1 checklist com `data_execucao` preenchida e `data_cadastro` nula, invisível ao painel Admin;
- diários distribuídos entre `ABERTO`, `ENCERRADO` e `FECHADO`.

## Achados P1

### 1. Rotas mutáveis personalizadas são autorizadas como visualização

`ModuleAccess` converte apenas nomes convencionais (`store`, `update`, `destroy`) em habilidades de escrita; qualquer outro método cai em `view`. A Frota possui vários POST/PATCH mutáveis com nomes como `montarPneu`, `recapar`, `updateStatusOsPreventiva`, `recalcularDepreciacao`, `toggleObsoleto*` e `duplicar`.

Impacto: um perfil somente leitura pode executar mutações se receber ou construir a requisição, mesmo quando a interface oculta o botão.

Recomendação: autorização explícita por rota/policy; nunca inferir escrita pelo nome do método. Criar teste de matriz de permissões para todas as rotas mutáveis.

### 2. Operador mobile pode editar ou excluir registros de outro operador

As listagens de abastecimento, diário e checklist filtram por usuário, mas update/delete validam apenas a empresa do veículo. Não validam `id_user` ou `user_create` do registro.

Impacto: quebra de autoria, responsabilização e trilha de auditoria.

Recomendação: policies por recurso; operador altera somente registros próprios e dentro de janela/status definido. Gestores usam permissão explícita e alteração auditada.

### 3. Contrato de checklist diverge entre PWA e Admin

O PWA grava `data_execucao` e `respostas` em JSON. O painel Admin consulta `data_cadastro` e o detalhe lê a tabela legada de itens realizados; a página Inertia `ChecklistExecucoes/Show` não existe.

Impacto: checklists válidos podem aparecer como pendentes ou não aparecer; o detalhe pode retornar erro ou não mostrar respostas. Já existe um registro local invisível por esse motivo.

Recomendação: escolher um contrato canônico, migrar/backfill dos campos e fazer Admin e PWA consumirem a mesma representação.

### 4. Checklist aceita itens arbitrários ou conjunto incompleto

`item_id` é validado apenas como inteiro. Não há verificação de pertencimento ao template, unicidade ou completude do conjunto de itens ativos.

Impacto: uma inspeção pode ser concluída omitindo itens críticos como freio, pneus ou iluminação.

Recomendação: validar o conjunto completo e único dos itens ativos do template; persistir snapshot da versão/texto do checklist; tratar alterações posteriores como nova versão.

### 5. Diário aberto não possui invariante atômico e usa status divergentes

A regra declara um diário aberto por motorista, mas permite outro diário no mesmo veículo e faz checagem/criação sem lock. O mobile usa `FECHADO`; o Admin aceita `ENCERRADO`. O banco local já contém um motorista com múltiplos ciclos abertos.

Impacto: turnos sobrepostos, horas e medições duplicadas, edição de diário fechado falhando por vocabulário incompatível.

Recomendação: status canônico; transição de estado explícita; unicidade de ciclo ativo por operador; transação com lock ou tabela própria de ciclo ativo.

### 6. Locações permitem sobreposição e vínculos de outro tenant

As regras `exists:` não restringem veículo, obra e funcionário à empresa atual. Não há invariante para uma única locação ativa nem coerência temporal entre início, previsão e fim. O banco local possui 3 veículos com múltiplas locações ativas.

Impacto: veículo simultaneamente atribuído a obras/condutores diferentes e possível associação cross-tenant.

Recomendação: `Rule::exists(...)->where(company_id)`; serviço transacional de transferência/encerramento; datas coerentes; restrição estrutural para uma alocação ativa.

### 7. Estado atual de pneus pode ser corrompido

Rodízio não confirma que o pneu está montado no veículo; montagem/rodízio verificam posição e gravam sem transação/lock. O ledger é usado simultaneamente como histórico e fonte do estado atual.

Impacto: pneu em estoque ou de outro veículo pode ser rodiziado; corridas podem montar dois pneus na mesma posição ou o mesmo pneu duas vezes.

Recomendação: tabela de montagem atual com unicidade por pneu e por `(veiculo, posição)`; ledger somente histórico; máquina de estados, transação e `lockForUpdate`.

### 8. Evidências mobile são publicadas em armazenamento público

Fotos de checklist, diário e comprovante de abastecimento são gravadas no disco público e retornadas como `/storage/...`.

Impacto: quem obtiver a URL pode acessar evidências operacionais sem passar por autorização do módulo ou tenant.

Recomendação: armazenamento privado e endpoint autenticado/tenant-scoped, com nomes não previsíveis e política de retenção.

### 9. Medidores não têm uma fonte canônica nem sequência garantida

O CRUD administrativo aceita qualquer valor não negativo; update mobile não preserva a regra `final >= inicial`. Cálculos alternam entre maior valor e último ID.

Impacto: erros ou lançamentos retroativos alteram preventiva, consumo, CPK e depreciação de formas diferentes.

Recomendação: serviço único de medição, ordenação por data do evento + desempate, monotonicidade padrão e fluxo explícito de correção/troca/reset do medidor.

## Achados P2

- Primeira preventiva por tempo não possui data-base quando ainda não há OS anterior.
- Prefixo, placa, chassi, RENAVAM e número de fogo não possuem unicidade normalizada por empresa.
- Exclusão do veículo remove arquivos definitivamente mesmo havendo `SoftDeletes` e estados `Vendido`/`Baixado`; isso prejudica auditoria histórica.
- Abastecimento não reconcilia quantidade, preço e total; os dois CRUDs Admin possuem contratos diferentes.
- Não há alerta agendado para vencimento de IPVA, seguro, tacógrafo e documentos.
- Painel de pneus executa consultas por linha para movimentos, CPK e medição atual.
- `VeiculoController` concentra 2.229 linhas e 97 métodos; cadastro, arquivos, manutenção, pneus, documentos, custos e medidores compartilham o mesmo controller.
- Não existem testes Admin de Frota para locações, pneus, medições, preventivas, documentos e matriz de autorização.

## Opções avaliadas

### A. Hardening focalizado (recomendado primeiro)

Corrigir autorização, ownership mobile, contrato do checklist, status/ciclo do diário, tenancy/sobreposição de locações e invariantes de pneus. Menor risco e entrega rápida; prepara o banco para a refatoração.

### B. Refatoração incremental por domínio

Após o hardening, extrair serviços/controllers de `VehicleLifecycle`, `Allocation`, `MeterReading`, `Maintenance`, `Tire`, `Fueling` e `DocumentCompliance`. Risco moderado, melhor testabilidade e evolução.

### C. Reescrita completa do módulo

Não recomendada agora. Custo e risco de regressão altos devido ao legado, PWA offline e dados históricos.

## Estratégia de testes

- Matriz de autorização: view não pode executar nenhuma rota POST/PUT/PATCH/DELETE.
- Testes cross-user mobile para abastecimento, diário e checklist.
- Contrato Admin/PWA do checklist, incluindo data, respostas, detalhe e migração de legados.
- Completude, unicidade e versionamento dos itens de checklist.
- Concorrência de ciclo aberto, locação ativa e posição de pneu.
- Tenancy em todas as FKs de Frota.
- Propriedades de medidor: monotonicidade, lançamento retroativo, correção e reset.
- Máquina de estados de pneus e cálculo CPK/CPH.
- Integração de vencimentos legais e retenção de arquivos.

## Evidência de testes existentes

Executados em 2026-10-29: 17 testes mobile, 67 asserções, todos aprovados. A suíte atual cobre idempotência, fotos, validação básica e tenancy de alguns endpoints, mas não cobre os P1 acima.

