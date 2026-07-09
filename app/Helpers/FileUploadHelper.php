<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Str;
use Psr\Http\Message\StreamInterface;

use ZipArchive;

class FileUploadHelper
{
    /** Lê credenciais de config('services.onedrive.*') — definidas SÓ via .env
     *  (MS_GRAPH_*). Sem defaults hardcoded: segredo não vive no código. */
    private static function siteId(): string
    {
        return (string) config('services.onedrive.site_id');
    }

    private static function rootFolder(): string
    {
        return config('services.onedrive.root_folder', 'SGA-Engeativos');
    }

    /* ==============================
     * TOKEN
     * ============================== */
    public static function getToken(): string
    {
        $clientID     = config('services.onedrive.client_id');
        $clientSecret = config('services.onedrive.client_secret');
        $tenantId     = config('services.onedrive.tenant_id');

        $scope       = 'https://graph.microsoft.com/.default';
        $tokenUrl    = "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/token";
        $tokenFile   = storage_path('app/public/token/token.json');

        if (is_file($tokenFile)) {
            $tokenData = json_decode(file_get_contents($tokenFile), true);
            if (!empty($tokenData['expires_at']) && time() < $tokenData['expires_at']) {
                return $tokenData['access_token'];
            }
        }
        return self::getNewToken($tokenUrl, $clientID, $clientSecret, $scope, $tokenFile);
    }

    public static function getNewToken(string $tokenUrl, string $clientID, string $clientSecret, string $scope, string $tokenFile): string
    {
        $data = [
            'grant_type'    => 'client_credentials',
            'client_id'     => $clientID,
            'client_secret' => $clientSecret,
            'scope'         => $scope,
        ];

        $ch = curl_init($tokenUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false, // habilite true em prod
        ]);
        $response = curl_exec($ch);
        $http     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        curl_close($ch);

        $json = json_decode($response, true);
        if ($http === 200 && !empty($json['access_token'])) {
            $json['expires_at'] = time() + ($json['expires_in'] ?? 3600);
            if (@file_put_contents($tokenFile, json_encode($json)) === false) {
                Log::error('Erro ao salvar token em token.json');
            }
            return $json['access_token'];
        }

