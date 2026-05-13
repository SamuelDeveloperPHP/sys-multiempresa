<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MigrateObras extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:migrate-obras';
    protected $description = 'Migra a tabela de obras do engeativos para blog_irpr';

    public function handle()
    {
        $this->info('Iniciando migração da tabela de obras...');

        try {
            // 1. Alterar a estrutura do banco de destino (blog_irpr.obras)
            $this->info('Ajustando estrutura da tabela de destino...');
            
            // Verifica e adiciona as colunas caso não existam
            $colunas = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM blog_irpr.obras");
            $colunasExistentes = array_map(function($col) { return $col->Field; }, $colunas);

            $alterQueries = [];
            if (!in_array('latitude', $colunasExistentes)) $alterQueries[] = "ADD COLUMN latitude VARCHAR(20) NULL";
            if (!in_array('longitude', $colunasExistentes)) $alterQueries[] = "ADD COLUMN longitude VARCHAR(20) NULL";
            if (!in_array('reidi', $colunasExistentes)) $alterQueries[] = "ADD COLUMN reidi TEXT NULL";
            if (!in_array('sync_status', $colunasExistentes)) $alterQueries[] = "ADD COLUMN sync_status INT NULL";
            if (!in_array('data_sincronizacao', $colunasExistentes)) $alterQueries[] = "ADD COLUMN data_sincronizacao DATETIME NULL";

            if (count($alterQueries) > 0) {
                $alterSql = "ALTER TABLE blog_irpr.obras " . implode(", ", $alterQueries);
                \Illuminate\Support\Facades\DB::statement($alterSql);
                $this->info('Colunas adicionadas com sucesso.');
            }

            // 2. Ajustar ENUM para aceitar 'Ativo' e 'Inativo'
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE blog_irpr.obras MODIFY COLUMN status ENUM('Ativo', 'Inativo', 'Ativa', 'Concluida', 'Paralisada', 'Cancelada') DEFAULT 'Ativo'");
            $this->info('ENUM ajustado.');

            // 3. Migrar os dados
            $this->info('Copiando dados...');
            $obras = \Illuminate\Support\Facades\DB::table('engeativos.obras')->get();

            $bar = $this->output->createProgressBar(count($obras));
            $bar->start();

            foreach ($obras as $obra) {
                // Previne duplicação
                $existe = \Illuminate\Support\Facades\DB::table('blog_irpr.obras')->where('id', $obra->id)->exists();
                if (!$existe) {
                    \Illuminate\Support\Facades\DB::table('blog_irpr.obras')->insert([
                        'id'            => $obra->id,
                        'company_id'    => $obra->id_empresa ?: 1,
                        'nome_fantasia' => $obra->nome_fantasia,
                        'razao_social'  => $obra->razao_social,
                        'cnpj'          => substr($obra->cnpj, 0, 20),
                        'code'          => substr($obra->codigo_obra, 0, 100),
                        'cep'           => substr($obra->cep, 0, 10),
                        'endereco'      => $obra->endereco,
                        'numero'        => substr($obra->numero, 0, 20),
                        'complemento'   => null,
                        'bairro'        => $obra->bairro,
                        'cidade'        => $obra->cidade,
                        'estado'        => substr($obra->estado, 0, 2),
                        'email'         => $obra->email,
                        'celular'       => substr($obra->celular, 0, 20),
                        'status'        => $obra->status_obra, // Ativo ou Inativo
                        'latitude'      => $obra->latitude,
                        'longitude'     => $obra->longitude,
                        'reidi'         => $obra->reidi,
                        'sync_status'   => $obra->sync_status,
                        'data_sincronizacao' => $obra->data_sincronizacao,
                        'deleted_at'    => $obra->deleted_at,
                        'created_at'    => $obra->created_at,
                        'updated_at'    => $obra->updated_at,
                    ]);
                }
                $bar->advance();
            }

            $bar->finish();
            $this->info("\nMigração de obras concluída com sucesso!");

        } catch (\Exception $e) {
            $this->error("\nErro durante a migração: " . $e->getMessage());
        }
    }
}
