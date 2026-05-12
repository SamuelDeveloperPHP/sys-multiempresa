-- =====================================================================
-- ETL: engeativos (banco antigo) -> sys-multiempresa (banco novo)
-- =====================================================================
-- Premissas:
--   * Banco antigo:   `engeativos`        (MySQL no mesmo servidor WAMP)
--   * Banco novo:     `sys_multiempresa`  (criar previamente, ja com migrations rodadas)
--   * Existe ao menos UMA empresa cadastrada no novo banco (companies)
--     antes de rodar este ETL. Substitua @company_id pelo ID correto.
--
-- IMPORTANTE: Antes de rodar
--   1. Fazer backup completo do banco antigo:
--      mysqldump -u root engeativos > backup_engeativos.sql
--   2. Confirmar que migrations do sys-multiempresa rodaram (todas as tabelas existem).
--   3. Ajustar @company_id abaixo para a empresa-alvo do sys-multiempresa.
--   4. Rodar este script com o banco sys_multiempresa selecionado:
--      mysql -u root sys_multiempresa < etl-engeativos-to-sys-multiempresa.sql
--
-- Este script eh IDEMPOTENTE para a maioria das tabelas (usa INSERT IGNORE
-- ou ON DUPLICATE KEY UPDATE). Pode ser rodado mais de uma vez sem duplicar.

SET @company_id := 1;             -- AJUSTE: id da empresa no novo banco
SET @origem := 'engeativos';      -- nome do schema antigo
SET FOREIGN_KEY_CHECKS = 0;       -- so durante a carga
SET UNIQUE_CHECKS = 0;

-- =====================================================================
-- 1. OBRAS
-- =====================================================================
-- Mapeamento:
--   engeativos.obras.id           -> sys_multiempresa.obras.id        (preserva PK)
--   engeativos.obras.codigo_obra  -> code + codigo_obra
--   engeativos.obras.id_empresa   -> id_empresa + company_id (forcado para @company_id)
--
-- ATENCAO: se o sys_multiempresa.obras ja tem outras obras (de outras
-- empresas), o INSERT IGNORE preserva-as. Caso contrario, considere TRUNCATE.

INSERT IGNORE INTO obras (
    id, company_id, id_empresa,
    nome_fantasia, razao_social, cnpj,
    code, codigo_obra,
    cep, endereco, numero, complemento, bairro, cidade, estado,
    email, celular, status,
    created_at, updated_at
)
SELECT
    o.id, @company_id, @company_id,
    NULLIF(TRIM(o.nome_fantasia), ''), NULLIF(TRIM(o.razao_social), ''), o.cnpj,
    o.codigo_obra, o.codigo_obra,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, 'Ativa',
    COALESCE(o.created_at, NOW()), COALESCE(o.updated_at, NOW())
FROM engeativos.obras o
WHERE o.deleted_at IS NULL;

-- =====================================================================
-- 2. FUNCIONARIOS (e tabelas dependentes)
-- =====================================================================

-- 2.1 Funcoes
INSERT IGNORE INTO funcao_funcionarios (id, company_id, funcao, created_at, updated_at)
SELECT f.id, @company_id, f.funcao, COALESCE(f.created_at, NOW()), COALESCE(f.updated_at, NOW())
FROM engeativos.funcao_funcionarios f
WHERE f.deleted_at IS NULL;

-- 2.2 Setores (se a tabela de origem existir)
-- Comentar se a tabela `setores` nao existir no engeativos
/*
INSERT IGNORE INTO funcionario_setores (id, company_id, nome, created_at, updated_at)
SELECT s.id, @company_id, s.nome, COALESCE(s.created_at, NOW()), COALESCE(s.updated_at, NOW())
FROM engeativos.setores s;
*/

