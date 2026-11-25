# Backlog de Produção — Gestão de Pneus

**Projeto:** sys-multiempresa

**Escopo:** catálogo, estoque, montagem, desmontagem, troca, rodízio, inspeções, recapagem, consertos, sucateamento, CPK, indicadores e alertas.

**Situação atual:** núcleo transacional implementado e validado localmente; **ainda depende de homologação operacional e do ambiente final** para aprovação de produção.
**Revisão:** 24/11/2026

## 1. Objetivo de produção

Disponibilizar a gestão de pneus com integridade transacional, isolamento por empresa, rastreabilidade, alertas acionáveis e comportamento previsível quando dois ou mais usuários operarem o mesmo estoque ou veículo simultaneamente.

## 2. Capacidades já existentes

- Cadastro individual por número de fogo.
- Estados de estoque, montado, recapadora, conserto e sucata.
- Montagem, desmontagem, troca e rodízio por posição.
- Histórico de movimentações e inspeções.
- Registro de sulco e pressão.
- Layouts de eixos e mapa visual do veículo.
- Cálculo de custo total, rodado e CPK/CPH.
- Contadores de total, montados, estoque e sucata.
- Alerta semanal de sulco abaixo de 3 mm e classificação abaixo de 1,6 mm.
- Restrições de acesso por habilidade do módulo.
- Escopo de empresa nos modelos de pneus, movimentações e inspeções.

## 3. Critérios obrigatórios de liberação

O módulo só pode ser liberado quando todos os critérios abaixo estiverem atendidos:

- [x] Duas solicitações simultâneas não conseguem montar o mesmo pneu.
- [x] Duas solicitações simultâneas não conseguem ocupar a mesma posição.
- [x] A operação perdedora recebe resposta de conflito clara e não gera evento parcial.
- [x] Toda alteração de estado e seu evento de histórico são confirmados na mesma transação.
- [x] O banco possui restrições que preservam a integridade mesmo fora da interface.
- [x] Nenhum alerta mistura dados ou destinatários de empresas diferentes.
- [ ] Todas as transições de estado possuem testes em MySQL.
- [ ] Migrações passam em banco vazio e em cópia anonimizada de banco existente.
- [ ] Scheduler, e-mail e monitoramento dos alertas estão validados no ambiente final.
- [ ] Operação, suporte e responsável pela frota aprovam o roteiro de homologação.
- [ ] Não existem defeitos críticos ou altos abertos.

## 4. Backlog priorizado

### P0 — Bloqueadores de produção

