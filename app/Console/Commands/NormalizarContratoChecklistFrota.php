<?php

namespace App\Console\Commands;

use App\Services\Frota\NormalizarContratoChecklist;
use Illuminate\Console\Command;

class NormalizarContratoChecklistFrota extends Command
{
    protected $signature = 'frota:normalizar-checklists
                            {--company= : Filtra por uma empresa}
                            {--execute : Aplica o backfill; sem esta opção apenas diagnostica}
                            {--json : Emite o resultado em JSON}';

    protected $description = 'Normaliza datas e status do contrato de checklist de forma idempotente';

    public function handle(NormalizarContratoChecklist $normalizer): int
    {
        $companyId = $this->companyId();

        if ($companyId === false) {
            $this->error('A opção --company deve ser um inteiro positivo.');

            return self::INVALID;
        }

        $result = $this->option('execute')
            ? $normalizer->execute($companyId)
            : ['dry_run' => true, 'before' => $normalizer->inspect($companyId)];

        if ($this->option('json')) {
            $this->line((string) json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        } else {
            $this->info($this->option('execute') ? 'Backfill concluído.' : 'Dry-run: nenhum dado foi alterado.');
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
