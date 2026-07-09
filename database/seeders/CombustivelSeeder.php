<?php

namespace Database\Seeders;

use App\Models\Frota\Combustivel;
use Illuminate\Database\Seeder;

/**
 * Combustíveis + fatores de emissão de referência.
 *
 * ⚠️ VALORES DE REFERÊNCIA — conferir anualmente contra a tabela do
 * Programa Brasileiro GHG Protocol e o % de mistura vigente da ANP
 * (biodiesel no diesel; etanol anidro na gasolina). Editável pelo admin.
 *
 * fator_fossil / fator_biogenico = kg CO₂ por litro do componente PURO.
 * perc_biogenico = fração da mistura de bomba que é biogênica (0..1).
 *
 * Idempotente (updateOrCreate por nome): pode rodar de novo sem duplicar.
 */
class CombustivelSeeder extends Seeder
{
    public function run(): void
    {
        $itens = [
            // nome, fator_fossil, fator_biogenico, perc_biogenico, ordem
            ['Diesel S10',          2.6030, 2.4310, 0.1400, 10],
            ['Diesel S500',         2.6030, 2.4310, 0.1400, 20],
            ['Gasolina comum',      2.2120, 1.5260, 0.2700, 30],
            ['Gasolina aditivada',  2.2120, 1.5260, 0.2700, 40],
            ['Etanol hidratado',    0.0000, 1.4570, 1.0000, 50],
        ];

        foreach ($itens as [$nome, $ff, $fb, $pb, $ordem]) {
            Combustivel::updateOrCreate(
                ['nome' => $nome],
                ['fator_fossil' => $ff, 'fator_biogenico' => $fb, 'perc_biogenico' => $pb, 'ordem' => $ordem, 'ativo' => true],
            );
        }
    }
}
