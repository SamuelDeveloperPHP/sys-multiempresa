# Backlog de engenharia, segurança e operação da frota

**Base de decisão** — 21/11/2026, revisão local da versão `e3082d2`. O objetivo é liberar um piloto multiempresa com dados reais, preservar o histórico operacional e dar à equipe evidências para decidir sobre a expansão. Os responsáveis abaixo são papéis propostos. As prioridades representam ordem de entrega.

A revisão anterior executou 81 testes e 480 verificações com SQLite. O ambiente implantado, seus logs, backups e banco ainda precisam de verificação própria. O [backlog de frota de outubro](../.10x/decisions/senior-engineer/frota-correcoes-backlog.md) registra FRT-000 a FRT-004 como concluídos. Preservar esses testes e reutilizar os tickets FRT seguintes. As contagens históricas de inconsistências devem ser recalculadas na base de homologação.

## P0 · Proteger contas e credenciais

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| SEC-01 · Backend e Segurança | Restringir a administração de usuários à empresa e ao alcance do administrador. Cobrir listagem, detalhe, criação, edição, exclusão, ativação e concessão de perfis. Hoje o cadastro aceita perfil global e a edição substitui vínculos. | Em uma base com duas empresas e uma conta compartilhada, o administrador local só consulta e altera o que lhe compete. Os vínculos da outra empresa sobrevivem à edição. Somente o papel autorizado concede perfil global. Negativas preservam dados e permissões. |
| SEC-02 · Backend e Operações | Retirar senhas, confirmações e conteúdo integral de requisições dos registros de erro do cadastro e edição. Verificar acesso e retenção dos logs existentes com o responsável pelo ambiente. | Falhas simuladas com dados fictícios registram identificador do evento e causa útil, sem os valores sensíveis no log ou no retorno. Operações documenta o período verificado e, se houver exposição, trata as contas afetadas sem copiar credenciais para o chamado. |

**Evidência no código** — [administração de usuários](../app/Http/Controllers/Admin/UserController.php) e [autorização por módulo](../app/Http/Middleware/ModuleAccess.php). Os dois itens podem começar juntos.

## P1 · Fechar as fronteiras de acesso

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| SEC-03 · Backend | Aplicar a autorização editorial às quatro ações de imagens. Validar vínculo com a publicação e a empresa antes de alterar arquivos ou banco. | Perfil de leitura recebe negativa nas quatro ações. Editor autorizado altera apenas publicações permitidas. Negativas preservam arquivo, ordem e capa. |
| SEC-04 · Segurança, Mobile e Operações | Inventariar entradas realmente habilitadas no ambiente do piloto, incluindo web, portal, PWA, APIs, filas e arquivos. Revisar exposição de fotos, evidências, documentos e dados mantidos no aparelho. Reutilizar FRT-008 para evidências mobile. | Matriz registra dado, canal, empresa, obra, papel, acesso público intencional e responsável. Dados privados exigem autorização também no download. Trocar empresa ou usuário em aparelho compartilhado não revela os dados da sessão anterior. O teste contempla pendências offline. |
| SEC-05 · Engenharia de plataforma | Incluir revisão de dependências PHP e JavaScript, proteção de segredos e permissões de implantação no processo de entrega. | Cada versão identifica dependências travadas, achados aplicáveis, responsável e decisão de tratamento. Credenciais ficam fora do artefato público. O acesso de implantação e sua revogação são verificados em homologação. |

**Evidência no projeto** — [rotas editoriais](../routes/web.php), [imagens de publicações](../app/Http/Controllers/Admin/Post/PostImageController.php), [registro das rotas da aplicação](../bootstrap/app.php) e [armazenamento offline](../resources/js/offline/db.js). A presença de um arquivo de rotas no repositório, por si só, não comprova exposição em produção.

