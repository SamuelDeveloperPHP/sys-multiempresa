<?php

namespace Database\Seeders;

use App\Models\Frota\Combustivel;
use App\Models\Frota\VeiculoAbastecimento;
use Illuminate\Database\Seeder;

/**
 * Casa os abastecimentos legados (combustível em texto livre) com a lista
 * de combustiveis, preenchendo id_combustivel por aproximação. Só toca em
 * registros ainda sem vínculo; o que não casar fica nulo (cai no fator antigo).
 *
 * Idempotente e seguro para rodar de novo:
 *   php artisan db:seed --class=AbastecimentoCombustivelBackfillSeeder
 */
class AbastecimentoCombustivelBackfillSeeder extends Seeder
{
    public function run(): void
    {
        $byNome = Combustivel::pluck('id', 'nome'); // ['Diesel S10' => 1, ...]

        // Padrão de casamento (ordem importa: mais específico primeiro).
        $regras = [
            ['/s\-?500/i',                       'Diesel S500'],
            ['/s\-?10|diesel\s*s10/i',           'Diesel S10'],
            ['/gasolina.*aditiv|aditiv.*gasol/i','Gasolina aditivada'],
            ['/gasolina/i',                      'Gasolina comum'],
            ['/etanol|alco[oó]l/i',              'Etanol hidratado'],
            ['/diesel/i',                        'Diesel S10'], // diesel genérico -> S10
        ];

        $resolver = function (?string $txt) use ($regras, $byNome): ?int {
            $txt = trim((string) $txt);
            if ($txt === '') return null;
            foreach ($regras as [$re, $nome]) {
                if (preg_match($re, $txt) && isset($byNome[$nome])) {
                    return $byNome[$nome];
                }
            }
            return null;
        };

        $casados = 0; $semCasar = 0;
        VeiculoAbastecimento::withoutGlobalScopes()
            ->whereNull('id_combustivel')
            ->whereNotNull('combustivel')
            ->chunkById(500, function ($lote) use ($resolver, &$casados, &$semCasar) {
                foreach ($lote as $ab) {
                    $id = $resolver($ab->combustivel);
                    if ($id) {
                        $ab->id_combustivel = $id;
                        $ab->saveQuietly();
                        $casados++;
                    } else {
                        $semCasar++;
                    }
                }
            });

        $this->command?->info("Abastecimentos casados: {$casados} | sem casar (id nulo): {$semCasar}");
    }
}
