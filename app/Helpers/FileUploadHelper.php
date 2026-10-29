<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FileUploadHelper
{
    public const DISK = 'local';
    public const ROOT = 'public/uploads';
    public const MAX_BYTES = 20 * 1024 * 1024;

    private const MIME_EXTENSIONS = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    /** Store an uploaded file beneath storage/app/private/public/uploads. */
    public static function store(UploadedFile $file, string $directory): string
    {
        if (! $file->isValid() || $file->getSize() > self::MAX_BYTES) {
            throw ValidationException::withMessages(['file' => 'O arquivo é inválido ou excede 20 MB.']);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $mime = strtolower((string) $file->getMimeType());
        self::assertAllowed($extension, $mime);

        return self::write($file->getRealPath(), $directory, self::MIME_EXTENSIONS[$mime]);
    }

    /** Store binary data from trusted app features such as the employee photo editor. */
    public static function storeContents(string $contents, string $directory, string $extension): string
    {
        if ($contents === '' || strlen($contents) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['file' => 'O arquivo é inválido ou excede 20 MB.']);
        }

        $extension = strtolower(ltrim($extension, '.'));
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents) ?: '';
        self::assertAllowed($extension, $mime);

        return self::writeContents($contents, $directory, self::MIME_EXTENSIONS[$mime]);
    }

    /** Store a replacement, persist its new path, then remove the old file. */
    public static function replace(?string $oldPath, UploadedFile $file, string $directory, callable $persist): string
    {
        $newPath = self::store($file, $directory);

        return self::persistReplacement($oldPath, $newPath, $persist);
    }

    /** Replace a file created from binary data, such as a canvas photo. */
    public static function replaceContents(?string $oldPath, string $contents, string $directory, string $extension, callable $persist): string
    {
        $newPath = self::storeContents($contents, $directory, $extension);

        return self::persistReplacement($oldPath, $newPath, $persist);
    }

    /** Serve an allowed private file inline or as a download. */
    public static function serve(string $path, bool $download = false, ?string $ownerDirectory = null): BinaryFileResponse
    {
        $path = self::normalizeManagedPath($path);
        abort_unless($path, 404);
        if ($ownerDirectory !== null) {
            $expectedPrefix = self::ROOT.'/'.self::sanitizeDirectory($ownerDirectory).'/';
            abort_unless(str_starts_with($path, $expectedPrefix), 404);
        }

        $disk = Storage::disk(self::DISK);
        abort_unless($disk->exists($path), 404);

        $absolutePath = $disk->path($path);
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($absolutePath) ?: '';
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        abort_unless(self::isAllowed($extension, $mime), 404);

        $response = response()->file($absolutePath, [
            'Content-Type' => $mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);

        if ($download) {
            $response->headers->set(
                'Content-Disposition',
                $response->headers->makeDisposition('attachment', basename($path))
            );
        }

        return $response;
    }

    /** Remove a file only when its path is inside the managed private uploads folder. */
    public static function delete(?string $path): bool
    {
        $path = $path ? self::normalizeManagedPath($path) : null;

        return $path ? Storage::disk(self::DISK)->delete($path) : false;
    }

    public static function normalizeManagedPath(string $path): ?string
    {
        $path = str_replace('\\', '/', trim($path));
        $path = ltrim($path, '/');

        if (! str_starts_with($path, self::ROOT.'/') || str_contains($path, '../') || str_contains($path, '/..')) {
            return null;
        }

        return $path;
    }

    private static function write(string|false $source, string $directory, string $extension): string
    {
        if (! $source || ! is_file($source)) {
            throw ValidationException::withMessages(['file' => 'Não foi possível ler o arquivo enviado.']);
        }

        return self::writeContents((string) file_get_contents($source), $directory, $extension);
    }

    private static function writeContents(string $contents, string $directory, string $extension): string
    {
        $directory = self::sanitizeDirectory($directory);
        $path = self::ROOT.'/'.$directory.'/'.Str::uuid().'.'.$extension;
        abort_unless(Storage::disk(self::DISK)->put($path, $contents), 500, 'Falha ao salvar o arquivo.');

        return $path;
    }

    private static function persistReplacement(?string $oldPath, string $newPath, callable $persist): string
    {
        try {
            if ($persist($newPath) === false) {
                throw new \RuntimeException('Não foi possível atualizar o registro do arquivo.');
            }
        } catch (\Throwable $exception) {
            self::delete($newPath);
            throw $exception;
        }

        if ($oldPath && $oldPath !== $newPath) self::delete($oldPath);

        return $newPath;
    }

    private static function sanitizeDirectory(string $directory): string
    {
        $segments = explode('/', str_replace('\\', '/', trim($directory, '/')));
        abort_if($directory === '' || collect($segments)->contains(fn ($segment) => $segment === '' || $segment === '.' || $segment === '..' || ! preg_match('/^[A-Za-z0-9_-]+$/', $segment)), 422, 'Pasta de destino inválida.');
        abort_unless(in_array($segments[0], ['funcionarios', 'veiculos'], true), 422, 'Pasta de destino inválida.');

        return implode('/', $segments);
    }

    private static function assertAllowed(string $extension, string $mime): void
    {
        if (! self::isAllowed($extension, $mime)) {
            throw ValidationException::withMessages(['file' => 'Formato não permitido. Envie somente PDF, JPEG, JPG ou PNG.']);
        }
    }

    private static function isAllowed(string $extension, string $mime): bool
    {
        $extension = strtolower($extension);
        $mime = strtolower($mime);

        return match ($mime) {
            'application/pdf' => $extension === 'pdf',
            'image/jpeg' => in_array($extension, ['jpg', 'jpeg'], true),
            'image/png' => $extension === 'png',
            default => false,
        };
    }
}