## P1 · Proteger transações de estoque e locação

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| EST-01 · Backend e Almoxarifado | Usar a mesma regra de saldo devolvível na aprovação normal e na rápida. Para devolução vinculada, conferir empresa, saída, produto, obra, quantidade e lote ou variante aplicável. Validar o vínculo e creditar dentro de uma transação com bloqueio da origem. | Em uma retirada de 10 unidades com 7 já devolvidas, aprovar mais 3 é válido. Duas solicitações simultâneas de 3 creditam, juntas, no máximo 3. Reenvio não duplica crédito. Devolução sem origem segue regra homologada separadamente. |
| EST-02 · Backend, Dados e Almoxarifado | Preservar a variante do saldo na abertura, contagem e ajuste do inventário. Identificar inventários antigos cuja variante não pode ser reconstruída com segurança. | Duas variantes do mesmo produto, com saldos 6 e 4 e contagem 6 e 3, geram uma saída de 1 na segunda variante. Produto sem variante continua funcionando. Inventário legado ambíguo aparece para conciliação antes do fechamento. |
| EST-03 · Backend e QA | Serializar contagem, fechamento e cancelamento do mesmo inventário. Reler o estado dentro da transação. Integrar com EST-02 antes da liberação. | Com conexões independentes no banco de homologação, dois fechamentos geram um único conjunto de ajustes. Cancelamento concorrente resulta em um único estado final. Um erro durante a gravação deixa saldo e inventário consistentes. |
| FRT-006 · Backend e Gestor de frota | Retomar o ticket existente de locações. Validar referências empresariais, ordem das datas e conflito de períodos por ativo, inclusive prorrogação e edição. | Duas reservas incompatíveis para um ativo não são confirmadas juntas. Veículo, obras e responsáveis pertencem ao contexto autorizado. O gestor homologa o limite entre devolução e nova retirada. Diagnóstico lista conflitos históricos antes de aplicar restrições. |

**Evidência no código** — [devoluções](../app/Http/Controllers/Admin/Estoque/DevolucaoController.php), [inventário](../app/Http/Controllers/Admin/Estoque/InventarioController.php), [atualização dos saldos](../app/Observers/EstoqueMovimentacaoObserver.php) e [locações](../app/Http/Controllers/Admin/Frota/VeiculoLocacaoController.php).

## P1 · Consolidar arquitetura e regras de frota

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| ARQ-01 · Líder técnico e donos dos fluxos | Mapear uma operação de ponta a ponta para veículo leve, caminhão e máquina de linha amarela. Registrar telas, API, tabelas, regras, exceções e responsável. Usar exemplos da versão efetivamente operada, incluindo locação e medição já existentes. | Cada fluxo do piloto tem exemplo aprovado, evidência de execução e classificação em existente, defeituoso ou lacuna confirmada. Operação explica uma medição concluída a partir do contrato, das leituras e das paradas. Divergência entre versão local e implantada ganha identificação própria. |
| ARQ-02 · Backend | Manter o monólito Laravel e extrair a regra por operação ao corrigir o fluxo. Começar por devolução e locação. O painel e os demais canais habilitados devem usar a mesma validação de domínio e a mesma transação. | Para a operação migrada, duas entradas suportadas produzem o mesmo resultado e aplicam a mesma autorização de negócio. Respostas existentes continuam compatíveis. A mudança é entregue com teste antes de passar ao próximo controlador. Depende do mapeamento do respectivo fluxo em ARQ-01. |
| MOB-01 · Mobile, Backend e QA | Verificar a fila offline e tornar previsíveis reenvio, troca de sessão e conflitos de edição. Retomar FRT-005 para o ciclo do diário e FRT-009 para leituras de medidor. | Em aparelho de teste, registrar sem sinal, fechar o app e sincronizar após reconexão gera um único evento com autor, empresa e hora da operação. Leitura atrasada preserva o histórico. Divergência que exige intervenção fica visível ao operador, com possibilidade de recuperação. |
| FRO-01 · Produto, Frota e QA | Homologar regras que dependem de decisão operacional. Incluir troca de horímetro, ativo parado, manutenção simultânea, passagem de obra e arredondamento da cobrança. | Em um contrato anonimizado, operação e financeiro assinam os resultados esperados. Dois serviços executados no mesmo dia produzem o desconto previsto pelo contrato. Correções ganham tickets apenas quando o comportamento observado divergir da regra aceita. Depende de ARQ-01. |

**Pontos de partida** — [regras dos checklists](../app/Services/Frota/ChecklistSubmission.php), [fila de sincronização](../resources/js/offline/syncQueue.js), [dias de manutenção na locação](../app/Models/Frota/VeiculoLocacao.php) e [diagnóstico de integridade](../app/Services/Frota/DiagnosticoIntegridadeFrota.php).

