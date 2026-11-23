<?php

namespace App\Services\Frota;

use App\Helpers\CompanyContext;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class EvidenciaMobile
{
    public function guardar(string $dataUrl, string $tipo): array
    {
        $empresa = CompanyContext::id();
        abort_unless($empresa, 403);
        $conteudo = base64_decode(Str::after($dataUrl, ','), true);
        $imagem = $conteudo ? @getimagesizefromstring($conteudo) : false;
        $formatos = ['image/jpeg' => 'jpeg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!$imagem || !isset($formatos[$imagem['mime']]) || $imagem[0] * $imagem[1] > 50000000) {
            throw ValidationException::withMessages(['foto' => 'Envie uma imagem JPEG, PNG ou WebP válida de até 50 megapixels.']);
        }
        $nome = 'priv-'.Str::uuid().'.'.$formatos[$imagem['mime']];
        $path = "uploads/aplicativo/{$tipo}/{$nome}";
        if (!Storage::disk('local')->put("empresas/{$empresa}/{$path}", $conteudo)) {
            throw new \RuntimeException('Falha ao persistir evidência privada.');
        }
        return ['nome' => $nome, 'path' => $path, 'url' => route('frota.evidencia', compact('tipo', 'nome'), false)];
    }
}
