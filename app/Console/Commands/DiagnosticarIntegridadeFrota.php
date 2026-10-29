<?php

namespace App\Console\Commands;

use App\Services\Frota\DiagnosticoIntegridadeFrota;
use Illuminate\Console\Command;

class DiagnosticarIntegridadeFrota extends Command
{
    protected $signature = 'frota:diagnosticar-integridade
                            {--company= : Filtra por uma empresa}
                            {--json : Emite o diagnóstico em JSON}
                            {--fail-on-issues : Retorna código de falha quando houver inconsistências}';

    protected $description = 'Diagnostica inconsistências operacionais da Frota sem alterar dados';

    public function handle(DiagnosticoIntegridadeFrota $diagnostico): int
    {
        $companyId = $this->companyId();

        if ($companyId === false) {
            $this->error('A opção --company deve ser um inteiro positivo.');

            return self::INVALID;
        }

        $resultado = $diagnostico->executar($companyId);

        if ($this->option('json')) {
            $this->line((string) json_encode(
                $resultado,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
            ));
        } else {
            $this->renderizar($resultado);
        }

        if ($this->option('fail-on-issues') && $resultado['summary']['total_issue_groups'] > 0) {
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function companyId(): int|null|false
    {
        $value = $this->option('company');

        if ($value === null || $value === '') {
            return null;
        }

        $value = (string) $value;

        return ctype_digit($value) && (int) $value > 0 ? (int) $value : false;
    }

    private function renderizar(array $resultado): void
    {
        $filtro = $resultado['filters']['company_id'];
        $this->info('Diagnóstico de integridade da Frota (somente leitura)');
        $this->line('Empresa: ' . ($filtro ?? 'todas'));

        foreach ($resultado['checks'] as $check) {
            $this->newLine();
            $this->line(sprintf(
                '<options=bold>%s</> — %d grupo(s), %d registro(s) afetado(s)',
                $check['label'],
                $check['issue_count'],
                $check['affected_records'],
            ));

            if ($check['records'] === []) {
                $this->line('  Nenhuma inconsistência.');
                continue;
            }

            $this->table(
                array_keys($check['records'][0]),
                array_map(
                    fn (array $row): array => array_map(
                        fn (mixed $value): string => is_array($value)
                            ? implode(',', $value)
                            : ($value === null ? 'NULL' : (string) $value),
                        $row,
                    ),
                    $check['records'],
                ),
            );
        }

        $this->newLine();
        $this->info(sprintf(
            'Resumo: %d verificação(ões) com problema, %d grupo(s), %d registro(s) afetado(s).',
            $resultado['summary']['checks_with_issues'],
            $resultado['summary']['total_issue_groups'],
            $resultado['summary']['total_affected_records'],
        ));
    }
}
