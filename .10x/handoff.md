# Handoff

## Estado atual

O primeiro marco de segurança (`FRT-000` a `FRT-002`) está concluído. A rede de testes, o diagnóstico repetível, a autorização explícita das rotas mutáveis e o ownership mobile estão disponíveis. O plano atualizado está em `.10x/decisions/senior-engineer/frota-correcoes-backlog.md`.

## Próxima implementação recomendada

1. `FRT-003`: unificar o contrato de checklist entre Admin e PWA.
2. Em seguida, completar/versionar checklists (`FRT-004`) e consolidar a máquina de estados do diário (`FRT-005`).

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
- `app/Services/Frota/CicloAbertoService.php`
- `app/Services/Frota/DiagnosticoIntegridadeFrota.php`
- `app/Console/Commands/DiagnosticarIntegridadeFrota.php`
- `app/Http/Requests/Mobile/*Checklist*`
- `app/Http/Requests/Mobile/*Diario*`
- `tests/Feature/Frota/AdminFrotaTestCase.php`
- `tests/Feature/Frota/ModuleAccessAuthorizationTest.php`
- `tests/Feature/Mobile/MobileOwnershipAuthorizationTest.php`

## Verificação obrigatória

Manter os 22 testes mobile e a suíte Admin. Ao alterar policies, preservar a diferença entre autoria e permissão explícita e a auditoria de overrides. Executar `php artisan frota:diagnosticar-integridade --json` antes/depois de qualquer saneamento. Em CI, usar `--fail-on-issues` quando a invariante correspondente já estiver corrigida.

## Histórico

- 2026-10-28: correção P1 do estoque concluída e validada.
- 2026-10-29: revisão sênior de Frota concluída, com 9 grupos P1 e 8 P2.
- 2026-10-29: `FRT-000` concluído; 61 testes e 203 asserções aprovados.
- 2026-10-29: `FRT-001` concluído; 92 rotas mutáveis protegidas e 64 testes aprovados.
- 2026-10-30: `FRT-002` concluído; ownership mobile e exceção gerencial auditada, com 70 testes aprovados.