-- 2.3 Funcionarios
INSERT IGNORE INTO funcionarios (
    id, company_id, id_obra, id_funcao, id_setor,
    nome, matricula, cpf, status, imagem_usuario,
    created_at, updated_at
)
SELECT
    f.id, @company_id, f.id_obra, f.id_funcao, NULL,
    f.nome, f.matricula, f.cpf,
    COALESCE(f.status, 'Ativo'), f.imagem_usuario,
    COALESCE(f.created_at, NOW()), COALESCE(f.updated_at, NOW())
FROM engeativos.funcionarios f
WHERE f.deleted_at IS NULL;

-- =====================================================================
-- 3. USERS (vincula a empresa + obras)
-- =====================================================================
-- Os users ja devem existir no novo banco (vindos do Breeze).
-- Aqui apenas vinculamos os users ANTIGOS a empresa @company_id e suas obras.
-- ATENCAO: este passo presume que os ids de users foram preservados.
--          Se houver conflito, ajustar manualmente.

-- 3.1 Vincular users a empresa
INSERT IGNORE INTO company_user (user_id, company_id, role, created_at, updated_at)
SELECT u.id, @company_id, 'member', NOW(), NOW()
FROM engeativos.users u
WHERE u.deleted_at IS NULL;

-- 3.2 Vincular users a obras (via CadastroUsuariosVinculo)
INSERT IGNORE INTO obra_user (user_id, obra_id, role, created_at, updated_at)
SELECT DISTINCT v.id_usuario, v.id_obra, 'member', NOW(), NOW()
FROM engeativos.cadastro_usuarios_vinculo v
WHERE v.id_usuario IS NOT NULL AND v.id_obra IS NOT NULL;

-- 3.3 Vincular users a funcionario (1:1 quando aplicavel)
INSERT IGNORE INTO user_funcionario (user_id, funcionario_id, company_id)
SELECT DISTINCT v.id_usuario, v.id_funcionario, @company_id
FROM engeativos.cadastro_usuarios_vinculo v
WHERE v.id_funcionario IS NOT NULL;

-- =====================================================================
-- 4. VEICULOS + estrutura
-- =====================================================================

-- 4.1 Tipos
INSERT IGNORE INTO tipos_veiculos (id, company_id, nome, created_at, updated_at)
SELECT t.id, @company_id, t.nome, COALESCE(t.created_at, NOW()), COALESCE(t.updated_at, NOW())
FROM engeativos.tipos_veiculos t;

-- 4.2 Veiculos
INSERT IGNORE INTO veiculos (
    id, company_id, obra_id,
    prefixo, tipo, placa, modelo, marca, ano, imagem,
    tipo_km, tipo_hr, sync_status, data_sincronizacao,
    created_at, updated_at
)
SELECT
    v.id, @company_id, v.obra_id,
    v.prefixo, v.tipo, v.placa, v.modelo, v.marca, v.ano, v.imagem,
    COALESCE(v.tipo_km, 0), COALESCE(v.tipo_hr, 0),
    1, NOW(),
    COALESCE(v.created_at, NOW()), COALESCE(v.updated_at, NOW())
FROM engeativos.veiculos v
WHERE v.deleted_at IS NULL;

-- 4.3 Locacoes
INSERT IGNORE INTO veiculos_locacaos (
    id, company_id, id_obra, veiculo_id, id_obraDestino,
    id_funcionario, id_funcionario_destino, tipo_veiculo,
    data_inicio, data_prevista, data_fim,
    sync_status, data_sincronizacao, created_at, updated_at
)
SELECT
    l.id, @company_id, l.id_obra, l.veiculo_id, l.id_obraDestino,
    l.id_funcionario, l.id_funcionario_destino, l.tipo_veiculo,
    l.data_inicio, l.data_prevista, l.data_fim,
    1, NOW(), COALESCE(l.created_at, NOW()), COALESCE(l.updated_at, NOW())
FROM engeativos.veiculos_locacaos l
WHERE l.deleted_at IS NULL;

