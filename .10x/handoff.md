# Handoff

## Estado atual

O `FRT-000` e o `FRT-001` estão concluídos. A rede de testes, o diagnóstico repetível e a autorização explícita das rotas mutáveis estão disponíveis. O plano atualizado está em `.10x/decisions/senior-engineer/frota-correcoes-backlog.md`.

## Próxima implementação recomendada

1. `FRT-002`: impor ownership nos updates/deletes mobile.
2. Só então iniciar contratos e dados (`FRT-003` a `FRT-009`).

## Arquivos críticos

- `app/Http/Middleware/ModuleAccess.php`
- `app/Providers/AppServiceProvider.php`
- `routes/web.php`
- `app/Http/Controllers/Mobile/Api/MobileApiController.php`
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

## Verificação obrigatória

Manter os 17 testes mobile e a nova suíte Admin. Executar `php artisan frota:diagnosticar-integridade --json` antes/depois de qualquer saneamento. Em CI, usar `--fail-on-issues` quando a invariante correspondente já estiver corrigida.

## Histórico

- 2026-10-28: correção P1 do estoque concluída e validada.
- 2026-10-29: revisão sênior de Frota concluída, com 9 grupos P1 e 8 P2.
- 2026-10-29: `FRT-000` concluído; 61 testes e 203 asserções aprovados.
- 2026-10-29: `FRT-001` concluído; 92 rotas mutáveis protegidas e 64 testes aprovados.

