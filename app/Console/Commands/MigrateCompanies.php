<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MigrateCompanies extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:migrate-companies';
    protected $description = 'Migra a tabela de empresas para companies';

    public function handle()
    {
        $this->info('Iniciando migração da tabela de empresas para companies...');

        try {
            // Apaga registros atuais e zera o autoincrement
            $this->info('Apagando registros atuais e zerando AUTO_INCREMENT...');
            
            // Opcional: Se houver restrições de chave estrangeira, precisamos desativar temporariamente
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            \Illuminate\Support\Facades\DB::table('blog_irpr.companies')->truncate(); // truncate apaga e zera auto_increment
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');

            $this->info('Registros antigos removidos.');

            // Lendo registros do engeativos
            $empresas = \Illuminate\Support\Facades\DB::table('engeativos.empresas')->get();
            $this->info("Encontradas " . count($empresas) . " empresas no banco antigo.");

            $bar = $this->output->createProgressBar(count($empresas));
            $bar->start();

            foreach ($empresas as $empresa) {
                \Illuminate\Support\Facades\DB::table('blog_irpr.companies')->insert([
                    'id'            => $empresa->id,
                    'name'          => $empresa->nome_fantasia ?: $empresa->razao_social,
                    'nome_fantasia' => $empresa->nome_fantasia,
                    'razao_social'  => $empresa->razao_social,
                    'cnpj'          => substr($empresa->cnpj, 0, 20),
                    'cep'           => substr($empresa->cep, 0, 10),
                    'endereco'      => $empresa->endereco,
                    'numero'        => substr($empresa->numero, 0, 20),
                    'bairro'        => $empresa->bairro,
                    'cidade'        => $empresa->cidade,
                    'estado'        => substr($empresa->estado, 0, 2),
                    'email'         => $empresa->email,
                    'celular'       => substr($empresa->celular, 0, 20),
                    'slug'          => \Illuminate\Support\Str::slug($empresa->nome_fantasia ?: $empresa->razao_social) . '-' . $empresa->id,
                    'logo_path'     => null,
                    'is_active'     => $empresa->status == 'Ativo' ? 1 : 0,
                    'deleted_at'    => $empresa->deleted_at,
                    'created_at'    => $empresa->created_at,
                    'updated_at'    => $empresa->updated_at,
                ]);
                $bar->advance();
            }

            $bar->finish();
            $this->info("\nMigração de empresas concluída com sucesso!");

        } catch (\Exception $e) {
            $this->error("\nErro durante a migração: " . $e->getMessage());
        }
    }
}
