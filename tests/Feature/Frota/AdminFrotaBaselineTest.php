<?php

namespace Tests\Feature\Frota;

use Inertia\Testing\AssertableInertia as Assert;

class AdminFrotaBaselineTest extends AdminFrotaTestCase
{
    public function test_listagem_admin_respeita_permissao_e_empresa_atual(): void
    {
        $empresaAtual = $this->criarEmpresa('Empresa Atual');
        $outraEmpresa = $this->criarEmpresa('Outra Empresa');
        $usuario = $this->criarUsuario($empresaAtual);

        $this->concederPermissao(
            $usuario,
            $empresaAtual,
            'admin.frota.veiculos.index',
            ['list'],
        );

        $this->criarVeiculo($empresaAtual, ['prefixo' => 'VISIVEL']);
        $this->criarVeiculo($outraEmpresa, ['prefixo' => 'OCULTO']);

        $this->comContexto($usuario, $empresaAtual)
            ->get(route('admin.frota.veiculos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Frota/Veiculos/Index')
                ->has('veiculos.data', 1)
                ->where('veiculos.data.0.prefixo', 'VISIVEL')
            );
    }
}
