# Decisões do Senior Engineer

- [Correção P1 — movimentações de estoque controlado](estoque-p1-regression.md) — 2026-10-28
- [Revisão sênior — Gestão de veículos e frotas](frota-gestao-veiculos-review.md) — 2026-10-29 — correções pendentes
- [Backlog sênior — Correções dos módulos de Frota](frota-correcoes-backlog.md) — 2026-10-30 — `FRT-000` a `FRT-003` concluídos; `FRT-004` próximo

## Princípios transversais

- Rotas mutáveis devem declarar autorização de escrita explicitamente; nomes de métodos não são fronteira de segurança.
- Estado operacional atual deve ter invariantes estruturais; ledgers são histórico, não substituto de constraints.
- Admin e PWA devem compartilhar contratos canônicos de status, data e representação dos registros.
- Constraints operacionais só entram após diagnóstico e saneamento idempotente dos dados legados.

