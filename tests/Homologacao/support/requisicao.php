<?php

use App\Models\User;
use Tests\TestCase;

require dirname(__DIR__, 3).'/vendor/autoload.php';

// Processo HTTP independente, exclusivo da instância descartável do executor.
final class RequisicaoConcorrente extends TestCase
{
    public function executar(string $entrada): void
    {
        $this->refreshApplication();
        if (!app()->environment('testing') || config('database.connections.mysql.database') !== 'frota_qa') {
            throw new RuntimeException('Banco de homologação obrigatório.');
        }
        config(['session.driver' => 'array', 'cache.default' => 'array']);
        [$empresa, $usuario, $rota, $payload, $barreira] = json_decode(file_get_contents($entrada), true, flags: JSON_THROW_ON_ERROR);
        $this->actingAs(User::findOrFail($usuario))->withSession(['current_company_id' => $empresa]);
        touch($entrada.'.ready');
        $limite = microtime(true) + 100;
        while (!is_file($barreira)) {
            if (microtime(true) >= $limite) {
                throw new RuntimeException('Barreira expirou.');
            }
            usleep(10000);
            clearstatcache();
        }
        $response = $this->postJson($rota, $payload);
        echo 'HTTP '.$response->getStatusCode()."\n";
        if ($response->getStatusCode() >= 500) {
            fwrite(STDERR, $response->exception?->getMessage() ?? 'Erro no servidor de teste.');
        }
    }
}

(new RequisicaoConcorrente('executar'))->executar($argv[1]);
