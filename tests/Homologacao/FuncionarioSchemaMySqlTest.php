<?php

namespace Tests\Homologacao;

use App\Models\Company;
use App\Models\Funcionario;
use App\Models\FuncionarioFuncao;
use App\Models\FuncionarioSetor;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

// O nome precisa ordenar antes de OperacaoFrotaEstoqueMySqlTest: o ensaio de restauração usa os dados do último teste.
class FuncionarioSchemaMySqlTest extends TestCase
{
    use DatabaseTruncation;

    protected function beforeTruncatingDatabase(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql' || DB::connection()->getDatabaseName() !== 'frota_qa') {
            $this->markTestSkipped('Exige a instância MySQL descartável do executor.');
        }
    }

    public function test_telas_de_funcionario_abrem_em_banco_criado_so_pelas_migrations(): void
    {
        $empresa = Company::create(['name' => 'Empresa RH QA', 'slug' => 'qa-rh', 'is_active' => true]);
        $ator = User::factory()->create(['type' => 'admin']);
        $ator->companies()->attach($empresa);
        $modulo = Module::updateOrCreate(['slug' => 'funcionarios'], [
            'name' => 'Funcionários', 'route_name' => 'admin.funcionarios.index', 'is_active' => true,
        ]);
        $ator->modulePermissions()->create(['company_id' => $empresa->id, 'module_id' => $modulo->id,
            'can_list' => true, 'can_view' => true, 'can_create' => true, 'can_edit' => true]);
        $this->actingAs($ator)->withSession(['current_company_id' => $empresa->id]);

        $setor = FuncionarioSetor::create(['company_id' => $empresa->id, 'nome_setor' => 'Setor QA']);
        $funcao = FuncionarioFuncao::create(['company_id' => $empresa->id, 'funcao' => 'Pedreiro']);
        $funcionario = Funcionario::unguarded(fn () => Funcionario::create([
            'company_id' => $empresa->id, 'nome' => 'Funcionário QA', 'id_setor' => $setor->id, 'id_funcao' => $funcao->id,
        ]));

        foreach ([
            'listagem' => route('admin.funcionarios.index'),
            'cadastro' => route('admin.funcionarios.create'),
            'detalhe' => route('admin.funcionarios.show', $funcionario->id),
            'edição' => route('admin.funcionarios.edit', $funcionario->id),
        ] as $tela => $url) {
            $resposta = $this->get($url);
            $this->assertSame(200, $resposta->getStatusCode(), "Tela de {$tela}: ".(session('errors')?->first('error') ?? 'sem mensagem'));
        }
    }
}