        Log::error('Erro ao obter token MS Graph', ['status' => $http, 'resp' => $json, 'curl' => $err]);
        throw new \RuntimeException('Erro ao obter o token do Microsoft Graph');
    }

    /* ==============================
     * UPLOAD
     * ============================== */
    public static function uploadFilesToFolder(string $folderName, $files, string $folderPath): array
    {
        $siteId      = self::siteId();
        $accessToken = self::getToken();

        if (!is_array($files)) $files = [$files];

        $responses = [];
        foreach ($files as $file) {
            $fileSize   = $file->getSize();
            $fileName   = $file->getClientOriginalName();
            $path       = $folderPath . '/' . $folderName . '/' . $fileName;
            $segments   = array_map('rawurlencode', explode('/', $path));
            $encoded    = implode('/', $segments);

            if ($fileSize > 4 * 1024 * 1024) {
                $responses[] = self::uploadLargeFile($siteId, $encoded, $file, $accessToken);
            } else {
                $responses[] = self::uploadSmallFile($siteId, $encoded, $file, $accessToken);
            }
        }
        return $responses;
    }

    public static function uploadSmallFile(string $siteId, string $encodedPath, $file, string $accessToken): array
    {
        $url = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$encodedPath}:/content";
        $client = new Client(['verify' => false]);
        try {
            $res = $client->put($url, [
                'headers' => [
                    'Authorization' => 'Bearer '.$accessToken,
                    'Content-Type'  => $file->getClientMimeType(),
                ],
                'body' => fopen($file->getRealPath(), 'r'),
            ]);
            if (in_array($res->getStatusCode(), [200, 201], true)) {
                return ['status' => 'success', 'message' => 'Arquivo enviado com sucesso: '.$file->getClientOriginalName(), 'name_file' => $file->getClientOriginalName()];
            }
            return ['status' => 'error', 'message' => 'Erro HTTP '.$res->getStatusCode().' ao enviar: '.$file->getClientOriginalName()];
        } catch (RequestException $e) {
            Log::error('Erro uploadSmallFile', ['ex' => $e->getMessage()]);
            return ['status' => 'error', 'message' => 'Erro ao enviar: '.$file->getClientOriginalName().'. '.$e->getMessage()];
        }
    }

    public static function uploadLargeFile(string $siteId, string $encodedPath, $file, string $accessToken): array
    {
        $client = new Client(['verify' => false]);
        $createUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$encodedPath}:/createUploadSession";

        try {
            $res = $client->post($createUrl, [
                'headers' => [
                    'Authorization' => 'Bearer '.$accessToken,
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'item' => [
                        '@microsoft.graph.conflictBehavior' => 'rename',
                        'name' => $file->getClientOriginalName(),
                    ],
                ],
            ]);
            $body = json_decode($res->getBody(), true);
            $uploadUrl = $body['uploadUrl'] ?? null;
            if (!$uploadUrl) throw new \RuntimeException('Upload URL não recebido.');

            $stream     = fopen($file->getRealPath(), 'rb');
            $fileSize   = $file->getSize();
            $chunkSize  = 327680; // 320KB
            $bytesLeft  = $fileSize;
            $offset     = 0;

            while ($bytesLeft > 0) {
                $len   = min($chunkSize, $bytesLeft);
                $data  = fread($stream, $len);
                $start = $offset;
                $end   = $offset + $len - 1;

                $client->put($uploadUrl, [
                    'headers' => [
                        'Content-Length' => $len,
                        'Content-Range'  => "bytes {$start}-{$end}/{$fileSize}",
                    ],
                    'body' => $data,
                ]);

                $offset    += $len;
                $bytesLeft -= $len;
            }
            fclose($stream);

            return ['status' => 'success', 'message' => 'Arquivo enviado com sucesso: '.$file->getClientOriginalName(), 'name_file' => $file->getClientOriginalName()];
        } catch (RequestException $e) {
            Log::error('Erro uploadLargeFile', ['ex' => $e->getMessage()]);
            return ['status' => 'error', 'message' => 'Erro no upload grande: '.$file->getClientOriginalName().'. '.$e->getMessage()];
        }
    }

    /* ==============================
     * DOWNLOAD / STREAM / LISTAGEM
     * ============================== */
    public static function downloadFileByPath(string $folderPath, string $fileName)
    {
        $siteId = self::siteId();
        $client = new Client(['verify' => false]);
        $downloadUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$folderPath}/{$fileName}:/content";
        try {
            $res = $client->get($downloadUrl, [
                'headers' => ['Authorization' => 'Bearer '.self::getToken()],
                'stream'  => true,
            ]);
            $mime = $res->getHeaderLine('Content-Type') ?: 'application/octet-stream';

            return response()->stream(function () use ($res) {
                while (!$res->getBody()->eof()) {
                    echo $res->getBody()->read(1024);
                }
            }, 200, [
                'Content-Type'        => $mime,
                'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro downloadFileByPath', ['ex' => $e->getMessage()]);
            return response()->json(['error' => 'Erro ao fazer download'], 500);
        }
    }

    public static function viewFilePdfByPath(string $folderPath, string $fileName)
    {
        $siteId = self::siteId();
        $client = new Client(['verify' => false]);
        $downloadUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$folderPath}/{$fileName}:/content";
        try {
            $res = $client->get($downloadUrl, [
                'headers' => ['Authorization' => 'Bearer '.self::getToken()],
                'stream'  => true,
            ]);
            return response()->stream(function () use ($res) {
                while (!$res->getBody()->eof()) {
                    echo $res->getBody()->read(1024);
                }
            }, 200, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$fileName.'"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro viewFilePdfByPath', ['ex' => $e->getMessage()]);
            return response()->json(['error' => 'Erro ao visualizar arquivo'], 500);
        }
    }

    /** Lista arquivos (não recursivo por padrão). */
    /*public static function listFilesInFolder(string $folderPath, bool $recursive = false): array
    {
      //  
        
        $siteId = self::siteId();
        $client = new Client(['verify' => false]);
        $headers = ['Authorization' => 'Bearer '.self::getToken()];
        $baseUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/".rawurlencode($folderPath).":/children";
        $items  = [];
        $next   = $baseUrl;

        try {
            while ($next) {
                $res  = $client->get($next, ['headers' => $headers]);
                $data = json_decode((string) $res->getBody(), true);
                

                foreach (($data['value'] ?? []) as $entry) {
                    $name    = $entry['name'] ?? '';
                    $isFolder= isset($entry['folder']);
                    $path    = trim($folderPath.'/'.$name, '/');

                    if ($isFolder) {
                        if ($recursive) {
                            $items = array_merge($items, self::listFilesInFolder($path, true));
                        }
                        continue;
                    }

                    $items[] = [
                        'name'   => $name,
                        'size'   => $entry['size'] ?? null,
                        'webUrl' => $entry['webUrl'] ?? null,
                        'path'   => $path,
                    ];
                }

                $next = $data['@odata.nextLink'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::error('Erro listFilesInFolder', ['folder' => $folderPath, 'ex' => $e->getMessage()]);
        }

        return $items;
    }*/
    
    public static function listFilesInFolder(string $folderPath, bool $recursive = false): array
    {
        $siteId = self::siteId();
        $client = new Client(['verify' => false]);
        $headers = ['Authorization' => 'Bearer '.self::getToken()];
    
        $baseUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/".rawurlencode($folderPath).":/children";
        $items  = [];
        $next   = $baseUrl;
    
        try {
            while ($next) {
                $res  = $client->get($next, ['headers' => $headers]);
                $data = json_decode((string) $res->getBody(), true);
    
                foreach (($data['value'] ?? []) as $entry) {
                    $name     = $entry['name'] ?? '';
                    $isFolder = isset($entry['folder']);
                    $path     = trim($folderPath.'/'.$name, '/');
    
                    if ($isFolder) {
                        if ($recursive) {
                            $items = array_merge($items, self::listFilesInFolder($path, true));
                        }
                        continue;
                    }
    
                    $items[] = [
                        'name'   => $name,
                        'size'   => $entry['size'] ?? null,
                        'webUrl' => $entry['webUrl'] ?? null,
                        'path'   => $path,
                    ];
                }
    
                $next = $data['@odata.nextLink'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::error('Erro listFilesInFolder', [
                'folder' => $folderPath,
                'ex'     => $e->getMessage()
            ]);
        }
    
        return $items;
    }
    
    /**
     * Baixa uma pasta do OneDrive (e subpastas) em um único ZIP.
     *
     * @param  string $folderPath Caminho relativo em relação à raiz "SGA-Engeativos"
     *                            Ex.: "veiculos/13"
     */
    public static function downloadFolderAsZip(string $folderPath)
    {
        $siteId  = self::siteId();
        $client  = new Client(['verify' => false]);
        $headers = ['Authorization' => 'Bearer '.self::getToken()];

        // Arquivo temporário para o zip
        $tmpZipPath = storage_path('app/tmp_onedrive_'.uniqid().'.zip');
        $zip        = new ZipArchive();

        if ($zip->open($tmpZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Não foi possível criar o arquivo ZIP.');
        }

        try {
            // Começa a partir da pasta informada, relativo dentro do ZIP
            self::addFolderToZip(
                $client,
                $headers,
                $folderPath,
                $zip,
                '' // relativo dentro do zip
            );

            $zip->close();

            // Nome bonito pro download (último segmento do caminho)
            $folderName = basename($folderPath);

            return response()->download($tmpZipPath, $folderName.'.zip')->deleteFileAfterSend(true);

        } catch (\Throwable $e) {
            $zip->close();
            @unlink($tmpZipPath);

            Log::error('Erro ao gerar zip do OneDrive', [
                'folder' => $folderPath,
                'ex'     => $e->getMessage(),
            ]);

            abort(500, 'Erro ao gerar o arquivo compactado.');
        }
    }

    /**
     * Função recursiva que varre a pasta no OneDrive e adiciona
     * arquivos ao ZIP, preservando a estrutura de diretórios.
     */
    protected static function addFolderToZip(
        Client $client,
        array $headers,
        string $folderPath,
        ZipArchive $zip,
        string $relativePathInZip
    ): void {
        $siteId = self::siteId();

        $url = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/".rawurlencode($folderPath).":/children";

        while ($url) {
            $res  = $client->get($url, ['headers' => $headers]);
            $data = json_decode((string) $res->getBody(), true);

            foreach (($data['value'] ?? []) as $entry) {
                $name     = $entry['name'] ?? '';
                $isFolder = isset($entry['folder']);

                // Caminho "full" no OneDrive (para chamadas recursivas)
                $childFolderPath = trim($folderPath.'/'.$name, '/');

                // Caminho relativo dentro do zip
                $childRelativePath = ltrim($relativePathInZip.'/'.$name, '/');

                if ($isFolder) {
                    // Garante pasta vazia no zip também
                    $zip->addEmptyDir($childRelativePath);

                    // Chama recursivamente para a subpasta
                    self::addFolderToZip(
                        $client,
                        $headers,
                        $childFolderPath,
                        $zip,
                        $childRelativePath
                    );
                } else {
                    // Para arquivos, usamos o @microsoft.graph.downloadUrl
                    $downloadUrl = $entry['@microsoft.graph.downloadUrl'] ?? null;

                    if (!$downloadUrl) {
                        continue; // sem URL de download, pula
                    }

                    // Baixa o conteúdo do arquivo
                    $fileRes = $client->get($downloadUrl, [
                        // a URL de download já é autorizada, mas o header extra não atrapalha
                        'headers' => $headers,
                        'stream'  => true,
                    ]);

                    $content = $fileRes->getBody()->getContents();

                    // Adiciona o arquivo ao zip com o caminho relativo correto
                    $zip->addFromString($childRelativePath, $content);
                }
            }

            // Paginação, se tiver
            $url = $data['@odata.nextLink'] ?? null;
        }
    }

    /** Abre stream binário do arquivo (para salvar local/zip). */
    public static function openFileStream(string $path): ?StreamInterface
    {
        $siteId = self::siteId();
        $client = new Client(['verify' => false]);
        $downloadUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$path}:/content";
        try {
            $res = $client->get($downloadUrl, [
                'headers' => ['Authorization' => 'Bearer '.self::getToken()],
                'stream'  => true,
            ]);
            return $res->getBody();
        } catch (\Throwable $e) {
            Log::error('Erro openFileStream', ['path' => $path, 'ex' => $e->getMessage()]);
            return null;
        }
    }

    /** Salva stream em arquivo local absoluto. */
    public static function saveStreamToLocal(StreamInterface $body, string $absoluteDestPath): ?string
    {
        try {
            $dir = dirname($absoluteDestPath);
            if (!is_dir($dir)) @mkdir($dir, 0775, true);

            $out = fopen($absoluteDestPath, 'wb');
            if (!$out) return null;
            while (!$body->eof()) {
                fwrite($out, $body->read(1024 * 1024)); // 1MB
            }
            fclose($out);
            return $absoluteDestPath;
        } catch (\Throwable $e) {
            Log::error('Erro saveStreamToLocal', ['dest' => $absoluteDestPath, 'ex' => $e->getMessage()]);
            return null;
        }
    }

    /* ==============================
     * DELETE / UPDATE (rename)
     * ============================== */
    public static function deleteFile(string $encodedPath): array
    {
        $siteId = self::siteId();
        $url    = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$encodedPath}:";
        $client = new Client(['verify' => false]);
        try {
            $res = $client->delete($url, ['headers' => ['Authorization' => 'Bearer '.self::getToken()]]);
            if ($res->getStatusCode() === 204) {
                return ['title' => 'Sucesso!!!', 'message' => 'Arquivo deletado com sucesso!!!', 'type' => 'success'];
            }
            return ['status' => 'error', 'message' => 'Erro HTTP '.$res->getStatusCode().' ao excluir'];
        } catch (RequestException $e) {
            Log::error('Erro deleteFile', ['ex' => $e->getMessage()]);
            return ['status' => 'error', 'message' => 'Erro ao excluir arquivo: '.$e->getMessage()];
        }
    }

    /** Renomeia arquivo (PATCH) — precisa do novo nome! */
    public static function updateFileName(string $encodedPath, string $newName): array
    {
        $siteId = self::siteId();
        $url    = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drive/root:/SGA-Engeativos/{$encodedPath}:";
        $client = new Client(['verify' => false]);

        try {
            $res = $client->patch($url, [
                'headers' => [
                    'Authorization' => 'Bearer '.self::getToken(),
                    'Content-Type'  => 'application/json',
                ],
                'json' => ['name' => $newName],
            ]);

            if (in_array($res->getStatusCode(), [200, 201], true)) {
                return ['status' => 'success', 'message' => 'Arquivo atualizado com sucesso.', 'name_file' => $newName];
            }
            return ['status' => 'error', 'message' => 'Erro HTTP '.$res->getStatusCode().' ao atualizar nome'];
        } catch (RequestException $e) {
            Log::error('Erro updateFileName', ['ex' => $e->getMessage()]);
            return ['status' => 'error', 'message' => 'Erro ao atualizar nome: '.$e->getMessage()];
        }
    }
}
