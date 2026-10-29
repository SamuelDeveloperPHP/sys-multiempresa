# Correção P1 — movimentações de estoque controlado

Data: 2026-10-28
Status: implementada e validada

## Contexto

Os fluxos de EPI, EPC e uniformes apresentavam perda de validade na entrada, falha ao criar produtos controlados com campos numéricos vazios, transferência sem preservar lote/variante e resposta 403 ao abrir o detalhe gerado.

## Decisão

- Normalizar `valor_unitario` e `estoque_minimo` vazios para zero no servidor.
- Serializar o carrinho de entrada no instante do envio para não depender do ciclo assíncrono do React.
- Exigir lote na transferência de itens controlados, travar o lote de origem durante a transação e copiar seus metadados para o lote de destino.
- Definir explicitamente o parâmetro `{movimentacao}` no resource para alinhar o route-model binding ao controller.
- Mapear Entrada, Saída e Transferência para a permissão funcional de Movimentações, permitindo operação por Almoxarife sem conceder acesso administrativo global.

## Evidências

- `EstoqueP1RegressionTest`: 4 testes, 18 asserções aprovadas.
- Build Vite de produção aprovado.
- PHP lint e `git diff --check` aprovados.
- Navegador confirmou a movimentação #28 e seu vínculo com a #29.

