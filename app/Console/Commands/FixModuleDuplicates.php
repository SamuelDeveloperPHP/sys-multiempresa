<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Limpa duplicatas e inconsistências nas tabelas modules e module_permissions.
 *
 * Uso:
 *   php artisan modules:fix          — exibe o diagnóstico e pede confirmação
 *   php artisan modules:fix --force  — executa sem pedir confirmação
 *   php artisan modules:fix --dry-run — só mostra o que seria feito, sem alterar nada
 */
class FixModuleDuplicates extends Command
{
    protected $signature = 'modules:fix
                            {--force   : Executa sem pedir confirmação}
                            {--dry-run : Mostra o que seria feito sem alterar dados}';

    protected $description = 'Limpa duplicatas e permissões órfãs nas tabelas modules e module_permissions';

    public function handle(): int
    {
        $dry = $this->option('dry-run');

        $this->line('');
        $this->info('=== Diagnóstico: modules & module_permissions ===');
        $this->line('');

        // ----------------------------------------------------------------
        // 1. MÓDULOS DUPLICADOS (mesmo slug, IDs diferentes)
        // ----------------------------------------------------------------
        $duplicateSlugs = DB::table('modules')
            ->select('slug', DB::raw('COUNT(*) as total'), DB::raw('MIN(id) as keep_id'))
            ->groupBy('slug')
            ->having('total', '>', 1)
            ->get();

        if ($duplicateSlugs->isEmpty()) {
            $this->line('  <fg=green>✓</> Sem slugs duplicados em modules.');
        } else {
            $this->warn("  ✗ {$duplicateSlugs->count()} slug(s) duplicado(s) encontrado(s):");
            foreach ($duplicateSlugs as $row) {
                $this->line("    slug=\"{$row->slug}\" → {$row->total} linhas (manter ID {$row->keep_id})");
            }
        }

        // ----------------------------------------------------------------
        // 2. PERMISSÕES ÓRFÃS (module_id sem módulo correspondente)
        // ----------------------------------------------------------------
        $orphanedPerms = DB::table('module_permissions as mp')
            ->leftJoin('modules as m', 'm.id', '=', 'mp.module_id')
            ->whereNull('m.id')
            ->count();

        if ($orphanedPerms === 0) {
            $this->line('  <fg=green>✓</> Sem permissões órfãs.');
        } else {
            $this->warn("  ✗ {$orphanedPerms} permissão(ões) órfã(s) (module_id inexistente).");
        }

        // ----------------------------------------------------------------
        // 3. parent_id = 0 em vez de NULL (quebra queries whereNull)
        // ----------------------------------------------------------------
        $parentZero = DB::table('modules')->where('parent_id', 0)->count();

        if ($parentZero === 0) {
            $this->line('  <fg=green>✓</> Nenhum módulo com parent_id = 0.');
        } else {
            $this->warn("  ✗ {$parentZero} módulo(s) com parent_id = 0 (deveria ser NULL para raiz).");
        }

        // ----------------------------------------------------------------
        // 4. id_modulo_relacionamento = 0 em vez de NULL
        // ----------------------------------------------------------------
        $relZero = DB::table('modules')->where('id_modulo_relacionamento', 0)->count();

        if ($relZero === 0) {
            $this->line('  <fg=green>✓</> Nenhum módulo com id_modulo_relacionamento = 0.');
        } else {
            $this->warn("  ✗ {$relZero} módulo(s) com id_modulo_relacionamento = 0 (deveria ser NULL para raiz).");
        }

        // ----------------------------------------------------------------
        // 5. Módulos sem route_name (invisíveis ao middleware ACL)
        // ----------------------------------------------------------------
        $semRota = DB::table('modules')->whereNull('route_name')->orWhere('route_name', '')->get(['id', 'slug', 'name']);

        if ($semRota->isEmpty()) {
            $this->line('  <fg=green>✓</> Todos os módulos têm route_name.');
        } else {
            $this->warn("  ✗ {$semRota->count()} módulo(s) sem route_name (ACL os ignora):");
            foreach ($semRota as $m) {
                $this->line("    [{$m->id}] {$m->slug} — {$m->name}");
            }
        }

        // ----------------------------------------------------------------
        // PERMISSÕES DUPLICADAS (mesma combinação company+user+module)
        // ----------------------------------------------------------------
        $duplicatePerms = DB::table('module_permissions')
            ->select('company_id', 'user_id', 'module_id', DB::raw('COUNT(*) as total'))
            ->groupBy('company_id', 'user_id', 'module_id')
            ->having('total', '>', 1)
            ->count();

        if ($duplicatePerms === 0) {
            $this->line('  <fg=green>✓</> Sem permissões duplicadas.');
        } else {
            $this->warn("  ✗ {$duplicatePerms} combinação(ões) company+user+module com registros duplicados.");
        }

        $this->line('');

        // Nada a fazer
        if ($duplicateSlugs->isEmpty() && $orphanedPerms === 0 && $duplicatePerms === 0
            && $parentZero === 0 && $relZero === 0) {
            $this->info('Banco de dados está consistente. Nenhuma ação necessária.');
            return self::SUCCESS;
        }

        if ($dry) {
            $this->warn('[dry-run] Nenhuma alteração foi feita.');
            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Deseja corrigir os problemas encontrados?')) {
            $this->line('Operação cancelada.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($duplicateSlugs, $orphanedPerms, $duplicatePerms, $parentZero, $relZero) {

            // ----------------------------------------------------------------
            // Fix 1: remove slugs duplicados (mantém o menor ID)
            // ----------------------------------------------------------------
            if ($duplicateSlugs->isNotEmpty()) {
                foreach ($duplicateSlugs as $row) {
                    // IDs que serão removidos (todos exceto o keep_id)
                    $idsToDelete = DB::table('modules')
                        ->where('slug', $row->slug)
                        ->where('id', '!=', $row->keep_id)
                        ->pluck('id');

                    // Reatribuir filhos que apontam para os IDs a serem removidos
                    DB::table('modules')
                        ->whereIn('parent_id', $idsToDelete)
                        ->update(['parent_id' => $row->keep_id]);

                    // Remover permissões vinculadas a esses IDs duplicados
                    DB::table('module_permissions')
                        ->whereIn('module_id', $idsToDelete)
                        ->delete();

                    // Remover os módulos duplicados
                    $deleted = DB::table('modules')
                        ->where('slug', $row->slug)
                        ->where('id', '!=', $row->keep_id)
                        ->delete();

                    $this->line("  Removidos {$deleted} duplicata(s) do slug \"{$row->slug}\" (mantido ID {$row->keep_id}).");
                }
            }

            // ----------------------------------------------------------------
            // Fix 2: remove permissões órfãs
            // ----------------------------------------------------------------
            if ($orphanedPerms > 0) {
                $deleted = DB::table('module_permissions as mp')
                    ->leftJoin('modules as m', 'm.id', '=', 'mp.module_id')
                    ->whereNull('m.id')
                    ->delete();

                $this->line("  Removidas {$deleted} permissão(ões) órfã(s).");
            }

            // ----------------------------------------------------------------
            // Fix 3: parent_id = 0 → NULL para módulos raiz
            // ----------------------------------------------------------------
            if ($parentZero > 0) {
                $fixed = DB::table('modules')->where('parent_id', 0)->update(['parent_id' => null]);
                $this->line("  Corrigidos {$fixed} módulo(s): parent_id 0 → NULL.");
            }

            // ----------------------------------------------------------------
            // Fix 4: id_modulo_relacionamento = 0 → NULL para módulos raiz
            // ----------------------------------------------------------------
            if ($relZero > 0) {
                $fixed = DB::table('modules')->where('id_modulo_relacionamento', 0)->update(['id_modulo_relacionamento' => null]);
                $this->line("  Corrigidos {$fixed} módulo(s): id_modulo_relacionamento 0 → NULL.");
            }

            // ----------------------------------------------------------------
            // Fix 5: remove permissões duplicadas (mantém o menor ID por grupo)
            // ----------------------------------------------------------------
            if ($duplicatePerms > 0) {
                $groups = DB::table('module_permissions')
                    ->select('company_id', 'user_id', 'module_id', DB::raw('MIN(id) as keep_id'), DB::raw('COUNT(*) as total'))
                    ->groupBy('company_id', 'user_id', 'module_id')
                    ->having('total', '>', 1)
                    ->get();

                $totalRemoved = 0;
                foreach ($groups as $g) {
                    $removed = DB::table('module_permissions')
                        ->where('company_id', $g->company_id)
                        ->where('user_id', $g->user_id)
                        ->where('module_id', $g->module_id)
                        ->where('id', '!=', $g->keep_id)
                        ->delete();
                    $totalRemoved += $removed;
                }

                $this->line("  Removidas {$totalRemoved} permissão(ões) duplicada(s).");
            }
        });

        $this->line('');
        $this->info('Limpeza concluída com sucesso.');

        return self::SUCCESS;
    }
}
