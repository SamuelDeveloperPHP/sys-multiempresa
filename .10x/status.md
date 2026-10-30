# Status

## 2026-10-28 — Estoque P1

- Correção implementada para cadastro, entrada e transferência de EPI/EPC/uniformes.
- Acesso por Almoxarife validado com permissão de Movimentações.
- Regressão automatizada aprovada: 4 testes, 18 asserções.
- Build de produção aprovado.
- Registros de teste mantidos conforme solicitado.

## 2026-10-29 — Revisão de Frota

- Revisão Senior Engineer e especialista de operações concluída.
- Nenhum P0; nove grupos P1 e oito grupos P2 documentados.
- Diagnóstico local confirmou sobreposição de locações, ciclos abertos duplicados e checklist invisível ao Admin.
- 17 testes mobile / 67 asserções aprovados; cobertura Admin de Frota permanece pendente.
- Correções funcionais ainda não iniciadas.

## 2026-10-29 — Backlog de correções de Frota

- Backlog técnico priorizado em quatro ondas e 17 itens (`FRT-000` a `FRT-016`).
- Estratégia recomendada: risco primeiro, começando por testes, autorização e ownership mobile.
- Dependências, critérios de aceite, gates de dados e definição de pronto documentados.
- Estado: pronto para refinamento/execução; nenhuma correção funcional iniciada.

## 2026-10-29 — FRT-000 concluído

- Suíte-base Admin de Frota criada com helpers reutilizáveis de tenancy e permissões.
- Comando `frota:diagnosticar-integridade` entregue em modo somente leitura, com filtro por empresa, JSON e falha opcional para CI.
- Banco local diagnosticado: 3 veículos com locações ativas duplicadas, 1 checklist invisível e 0 motoristas com diários abertos duplicados.
- Validação completa: 61 testes e 203 asserções; nenhuma regressão.
- Próximo item: `FRT-001` — autorização explícita das rotas mutáveis.

## 2026-10-29 — FRT-001 concluído

- As 92 rotas mutáveis de Frota agora exigem habilidade de escrita.
- Ações customizadas declaram `moduleAbility()` na própria rota.
- O fallback global de mutações deixou de retornar `view`.
- Perfil somente leitura validado com 403 e ausência de mutação; perfil editor validado com sucesso.
- Suíte completa: 64 testes e 349 asserções; cache de rotas aprovado.
- Próximo item: `FRT-002` — ownership nas mutações mobile.

## 2026-10-30 — FRT-002 concluído

- Abastecimentos, diários de bordo e checklists mobile agora exigem autoria para update/delete.
- Administrador ou gestor sem permissão explícita recebe 403; exceção exige `can_edit`/`can_delete` do módulo.
- Toda exceção gerencial autorizada registra ator e snapshots anterior/posterior em `audit_logs`.
- Recursos de outra empresa permanecem invisíveis e tentativas negadas não alteram nem auditam registros.
- Suíte completa: 70 testes e 388 asserções; nenhuma migration ou mudança de dados necessária.
- Próximo item: `FRT-003` — contrato canônico de checklist Admin/PWA.

## 2026-10-30 — FRT-003 concluído

- Admin e PWA agora compartilham data, status e representação canônicos para as execuções de checklist.
- Leitura e gravação compatíveis preservam clientes e dados legados durante a transição.
- A ficha Admin exibe respostas, evidências e conformidade; o binding vazio da rota foi corrigido.
- Backfill local idempotente normalizou 3.912 execuções e reduziu checklists invisíveis de 1 para zero, sem excluir respostas.
- Suíte completa: 73 testes e 448 asserções; build e teste visual no navegador aprovados.
- Próximo item: `FRT-004` — completude e versionamento do checklist.

## 2026-10-30 — FRT-004 concluído

- API rejeita itens alheios, repetidos e obrigatórios ausentes no cadastro e na edição.
- Versão e snapshot preservam o modelo, o texto e as regras históricas de cada execução.
- Obrigatoriedade e criticidade são configuráveis no Admin; reprovação crítica gera encaminhamento sem bloqueio automático do veículo.
- As 3.912 execuções foram versionadas de forma idempotente, preservando 85.212 respostas legadas e o JSON existente.
- Suíte completa com 81 testes e 480 asserções, build e teste visual no navegador aprovados.
- Próximo item: `FRT-005` — máquina de estados do diário de bordo.

