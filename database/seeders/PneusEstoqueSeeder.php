<?php

namespace Database\Seeders;

use App\Models\Frota\Pneu;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Popula o catalogo de Pneus com um lote em ESTOQUE para testes (montar,
 * trocar, rodizio, recapar). Idempotente por numero_fogo (EST-####).
 *
 *   php artisan db:seed --class=PneusEstoqueSeeder
 */
class PneusEstoqueSeeder extends Seeder
{
    public function run(): void
    {
        // [medida, marcas[], desenho, sulco_novo, valor_base, qtd]
        $grupos = [
            ['295/80 R22.5', ['Michelin', 'Pirelli', 'Bridgestone', 'Goodyear'], 'Borrachudo', 16, 2600, 14], // caminhoes/onibus
            ['275/80 R22.5', ['Firestone', 'Continental'], 'Misto', 15, 2300, 3],
            ['225/75 R16C',  ['Michelin', 'Goodyear'], 'Misto', 10, 950, 6],   // Sprinter/Master/Ducato
            ['195/65 R15',   ['Pirelli', 'Firestone'], 'Direcional', 8, 480, 3], // Polo
            ['12.5/80-18',   ['Titan', 'Firestone'], 'OTR (linha amarela)', 20, 1800, 2], // retro dianteiro
            ['19.5L-24',     ['Titan', 'Firestone'], 'OTR (linha amarela)', 30, 3200, 2], // retro traseiro
            ['12-16.5',      ['Camso', 'Michelin'], 'OTR (linha amarela)', 14, 1400, 4],   // skid Bobcat
        ];
        $vidas = [0, 0, 0, 1, 0, 0, 2, 0, 0, 1]; // maioria novos; alguns recap p/ testar CPK

        $i = 0; $criados = 0;
        foreach ($grupos as [$medida, $marcas, $desenho, $sulco, $valorBase, $qtd]) {
            for ($k = 0; $k < $qtd; $k++) {
                $i++;
                $fogo   = 'EST-' . str_pad((string) $i, 4, '0', STR_PAD_LEFT);
                $marca  = $marcas[$k % count($marcas)];
                $vida   = $vidas[$i % count($vidas)];
                $valor  = $valorBase + ($i % 5) * 40 - $vida * 200; // recap custa menos

                $pneu = Pneu::withoutGlobalScopes()->firstOrCreate(
                    ['numero_fogo' => $fogo, 'company_id' => 1],
                    [
                        'dot'           => sprintf('%02d%02d', 5 + ($i % 40), 23 + ($i % 2)),
                        'marca'         => $marca,
                        'medida'        => $medida,
                        'desenho'       => $desenho,
                        'tipo'          => 'radial',
                        'vida_atual'    => $vida,
                        'valor_compra'  => $valor,
                        'data_compra'   => Carbon::now()->subDays($i * 9)->toDateString(),
                        'sulco_novo_mm' => $sulco,
                        'situacao'      => 'estoque',
                        'user_create'   => 'seeder',
                    ]
                );
                if ($pneu->wasRecentlyCreated) $criados++;
            }
        }

        $this->command->info("Pneus em estoque criados: {$criados} (de {$i} no lote; ja existentes foram ignorados).");
    }
}
