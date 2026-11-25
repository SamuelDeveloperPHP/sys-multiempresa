<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicados = DB::table('pneus')
            ->select('company_id', 'numero_fogo', DB::raw('COUNT(*) as total'))
            ->groupBy('company_id', 'numero_fogo')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicados->isNotEmpty()) {
            throw new \RuntimeException('Existem números de fogo duplicados por empresa. Execute o diagnóstico de pneus antes da migration.');
        }

        $montagens = DB::table('pneus')
            ->where('situacao', 'montado')
            ->whereNull('deleted_at')
            ->get(['id', 'company_id'])
            ->map(function ($pneu) {
                $movimento = DB::table('pneu_movimentacoes')
                    ->where('pneu_id', $pneu->id)
                    ->whereIn('tipo', ['montagem', 'rodizio'])
                    ->whereNotNull('veiculo_id')
                    ->whereNotNull('posicao')
                    ->whereNull('deleted_at')
                    ->orderByDesc('data')
                    ->orderByDesc('id')
                    ->first(['id', 'veiculo_id', 'posicao', 'data']);

                if (! $pneu->company_id || ! $movimento) {
                    throw new \RuntimeException("Pneu montado {$pneu->id} não possui empresa ou movimentação válida.");
                }

                return [
                    'company_id' => (int) $pneu->company_id,
                    'pneu_id' => (int) $pneu->id,
                    'veiculo_id' => (int) $movimento->veiculo_id,
                    'posicao' => (string) $movimento->posicao,
                    'movimentacao_id' => (int) $movimento->id,
                    'montado_em' => $movimento->data,
                ];
            });

        $posicoesDuplicadas = $montagens
            ->groupBy(fn (array $item) => "{$item['company_id']}:{$item['veiculo_id']}:{$item['posicao']}")
            ->filter(fn ($grupo) => $grupo->count() > 1);

        if ($posicoesDuplicadas->isNotEmpty()) {
            throw new \RuntimeException('Existem posições de pneus ocupadas mais de uma vez. Execute o diagnóstico de pneus antes da migration.');
        }

        Schema::table('pneus', function (Blueprint $table) {
            $table->unique(['company_id', 'numero_fogo'], 'pneus_company_numero_fogo_unique');
        });

        Schema::create('pneu_montagens_ativas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('pneu_id')->unique()->constrained('pneus')->restrictOnDelete();
            $table->foreignId('veiculo_id')->constrained('veiculos')->restrictOnDelete();
            $table->string('posicao', 12);
            $table->foreignId('movimentacao_id')->nullable()->constrained('pneu_movimentacoes')->nullOnDelete();
            $table->date('montado_em');
            $table->timestamps();

            $table->unique(
                ['company_id', 'veiculo_id', 'posicao'],
                'pneu_montagens_company_veiculo_posicao_unique'
            );
            $table->index(['company_id', 'veiculo_id'], 'pneu_montagens_company_veiculo_index');
        });

        foreach ($montagens as $montagem) {
            DB::table('pneu_montagens_ativas')->insert($montagem + [
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pneu_montagens_ativas');

        Schema::table('pneus', function (Blueprint $table) {
            $table->dropUnique('pneus_company_numero_fogo_unique');
        });
    }
};