-- 4.4 Checklists
INSERT IGNORE INTO veiculo_checklist (
    id, company_id, id_veiculo, nome_checklist, situacao,
    user_create, user_edit, sync_status, data_sincronizacao,
    created_at, updated_at, deleted_at
)
SELECT c.id, @company_id, c.id_veiculo, c.nome_checklist, COALESCE(c.situacao, 'Ativo'),
       c.user_create, c.user_edit, 1, NOW(),
       COALESCE(c.created_at, NOW()), COALESCE(c.updated_at, NOW()), c.deleted_at
FROM engeativos.veiculo_checklist c;

INSERT IGNORE INTO veiculo_checklist_itens (
    id, company_id, id_checklist, id_veiculo, nome_servico,
    periodo_maq_vei, alerta_venci, tipo_itens, periodo_dias, alert_venc_dias,
    user_create, user_edit, situacao,
    sync_status, data_sincronizacao, created_at, updated_at, deleted_at
)
SELECT i.id, @company_id, i.id_checklist, i.id_veiculo, i.nome_servico,
       i.periodo_maq_vei, i.alerta_venci, i.tipo_itens, i.periodo_dias, i.alert_venc_dias,
       i.user_create, i.user_edit, COALESCE(i.situacao, 'Ativo'),
       1, NOW(), COALESCE(i.created_at, NOW()), COALESCE(i.updated_at, NOW()), i.deleted_at
FROM engeativos.veiculo_checklist_itens i;

-- 4.5 Checklist execucao (servicos + realizados)
INSERT IGNORE INTO veiculo_checklist_itens_servicos (
    id, company_id, id_obra, id_veiculo, id_checklist,
    id_local, status, status_ciclo, tipo_checklist,
    id_abertura_vinculada, data_fechamento, anomalia_offline,
    foto_extra_1, desc_extra_1, foto_extra_2, desc_extra_2,
    foto_extra_3, desc_extra_3, foto_extra_4, desc_extra_4,
    data_cadastro, user_create, user_edit, id_horimetro, id_quilometragem,
    sync_status, data_sincronizacao, created_at, updated_at, deleted_at
)
SELECT s.id, @company_id, s.id_obra, s.id_veiculo, s.id_checklist,
       s.id_local, s.status, s.status_ciclo, s.tipo_checklist,
       s.id_abertura_vinculada, s.data_fechamento, COALESCE(s.anomalia_offline, 0),
       s.foto_extra_1, s.desc_extra_1, s.foto_extra_2, s.desc_extra_2,
       s.foto_extra_3, s.desc_extra_3, s.foto_extra_4, s.desc_extra_4,
       s.data_cadastro, s.user_create, s.user_edit, s.id_horimetro, s.id_quilometragem,
       1, NOW(), COALESCE(s.created_at, NOW()), COALESCE(s.updated_at, NOW()), s.deleted_at
FROM engeativos.veiculo_checklist_itens_servicos s;

INSERT IGNORE INTO veiculo_checklist_itens_realizados (
    id, company_id, id_obra, id_checklist, id_local,
    id_checklist_realizado, id_checklist_itens, id_veiculo,
    data_cadastro, status, arquivo_app, arquivo_servidor,
    user_create, horimetro_atual, horimetro_novo,
    quilometragem_atual, quilometragem_nova, observacao,
    sync_status, data_sincronizacao, created_at, updated_at, deleted_at
)
SELECT r.id, @company_id, r.id_obra, r.id_checklist, r.id_local,
       r.id_checklist_realizado, r.id_checklist_itens, r.id_veiculo,
       r.data_cadastro, r.status, r.arquivo_app, r.arquivo_servidor,
       r.user_create, r.horimetro_atual, r.horimetro_novo,
       r.quilometragem_atual, r.quilometragem_nova, r.observacao,
       1, NOW(), COALESCE(r.created_at, NOW()), COALESCE(r.updated_at, NOW()), r.deleted_at
FROM engeativos.veiculo_checklist_itens_realizados r;

