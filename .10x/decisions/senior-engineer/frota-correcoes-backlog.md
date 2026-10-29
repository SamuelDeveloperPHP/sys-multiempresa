# Backlog sênior — Correções dos módulos de Frota

Data: 2026-10-29  
Status: pronto para refinamento e execução  
Origem: `frota-gestao-veiculos-review.md`

## Objetivo

Eliminar primeiro os riscos de autorização, isolamento entre usuários/empresas e corrupção de estado operacional; em seguida, consolidar contratos, desempenho e manutenibilidade dos módulos Admin + PWA de Frota.

## Estratégias avaliadas

### 1. Risco primeiro, em ondas pequenas — recomendada

Começa por testes de caracterização e bloqueios de segurança, saneia os dados existentes e somente depois adiciona constraints/refatora. Tem menor raio de impacto, rollback mais simples e permite validar cada invariante em produção.

### 2. Frentes paralelas por domínio

Permissões, checklists, operações e pneus avançam simultaneamente. Reduz o calendário, mas exige contratos congelados, coordenação de migrations e uma suíte de integração que hoje não existe. Pode ser usada após a Onda 0.

### 3. Refatoração estrutural antes das correções

Separaria o controller principal antes de corrigir as regras. Não recomendada: movimenta muito código enquanto os comportamentos incorretos ainda não estão protegidos por testes.

## Escala

- Prioridade: `P1` corrige risco imediato; `P2` corrige confiabilidade/manutenção.
- Esforço: `S` pequeno, `M` médio, `L` grande, `XL` extragrande.
- Cada item deve resultar em mudança focada, testes comportamentais, plano de rollback e nenhuma alteração lateral.

## Visão ordenada

| Ordem | ID | Item | Prioridade | Esforço | Dependências |
|---:|---|---|:---:|:---:|---|
| 0 | FRT-000 | Baseline de testes e diagnóstico repetível | P1 | M | — |
| 1 | FRT-001 | Autorização explícita das rotas mutáveis | P1 | M | FRT-000 |
| 2 | FRT-002 | Ownership nas mutações mobile | P1 | M | FRT-000 |
| 3 | FRT-003 | Contrato canônico de checklist Admin/PWA | P1 | L | FRT-000 |
| 4 | FRT-004 | Completude e versionamento do checklist | P1 | L | FRT-003 |
| 5 | FRT-005 | Máquina de estados do diário de bordo | P1 | L | FRT-000 |
| 6 | FRT-006 | Locação tenant-safe e sem sobreposição | P1 | L | FRT-000 |
| 7 | FRT-007 | Estado transacional de montagem de pneus | P1 | XL | FRT-000 |
| 8 | FRT-008 | Evidências mobile em armazenamento privado | P1 | L | FRT-002 |
| 9 | FRT-009 | Fonte canônica de hodômetro/horímetro | P1 | XL | FRT-000 |
| 10 | FRT-010 | Base temporal da primeira preventiva | P2 | M | FRT-009 |
| 11 | FRT-011 | Identificadores únicos e normalizados | P2 | M | FRT-000 |
| 12 | FRT-012 | Baixa de veículo com retenção histórica | P2 | M | FRT-001 |
| 13 | FRT-013 | Contrato único e reconciliação de abastecimento | P2 | L | FRT-002, FRT-009 |
| 14 | FRT-014 | Alertas de vencimentos legais | P2 | M | FRT-000 |
| 15 | FRT-015 | Remoção de N+1 no painel de pneus | P2 | M | FRT-007 |
| 16 | FRT-016 | Decomposição incremental do `VeiculoController` | P2 | XL | P1 concluídos |

## Onda 0 — Proteção para mudança

### FRT-000 — Baseline de testes e diagnóstico repetível

**Resultado esperado:** congelar o comportamento útil e tornar os dados inconsistentes mensuráveis antes de qualquer migration.

**Escopo:**

- criar suíte Admin de Frota e helpers de empresa, usuário, veículo e permissões;
- manter os 17 testes mobile existentes como baseline;
- transformar os diagnósticos de locações duplicadas, diários abertos e checklists invisíveis em comando/consulta somente leitura;
- registrar contagens antes/depois de cada saneamento.

**Critérios de aceite:**

- suíte roda isoladamente e no pipeline;
- nenhum teste depende de dados locais preexistentes;
- diagnóstico informa IDs afetados por empresa, sem alterar registros;
- baseline atual continua verde: 17 testes e 67 asserções mobile.

## Onda 1 — Segurança e fronteiras de acesso

