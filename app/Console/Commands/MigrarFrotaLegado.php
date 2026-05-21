<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Migra dados das tabelas Veiculo* do banco engeativos (legado)
 * para o banco atual (sys-multiempresa).
 *
 * Aplica mapeamento de schema (nomeCategoria → nome_categoria, etc),
 * adiciona company_id e converte tipos quando necessario.
 *
 * Uso:
 *   php artisan frota:migrar-legado            # tenta inserir, ignora duplicatas
 *   php artisan frota:migrar-legado --fresh    # truncate antes (recomendado em dev)
 *   php artisan frota:migrar-legado --only=veiculos,categorias
 */
class MigrarFrotaLegado extends Command
{
    protected $signature = 'frota:migrar-legado
                            {--fresh : Trunca cada tabela destino antes de inserir}
                            {--source=engeativos : Nome do schema MySQL origem}
                            {--company=1 : ID da empresa para os registros migrados}
                            {--only= : CSV de etapas (fornecedores,categorias,subcategorias,marcas,modelos,tipos,preventivas,veiculos,locacoes,imagens,abastecimentos,horimetros,quilometragens,diario,checklists,checklist_itens,checklist_execucoes,checklist_realizados,manutencoes,ipvas,seguros,docs_legais,docs_tecnicos,preventivas_itens,preventivas_realizadas)}';

    protected $description = 'Migra dados de Frota do banco engeativos (legado) para o sys-multiempresa';

    protected string $source;
    protected int $companyId;
    protected bool $fresh;
    protected array $only;

    public function handle(): int
    {
        $this->source    = $this->option('source');
        $this->companyId = (int) $this->option('company');
        $this->fresh     = (bool) $this->option('fresh');
        $only            = $this->option('only');
        $this->only      = $only ? array_map('trim', explode(',', $only)) : [];

        if (! $this->verificarOrigem()) {
            return self::FAILURE;
        }

        $this->info("ETL Frota: {$this->source} → " . config('database.connections.mysql.database'));
        $this->info("company_id destino: {$this->companyId}");
        if ($this->fresh) {
            $this->warn('Modo --fresh: tabelas destino serao TRUNCADAS antes do insert.');
        }
        $this->newLine();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            $this->etapa('fornecedores',       fn () => $this->migrarFornecedores());
            $this->etapa('categorias',           fn () => $this->migrarCategorias());
            $this->etapa('subcategorias',        fn () => $this->migrarSubcategorias());
            $this->etapa('marcas',               fn () => $this->migrarMarcas());
            $this->etapa('modelos',              fn () => $this->migrarModelos());
            $this->etapa('tipos',                fn () => $this->migrarTipos());
            $this->etapa('preventivas',          fn () => $this->migrarPreventivas());
            $this->etapa('veiculos',             fn () => $this->migrarVeiculos());
            $this->etapa('locacoes',             fn () => $this->migrarLocacoes());
            $this->etapa('imagens',              fn () => $this->migrarImagens());
            $this->etapa('abastecimentos',       fn () => $this->migrarAbastecimentos());
            $this->etapa('horimetros',           fn () => $this->migrarHorimetros());
            $this->etapa('quilometragens',       fn () => $this->migrarQuilometragens());
            $this->etapa('diario',               fn () => $this->migrarDiario());
            $this->etapa('checklists',           fn () => $this->migrarChecklists());
            $this->etapa('checklist_itens',      fn () => $this->migrarChecklistItens());
            $this->etapa('checklist_execucoes',  fn () => $this->migrarChecklistExecucoes());
            $this->etapa('checklist_realizados', fn () => $this->migrarChecklistRealizados());
            $this->etapa('manutencoes',        fn () => $this->migrarManutencoes());
            $this->etapa('ipvas',              fn () => $this->migrarIpvas());
            $this->etapa('seguros',            fn () => $this->migrarSeguros());
            $this->etapa('docs_legais',        fn () => $this->migrarDocsLegais());
            $this->etapa('docs_tecnicos',      fn () => $this->migrarDocsTecnicos());
            $this->etapa('preventivas_itens',  fn () => $this->migrarPreventivasItens());
            $this->etapa('preventivas_realizadas', fn () => $this->migrarPreventivasRealizadas());
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        $this->newLine();
        $this->info('ETL concluido.');
        return self::SUCCESS;
    }

    /* =========================================================
     * Migrações
     * ========================================================= */

    protected function migrarFornecedores(): int
    {
        $this->truncar('fornecedores');
        $linhas = DB::select("SELECT * FROM {$this->source}.fornecedores");

        $obrasValidas = DB::table('obras')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_obra'             => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'nome_fantasia'       => mb_substr((string) $r->nome_fantasia, 0, 191) ?: '(sem nome)',
                'razao_social'        => $r->razao_social ? mb_substr($r->razao_social, 0, 191) : null,
                'atividade_principal' => $r->atividade_principal ? mb_substr($r->atividade_principal, 0, 100) : null,
                'cnpj'                => $r->cnpj ? mb_substr($r->cnpj, 0, 20) : null,
                'cpf'                 => $r->cpf ? mb_substr($r->cpf, 0, 20) : null,
                'cep'                 => $r->cep ? mb_substr($r->cep, 0, 15) : null,
                'endereco'            => $r->endereco ? mb_substr($r->endereco, 0, 191) : null,
                'numero'              => $r->numero ? mb_substr($r->numero, 0, 20) : null,
                'bairro'              => $r->bairro ? mb_substr($r->bairro, 0, 100) : null,
                'cidade'              => $r->cidade ? mb_substr($r->cidade, 0, 100) : null,
                // Estado legado tem codigo numerico ("16") ou sigla — limita 2 chars
                'estado'              => $r->estado ? mb_substr($r->estado, 0, 2) : null,
                'email'               => $r->email ? mb_substr($r->email, 0, 191) : null,
                'celular'             => $r->celular ? mb_substr($r->celular, 0, 30) : null,
                'status'              => in_array($r->status, ['Ativo', 'Inativo'], true) ? $r->status : 'Ativo',
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('fornecedores', $batch);
    }

