# Handoff

## Estado atual

A correção P1 do estoque está concluída. O detalhe da movimentação #28 abre sem 403, a transferência preserva lote e variante, a validade de entrada é persistida e produtos controlados aceitam valores de referência vazios.

## Verificação recomendada

Executar `php artisan test tests/Feature/Estoque/EstoqueP1RegressionTest.php` após qualquer alteração nos controllers, nas rotas ou no middleware de permissões do estoque.

## Observação

O repositório contém diversas alterações anteriores não relacionadas. Os commits desta correção devem incluir somente os arquivos explicitamente selecionados para o P1.