| ID | Entrega | Descrição | Critérios de aceite | Estimativa | Dependências |
|---|---|---|---|---:|---|
| PNEU-001 | Estado canônico de montagem | Criar uma representação de montagem ativa, sem depender de reconstruir a posição apenas pelo histórico. Pode ser tabela `pneu_montagens_ativas` ou campos canônicos equivalentes. | Um pneu possui no máximo uma montagem ativa; veículo e posição possuem no máximo um pneu ativo; histórico continua imutável. | 3 d | — |
| PNEU-002 | Restrições únicas no MySQL | Adicionar unicidade para número de fogo por empresa, pneu ativo e posição ativa por empresa/veículo. Definir tratamento dos registros legados duplicados. | Inserção duplicada falha no banco; migration possui diagnóstico e não remove dados silenciosamente. | 2 d | PNEU-001 |
| PNEU-003 | Serviço transacional de movimentação | Centralizar montagem, desmontagem, troca e rodízio em um serviço de domínio. Usar transação, `lockForUpdate` e releitura das condições dentro da transação. | Estado, montagem ativa e ledger confirmam juntos; qualquer erro desfaz tudo. | 4 d | PNEU-001, PNEU-002 |
| PNEU-004 | Concorrência do estoque | Tratar tentativa simultânea de retirada do mesmo pneu. Retornar conflito funcional, sem erro genérico. | Em teste concorrente, uma operação vence, a outra recebe HTTP 409/erro equivalente; existe uma única montagem e um único evento válido. | 2 d | PNEU-003 |
| PNEU-005 | Concorrência por posição | Tratar duas montagens/trocas simultâneas para a mesma posição. | Apenas um pneu ocupa a posição; nenhuma movimentação órfã é criada. | 2 d | PNEU-003 |
| PNEU-006 | Máquina de estados | Definir transições válidas: estoque → montado; montado → estoque/conserto/recapadora; recapadora/conserto → estoque; qualquer estado permitido → sucata conforme regra. | Ações inválidas são rejeitadas no backend; interface reflete as mesmas regras; testes cobrem todas as transições. | 2 d | PNEU-003 |
| PNEU-007 | Validação de veículo e posição | Validar a posição contra o layout configurado e confirmar que o pneu está montado no veículo informado antes de rodízio, desmontagem ou troca. | Não é possível gravar posição inexistente, rodiziar pneu de estoque ou alterar pneu de outro veículo. | 2 d | PNEU-003 |
| PNEU-008 | Integridade de recapagem e sucata | Colocar evento e atualização de estado/vida na mesma transação e bloquear concorrência no pneu. | Duas recapagens simultâneas não criam a mesma vida nem perdem incremento; sucateamento é idempotente. | 2 d | PNEU-003, PNEU-006 |
| PNEU-009 | Exclusão segura | Impedir exclusão de pneu montado ou com histórico; substituir exclusão por inativação controlada quando aplicável. | Histórico nunca desaparece por exclusão do cadastro; usuário recebe orientação de correção. | 1 d | PNEU-006 |
| PNEU-010 | Isolamento dos alertas | Remover consolidação global. Processar cada empresa separadamente e usar destinatários pertencentes à empresa. | Um e-mail contém somente pneus da empresa destinatária; teste cria duas empresas e comprova isolamento. | 3 d | — |
| PNEU-011 | Proteção multiempresa nas ações | Validar pneu, veículo, fornecedor e destinatários no mesmo contexto empresarial, inclusive em IDs enviados manualmente. | Tentativas cruzadas retornam 403/404; nenhum registro é criado ou alterado. | 2 d | PNEU-003 |
| PNEU-012 | Testes MySQL de ciclo e concorrência | Criar suíte específica para montagem, troca, rodízio, desmontagem, recapagem, conserto, inspeção, sucata e corridas simultâneas. | Suíte roda em MySQL/InnoDB e comprova locks e restrições; não usar apenas SQLite para concorrência. | 4 d | PNEU-001 a PNEU-011 |
| PNEU-013 | Migração e reconciliação inicial | Criar diagnóstico de duplicidades, pneus montados mais de uma vez, posições repetidas, estados incompatíveis e eventos incompletos. | Dry-run gera relatório; aplicação exige confirmação; execução é idempotente e auditável. | 3 d | PNEU-001, PNEU-002 |

**Saída do P0:** módulo seguro para operação concorrente e isolado por empresa.

### P1 — Operação, alertas e indicadores necessários

