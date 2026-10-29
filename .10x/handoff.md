# Handoff

## Estado atual

A revisão de Frota está concluída e documentada em `.10x/decisions/senior-engineer/frota-gestao-veiculos-review.md`. Não houve alteração funcional. O primeiro pacote recomendado é o hardening de autorização e integridade.

## Próxima implementação recomendada

1. Corrigir `ModuleAccess`/policies para rotas mutáveis personalizadas.
2. Impor ownership nos updates/deletes mobile.
3. Unificar o contrato de checklist Admin/PWA e os status do diário.
4. Sanear locações ativas duplicadas antes de criar a restrição estrutural.
5. Implementar máquinas de estado e locks para pneus, locações e ciclos.

## Arquivos críticos

- `app/Http/Middleware/ModuleAccess.php`
- `app/Http/Controllers/Mobile/Api/MobileApiController.php`
- `app/Http/Controllers/Admin/Frota/VeiculoController.php`
- `app/Http/Controllers/Admin/Frota/VeiculoLocacaoController.php`
- `app/Http/Controllers/Admin/Frota/VeiculoChecklistServicoController.php`
- `app/Services/Frota/CicloAbertoService.php`
- `app/Http/Requests/Mobile/*Checklist*`
- `app/Http/Requests/Mobile/*Diario*`

## Verificação obrigatória

Manter os 17 testes mobile atuais e adicionar testes Admin/concorrência/ownership antes de alterar dados ou constraints.

## Histórico

- 2026-10-28: correção P1 do estoque concluída e validada.