    protected function migrarCategorias(): int
    {
        $this->truncar('veiculo_categorias');
        $linhas = DB::select("SELECT id, nomeCategoria, statusCategoria, created_at, updated_at, deleted_at FROM {$this->source}.veiculos_categorias");

        $batch = [];
        foreach ($linhas as $r) {
            $batch[] = [
                'id'               => $r->id,
                'company_id'       => $this->companyId,
                'nome_categoria'   => $r->nomeCategoria ?? '(sem nome)',
                'status_categoria' => $r->statusCategoria ?: 'Ativo',
                'created_at'       => $r->created_at,
                'updated_at'       => $r->updated_at,
                'deleted_at'       => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_categorias', $batch);
    }

    protected function migrarSubcategorias(): int
    {
        $this->truncar('veiculo_subcategorias');
        $linhas = DB::select("SELECT id, id_categoria, nomeSubCategoria, statusSubCategoria, user_create, user_edit, created_at, updated_at, deleted_at FROM {$this->source}.veiculos_subcategorias");

        $catsValidas = DB::table('veiculo_categorias')->pluck('id')->flip();
        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($catsValidas[$r->id_categoria])) continue;
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_categoria'        => $r->id_categoria,
                'nome_subcategoria'   => $r->nomeSubCategoria ?? '(sem nome)',
                'status_subcategoria' => $r->statusSubCategoria ?: 'Ativo',
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_subcategorias', $batch);
    }

    protected function migrarMarcas(): int
    {
        $this->truncar('marca_maquinas');
        $linhas = DB::select("SELECT id, marca, created_at, updated_at FROM {$this->source}.marca_maquinas");

        $batch = array_map(fn ($r) => [
            'id'         => $r->id,
            'company_id' => $this->companyId,
            'marca'      => $r->marca,
            'created_at' => $r->created_at,
            'updated_at' => $r->updated_at,
        ], $linhas);

        return $this->insertBatch('marca_maquinas', $batch);
    }

    protected function migrarModelos(): int
    {
        $this->truncar('modelo_maquinas');
        $linhas = DB::select("SELECT id, modelo, created_at, updated_at FROM {$this->source}.modelo_maquinas");

        $batch = array_map(fn ($r) => [
            'id'         => $r->id,
            'company_id' => $this->companyId,
            'marca_id'   => null,
            'modelo'     => $r->modelo,
            'created_at' => $r->created_at,
            'updated_at' => $r->updated_at,
        ], $linhas);

        return $this->insertBatch('modelo_maquinas', $batch);
    }

    protected function migrarTipos(): int
    {
        $this->truncar('tipos_veiculos');
        $linhas = DB::select("SELECT id, nome_tipo_veiculo, tipo_veiculo, created_at, updated_at, deleted_at FROM {$this->source}.tipos_veiculos");

        $batch = array_map(fn ($r) => [
            'id'         => $r->id,
            'company_id' => $this->companyId,
            'nome'       => mb_substr($r->nome_tipo_veiculo, 0, 80),
            'codigo'     => mb_substr($r->tipo_veiculo, 0, 30),
            'created_at' => $r->created_at,
            'updated_at' => $r->updated_at,
            'deleted_at' => $r->deleted_at,
        ], $linhas);

        return $this->insertBatch('tipos_veiculos', $batch);
    }

    protected function migrarPreventivas(): int
    {
        $this->truncar('veiculo_preventivas');
        $linhas = DB::select("SELECT id, id_veiculo, nome_preventiva, nome_servico, tipo_veiculo, situacao, periodo, tipo, alerta_venci, user_create, user_edit, created_at, updated_at, deleted_at FROM {$this->source}.veiculo_preventivas");

        $batch = array_map(fn ($r) => [
            'id'                  => $r->id,
            'company_id'          => $this->companyId,
            'id_veiculo'          => null,
            'nome_preventiva'     => mb_substr((string) $r->nome_preventiva, 0, 191) ?: '(sem nome)',
            'nome_servico'        => $r->nome_servico ? mb_substr((string) $r->nome_servico, 0, 191) : null,
            'tipo_veiculo'        => $r->tipo_veiculo ? mb_substr((string) $r->tipo_veiculo, 0, 30) : null,
            'situacao'            => $r->situacao ? mb_substr((string) $r->situacao, 0, 30) : 'Ativo',
            'periodo'             => $this->intOrNull($r->periodo),
            'tipo'                => $r->tipo ? mb_substr((string) $r->tipo, 0, 30) : null,
            'alerta_venci'        => $this->intOrNull($r->alerta_venci),
            'user_create'         => $r->user_create,
            'user_edit'           => $r->user_edit,
            'sync_status'         => 0,
            'created_at'          => $r->created_at,
            'updated_at'          => $r->updated_at,
            'deleted_at'          => $r->deleted_at,
        ], $linhas);

        // 2a passada: ligar id_veiculo (depois que veiculos for migrado)
        $resultado = $this->insertBatch('veiculo_preventivas', $batch);

        return $resultado;
    }

    protected function migrarVeiculos(): int
    {
        $this->truncar('veiculos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculos");

        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $catsValidas     = DB::table('veiculo_categorias')->pluck('id')->flip();
        $subcatsValidas  = DB::table('veiculo_subcategorias')->pluck('id')->flip();
        $prevsValidas    = DB::table('veiculo_preventivas')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            $batch[] = [
                'id'                    => $r->id,
                'company_id'            => $this->companyId,
                'obra_id'               => isset($obrasValidas[$r->obra_id]) ? $r->obra_id : null,
                'id_categoria'          => isset($catsValidas[$r->idCategoria]) ? $r->idCategoria : null,
                'id_subcategoria'       => isset($subcatsValidas[$r->idSubCategoria]) ? $r->idSubCategoria : null,
                'id_preventiva'         => $r->id_preventiva && isset($prevsValidas[$r->id_preventiva]) ? $r->id_preventiva : null,
                'prefixo'               => mb_substr((string) $r->prefixo, 0, 60) ?: ('VEI-' . $r->id),
                'tipo'                  => $r->tipo ? mb_substr($r->tipo, 0, 30) : null,
                'placa'                 => $r->placa ? mb_substr($r->placa, 0, 12) : null,
                'modelo'                => $r->modelo ? mb_substr($r->modelo, 0, 120) : null,
                'marca'                 => $r->marca ? mb_substr($r->marca, 0, 120) : null,
                'ano'                   => $this->intOrNull($r->ano),
                'imagem'                => $r->imagem ? mb_substr($r->imagem, 0, 255) : null,
                'tipo_km'               => (bool) $r->tipo_km,
                'tipo_hr'               => (bool) $r->tipo_hr,
                'tipo_tempo'            => (bool) $r->tipo_tempo,
                'veiculo'               => $r->veiculo ? mb_substr($r->veiculo, 0, 191) : null,
                'valor_fipe'            => $this->decimalOrNull($r->valor_fipe),
                'valor_aquisicao'       => $this->decimalOrNull($r->valor_aquisicao),
                'valor_mercado'         => $this->decimalOrNull($r->valor_mercado),
                'codigo_fipe'           => $r->codigo_fipe ? mb_substr($r->codigo_fipe, 0, 30) : null,
                'fipe_mes_referencia'   => $r->fipe_mes_referencia ? mb_substr($r->fipe_mes_referencia, 0, 30) : null,
                'mes_aquisicao'         => $r->mes_aquisicao ? mb_substr($r->mes_aquisicao, 0, 30) : null,
                'nun_serie_chassi'      => $r->nun_serie_chassi ? mb_substr($r->nun_serie_chassi, 0, 60) : null,
                'renavam'               => $r->renavam ? mb_substr($r->renavam, 0, 30) : null,
                'horimetro_inicial'     => $this->intOrNull($r->horimetro_inicial),
                'quilometragem_inicial' => $this->intOrNull($r->quilometragem_inicial),
                'observacao'            => $r->observacao,
                'situacao'              => $r->situacao ? mb_substr($r->situacao, 0, 30) : 'Ativo',
                'user_create'           => $r->user_create,
                'user_edit'             => $r->user_edit,
                'sync_status'           => $r->sync_status ?? 0,
                'data_sincronizacao'    => $r->data_sincronizacao,
                'created_at'            => $r->created_at,
                'updated_at'            => $r->updated_at,
                'deleted_at'            => $r->deleted_at,
            ];
        }
        $inseridos = $this->insertBatch('veiculos', $batch);

        // Backfill id_veiculo nas preventivas
        DB::statement("UPDATE veiculo_preventivas vp JOIN {$this->source}.veiculo_preventivas src ON src.id = vp.id SET vp.id_veiculo = src.id_veiculo WHERE src.id_veiculo IS NOT NULL AND src.id_veiculo IN (SELECT id FROM veiculos)");

        return $inseridos;
    }

    protected function migrarLocacoes(): int
    {
        $this->truncar('veiculos_locacaos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculos_locacaos");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $funcsValidos    = DB::table('funcionarios')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                       => $r->id,
                'company_id'               => $this->companyId,
                'id_obra'                  => isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'veiculo_id'               => $r->veiculo_id,
                'id_obraDestino'           => isset($obrasValidas[$r->id_obraDestino]) ? $r->id_obraDestino : null,
                'id_funcionario'           => isset($funcsValidos[$r->id_funcionario]) ? $r->id_funcionario : null,
                'id_funcionario_destino'   => $r->id_funcionario_destino && isset($funcsValidos[$r->id_funcionario_destino]) ? $r->id_funcionario_destino : null,
                'tipo_veiculo'             => $r->tipo_veiculo,
                'data_inicio'              => $r->data_inicio,
                'data_prevista'            => $r->data_prevista,
                'data_fim'                 => $r->data_fim,
                'sync_status'              => $r->sync_status ?? 0,
                'data_sincronizacao'       => $r->data_sincronizacao,
                'created_at'               => $r->created_at,
                'updated_at'               => $r->updated_at,
                'deleted_at'               => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculos_locacaos', $batch);
    }

    protected function migrarImagens(): int
    {
        $this->truncar('veiculo_imagens');
        $linhas = DB::select("SELECT id, veiculo_id, imagens, descricao, created_at, updated_at, deleted_at FROM {$this->source}.veiculos_imagens");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!$r->veiculo_id || !isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'         => $r->id,
                'company_id' => $this->companyId,
                'veiculo_id' => $r->veiculo_id,
                'arquivo'    => $r->imagens ? mb_substr($r->imagens, 0, 500) : '',
                'descricao'  => $r->descricao ? mb_substr($r->descricao, 0, 191) : null,
                'ordem'      => 0,
                'created_at' => $r->created_at,
                'updated_at' => $r->updated_at,
                'deleted_at' => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_imagens', $batch);
    }

    protected function migrarAbastecimentos(): int
    {
        $this->truncar('veiculo_abastecimentos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_abastecimentos");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $funcsValidos    = DB::table('funcionarios')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!$r->veiculo_id || !isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_local'            => null,
                'veiculo_id'          => $r->veiculo_id,
                'id_obra'             => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'id_funcionario'      => $r->id_funcionario && isset($funcsValidos[$r->id_funcionario]) ? $r->id_funcionario : null,
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'data_abastecimento'  => $r->data_abastecimento,
                'km_anterior'         => $r->km_anterior,
                'km_atual'            => $r->km_atual,
                'hr_anterior'         => $r->hr_anterior,
                'hr_atual'            => $r->hr_atual,
                'fornecedor'          => $r->fornecedor ? mb_substr($r->fornecedor, 0, 191) : null,
                'combustivel'         => $r->combustivel ? mb_substr($r->combustivel, 0, 60) : null,
                'tipo'                => $r->tipo ? mb_substr($r->tipo, 0, 30) : null,
                'quantidade'          => $r->quantidade,
                'valor_do_litro'      => $r->valor_do_litro,
                'valor_total'         => $r->valor_total,
                'arquivo_app'         => $r->arquivo_app ? mb_substr($r->arquivo_app, 0, 255) : null,
                'arquivo_servidor'    => $r->arquivo_servidor,
                'sync_status'         => $r->sync_status ?? 0,
                'data_sincronizacao'  => $r->data_sincronizacao,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_abastecimentos', $batch);
    }

    protected function migrarHorimetros(): int
    {
        $this->truncar('veiculo_horimetro');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_horimetro");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $funcsValidos    = DB::table('funcionarios')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_local'            => null,
                'veiculo_id'          => $r->veiculo_id,
                'id_funcionario'      => $r->id_funcionario && isset($funcsValidos[$r->id_funcionario]) ? $r->id_funcionario : null,
                'id_obra'             => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'horimetro_atual'     => (int) $r->horimetro_atual,
                'horimetro_novo'      => (int) $r->horimetro_novo,
                'data_horimetro'      => $r->data_horimetro,
                'sync_status'         => $r->sync_status ?? 0,
                'data_sincronizacao'  => $r->data_sincronizacao,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
            ];
        }
        return $this->insertBatch('veiculo_horimetro', $batch);
    }

    protected function migrarQuilometragens(): int
    {
        $this->truncar('veiculo_quilometragems');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_quilometragems");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $funcsValidos    = DB::table('funcionarios')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                   => $r->id,
                'company_id'           => $this->companyId,
                'id_local'             => null,
                'veiculo_id'           => $r->veiculo_id,
                'id_funcionario'       => $r->id_funcionario && isset($funcsValidos[$r->id_funcionario]) ? $r->id_funcionario : null,
                'id_obra'              => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'user_create'          => $r->user_create,
                'user_edit'            => $r->user_edit,
                'quilometragem_atual'  => (int) $r->quilometragem_atual,
                'quilometragem_nova'   => (int) $r->quilometragem_nova,
                'data_quilometragem'   => $r->data_quilometragem,
                'sync_status'          => $r->sync_status ?? 0,
                'data_sincronizacao'   => $r->data_sincronizacao,
                'created_at'           => $r->created_at,
                'updated_at'           => $r->updated_at,
            ];
        }
        return $this->insertBatch('veiculo_quilometragems', $batch);
    }

    protected function migrarDiario(): int
    {
        $this->truncar('veiculos_diario_bordo');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculos_diario_bordo");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $usersValidos    = DB::table('users')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!$r->id_veiculo || !isset($veiculosValidos[$r->id_veiculo])) continue;
            $batch[] = [
                'id'                       => $r->id,
                'company_id'               => $this->companyId,
                'id_local'                 => null,
                'ciclo_status'             => $r->horario_final ? 'ENCERRADO' : 'ABERTO',
                'horas_trabalhadas_minutos'=> 0,
                'descricao_encerramento'   => null,
                'id_obra'                  => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'id_veiculo'               => $r->id_veiculo,
                'id_user'                  => $r->id_user && isset($usersValidos[$r->id_user]) ? $r->id_user : null,
                'user_create'              => $r->user_create,
                'user_edit'                => $r->user_edit,
                'data_cadastro'            => $r->data_cadastro,
                'horario_inicial'          => $this->datetimeOrNull($r->data_cadastro, $r->horario_inicial),
                'hr_anterior'              => $this->intOrNull($r->hr_anterior),
                'km_anterior'              => $this->intOrNull($r->km_anterior),
                'horario_final'            => $this->datetimeOrNull($r->data_cadastro, $r->horario_final),
                'hr_atual'                 => $this->intOrNull($r->hr_atual),
                'km_atual'                 => $this->intOrNull($r->km_atual),
                'descricao_atividade'      => $r->descricao_atividade,
                'arquivo_app'              => $r->arquivo_app ? mb_substr($r->arquivo_app, 0, 255) : null,
                'arquivo_servidor'         => $r->arquivo_servidor,
                'sync_status'              => $r->sync_status ?? 0,
                'data_sincronizacao'       => $r->data_sincronizacao,
                'created_at'               => $r->created_at,
                'updated_at'               => $r->updated_at,
                'deleted_at'               => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculos_diario_bordo', $batch);
    }

    protected function migrarChecklists(): int
    {
        $this->truncar('veiculo_checklist');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_checklist");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_veiculo'          => $r->id_veiculo && isset($veiculosValidos[$r->id_veiculo]) ? $r->id_veiculo : null,
                'nome_checklist'      => mb_substr((string) $r->nome_checklist, 0, 191) ?: '(sem nome)',
                'situacao'            => $r->situacao ? mb_substr((string) $r->situacao, 0, 30) : 'Ativo',
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'sync_status'         => $r->sync_status ?? 0,
                'data_sincronizacao'  => $r->data_sincronizacao,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_checklist', $batch);
    }

    protected function migrarChecklistItens(): int
    {
        $this->truncar('veiculo_checklist_itens');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_checklist_itens");

        $checksValidos   = DB::table('veiculo_checklist')->pluck('id')->flip();
        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($checksValidos[$r->id_checklist])) continue;
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_checklist'        => $r->id_checklist,
                'id_veiculo'          => $r->id_veiculo && isset($veiculosValidos[$r->id_veiculo]) ? $r->id_veiculo : null,
                'nome_servico'        => mb_substr((string) $r->nome_servico, 0, 191),
                'periodo_maq_vei'     => $r->periodo_maq_vei,
                'alerta_venci'        => $r->alerta_venci,
                'tipo_itens'          => $r->tipo_itens ? mb_substr($r->tipo_itens, 0, 30) : null,
                'periodo_dias'        => $r->periodo_dias,
                'alert_venc_dias'     => $r->alert_venc_dias,
                'user_create'         => $r->user_create ? mb_substr($r->user_create, 0, 191) : null,
                'user_edit'           => $r->user_edit ? mb_substr($r->user_edit, 0, 191) : null,
                'situacao'            => $r->situacao ?: 'Ativo',
                'sync_status'         => $r->sync_status ?? 0,
                'data_sincronizacao'  => $r->data_sincronizacao,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_checklist_itens', $batch);
    }

    protected function migrarChecklistExecucoes(): int
    {
        $this->truncar('veiculo_checklist_itens_servicos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_checklist_itens_servicos");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $checksValidos   = DB::table('veiculo_checklist')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            $idLocal = $r->id_local ? mb_substr($r->id_local, 0, 64) : ('legacy_' . $r->id);
            $batch[] = [
                'id'                  => $r->id,
                'company_id'          => $this->companyId,
                'id_obra'             => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'id_veiculo'          => $r->id_veiculo && isset($veiculosValidos[$r->id_veiculo]) ? $r->id_veiculo : null,
                'id_checklist'        => $r->id_checklist && isset($checksValidos[$r->id_checklist]) ? $r->id_checklist : null,
                'id_local'            => $idLocal,
                'status'              => $r->status ? mb_substr($r->status, 0, 30) : null,
                'status_ciclo'        => $r->status_ciclo ?: 'ABERTO',
                'tipo_checklist'      => 'ABERTURA',
                'id_abertura_vinculada' => null,
                'data_fechamento'     => $r->data_fechamento,
                'anomalia_offline'    => (bool) ($r->anomalia_offline ?? false),
                'foto_extra_1'        => $r->foto_extra_1,
                'desc_extra_1'        => $r->desc_extra_1,
                'foto_extra_2'        => $r->foto_extra_2,
                'desc_extra_2'        => $r->desc_extra_2,
                'foto_extra_3'        => $r->foto_extra_3,
                'desc_extra_3'        => $r->desc_extra_3,
                'foto_extra_4'        => $r->foto_extra_4,
                'desc_extra_4'        => $r->desc_extra_4,
                'data_cadastro'       => $r->data_cadastro,
                'user_create'         => $r->user_create,
                'user_edit'           => $r->user_edit,
                'sync_status'         => $r->sync_status ?? 0,
                'data_sincronizacao'  => $r->data_sincronizacao,
                'created_at'          => $r->created_at,
                'updated_at'          => $r->updated_at,
                'deleted_at'          => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_checklist_itens_servicos', $batch);
    }

    protected function migrarChecklistRealizados(): int
    {
        $this->truncar('veiculo_checklist_itens_realizados');
        // chunk em 5k para nao estourar memoria (85k rows)
        $offset = 0;
        $chunk  = 5000;
        $total  = 0;

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $checksValidos   = DB::table('veiculo_checklist')->pluck('id')->flip();
        $itensValidos    = DB::table('veiculo_checklist_itens')->pluck('id')->flip();

        do {
            $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_checklist_itens_realizados ORDER BY id LIMIT $chunk OFFSET $offset");
            if (empty($linhas)) break;

            $batch = [];
            foreach ($linhas as $r) {
                $idLocal = $r->id_local ? mb_substr($r->id_local, 0, 64) : ('legacy_' . $r->id);
                $batch[] = [
                    'id'                       => $r->id,
                    'company_id'               => $this->companyId,
                    'id_obra'                  => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                    'id_checklist'             => $r->id_checklist && isset($checksValidos[$r->id_checklist]) ? $r->id_checklist : null,
                    'id_local'                 => $idLocal,
                    'id_checklist_realizado'   => $r->id_checklist_realizado ? mb_substr($r->id_checklist_realizado, 0, 64) : null,
                    'id_checklist_itens'       => $r->id_checklist_itens && isset($itensValidos[$r->id_checklist_itens]) ? $r->id_checklist_itens : null,
                    'id_veiculo'               => $r->id_veiculo && isset($veiculosValidos[$r->id_veiculo]) ? $r->id_veiculo : null,
                    'data_cadastro'            => $r->data_cadastro,
                    'status'                   => $r->status,
                    'arquivo_app'              => $r->arquivo_app ? mb_substr($r->arquivo_app, 0, 255) : null,
                    'arquivo_servidor'         => $r->arquivo_servidor,
                    'user_create'              => $r->user_create,
                    'horimetro_atual'          => $r->horimetro_atual,
                    'horimetro_novo'           => $r->horimetro_novo,
                    'quilometragem_atual'      => $r->quilometragem_atual,
                    'quilometragem_nova'       => $r->quilometragem_nova,
                    'observacao'               => $r->observacao,
                    'sync_status'              => $r->sync_status ?? 0,
                    'data_sincronizacao'       => $r->data_sincronizacao,
                    'created_at'               => $r->created_at,
                    'updated_at'               => $r->updated_at,
                    'deleted_at'               => $r->deleted_at,
                ];
            }
            $total += $this->insertBatch('veiculo_checklist_itens_realizados', $batch, silent: true);
            $offset += $chunk;
            $this->line("    chunk @ {$offset}: total acumulado = {$total}");
        } while (true);

        return $total;
    }

    protected function migrarManutencoes(): int
    {
        $this->truncar('veiculo_manutencaos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_manutencaos");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                    => $r->id,
                'company_id'            => $this->companyId,
                'veiculo_id'            => $r->veiculo_id,
                'fornecedor_id'         => $r->fornecedor_id,
                'servico_id'            => $r->servico_id,
                'id_obra'               => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'id_usuario'            => $r->id_usuario,
                'tipo'                  => $r->tipo ? mb_substr($r->tipo, 0, 50) : null,
                'valor_do_servico'      => $this->decimalOrNull($r->valor_do_servico),
                'quilometragem_atual'   => $r->quilometragem_atual,
                'quilometragem_nova'    => $r->quilometragem_nova,
                'horimetro_atual'       => $r->horimetro_atual,
                'horimetro_proximo'     => $r->horimetro_proximo,
                'data_de_execucao'      => $r->data_de_execucao,
                'data_previsao_termino' => $r->data_previsao_termino,
                'data_conclusao'        => $r->data_conclusao,
                'data_de_vencimento'    => $r->data_de_vencimento,
                'descricao'             => $r->descricao,
                'situacao'              => $r->situacao ?: 1,
                'status'                => $r->status,
                'arquivo'               => $r->arquivo ? mb_substr($r->arquivo, 0, 255) : null,
                'user_create'           => $r->user_create,
                'user_edit'             => $r->user_edit,
                'created_at'            => $r->created_at,
                'updated_at'            => $r->updated_at,
                'deleted_at'            => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_manutencaos', $batch);
    }

    protected function migrarIpvas(): int
    {
        $this->truncar('veiculo_ipvas');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_ipvas");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'                 => $r->id,
                'company_id'         => $this->companyId,
                'veiculo_id'         => $r->veiculo_id,
                'referencia_ano'     => $r->referencia_ano ? mb_substr($r->referencia_ano, 0, 10) : null,
                'valor'              => $this->decimalOrNull($r->valor),
                'data_de_vencimento' => $r->data_de_vencimento,
                'data_de_pagamento'  => $r->data_de_pagamento,
                'nome_anexo_ipva'    => $r->nome_anexo_ipva ? mb_substr($r->nome_anexo_ipva, 0, 255) : null,
                'extensao'           => $r->extensao ? mb_substr($r->extensao, 0, 10) : null,
                'user_create'        => $r->user_create,
                'user_edit'          => $r->user_edit,
                'created_at'         => $r->created_at,
                'updated_at'         => $r->updated_at,
                'deleted_at'         => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_ipvas', $batch);
    }

    protected function migrarSeguros(): int
    {
        $this->truncar('veiculo_seguros');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_seguros");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->veiculo_id])) continue;
            $batch[] = [
                'id'               => $r->id,
                'company_id'       => $this->companyId,
                'veiculo_id'       => $r->veiculo_id,
                'nome_seguradora'  => $r->nome_seguradora ? mb_substr($r->nome_seguradora, 0, 191) : null,
                'carencia_inicial' => $this->dateOrNull($r->carencia_inicial),
                'carencia_final'   => $this->dateOrNull($r->carencia_final),
                'valor'            => $this->decimalOrNull($r->valor),
                'user_create'      => $r->user_create,
                'user_edit'        => $r->user_edit,
                'created_at'       => $r->created_at,
                'updated_at'       => $r->updated_at,
                'deleted_at'       => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_seguros', $batch);
    }

    protected function migrarDocsLegais(): int
    {
        $this->truncar('veiculos_docs_legais');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculos_docs_legais");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->id_veiculo])) continue;
            $batch[] = [
                'id'              => $r->id,
                'company_id'      => $this->companyId,
                'id_veiculo'      => $r->id_veiculo,
                'id_tipo_veiculo' => $r->id_tipo_veiculo,
                'id_doc_legal'    => $r->id_doc_legal,
                'nome_documento'  => $r->nome_documento ? mb_substr($r->nome_documento, 0, 191) : null,
                'arquivo'         => $r->arquivo ? mb_substr($r->arquivo, 0, 255) : null,
                'data_documento'  => $r->data_documento,
                'validade'        => $r->validade,
                'data_validade'   => $r->data_validade,
                'status'          => $r->status ? mb_substr($r->status, 0, 30) : null,
                'user_create'     => $r->user_create,
                'user_edit'       => $r->user_edit,
                'created_at'      => $r->created_at,
                'updated_at'      => $r->updated_at,
                'deleted_at'      => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculos_docs_legais', $batch);
    }

    protected function migrarPreventivasItens(): int
    {
        $this->truncar('veiculo_preventivas_itens');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_preventivas_itens");

        $preventivasValidas = DB::table('veiculo_preventivas')->pluck('id')->flip();
        $veiculosValidos    = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($preventivasValidas[$r->id_preventiva])) continue;
            $batch[] = [
                'id'              => $r->id,
                'company_id'      => $this->companyId,
                'id_preventiva'   => $r->id_preventiva,
                'id_veiculo'      => $r->id_veiculo && isset($veiculosValidos[$r->id_veiculo]) ? $r->id_veiculo : null,
                'nome_servico'    => mb_substr((string) $r->nome_servico, 0, 250),
                'serial_number'   => $r->serial_number ? mb_substr($r->serial_number, 0, 50) : null,
                'periodo_maq_vei' => $r->periodo_maq_vei,
                'periodo_mes'     => $r->periodo_mes,
                'tipo_itens'      => $r->tipo_itens ? mb_substr($r->tipo_itens, 0, 10) : null,
                'situacao'        => $r->situacao ?: '1',
                'alerta_venci'    => $r->alerta_venci,
                'alert_venc_mes'  => $r->alert_venc_mes,
                'user_create'     => $r->user_create ? mb_substr((string) $r->user_create, 0, 191) : null,
                'user_edit'       => $r->user_edit ? mb_substr((string) $r->user_edit, 0, 191) : null,
                'created_at'      => $r->created_at,
                'updated_at'      => $r->updated_at,
                'deleted_at'      => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_preventivas_itens', $batch);
    }

    protected function migrarPreventivasRealizadas(): int
    {
        $this->truncar('veiculo_preventivas_itens_realizadas');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculo_preventivas_itens_realizadas");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();
        $obrasValidas    = DB::table('obras')->pluck('id')->flip();
        $funcsValidos    = DB::table('funcionarios')->pluck('id')->flip();
        $prevValidas     = DB::table('veiculo_preventivas')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->id_veiculo])) continue;
            $batch[] = [
                'id'                    => $r->id,
                'company_id'            => $this->companyId,
                'id_veiculo'            => $r->id_veiculo,
                // legado tem fornecedor_id como varchar (nome) — sem cadastro de fornecedores ainda, ignora
                'fornecedor_id'         => null,
                'id_obra'               => $r->id_obra && isset($obrasValidas[$r->id_obra]) ? $r->id_obra : null,
                'id_preventiva'         => $r->id_preventiva && isset($prevValidas[$r->id_preventiva]) ? $r->id_preventiva : null,
                'id_motorista'          => $r->id_motorista && isset($funcsValidos[$r->id_motorista]) ? $r->id_motorista : null,
                'tipo'                  => $r->tipo ? mb_substr($r->tipo, 0, 30) : null,
                'nf_pecas'              => $r->nf_pecas ? mb_substr($r->nf_pecas, 0, 60) : null,
                'nf_mao_obra'           => $r->nf_mao_obra ? mb_substr($r->nf_mao_obra, 0, 60) : null,
                'valor_do_servico'      => $r->valor_do_servico,
                'valor_da_mao_obra'     => $r->valor_da_mao_obra,
                'total_valor_servico'   => $r->total_valor_servico,
                'quilometragem_atual'   => $r->quilometragem_atual,
                'quilometragem_nova'    => $r->quilometragem_nova,
                'campo_calc_km'         => $r->campo_calc_km,
                'horimetro_atual'       => $r->horimetro_atual,
                'horimetro_proximo'     => $r->horimetro_proximo,
                'campo_cal_hr'          => $r->campo_cal_hr,
                'data_de_execucao'      => $r->data_de_execucao,
                'data_previsao_termino' => $r->data_previsao_termino,
                'data_conclusao'        => $r->data_conclusao,
                'campo_cal_mes'         => $r->campo_cal_mes,
                'data_de_vencimento'    => $r->data_de_vencimento,
                'descricao'             => $r->descricao,
                'status_realizado'      => (string) ($r->status_realizado ?? '1'),
                'user_create'           => $r->user_create,
                'user_edit'             => $r->user_edit,
                'created_at'            => $r->created_at,
                'updated_at'            => $r->updated_at,
                'deleted_at'            => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculo_preventivas_itens_realizadas', $batch);
    }

    protected function migrarDocsTecnicos(): int
    {
        $this->truncar('veiculos_docs_tecnicos');
        $linhas = DB::select("SELECT * FROM {$this->source}.veiculos_docs_tecnicos");

        $veiculosValidos = DB::table('veiculos')->pluck('id')->flip();

        $batch = [];
        foreach ($linhas as $r) {
            if (!isset($veiculosValidos[$r->id_veiculo])) continue;
            $batch[] = [
                'id'              => $r->id,
                'company_id'      => $this->companyId,
                'id_veiculo'      => $r->id_veiculo,
                'id_tipo_veiculo' => $r->id_tipo_veiculo,
                'id_doc_tecnico'  => $r->id_doc_tecnico,
                'nome_documento'  => $r->nome_documento ? mb_substr($r->nome_documento, 0, 191) : null,
                'arquivo'         => $r->arquivo ? mb_substr($r->arquivo, 0, 255) : null,
                'data_documento'  => $r->data_documento,
                'validade'        => $r->validade,
                'data_validade'   => $r->data_validade,
                'status'          => $r->status ? mb_substr($r->status, 0, 30) : null,
                'user_create'     => $r->user_create,
                'user_edit'       => $r->user_edit,
                'created_at'      => $r->created_at,
                'updated_at'      => $r->updated_at,
                'deleted_at'      => $r->deleted_at,
            ];
        }
        return $this->insertBatch('veiculos_docs_tecnicos', $batch);
    }

    /* =========================================================
     * Helpers
     * ========================================================= */

    protected function verificarOrigem(): bool
    {
        try {
            DB::select("SHOW TABLES FROM {$this->source} LIKE 'veiculos'");
            return true;
        } catch (\Throwable $e) {
            $this->error("Banco origem '{$this->source}' inacessivel: " . $e->getMessage());
            return false;
        }
    }

    protected function etapa(string $nome, callable $fn): void
    {
        if ($this->only && !in_array($nome, $this->only, true)) {
            return;
        }
        $inicio = microtime(true);
        $this->info("→ {$nome}...");
        try {
            $qtd = $fn();
            $dur = round(microtime(true) - $inicio, 2);
            $this->info("  ✓ {$nome}: {$qtd} registros em {$dur}s");
        } catch (\Throwable $e) {
            $this->error("  ✗ {$nome} falhou: " . $e->getMessage());
        }
    }

    protected function truncar(string $tabela): void
    {
        if ($this->fresh) {
            DB::table($tabela)->truncate();
        }
    }

    protected function insertBatch(string $tabela, array $rows, bool $silent = false): int
    {
        if (empty($rows)) return 0;
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table($tabela)->insertOrIgnore($chunk);
        }
        return count($rows);
    }

    protected function intOrNull($v): ?int
    {
        if ($v === null || $v === '') return null;
        // remove tudo que nao for digito ou sinal
        $limpo = preg_replace('/[^0-9-]/', '', (string) $v);
        return $limpo === '' ? null : (int) $limpo;
    }

    protected function decimalOrNull($v): ?float
    {
        if ($v === null || $v === '') return null;
        // 'R$ 1.234,56' → '1234.56'
        $limpo = (string) $v;
        $limpo = preg_replace('/[^0-9,.\-]/', '', $limpo);
        // se tem ',' e '.', assume PT-BR (1.234,56)
        if (str_contains($limpo, ',') && str_contains($limpo, '.')) {
            $limpo = str_replace('.', '', $limpo);
            $limpo = str_replace(',', '.', $limpo);
        } elseif (str_contains($limpo, ',')) {
            $limpo = str_replace(',', '.', $limpo);
        }
        return is_numeric($limpo) ? (float) $limpo : null;
    }

    protected function dateOrNull($v): ?string
    {
        if (!$v) return null;
        // Aceita 'YYYY-MM-DD', 'DD/MM/YYYY' ou valores legados como varchar
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $v)) return substr((string) $v, 0, 10);
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})/', (string) $v, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
        $ts = strtotime((string) $v);
        return $ts ? date('Y-m-d', $ts) : null;
    }

    protected function datetimeOrNull($baseDate, $time): ?string
    {
        if (!$time) return null;
        // se ja for datetime completo, retorna
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $time)) return $time;
        // se for HH:MM, combina com base date
        if (preg_match('/^(\d{1,2}):(\d{2})/', (string) $time, $m)) {
            $dataBase = $baseDate ? date('Y-m-d', strtotime((string) $baseDate)) : date('Y-m-d');
            return $dataBase . ' ' . str_pad($m[1], 2, '0', STR_PAD_LEFT) . ':' . $m[2] . ':00';
        }
        return null;
    }
}