### FRT-001 — Autorização explícita das rotas mutáveis

**Resultado esperado:** nenhuma requisição de escrita é autorizada como simples visualização.

**Escopo:** mapear todas as rotas POST/PUT/PATCH/DELETE de Frota para habilidade/policy explícita; remover o fallback inseguro por nome de método; validar ações como pneus, preventivas, obsolescência, duplicação e depreciação.

**Critérios de aceite:**

- perfil com apenas `view` recebe 403 em todas as rotas mutáveis;
- perfis com a habilidade correta mantêm o fluxo atual;
- matriz automatizada cobre cada rota mutável de Frota;
- tentativa negada não altera banco nem arquivos.

### FRT-002 — Ownership nas mutações mobile

**Resultado esperado:** operador mobile só altera registros próprios e gestores só o fazem por permissão explícita.

**Escopo:** policies de abastecimento, diário e checklist; regra de empresa + autor + estado/janela de edição; auditoria para exceções gerenciais.

**Critérios de aceite:**

- editar/excluir registro de outro usuário retorna 403, mesmo na mesma empresa;
- recurso de outra empresa continua invisível;
- autor pode editar apenas dentro da regra definida e enquanto o estado permitir;
- exceção gerencial registra ator, horário e valores alterados.

### FRT-008 — Evidências mobile em armazenamento privado

**Resultado esperado:** fotos e comprovantes só são acessíveis por endpoint autenticado e autorizado.

**Escopo:** novo armazenamento privado, download/visualização tenant-scoped, migração segura das referências públicas e política de retenção.

**Critérios de aceite:**

- URL pública antiga não expõe novo upload;
- usuário sem acesso recebe 403/404 sem revelar existência;
- arquivos legados são migrados ou mantidos sob compatibilidade temporária documentada;
- exclusão e retenção respeitam auditoria e soft delete.

## Onda 2 — Integridade operacional

### FRT-003 — Contrato canônico de checklist Admin/PWA

**Resultado esperado:** o mesmo checklist aparece com os mesmos dados nos dois canais.

**Escopo:** definir data canônica, estrutura de respostas e status; adaptar leitura/gravação; criar detalhe Admin; backfill idempotente do legado.

**Critérios de aceite:**

- checklist criado na PWA aparece imediatamente no Admin;
- detalhe Admin mostra todas as respostas e evidências;
- filtros usam a data canônica;
- backfill possui dry-run, é reexecutável e inclui o registro local hoje invisível;
- API mantém compatibilidade de leitura durante uma janela de transição.

### FRT-004 — Completude e versionamento do checklist

**Resultado esperado:** inspeção não pode omitir, duplicar ou inventar itens.

**Escopo:** validar pertencimento, unicidade e conjunto completo; versionar template; salvar snapshot do texto/criticidade aplicável à execução.

**Critérios de aceite:**

- item alheio ao template retorna 422;
- item duplicado ou obrigatório ausente retorna 422;
- alteração futura do template não muda uma execução histórica;
- itens críticos reprovados geram o estado/encaminhamento operacional definido.

### FRT-005 — Máquina de estados do diário de bordo

**Resultado esperado:** um motorista possui no máximo um ciclo ativo, com vocabulário único.

**Escopo:** escolher status canônico (`ABERTO`/`FECHADO`), migrar `ENCERRADO`, impedir transições inválidas e serializar abertura/fechamento.

**Critérios de aceite:**

- Admin e PWA usam os mesmos estados;
- abertura concorrente resulta em somente um ciclo ativo;
- diário fechado não volta a aberto sem fluxo excepcional auditado;
- os registros duplicados existentes são saneados por regra documentada;
- cálculo de duração e medição permanece consistente.

### FRT-006 — Locação tenant-safe e sem sobreposição

**Resultado esperado:** veículo possui no máximo uma locação ativa válida e todas as FKs pertencem à mesma empresa.

**Escopo:** validação tenant-scoped, coerência entre datas, serviço transacional de alocar/transferir/encerrar e proteção estrutural de estado ativo.

**Critérios de aceite:**

- veículo, obra ou funcionário de outra empresa retornam 422/404;
- início, previsão e encerramento respeitam ordem temporal;
- duas alocações concorrentes não ficam ativas;
- as 3 duplicidades locais são saneadas com relatório antes da constraint;
- transferência preserva histórico completo.

### FRT-007 — Estado transacional de montagem de pneus

**Resultado esperado:** um pneu ocupa no máximo uma posição e uma posição recebe no máximo um pneu.

