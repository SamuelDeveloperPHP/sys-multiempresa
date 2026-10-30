# Handoff

## Estado atual

`FRT-000` a `FRT-004` estão concluídos. Checklists agora possuem contrato canônico, validação de completude, versão e snapshot histórico, com obrigatoriedade/criticidade explícitas e saneamento local idempotente. O plano atualizado está em `.10x/decisions/senior-engineer/frota-correcoes-backlog.md`.

## Próxima implementação recomendada

1. `FRT-005`: consolidar a máquina de estados e a concorrência do diário de bordo.
2. Em seguida, corrigir locações sobrepostas (`FRT-006`) e o estado transacional de pneus (`FRT-007`).

## Arquivos críticos

- `app/Http/Middleware/ModuleAccess.php`
- `app/Providers/AppServiceProvider.php`
- `routes/web.php`
- `app/Http/Controllers/Mobile/Api/MobileApiController.php`
- `app/Policies/Frota/Concerns/AuthorizesMobileOwnership.php`
- `app/Policies/Frota/VeiculoAbastecimentoPolicy.php`
- `app/Policies/Frota/VeiculoDiarioBordoPolicy.php`
- `app/Policies/Frota/VeiculoChecklistServicoPolicy.php`
- `app/Http/Controllers/Admin/Frota/VeiculoController.php`
- `app/Http/Controllers/Admin/Frota/VeiculoLocacaoController.php`
- `app/Http/Controllers/Admin/Frota/VeiculoChecklistServicoController.php`
- `app/Services/Frota/ChecklistExecutionContract.php`
- `app/Services/Frota/NormalizarContratoChecklist.php`
- `app/Services/Frota/ChecklistSubmission.php`
- `app/Services/Frota/VersionarChecklistsLegados.php`
- `app/Console/Commands/NormalizarContratoChecklistFrota.php`
- `app/Console/Commands/VersionarChecklistsFrota.php`
- `resources/js/Pages/Admin/Frota/ChecklistExecucoes/Show.jsx`
- `app/Services/Frota/CicloAbertoService.php`
- `app/Services/Frota/DiagnosticoIntegridadeFrota.php`
- `app/Console/Commands/DiagnosticarIntegridadeFrota.php`
- `app/Http/Requests/Mobile/*Checklist*`
- `app/Http/Requests/Mobile/*Diario*`
- `tests/Feature/Frota/AdminFrotaTestCase.php`
- `tests/Feature/Frota/ModuleAccessAuthorizationTest.php`
- `tests/Feature/Frota/ChecklistExecutionContractTest.php`
- `tests/Feature/Mobile/MobileOwnershipAuthorizationTest.php`

## Verificação obrigatória

Manter os testes mobile e a suíte Admin. Ao alterar policies, preservar a diferença entre autoria e permissão explícita e a auditoria de overrides. Executar `php artisan frota:diagnosticar-integridade --json` antes/depois de qualquer saneamento. Para checklists, usar `frota:normalizar-checklists` e `frota:versionar-checklists` como dry-run antes de `--execute`. Não inferir criticidade de `tipo_itens`: esse campo representa `km/hr`. Em CI, usar `--fail-on-issues` quando a invariante correspondente já estiver corrigida.

## Histórico

- 2026-10-28: correção P1 do estoque concluída e validada.
- 2026-10-29: revisão sênior de Frota concluída, com 9 grupos P1 e 8 P2.
- 2026-10-29: `FRT-000` concluído; 61 testes e 203 asserções aprovados.
- 2026-10-29: `FRT-001` concluído; 92 rotas mutáveis protegidas e 64 testes aprovados.
- 2026-10-30: `FRT-002` concluído; ownership mobile e exceção gerencial auditada, com 70 testes aprovados.
- 2026-10-30: `FRT-003` concluído; contrato canônico de checklist, backfill idempotente e ficha Admin, com 73 testes aprovados.
- 2026-10-30: `FRT-004` concluído; completude, snapshot, criticidade e versionamento histórico dos checklists.

