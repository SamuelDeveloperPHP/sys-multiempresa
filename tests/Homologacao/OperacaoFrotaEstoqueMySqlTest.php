<?php

namespace Tests\Homologacao;

use App\Models\Company;
use App\Models\Estoque\Devolucao;
use App\Models\Estoque\Inventario;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\ProdutoVariante;
use App\Models\Estoque\Saldo;
use App\Models\Frota\Veiculo;
use App\Models\Frota\VeiculoLocacao;
use App\Models\Module;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class OperacaoFrotaEstoqueMySqlTest extends TestCase
{
    use DatabaseTruncation;

    protected function beforeTruncatingDatabase(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql' || DB::connection()->getDatabaseName() !== 'frota_qa') {
            $this->markTestSkipped('Exige a instância MySQL descartável do executor.');
        }
    }

    private function disputar(Company $empresa, User $ator, array $pedidos): array
    {
        $barreira = storage_path('liberar-'.Str::uuid());
        $processos = [];
        try {
            foreach ($pedidos as $i => [$rota, $dados]) {
                $entrada = $barreira.'.'.$i.'.json';
                file_put_contents($entrada, json_encode([$empresa->id, $ator->id, $rota, $dados, $barreira], JSON_THROW_ON_ERROR));
                $processo = new Process([PHP_BINARY, __DIR__.'/support/requisicao.php', $entrada], base_path(), timeout: 120);
                $processo->start();
                $processos[] = $processo;
            }
            $limite = microtime(true) + 90;
            foreach ($processos as $i => $processo) {
                while (!is_file($barreira.'.'.$i.'.json.ready')) {
                    if (!$processo->isRunning() || microtime(true) >= $limite) {
                        $this->fail('A requisição não chegou à barreira. '.$processo->getErrorOutput());
                    }
                    usleep(10000);
                    clearstatcache();
                }
            }
            touch($barreira);
            $status = [];
            foreach ($processos as $processo) {
                $processo->wait();
                $this->assertTrue($processo->isSuccessful(), $processo->getErrorOutput());
                $this->assertMatchesRegularExpression('/HTTP (302|422)/', $processo->getOutput(), $processo->getErrorOutput());
                preg_match('/HTTP (\d+)/', $processo->getOutput(), $m);
                $status[] = (int) $m[1];
            }
            sort($status);
            return $status;
        } finally {
            foreach ($processos as $i => $processo) {
                $processo->stop();
                foreach (['.json', '.json.ready'] as $sufixo) {
                    $arquivo = $barreira.'.'.$i.$sufixo;
                    if (is_file($arquivo)) {
                        unlink($arquivo);
                    }
                }
            }
            if (is_file($barreira)) {
                unlink($barreira);
            }
        }
    }

    public function test_disputas_nas_rotas_de_locacao_devolucao_e_inventario(): void
    {
        $empresa = Company::create(['name' => 'Empresa QA', 'slug' => 'qa-operacao', 'is_active' => true]);
        $ator = User::factory()->create(['type' => 'admin']);
        $ator->companies()->attach($empresa);
        $this->actingAs($ator)->withSession(['current_company_id' => $empresa->id]);
        foreach (['frota.locacoes', 'estoque.inventarios', 'estoque.devolucoes'] as $slug) {
            $modulo = Module::updateOrCreate(['slug' => $slug], ['name' => $slug, 'route_name' => "admin.{$slug}.index", 'is_active' => true]);
            $ator->modulePermissions()->create(['company_id' => $empresa->id, 'module_id' => $modulo->id,
                'can_list' => true, 'can_create' => true, 'can_edit' => true]);
        }
        $obra = Obra::create(['company_id' => $empresa->id, 'nome_fantasia' => 'Obra QA']);
        $ator->obras()->attach($obra);
        $veiculo = Veiculo::create(['company_id' => $empresa->id, 'prefixo' => 'QA-001', 'situacao' => 'Ativo']);
        $locacoes = route('admin.frota.locacoes.store');
        $dados = ['veiculo_id' => $veiculo->id, 'id_obra' => $obra->id, 'data_inicio' => '2026-10-01', 'data_fim' => '2026-10-10'];
        $this->assertSame([302, 422], $this->disputar($empresa, $ator, [[$locacoes, $dados], [$locacoes, $dados]]));
        $primeira = VeiculoLocacao::sole();
        $this->postJson($locacoes, array_merge($dados, ['data_inicio' => '2026-10-10', 'data_fim' => null]))->assertRedirect();
        $this->putJson(route('admin.frota.locacoes.update', $primeira), array_merge($dados, ['data_fim' => '2026-10-11']))->assertUnprocessable();
        $this->postJson($locacoes, array_merge($dados, ['data_inicio' => '2026-10-12']))->assertUnprocessable();

        $outra = Company::create(['name' => 'Outra empresa', 'slug' => 'qa-outra']);
        $outroVeiculo = Veiculo::withoutGlobalScopes()->create(['company_id' => $outra->id, 'prefixo' => 'FORA']);
        $this->postJson($locacoes, array_merge($dados, ['veiculo_id' => $outroVeiculo->id]))->assertJsonValidationErrors('veiculo_id');

        $produto = Produto::create(['sku' => 'QA-UNIFORME', 'nome' => 'Uniforme', 'unidade' => 'UN', 'tipo_item' => 'uniforme', 'ativo' => true]);
        $base = ['company_id' => $empresa->id, 'produto_id' => $produto->id, 'obra_id' => $obra->id,
            'data_movimento' => now()->toDateString(), 'valor_unitario' => 1, 'valor_total' => 1];
        foreach (['M' => 6, 'G' => 4] as $tamanho => $saldo) {
            $variante = ProdutoVariante::create(['produto_id' => $produto->id, 'tamanho' => $tamanho, 'ativo' => true]);
            Movimentacao::create($base + ['tipo' => Movimentacao::TIPO_ENTRADA, 'quantidade' => $saldo, 'variante_id' => $variante->id]);
        }
        $this->postJson(route('admin.estoque.inventarios.store'), ['obra_id' => $obra->id, 'data_inicio' => now()->toDateString()])->assertRedirect();
        $inv = Inventario::sole();
        $this->assertCount(2, $inv->itens);
        foreach ($inv->itens as $item) {
            $this->putJson(route('admin.estoque.inventarios.itens.update', [$inv, $item]),
                ['saldo_contado' => $item->variante_id == $variante->id ? 3 : 6])->assertRedirect();
        }
        $fechar = route('admin.estoque.inventarios.fechar', $inv);
        $this->assertSame([302, 422], $this->disputar($empresa, $ator, [[$fechar, []], [$fechar, []]]));
        $ajuste = Movimentacao::where('inventario_id', $inv->id)->sole();
        $this->assertEquals($variante->id, $ajuste->variante_id);
        $this->assertEquals(1, $ajuste->quantidade);
        $this->assertEquals(3, Saldo::where('variante_id', $variante->id)->sole()->quantidade);
        $this->postJson(route('admin.estoque.inventarios.cancelar', $inv))->assertUnprocessable();

        $this->postJson(route('admin.estoque.inventarios.store'), ['obra_id' => $obra->id, 'data_inicio' => now()->toDateString()])->assertRedirect();
        $outroInv = Inventario::where('status', Inventario::STATUS_ABERTO)->sole();
        $falhar = true;
        Movimentacao::created(function ($mov) use (&$falhar, $outroInv) {
            if ($falhar && $mov->inventario_id == $outroInv->id) {
                throw new \RuntimeException('Falha simulada durante ajuste de inventário.');
            }
        });
        $this->postJson(route('admin.estoque.inventarios.fechar', $outroInv), ['forcar_nao_contados' => true])->assertStatus(500);
        $falhar = false;
        $this->assertSame(Inventario::STATUS_ABERTO, $outroInv->fresh()->status);
        $this->assertEquals(0, Movimentacao::where('inventario_id', $outroInv->id)->count());
        $this->assertEquals(3, Saldo::where('variante_id', $variante->id)->sole()->quantidade);
        $pedidoFechar = [route('admin.estoque.inventarios.fechar', $outroInv), ['forcar_nao_contados' => true]];
        $pedidoCancelar = [route('admin.estoque.inventarios.cancelar', $outroInv), []];
        $this->assertSame([302, 422], $this->disputar($empresa, $ator, [$pedidoFechar, $pedidoCancelar]));
        $this->assertEquals($outroInv->fresh()->status === Inventario::STATUS_FECHADO ? 2 : 0,
            Movimentacao::where('inventario_id', $outroInv->id)->count());

        $saida = Movimentacao::create($base + ['tipo' => Movimentacao::TIPO_SAIDA, 'quantidade' => 10, 'retirante_user_id' => $ator->id]);
        $requisicao = ['funcionario_user_id' => $ator->id, 'produto_id' => $produto->id,
            'obra_id' => $obra->id, 'movimentacao_saida_id' => $saida->id, 'estado_material' => 'USADO_OK'];
        $aprovacao = ['senha_aprovador' => 'password'];
        $this->postJson(route('admin.estoque.devolucoes.store'), array_merge($requisicao, [
            'movimentacao_saida_id' => null, 'quantidade' => 1, 'chave_reenvio' => (string) Str::uuid(),
        ]))->assertJsonValidationErrors('movimentacao_saida_id');
        $pedidos = [];
        foreach ([7, 3, 3] as $qtd) {
            $payload = $requisicao + ['quantidade' => $qtd, 'chave_reenvio' => (string) Str::uuid()];
            $this->postJson(route('admin.estoque.devolucoes.store'), $payload)->assertRedirect();
            $this->postJson(route('admin.estoque.devolucoes.store'), $payload)->assertRedirect();
            $dev = Devolucao::where('chave_reenvio', $payload['chave_reenvio'])->sole();
            $rota = route('admin.estoque.devolucoes.aprovar', $dev);
            if ($qtd === 7) {
                $this->postJson($rota, $aprovacao)->assertRedirect();
            } else {
                $pedidos[] = [$rota, $aprovacao];
            }
        }
        $this->assertSame([302, 422], $this->disputar($empresa, $ator, $pedidos));
        $this->assertEquals(10, Movimentacao::where('movimentacao_origem_id', $saida->id)->sum('quantidade'));
        $this->assertSame(2, Devolucao::where('status', Devolucao::STATUS_APROVADA)->count());

        $func = \App\Models\Funcionario::create(['company_id' => $empresa->id, 'nome' => 'Retirante QA', 'senha_retirada' => '4321']);
        $lote = \App\Models\Estoque\Lote::create(['company_id' => $empresa->id, 'produto_id' => $produto->id,
            'obra_id' => $obra->id, 'variante_id' => $variante->id, 'numero_lote' => 'QA-L01', 'quantidade_inicial' => 4,
            'quantidade_atual' => 0, 'data_entrada' => now()->toDateString()]);
        $saidaRapida = Movimentacao::create($base + ['tipo' => Movimentacao::TIPO_SAIDA, 'quantidade' => 4,
            'retirante_funcionario_id' => $func->id, 'variante_id' => $variante->id, 'lote_id' => $lote->id]);
        $rapida = ['movimentacao_saida_id' => $saidaRapida->id, 'quantidade' => 1,
            'senha_funcionario' => '4321', 'estado_material' => 'USADO_OK', 'chave_reenvio' => (string) Str::uuid()];
        $rotaRapida = route('admin.estoque.devolucoes.rapida.store');
        $this->assertSame([302, 302], $this->disputar($empresa, $ator, [[$rotaRapida, $rapida], [$rotaRapida, $rapida]]));
        $this->assertEquals(1, $lote->fresh()->quantidade_atual);
        $this->assertEquals($variante->id, Movimentacao::where('movimentacao_origem_id', $saidaRapida->id)->sole()->variante_id);
    }
}