**Escopo:** fonte explícita do estado atual, ledger imutável de eventos, máquina de estados e operações transacionais com locks para montar, desmontar, rodiziar e trocar.

**Critérios de aceite:**

- pneu desmontado ou de outro veículo não pode ser rodiziado;
- corridas de montagem não duplicam pneu nem posição;
- cada mudança gera evento com origem, destino, medição, ator e data;
- rollback deixa estado atual e ledger coerentes;
- CPK/CPH preserva os resultados históricos esperados.

### FRT-009 — Fonte canônica de hodômetro/horímetro

**Resultado esperado:** manutenção, consumo, pneus e depreciação usam a mesma medição válida.

**Escopo:** serviço central de leitura/gravação, ordenação por data do evento, monotonicidade e fluxos explícitos para correção, troca/reset e lançamento retroativo.

**Critérios de aceite:**

- valor final nunca é menor que o inicial sem evento excepcional válido;
- Admin e mobile aplicam as mesmas regras;
- preventiva, consumo, CPK e depreciação retornam a mesma medição de referência;
- lançamento retroativo recalcula somente agregados definidos;
- toda correção mantém valor anterior e justificativa.

## Onda 3 — Confiabilidade e conformidade

### FRT-010 — Base temporal da primeira preventiva

**Critérios de aceite:** a primeira previsão por tempo parte de data configurada e auditável — aquisição, início de operação ou plano — mesmo sem OS anterior; cenários de data ausente têm fallback explícito e teste.

### FRT-011 — Identificadores únicos e normalizados

**Critérios de aceite:** placa, chassi, RENAVAM, prefixo e número de fogo são normalizados; duplicidades existentes são relatadas/saneadas antes dos índices; unicidade respeita o escopo empresarial definido.

### FRT-012 — Baixa de veículo com retenção histórica

**Critérios de aceite:** baixa/venda não apaga evidências; exclusão física é ação separada, privilegiada e auditada; relacionamentos históricos permanecem consultáveis.

### FRT-013 — Contrato único e reconciliação de abastecimento

**Critérios de aceite:** Admin e PWA usam os mesmos campos e combustível; quantidade × preço unitário reconcilia com total dentro de tolerância definida; divergências exigem justificativa; consumo usa medição canônica.

### FRT-014 — Alertas de vencimentos legais

**Critérios de aceite:** IPVA, seguro, tacógrafo e documentos geram alertas idempotentes nas janelas configuradas; timezone e virada do dia são testados; nenhum alerta duplica destinatário/evento.

### FRT-015 — Remoção de N+1 no painel de pneus

**Critérios de aceite:** movimentos, CPK e medição são carregados em lote; quantidade de queries é limitada por teste; paginação mantém os mesmos valores e filtros.

### FRT-016 — Decomposição incremental do `VeiculoController`

**Resultado esperado:** separar domínios sem reescrever o módulo.

**Ordem sugerida:** `MeterReading`, `Allocation`, `Tire`, `Maintenance`, `Fueling`, `DocumentCompliance` e, por fim, `VehicleLifecycle`.

**Critérios de aceite:**

- cada extração preserva rotas e contratos externos;
- regras ficam em serviços/actions testáveis, controllers apenas orquestram;
- uma extração por mudança revisável;
- nenhuma abstração é criada antes de existir uma regra compartilhada comprovada.

## Dependências e gates de implantação

1. Nenhuma constraint entra antes do diagnóstico e saneamento correspondente.
2. Migrations de dados precisam de dry-run, execução idempotente e contagem antes/depois.
3. Alteração de contrato Admin/PWA exige compatibilidade temporária ou implantação coordenada.
4. Mudanças concorrentes em diário, locação e pneus exigem teste com duas transações reais.
5. Onda seguinte só começa quando a suíte da onda anterior estiver verde em ambiente semelhante ao de produção.

## Definição de pronto global

- critérios de aceite automatizados nos níveis unitário, feature e integração adequados;
- tenancy, autorização, concorrência e rollback testados;
- logs sem dados sensíveis e trilha de auditoria presente nas exceções;
- migrations testadas sobre cópia representativa e com rollback operacional documentado;
- contratos e estados documentados;
- zero regressão nos 17 testes mobile existentes;
- revisão de código separada por item ou por pacote pequeno e coeso.

## Primeiro pacote recomendado

Executar `FRT-000`, `FRT-001` e `FRT-002` como primeiro marco. Esse pacote cria a rede de segurança e fecha as duas fronteiras de autorização sem depender de migrations destrutivas. Depois, seguir com `FRT-003` a `FRT-006`, sempre saneando dados antes de constraints.
