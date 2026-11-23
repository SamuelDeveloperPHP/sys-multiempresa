<?php

namespace Tests\Homologacao;

use App\Models\Obra;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Frota\AdminFrotaTestCase;

class ConcorrenciaMySqlTest extends AdminFrotaTestCase
{
    public function test_duas_conexoes_disputam_o_mesmo_ativo_e_inventario(): void
    {
        $connection = DB::connection();
        $this->assertSame('mysql', $connection->getDriverName());
        $this->assertSame('frota_qa', $connection->getDatabaseName());
        config(['database.connections.qa_concorrente' => $connection->getConfig()]);
        $other = DB::connection('qa_concorrente');
        $this->assertNotEquals($connection->selectOne('SELECT CONNECTION_ID() AS id')->id,
            $other->selectOne('SELECT CONNECTION_ID() AS id')->id);

        $company = $this->criarEmpresa();
        $vehicle = $this->criarVeiculo($company);
        $user = $this->criarUsuario($company);
        $obra = Obra::create(['company_id' => $company->id, 'nome_fantasia' => 'Obra QA']);
        $inventory = $connection->table('estoque_inventarios')->insertGetId([
            'company_id' => $company->id, 'obra_id' => $obra->id, 'responsavel_id' => $user->id,
            'numero' => 'QA-001', 'data_inicio' => '2026-11-21',
        ]);
        // RefreshDatabase mantém a primeira transação aberta com as linhas de teste.
        // NOWAIT distingue bloqueio real de uma linha ausente ou erro de conexão.
        try {
            foreach (['veiculos' => $vehicle->id, 'estoque_inventarios' => $inventory] as $table => $id) {
                $other->beginTransaction();
                try {
                    $other->table($table)->where('id', $id)->lock('FOR UPDATE NOWAIT')->first();
                    $this->fail("A segunda conexão não encontrou o bloqueio de {$table}.");
                } catch (QueryException $exception) {
                    $this->assertSame(3572, $exception->errorInfo[1]);
                } finally {
                    $other->rollBack();
                }
            }
        } finally {
            DB::purge('qa_concorrente');
        }
    }
}