-- 4.6 Operacao do dia: horimetro, quilometragem, abastecimento, diario
INSERT IGNORE INTO veiculo_horimetro (
    id, company_id, id_local, veiculo_id, id_funcionario, id_obra,
    user_create, user_edit, horimetro_atual, horimetro_novo,
    data_horimetro, sync_status, data_sincronizacao, created_at, updated_at
)
SELECT h.id, @company_id, h.id_local, h.veiculo_id, h.id_funcionario, h.id_obra,
       h.user_create, h.user_edit, h.horimetro_atual, h.horimetro_novo,
       h.data_horimetro, 1, NOW(), COALESCE(h.created_at, NOW()), COALESCE(h.updated_at, NOW())
FROM engeativos.veiculo_horimetro h;

INSERT IGNORE INTO veiculo_quilometragems (
    id, company_id, id_local, veiculo_id, id_funcionario, id_obra,
    user_create, quilometragem_atual, quilometragem_nova,
    data_quilometragem, sync_status, data_sincronizacao, created_at, updated_at
)
SELECT q.id, @company_id, q.id_local, q.veiculo_id, q.id_funcionario, q.id_obra,
       q.user_create, q.quilometragem_atual, q.quilometragem_nova,
       q.data_quilometragem, 1, NOW(), COALESCE(q.created_at, NOW()), COALESCE(q.updated_at, NOW())
FROM engeativos.veiculo_quilometragems q;

INSERT IGNORE INTO veiculo_abastecimentos (
    id, company_id, id_local, veiculo_id, id_obra, id_funcionario,
    user_create, user_edit, data_abastecimento,
    km_anterior, km_atual, hr_anterior, hr_atual,
    fornecedor, combustivel, tipo,
    quantidade, valor_do_litro, valor_total,
    arquivo_app, arquivo_servidor,
    sync_status, data_sincronizacao, created_at, updated_at
)
SELECT a.id, @company_id, a.id_local, a.veiculo_id, a.id_obra, a.id_funcionario,
       a.user_create, a.user_edit, a.data_abastecimento,
       a.km_anterior, a.km_atual, a.hr_anterior, a.hr_atual,
       a.fornecedor, a.combustivel, a.tipo,
       a.quantidade, a.valor_do_litro, a.valor_total,
       a.arquivo_app, a.arquivo_servidor,
       1, NOW(), COALESCE(a.created_at, NOW()), COALESCE(a.updated_at, NOW())
FROM engeativos.veiculo_abastecimentos a;

INSERT IGNORE INTO veiculos_diario_bordo (
    id, company_id, id_local, ciclo_status, horas_trabalhadas_minutos,
    descricao_encerramento, id_obra, id_veiculo, id_user,
    user_create, user_edit, data_cadastro,
    horario_inicial, hr_anterior, km_anterior,
    horario_final, hr_atual, km_atual,
    descricao_atividade, arquivo_app, arquivo_servidor,
    sync_status, data_sincronizacao, created_at, updated_at, deleted_at
)
SELECT d.id, @company_id, d.id_local, COALESCE(d.ciclo_status, 'ABERTO'),
       COALESCE(d.horas_trabalhadas_minutos, 0),
       d.descricao_encerramento, d.id_obra, d.id_veiculo, d.id_user,
       d.user_create, d.user_edit, d.data_cadastro,
       d.horario_inicial, d.hr_anterior, d.km_anterior,
       d.horario_final, d.hr_atual, d.km_atual,
       d.descricao_atividade, d.arquivo_app, d.arquivo_servidor,
       1, NOW(), COALESCE(d.created_at, NOW()), COALESCE(d.updated_at, NOW()), d.deleted_at
FROM engeativos.veiculos_diario_bordo d;

