<?php

namespace App\Console\Commands;

use App\Services\Frota\VersionarChecklistsLegados;
use Illuminate\Console\Command;

class VersionarChecklistsFrota extends Command
{
    protected $signature = 'frota:versionar-checklists
                            {--company= : Filtra por uma empresa}
                            {--execute : Grava snapshots e resultados; sem esta opção apenas diagnostica}
                            {--json : Emite o resultado em JSON}';

    protected $description = 'Congela a versão dos checklists legados de forma idempotente';

    public function handle(VersionarChecklistsLegados $versioner): int
    {
        $companyId = $this->companyId();
        if ($companyId === false) {
            $this->error('A opção --company deve ser um inteiro positivo.');

            return self::INVALID;
        }

        $result = $this->option('execute')
            ? $versioner->execute($companyId)
            : ['dry_run' => true, 'before' => $versioner->inspect($companyId)];

        if ($this->option('json')) {
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        } else {
            $this->info($this->option('execute') ? 'Versionamento concluído.' : 'Dry-run: nenhum dado foi alterado.');
            $this->table(['Métrica', 'Quantidade'], collect($result['before'])->except('company_id')->map(
                fn (int $count, string $key): array => [$key, $count],
            )->values()->all());
        }

        return self::SUCCESS;
    }

    private function companyId(): int|null|false
    {
        $value = $this->option('company');

        if ($value === null || $value === '') {
            return null;
        }

        return ctype_digit((string) $value) && (int) $value > 0 ? (int) $value : false;
    }
}
