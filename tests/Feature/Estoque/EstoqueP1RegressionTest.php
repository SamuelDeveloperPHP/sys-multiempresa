<?php

namespace Tests\Feature\Estoque;

use App\Http\Middleware\UpdateLastSeen;
use App\Models\Company;
use App\Models\Estoque\Lote;
use App\Models\Estoque\Movimentacao;
use App\Models\Estoque\Produto;
use App\Models\Estoque\ProdutoVariante;
use App\Models\Module;
use App\Models\ModulePermission;
use App\Models\Obra;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstoqueP1RegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(UpdateLastSeen::class);
    }

    public function test_movimentacao_show_route_uses_the_controller_binding_name(): void
    {
        $route = app('router')->getRoutes()->getByName('admin.estoque.movimentacoes.show');

        $this->assertNotNull($route);
        $this->assertSame(['movimentacao'], $route->parameterNames());
    }

    public function test_controlled_product_accepts_blank_reference_values(): void
    {
        [$user, $company] = $this->tenant();

        $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id])
            ->post(route('admin.estoque.produtos.store'), [
                'tipo_item' => Produto::TIPO_EPC,
                'sku' => 'EPC-SEM-VALOR',
                'nome' => 'EPC sem valor de referência',
                'unidade' => 'UN',
                'valor_unitario' => '',
                'estoque_minimo' => '',
                'ativo' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('estoque_produtos', [
            'company_id' => null,
            'sku' => 'EPC-SEM-VALOR',
            'tipo_item' => Produto::TIPO_EPC,
            'valor_unitario' => 0,
            'estoque_minimo' => 0,
        ]);
    }

    public function test_entry_persists_controlled_item_expiration_date(): void
    {
        [$user, $company, $origem] = $this->tenant(withWorks: true);
        $produto = $this->controlledProduct($company);

        $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id])
            ->post(route('admin.estoque.entradas.store'), [
                'obra_id' => $origem->id,
                'data_movimento' => now()->toDateString(),
                'itens' => [[
                    'produto_id' => $produto->id,
                    'tipo_item' => Produto::TIPO_UNIFORME,
                    'quantidade' => 2,
                    'valor_unitario' => 15,
                    'cor' => 'Azul',
                    'tamanho' => 'M',
                    'numero_ca' => 'CA-TESTE',
                    'numero_lote' => 'LOTE-VALIDADE',
                    'validade' => '2027-10-28',
                ]],
            ])
            ->assertRedirect(route('admin.estoque.entradas.index'));

        $this->assertDatabaseHas('estoque_lotes', [
            'produto_id' => $produto->id,
            'obra_id' => $origem->id,
            'numero_lote' => 'LOTE-VALIDADE',
            'validade' => '2027-10-28 00:00:00',
        ]);
    }

    public function test_transfer_preserves_variant_and_lot_metadata_and_redirects_to_details(): void
    {
        [$user, $company, $origem, $destino] = $this->tenant(withWorks: true);
        $this->grantWarehouseOperatorAccess($user, $company);
        $produto = $this->controlledProduct($company, Produto::TIPO_EPC);
        $variante = ProdutoVariante::create([
            'produto_id' => $produto->id,
            'cor' => 'Amarelo',
            'tamanho' => 'Único',
        ]);

        $entrada = Movimentacao::create([
            'company_id' => $company->id,
            'produto_id' => $produto->id,
            'variante_id' => $variante->id,
            'obra_id' => $origem->id,
            'tipo' => Movimentacao::TIPO_ENTRADA,
            'quantidade' => 5,
            'valor_unitario' => 25,
            'valor_total' => 125,
            'data_movimento' => now()->toDateString(),
        ]);
        $loteOrigem = Lote::create([
            'company_id' => $company->id,
            'produto_id' => $produto->id,
            'variante_id' => $variante->id,
            'obra_id' => $origem->id,
            'numero_ca' => 'CA-EPC',
            'numero_lote' => 'LOTE-EPC',
            'validade' => '2027-12-31',
            'valor_unitario' => 25,
            'quantidade_inicial' => 5,
            'quantidade_atual' => 5,
            'data_entrada' => now()->toDateString(),
            'movimentacao_entrada_id' => $entrada->id,
        ]);
        $entrada->forceFill(['lote_id' => $loteOrigem->id])->saveQuietly();

        $response = $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id])
            ->post(route('admin.estoque.transferencias.store'), [
                'produto_id' => $produto->id,
                'lote_id' => $loteOrigem->id,
                'obra_id' => $origem->id,
                'obra_destino_id' => $destino->id,
                'quantidade' => 2,
                'data_movimento' => now()->toDateString(),
            ]);

        $saida = Movimentacao::withoutGlobalScopes()
            ->where('tipo', Movimentacao::TIPO_TRANSF_OUT)
            ->latest('id')
            ->firstOrFail();
        $entradaDestino = Movimentacao::withoutGlobalScopes()->findOrFail($saida->movimentacao_par_id);
        $loteDestino = Lote::withoutGlobalScopes()->findOrFail($entradaDestino->lote_id);

        $response->assertRedirect(route('admin.estoque.movimentacoes.show', $saida));
        $this->actingAs($user)
            ->withSession(['current_company_id' => $company->id])
            ->get(route('admin.estoque.movimentacoes.show', $saida))
            ->assertOk();

        $this->assertSame($variante->id, $saida->variante_id);
        $this->assertSame($loteOrigem->id, $saida->lote_id);
        $this->assertSame($variante->id, $entradaDestino->variante_id);
        $this->assertSame('LOTE-EPC', $loteDestino->numero_lote);
        $this->assertSame('CA-EPC', $loteDestino->numero_ca);
        $this->assertSame('2027-12-31', $loteDestino->validade?->toDateString());
        $this->assertSame(3.0, (float) $loteOrigem->fresh()->quantidade_atual);
        $this->assertSame(2.0, (float) $loteDestino->quantidade_atual);
    }

    private function tenant(bool $withWorks = false): array
    {
        $company = Company::create([
            'name' => 'Empresa Teste',
            'slug' => 'empresa-teste',
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'type' => 'super_admin',
            'email' => 'almoxarife.teste@example.test',
        ]);

        if (!$withWorks) {
            return [$user, $company];
        }

        $origem = Obra::create([
            'company_id' => $company->id,
            'codigo_obra' => 'ORIGEM',
            'nome_fantasia' => 'Obra Origem',
        ]);
        $destino = Obra::create([
            'company_id' => $company->id,
            'codigo_obra' => 'DESTINO',
            'nome_fantasia' => 'Obra Destino',
        ]);

        return [$user, $company, $origem, $destino];
    }

    private function controlledProduct(Company $company, string $type = Produto::TIPO_UNIFORME): Produto
    {
        return Produto::create([
            'company_id' => $company->id,
            'tipo_item' => $type,
            'controla_variacao' => true,
            'sku' => 'CONTROLADO-' . $type,
            'nome' => 'Produto controlado ' . $type,
            'unidade' => 'UN',
            'valor_unitario' => 0,
            'estoque_minimo' => 0,
            'ativo' => true,
        ]);
    }

    private function grantWarehouseOperatorAccess(User $user, Company $company): void
    {
        $user->forceFill([
            'name' => 'Almoxarife QA',
            'type' => 'user',
        ])->save();
        $user->companies()->syncWithoutDetaching([$company->id => ['role' => 'almoxarife']]);

        $module = Module::query()->firstOrCreate(
            ['slug' => 'estoque.movimentacoes'],
            [
                'name' => 'Movimentações',
                'route_name' => 'admin.estoque.movimentacoes.index',
                'is_active' => true,
            ],
        );

        ModulePermission::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'user_id' => $user->id,
                'module_id' => $module->id,
            ],
            [
                'can_list' => true,
                'can_view' => true,
                'can_create' => true,
                'can_edit' => true,
                'can_delete' => false,
            ],
        );
    }
}
