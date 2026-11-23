<?php

namespace App\Http\Controllers\Mobile;

use App\Helpers\CompanyContext;
use App\Models\Frota\VeiculoAbastecimento;
use App\Models\Frota\VeiculoChecklistServico;
use App\Models\Frota\VeiculoDiarioBordo;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

final class EvidenciaController
{
    public function __invoke(string $tipo, string $nome, ?int $execucao = null)
    {
        $empresa = CompanyContext::id();
        abort_unless($empresa, 404);
        $path = "uploads/aplicativo/{$tipo}/{$nome}";
        if ($tipo === 'checklist_servicos') {
            $registro = VeiculoChecklistServico::where('company_id', $empresa)->findOrFail($execucao ?? 0);
            abort_unless(collect($registro->respostas)->contains('foto_path', $path), 404);
        } elseif ($tipo === 'diario_bordo') {
            $registro = VeiculoDiarioBordo::where('company_id', $empresa)
                ->where(fn ($q) => $q->where('arquivo_app', $nome)->orWhere('arquivo_fechamento_app', $nome))->firstOrFail();
        } else {
            $registro = VeiculoAbastecimento::where('company_id', $empresa)->where('arquivo_app', $nome)->firstOrFail();
        }
        abort_unless(Gate::allows('view', $registro), 404);
        $disco = Storage::disk('local');
        $arquivo = "empresas/{$empresa}/{$path}";
        abort_unless($disco->exists($arquivo), 404);
        return $disco->response($arquivo, $nome, [
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }
}
