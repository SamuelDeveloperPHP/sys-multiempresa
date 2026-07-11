<?php

namespace Database\Seeders;

use App\Models\Frota\Veiculo;
use App\Services\Frota\SugeridorLayoutPneu;
use Illuminate\Database\Seeder;

/**
 * Preenche veiculos.config_pneus dos casos obvios a partir da sugestao por
 * palavra-chave (veiculo/modelo). Nao sobrescreve quem ja tem layout; deixa em
 * branco os ambiguos/sem-pneu (munck, esteira, estacionario, implemento).
 *
 *   php artisan db:seed --class=PneusConfigBackfillSeeder
 */
class PneusConfigBackfillSeeder extends Seeder
{
    public function run(): void
    {
        $sug = app(SugeridorLayoutPneu::class);
        $slugs = array_keys(config('frota_pneus.layouts', []));

        $aplicados = 0; $pulados = 0; $porLayout = [];

        Veiculo::withoutGlobalScopes()->whereNull('deleted_at')->whereNull('config_pneus')
            ->get(['id', 'prefixo', 'veiculo', 'modelo', 'config_pneus'])
            ->each(function (Veiculo $v) use ($sug, $slugs, &$aplicados, &$pulados, &$porLayout) {
                $slug = $sug->sugerir($v->veiculo, $v->modelo);
                if (! $slug || ! in_array($slug, $slugs, true)) { $pulados++; return; }
                $v->update(['config_pneus' => $slug]);
                $aplicados++;
                $porLayout[$slug] = ($porLayout[$slug] ?? 0) + 1;
            });

        $this->command->info("config_pneus preenchido em {$aplicados} veiculo(s); {$pulados} deixado(s) em branco (ambiguo/sem pneu).");
        foreach ($porLayout as $slug => $qtd) {
            $this->command->line("  - {$slug}: {$qtd}");
        }
    }
}