## P1 · Homologar e operar com evidências

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| QA-01 · QA e Plataforma | Preparar ambiente isolado, com o mesmo mecanismo e versão principal de banco do piloto. Automatizar suíte PHP, build web, testes de autorização com duas empresas e cenários de concorrência. | Uma execução identificada pelo commit produz resultado repetível, incluindo duas conexões reais para disputas de estoque e locação. Dados e integrações de homologação estão isolados. A equipe consegue distinguir falha do produto de falha do ambiente. |
| OPS-01 · Operações e Dados | Ensaiar publicação, migração, restauração do banco e recuperação dos arquivos de evidência. Definir com a operação o tempo de recuperação aceitável e a perda máxima tolerada. | Restaurar cópia em ambiente isolado, abrir anexos e conciliar saldos, locações e registros de campo. Anotar tempos medidos, ponto de recuperação e decisão para retomar ou interromper o piloto. |
| OPS-02 · Operações e Suporte | Monitorar erros de gravação, idade das filas, falhas de sincronização e duração dos fechamentos. Definir quem recebe cada alerta e o que fazer. | Uma falha simulada gera alerta com responsável e referência rastreável sem conteúdo sensível. Suporte consegue distinguir serviço atrasado, envio pendente no aparelho e evento rejeitado pelo servidor. |

## P2 · Escalar após o piloto

| ID e responsável | Entrega | Critério de aceite |
|---|---|---|
| ENG-01 · Backend e Dados | Medir o tempo de resposta e a quantidade de consultas nos painéis mais usados. Retomar FRT-015 para pneus e FRT-016 para decomposição gradual do controlador, conforme os resultados. | Comparação antes e depois com o mesmo volume e filtros, incluindo uma empresa pequena e outra de maior volume. A equipe de campo valida o tempo-alvo; testes preservam os totais e a visibilidade por empresa. |
| PROD-01 · Produto e Gestor de frota | Ordenar FRT-007 e FRT-010 a FRT-014 pela frequência, impacto e incidência no piloto. Priorizar antes da expansão qualquer defeito que afete segurança operacional ou dados reais. | Cada item selecionado tem ocorrência ou necessidade demonstrada, responsável e indicador verificável, por exemplo leituras divergentes por 100 apontamentos ou preventivas sem data-base. |

## Ordem de execução e decisão de liberação

1. **Começar agora.** Backend assume SEC-01 e SEC-02. QA prepara QA-01. Produto e o encarregado executam ARQ-01 sobre uma locação concluída. São frentes independentes.
2. **Corrigir e homologar por fluxo.** Entregar SEC-03 e avaliar os canais em SEC-04. Usar QA-01 para demonstrar FRT-006 e as correções de estoque. Rodar o diagnóstico antes e depois das mudanças. Dados legados ambíguos exigem decisão do responsável antes de saneamento.
3. **Liberar por escopo.** Para qualquer piloto com dados reais, exigir P0 aceitos, autorização dos canais acessíveis verificada, recuperação ensaiada e suporte identificado. Se estoque estiver acessível, exigir EST-01 a EST-03. Se locação ou PWA integrarem o piloto, exigir os cenários correspondentes de FRT-006, MOB-01 e FRO-01. Uma função adiada precisa estar efetivamente inacessível no servidor para o público do piloto.
4. **Expandir com reconciliação.** Começar por uma empresa e uma obra. Comparar o primeiro período completo com o controle da operação. Registrar divergências, incidentes, tempo de fechamento e decisão dos responsáveis antes de incluir a próxima empresa.

**Conclusão de cada ticket** exige comportamento demonstrado, teste repetível quando couber, confirmação do responsável e referência à versão avaliada. Mudanças de dados também exigem contagem antes e depois e caminho de recuperação. Datas e estimativas dependem da capacidade da equipe e do diagnóstico dos dados legados.

## Execução da primeira rodada · 21/11/2026

| Item | Evidência local | Pendente para o piloto |
|---|---|---|
| SEC-01 | Cadastro, edição, exclusão, ativação e consulta de contas respeitam empresa, papel e permissões delegáveis. Alterações de conta e vínculos são transacionais. Conta compartilhada admite edição de permissões da empresa atual e preserva identidade e demais vínculos. [Testes de gestão de usuários](../tests/Feature/Admin/UserManagementTest.php) | Homologar a matriz com os administradores. A gestão global fica com o superadministrador. |
| SEC-02 | Erro de gravação registra identificadores e classe da exceção. Validação preserva os erros de campo e descarta as senhas na sessão. Busca local encontrou três linhas de erros administrativos com campo de senha preenchido em 21 e 22/07/2026. A verificação contabilizou metadados. | O responsável pelo ambiente implantado verifica retenção, acesso, cópias e eventual reutilização de credenciais. Os resultados locais não determinam exposição em produção. |
| QA-01 | A suíte SQLite e o build do painel/PWA passaram. O [executor de MySQL](../scripts/test-mysql.ps1) cria uma instância descartável em porta local exclusiva, executa migrations e verifica autorização e [bloqueio entre duas conexões](../tests/Homologacao/ConcorrenciaMySqlTest.php). Foi usado MySQL 8.3.0, versão verificada na base local de referência. | Confirmar versão/configuração da implantação. Os testes de bloqueio comprovam contenção no banco. O aceite dos efeitos de duas requisições reais de negócio pertence a EST-03 e FRT-006. |
| ARQ-01 | Amostras fictícias selecionadas na base local e conciliadas com o caminho administrativo abaixo. | Operação e financeiro confirmam a convenção de dias e a medição comercial aceita. |