| ID | Entrega | Descrição | Critérios de aceite | Estimativa | Dependências |
|---|---|---|---|---:|---|
| PNEU-014 | Inspeção contextual | Ao inspecionar, registrar automaticamente veículo, posição e medição atual da montagem ativa. | Histórico mostra onde e em qual medição a inspeção ocorreu; dados não dependem de digitação duplicada. | 2 d | PNEU-001 |
| PNEU-015 | Inspeção vencida ou ausente | Definir periodicidade configurável e alertar pneus sem inspeção ou com inspeção atrasada. | Painel e alerta distinguem “sem inspeção” de “inspeção vencida”. | 2 d | PNEU-014 |
| PNEU-016 | Pressão fora da faixa | Definir pressão recomendada por medida/eixo ou configuração do veículo e alertar desvios. | Faixa é configurável; não usar um limite único para todos os pneus. | 3 d | PNEU-014 |
| PNEU-017 | Estoque mínimo por medida | Permitir mínimo por empresa e medida, considerando apenas pneus disponíveis. | Painel e alerta mostram medida, saldo e mínimo; pneus montados não entram no saldo. | 2 d | PNEU-001 |
| PNEU-018 | Idade e DOT | Interpretar DOT, sinalizar pneus vencidos, próximos do limite ou com DOT inválido/ausente. | Regra é configurável e exibe data calculada e motivo do alerta. | 2 d | — |
| PNEU-019 | Limite de vidas/recapagens | Configurar máximo por tipo/medida e impedir nova recapagem além da política. | Backend bloqueia; painel mostra vida atual e limite. | 2 d | PNEU-006 |
| PNEU-020 | Central de alertas | Persistir alertas com empresa, tipo, severidade, objeto, abertura, reconhecimento e resolução. | Alertas não se repetem indefinidamente; usuário pode reconhecer; resolução automática é registrada. | 4 d | PNEU-010, PNEU-015 a PNEU-019 |
| PNEU-021 | Entrega e monitoramento de e-mail | Registrar sucesso/falha, destinatários, tentativas e último envio. Adicionar comando de teste por empresa. | Falha de e-mail fica visível; envio pode ser reprocessado sem duplicação indevida. | 2 d | PNEU-010, PNEU-020 |
| PNEU-022 | Painel operacional | Exibir críticos por sulco, pressão, inspeção, DOT, estoque mínimo e estado operacional. | Indicadores filtram por empresa e permitem abrir os registros que compõem cada total. | 4 d | PNEU-015 a PNEU-020 |
| PNEU-023 | Indicadores gerenciais | Entregar CPK/CPH por pneu, marca, medida, veículo e vida; custo de recapagem; taxa de sucateamento; rendimento por vida. | Fórmulas documentadas; filtros e exportação reproduzem os totais da tela. | 4 d | PNEU-003, PNEU-014 |
| PNEU-024 | Qualidade das medições | Detectar medição regressiva, ausência de medição e mudança indevida entre km e hora. | CPK não incorpora intervalos inválidos silenciosamente; divergência gera alerta de dados. | 2 d | PNEU-003 |
| PNEU-025 | Auditoria operacional | Registrar ator, empresa, antes/depois, veículo, posição, motivo e origem da ação. | Suporte consegue reconstruir quem fez cada alteração e quando. | 2 d | PNEU-003 |

**Saída do P1:** operação acompanhável, alertas acionáveis e indicadores confiáveis.

### P1 — Desempenho e robustez

| ID | Entrega | Descrição | Critérios de aceite | Estimativa | Dependências |
|---|---|---|---|---:|---|
| PNEU-026 | Eliminar N+1 da listagem | Evitar consultas por pneu para posição, movimentações, CPK e medição atual. Usar agregações/eager loading apropriados. | Limite de consultas automatizado; página com 20 pneus não cresce linearmente em consultas por item. | 3 d | PNEU-001 |
| PNEU-027 | Índices de consulta | Revisar índices para empresa/situação, montagem ativa, veículo/posição, alertas e últimas inspeções. | Plano de execução usa índices nas consultas críticas; medição antes/depois documentada. | 2 d | PNEU-001, PNEU-020 |
| PNEU-028 | Metas de desempenho | Definir volume de referência e metas de p95 para listagem, mapa do veículo e movimentações. | Teste com volume realista atende às metas acordadas sem timeout. | 2 d | PNEU-026, PNEU-027 |
| PNEU-029 | Idempotência de comandos | Adicionar chave idempotente nas ações críticas, principalmente se futuramente forem executadas pelo mobile/PWA. | Reenvio da mesma solicitação retorna o resultado original sem duplicar eventos. | 2 d | PNEU-003 |
| PNEU-030 | Tratamento de falhas | Padronizar mensagens de conflito, validação, indisponibilidade e falha inesperada. | Operador sabe atualizar a tela ou corrigir dados; logs preservam diagnóstico sem dados sensíveis. | 1 d | PNEU-003 |

### P1 — Operação de produção