-- 4.7 Preventivas
INSERT IGNORE INTO veiculo_preventivas (
    id, company_id, id_veiculo,
    nome_preventiva, nome_servico, tipo_veiculo, situacao,
    periodo, tipo, alerta_venci,
    user_create, user_edit, sync_status, data_sincronizacao,
    created_at, updated_at, deleted_at
)
SELECT p.id, @company_id, p.id_veiculo,
       p.nome_preventiva, p.nome_servico, p.tipo_veiculo, COALESCE(p.situacao, 'Ativo'),
       p.periodo, p.tipo, p.alerta_venci,
       p.user_create, p.user_edit, 1, NOW(),
       COALESCE(p.created_at, NOW()), COALESCE(p.updated_at, NOW()), p.deleted_at
FROM engeativos.veiculo_preventivas p;

INSERT IGNORE INTO veiculo_preventivas_itens_realizadas (
    id, company_id, id_veiculo, fornecedor_id, id_obra,
    id_preventiva, id_motorista, tipo,
    nf_pecas, nf_mao_obra,
    valor_do_servico, valor_da_mao_obra, total_valor_servico,
    quilometragem_atual, quilometragem_nova, campo_calc_km,
    horimetro_atual, horimetro_proximo, campo_cal_hr,
    data_de_execucao, data_previsao_termino, data_conclusao, campo_cal_mes,
    data_de_vencimento, descricao, status_realizado,
    user_create, user_edit, sync_status, data_sincronizacao,
    created_at, updated_at, deleted_at
)
SELECT r.id, @company_id, r.id_veiculo, r.fornecedor_id, r.id_obra,
       r.id_preventiva, r.id_motorista, r.tipo,
       r.nf_pecas, r.nf_mao_obra,
       r.valor_do_servico, r.valor_da_mao_obra, r.total_valor_servico,
       r.quilometragem_atual, r.quilometragem_nova, r.campo_calc_km,
       r.horimetro_atual, r.horimetro_proximo, r.campo_cal_hr,
       r.data_de_execucao, r.data_previsao_termino, r.data_conclusao, r.campo_cal_mes,
       r.data_de_vencimento, r.descricao, r.status_realizado,
       r.user_create, r.user_edit, 1, NOW(),
       COALESCE(r.created_at, NOW()), COALESCE(r.updated_at, NOW()), r.deleted_at
FROM engeativos.veiculo_preventivas_itens_realizadas r;

-- =====================================================================
-- 5. CONCLUSAO
-- =====================================================================
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;

-- Contadores para conferencia
SELECT 'obras'                                AS tabela, COUNT(*) AS qtd FROM obras                                WHERE company_id = @company_id
UNION ALL SELECT 'funcionarios',                          COUNT(*)        FROM funcionarios                          WHERE company_id = @company_id
UNION ALL SELECT 'veiculos',                              COUNT(*)        FROM veiculos                              WHERE company_id = @company_id
UNION ALL SELECT 'veiculos_locacaos',                     COUNT(*)        FROM veiculos_locacaos                     WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_checklist',                     COUNT(*)        FROM veiculo_checklist                     WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_checklist_itens',               COUNT(*)        FROM veiculo_checklist_itens               WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_checklist_itens_servicos',      COUNT(*)        FROM veiculo_checklist_itens_servicos      WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_checklist_itens_realizados',    COUNT(*)        FROM veiculo_checklist_itens_realizados    WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_horimetro',                     COUNT(*)        FROM veiculo_horimetro                     WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_quilometragems',                COUNT(*)        FROM veiculo_quilometragems                WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_abastecimentos',                COUNT(*)        FROM veiculo_abastecimentos                WHERE company_id = @company_id
UNION ALL SELECT 'veiculos_diario_bordo',                 COUNT(*)        FROM veiculos_diario_bordo                 WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_preventivas',                   COUNT(*)        FROM veiculo_preventivas                   WHERE company_id = @company_id
UNION ALL SELECT 'veiculo_preventivas_itens_realizadas',  COUNT(*)        FROM veiculo_preventivas_itens_realizadas  WHERE company_id = @company_id;