### Amostras de locação e rastreabilidade

O [formulário](../resources/js/Pages/Admin/Frota/Locacoes/Form.jsx) envia veículo, obras, responsáveis e datas ao [controlador de locações](../app/Http/Controllers/Admin/Frota/VeiculoLocacaoController.php), que valida e grava em `veiculos_locacaos`. A empresa vem do contexto do servidor. A edição preenche a data final. O histórico por veículo reúne as locações e usa o [modelo de locação](../app/Models/Frota/VeiculoLocacao.php) para apurar os dias de manutenção. O [histórico no painel](../resources/js/Pages/Admin/Frota/Locacoes/Show.jsx) calcula a duração pela diferença das datas. O [repositório móvel](../resources/js/offline/repositories/locacoesRepo.js) é o ponto de leitura correspondente no aparelho.

| Locação | Ativo | Período encerrado | Dias pela diferença de datas | Dias de manutenção apurados |
|---|---|---|---:|---:|
| 384 | Utilitário Renault Master, controle por km | 29/12/2025 a 15/01/2026 | 17 | 1 |
| 396 | Caminhão Atego, controle por km | 17/01/2026 a 10/02/2026 | 24 | 2 |
| 420 | Retroescavadeira JCB 3CX, controle por hora | 28/02 a 09/03/2026 | 9 | 0 |
| 430 | Munck com horímetro | 06 a 10/03/2026 | 4 | 0 |

Na locação 430, o veículo 24 saiu da obra 25 para a 26. O término previsto era 31/03. Os lançamentos nos dias 6, 7, 9 e 10 começam em 4.387 h e terminam em 4.388 h. A diferença observada é de **1 h**. Não foi localizada nessa consulta uma tarifa, uma medição assinada ou uma fatura vinculada que permita determinar o valor comercial aceito. A classificação comercial da operação continua em aberto.

**Regra para homologar com a operação.** Para a locação 430, o painel calcula quatro dias decorridos, enquanto o período ocupa cinco datas civis. A coluna “dias em obra” usa o dia atual mesmo nas locações encerradas. Confirmar se a coluna expressa tempo desde a mobilização ou permanência efetiva. Essa escolha afeta a interpretação do histórico e deve preceder qualquer alteração de cobrança.

### SEC-03 · Galeria de publicações

Envio, reordenação, escolha da capa e remoção de imagem exigem permissão de editar a publicação na empresa selecionada. Quando o submódulo de publicações está configurado, sua permissão prevalece sobre a do menu Blog, inclusive no formulário de edição. A capa e a ordem são atualizadas em transação. Uma imagem de outra publicação invalida a operação inteira.

Os [testes da galeria](../tests/Feature/Admin/PostGalleryAuthorizationTest.php) cobrem leitura com permissão de edição apenas no menu pai, edição autorizada, publicação de outra empresa e imagens de duas publicações da mesma empresa. Usam arquivos de teste isolados e verificam o resultado no banco e no disco. Para a implantação, conferir se os editores designados têm permissão de edição no submódulo de publicações da empresa.

### SEC-04 · Evidências e isolamento do aparelho · 23/11/2026

A consulta de leitura à base fictícia local `sys_engeativos` identificou MySQL 8.3.0. A tabela abaixo conta registros, inclusive os que podem ter sido desativados. A identificação de referências indica onde investigar. A existência do arquivo e a disponibilidade de uma URL no ambiente implantado exigem verificação separada.

| Origem | Registros | Empresa ausente | Referência encontrada |
|---|---:|---:|---|
| Abastecimentos | 633 | 3 | 310 com /storage/ em arquivo_servidor |
| Diários de bordo | 1.643 | 2 | 146 com /storage/ no anexo principal. Contagem exclui o campo de fechamento. |
| Execuções de checklist | 3.913 | 1 | 1 com foto_path no JSON de respostas |