| ID | Entrega | Descrição | Critérios de aceite | Estimativa | Dependências |
|---|---|---|---|---:|---|
| PNEU-031 | Scheduler e cron | Configurar `schedule:run` por minuto e validar compatibilidade de execução em segundo plano no servidor final. | Execução real registrada; alerta ocorre no horário de São Paulo; existe monitoramento de atraso. | 1 d | PNEU-010 |
| PNEU-032 | Configuração de e-mail | Validar remetente, SPF/DKIM, destinatários por empresa e ambiente de teste. | Mensagem chega sem expor empresas; falha gera evento operacional. | 1 d | PNEU-021 |
| PNEU-033 | Observabilidade | Criar métricas/logs para conflitos, falhas transacionais, alertas pendentes, duração dos painéis e erros do scheduler. | Painel ou consulta operacional permite detectar falhas sem aguardar reclamação. | 2 d | PNEU-003, PNEU-020 |
| PNEU-034 | Plano de reversão e recuperação | Documentar rollback de aplicação e migration, além de restauração validada conforme política de dados. | Ensaio em homologação comprova tempo e passos de recuperação. | 1 d | PNEU-013 |
| PNEU-035 | Runbook de suporte | Documentar resolução de pneu duplicado, posição ocupada, medição inválida, alerta não enviado e divergência de CPK. | Suporte executa cenários simulados sem intervenção do desenvolvedor. | 2 d | PNEU-013, PNEU-021, PNEU-024 |

### P2 — Evolução após estabilização

| ID | Entrega | Descrição | Critérios de aceite | Estimativa | Dependências |
|---|---|---|---|---:|---|
| PNEU-036 | QR Code/código de barras | Identificar o pneu em inspeções e movimentações por leitura. | Código resolve somente pneus da empresa atual e exige confirmação da ação. | 3 d | PNEU-003 |
| PNEU-037 | Operação mobile/offline | Permitir inspeções e movimentações no PWA com idempotência e resolução explícita de conflitos. | Reenvio não duplica; conflito de estoque/posição fica rejeitado e visível ao operador. | 5 d | PNEU-029 |
| PNEU-038 | Previsão de substituição | Projetar data/medição de troca a partir do desgaste histórico. | Modelo informa base, confiança e não substitui o limite operacional. | 4 d | PNEU-014, PNEU-023 |
| PNEU-039 | Comparativo de fornecedores | Comparar compra, recapagem, conserto, rendimento e custo por fornecedor. | Indicadores respeitam volume mínimo e filtros de empresa/período. | 3 d | PNEU-023 |
| PNEU-040 | Importação assistida | Importar estoque e histórico legado com validação, dry-run e relatório de rejeições. | Importação é idempotente e preserva rastreabilidade da origem. | 4 d | PNEU-013 |

## 5. Matriz mínima de testes

### Concorrência

- [ ] Dois usuários montam o mesmo pneu em veículos diferentes.
- [ ] Dois usuários montam pneus diferentes na mesma posição.
- [ ] Duas trocas simultâneas na mesma posição.
- [ ] Desmontagem concorrente com rodízio.
- [ ] Recapagem concorrente com sucateamento.
- [ ] Exclusão concorrente com montagem.
- [ ] Repetição da mesma requisição por timeout/reenvio.

### Ciclo de vida

- [ ] Compra/cadastro → estoque → montagem → rodízio → desmontagem.
- [ ] Desmontagem → conserto → estoque → nova montagem.
- [ ] Desmontagem → recapadora → recapagem → nova vida → estoque.
- [ ] Desmontagem → sucata e bloqueio definitivo de montagem.
- [ ] Troca registra corretamente saída e entrada na mesma medição.
- [ ] CPK soma compra, recapagens e consertos sem duplicação.
- [ ] CPK ignora e sinaliza intervalos inválidos.

### Multiempresa e permissões

- [ ] Usuário não acessa pneu, veículo ou inspeção de outra empresa.
- [ ] IDs manipulados não atravessam o escopo empresarial.
- [ ] Alertas e destinatários são isolados por empresa.
- [ ] Perfil de leitura não executa ações.
- [ ] Perfis de edição e exclusão respeitam as permissões administrativas.

### Alertas

- [ ] Sulco abaixo de alerta e abaixo do mínimo legal.
- [ ] Pressão baixa e alta conforme configuração.
- [ ] Inspeção vencida e pneu nunca inspecionado.
- [ ] DOT próximo do limite e vencido.
- [ ] Estoque mínimo por medida.
- [ ] Falha de e-mail, reprocessamento e não duplicação.
- [ ] Reconhecimento e resolução do alerta.

### Banco e migração

- [ ] Banco MySQL vazio.
- [ ] Banco existente sem pneus.
- [ ] Banco com histórico consistente.
- [ ] Banco com duplicidades e inconsistências conhecidas.
- [ ] Dry-run e aplicação idempotente.
- [ ] Reversão testada em homologação.

## 6. Roteiro de homologação operacional

1. Cadastrar pneus novos, recapados e com medidas diferentes.
2. Configurar layouts de veículos leves, caminhões e máquinas.
3. Executar montagem, rodízio, troca e desmontagem com dois operadores.
4. Inspecionar sulco e pressão, inclusive valores críticos.
5. Enviar pneu para conserto e recapadora e devolvê-lo ao estoque.
6. Sucatear uma carcaça e comprovar bloqueio de reutilização.
7. Conferir CPK/CPH manualmente com uma amostra conhecida.
8. Executar alertas em dry-run por empresa e validar destinatários.
9. Simular falha entre evento e atualização de estado e comprovar rollback.
10. Validar tempo de resposta com o volume esperado para 12 meses.

## 7. Plano sugerido de execução

Estimativas em dias ideais de engenharia, sem contar aprovações externas.

| Etapa | Escopo | Esforço aproximado | Resultado |
|---|---|---:|---|
| Sprint 1 | PNEU-001 a PNEU-009 | 15–18 d | Integridade e concorrência resolvidas |
| Sprint 2 | PNEU-010 a PNEU-013 | 9–11 d | Multiempresa, testes e reconciliação |
| Sprint 3 | PNEU-014 a PNEU-025 | 20–24 d | Alertas e indicadores operacionais |
| Sprint 4 | PNEU-026 a PNEU-035 | 12–15 d | Desempenho, observabilidade e operação |
| Go-live | Homologação, correções e liberação | 4–6 d | Produção controlada |

**Total estimado:** 60–74 dias ideais. Com dois profissionais trabalhando em paralelo e revisão dedicada, o calendário provável é de 6 a 8 semanas. O escopo mínimo de produção é P0 + PNEU-031 a PNEU-035; os demais itens P1 podem ser priorizados conforme a operação, sem remover os critérios obrigatórios de liberação.

## 8. Estratégia de liberação

1. Executar diagnóstico de dados em produção sem alterações.
2. Corrigir inconsistências aprovadas em janela controlada.
3. Aplicar migrations em homologação equivalente à produção.
4. Rodar suíte MySQL, testes concorrentes e roteiro operacional.
5. Publicar com o módulo de escrita inicialmente restrito ao grupo piloto.
6. Acompanhar conflitos, erros, scheduler e alertas por pelo menos dois ciclos operacionais.
7. Liberar aos demais usuários após aceite do responsável pela frota.

## 9. Decisão atual

**GO técnico condicionado para piloto/homologação multiusuário; NO-GO para liberação geral.**

Em 24/11/2026 foram implementados: montagem ativa canônica, unicidade no MySQL, transações e bloqueios nas operações, validação de layout/empresa, ciclo controlado de recapagem/conserto/sucata, exclusão segura, inspeção contextual e alertas isolados por empresa. A migração passou no MySQL local com quatro montagens legadas reconciliadas; a tentativa de duplicar uma posição foi rejeitada pelo banco com SQLSTATE 23000 e revertida. A suíte completa passou com 105 testes/626 asserções antes dos testes adicionais de ciclo e isolamento.

A liberação geral continua condicionada à suíte concorrente completa em MySQL/InnoDB, ensaio da migração em cópia anonimizada do banco final, validação real de e-mail/scheduler/monitoramento e aceite do roteiro por dois operadores e pelo responsável da frota.