| Canal e dado | Acesso e escopo observados no projeto | Responsável e aceite restante |
|---|---|---|
| PWA e download de fotos novas de abastecimento, diário e checklist | Armazenamento privado por empresa. Download exige sessão, empresa selecionada, permissão de visualizar o módulo e vínculo com a obra indicada no registro. O checklist também exige vínculo da foto com a execução. A autoria e o cargo não concedem acesso ao anexo. | Frota e Segurança homologam as concessões e os três tipos de download com seus perfis. |
| PWA em aparelho compartilhado e fila de envio | Partição por usuário e empresa, sessão offline com vencimento e verificação de contexto na sincronização da nova versão. Pendências anteriores sem atribuição ficam na base antiga. | Mobile e Operações identificam aparelhos com versões antigas, conciliam as filas na origem com o operador e verificam reconexão e encerramento de sessão no aparelho. Preservar pendências até confirmar recebimento. |
| Painel e portal do cliente | O painel usa sessão e permissões por módulo. O portal tem autenticação de cliente e desafio de segundo fator. | Segurança inventaria documentos por rota habilitada na implantação e verifica acesso de cliente, empresa e obra no download. |
| API do aplicativo anterior | Há rotas de sincronização com token no repositório. O registro dessas rotas não aparece no bootstrap inspecionado. O controlador antigo grava anexos no disco público. | Engenharia confirma a lista de rotas publicada e quais versões de aplicativo continuam em uso antes de habilitar esse canal. |
| Arquivos antigos e cópias públicas | Referências históricas podem continuar servidas diretamente pelo servidor de arquivos. | Dados e Operações conciliam empresa e obra, verificam conteúdo e cópias, ensaiam recuperação e migram com contagem e hash. O aceite exige acesso autorizado à cópia privada e indisponibilidade da URL pública anterior. |

**Verificação repetível.** O [executor MySQL](../scripts/test-mysql.ps1) cria uma instância isolada no projeto e executa as migrations. Nesta revisão passaram 61 testes com 439 verificações no MySQL 8.3.0. O [teste de comprovante](../tests/Homologacao/EvidenciaMobileMySqlTest.php) exercita gravação, leitura, reenvio, troca de empresa, acesso por colega e exclusão lógica. A suíte complementar SQLite passou com 89 testes e 555 verificações. O [teste no Chrome](../tests/pwa/isolamento-fila.mjs) grava uma pendência em cada uma de três combinações de usuário e empresa e confere o conteúdo ao retornar à primeira. O aceite de produção permanece aberto para a atualização de aparelhos antigos, sincronização ponta a ponta, regras por obra e migração dos anexos históricos.


### Concessões administrativas e sincronização offline · 23/11/2026

A permissão de negócio exige empresa, módulo ativo e ação concedida. A autoria serve à auditoria. Os perfis admin e super_admin exigem concessão para a operação. A gestão de concessões pelos formulários revisados exige perfil administrativo e acesso autorizado à rota. Antes de implantar, o responsável deve confirmar que a conta encarregada de gerir permissões possui vínculo com a empresa e concessão para gerir usuários.

Na PWA, o conjunto de permissões é armazenado na partição do usuário e da empresa. Sem conexão, o aplicativo consulta a última cópia recebida dentro da validade da sessão offline. Na reconexão, a PWA atualiza as concessões e o servidor verifica cada operação pendente. Revogar criação impede que uma nova pendência gere registro, inclusive quando o operador já cadastrou outros registros para o mesmo veículo. O teste de comprovante verifica também o vínculo explícito com a obra quando o registro tem obra informada.

Na base fictícia de referência havia cinco contas ativas. Uma conta de usuário e uma de motorista estavam sem qualquer ação concedida em módulo ativo. A consulta contou vínculos e permissões sem conceder acesso. O aceite da implantação inclui revisar esses casos com o administrador, verificar pendências em aparelho atualizado a partir da versão anterior e conferir o inventário de URLs históricas de anexos.

Os cadastros iniciais dos módulos e as migrações que acrescentam menus passaram a preservar as concessões. Em instalações novas, a equipe responsável deve provisionar explicitamente a primeira conta administrativa, sua empresa e a permissão de gestão de usuários. Em bases existentes, uma linha de permissão pode ter sido criada pelas rotinas antigas. Antes da liberação, o administrador deve reconciliar as concessões com sua matriz aprovada. Esta revisão preservou os valores existentes.
