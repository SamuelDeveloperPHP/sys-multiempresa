<?php

namespace App\Providers;

use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;
use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use App\Infrastructure\Jarvis\AI\AnthropicLlmClient;
use App\Infrastructure\Jarvis\AI\HeuristicLlmClient;
use App\Infrastructure\Jarvis\Approval\DatabaseApprovalGateway;
use App\Infrastructure\Jarvis\Audit\DatabaseAuditGateway;
use App\Infrastructure\Jarvis\Security\DefaultPermissionGateway;
use Illuminate\Support\ServiceProvider;

class JarvisServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../../config/jarvis.php', 'jarvis');

        // LLM Client: seleciona implementação via JARVIS_LLM_DRIVER no .env
        // Valores aceitos: 'heuristic' (padrão/dev) | 'anthropic' (produção)
        $driver = config('jarvis.llm_driver', 'heuristic');

        if ($driver === 'anthropic') {
            $this->app->singleton(LlmClientInterface::class, AnthropicLlmClient::class);
        } else {
            $this->app->singleton(LlmClientInterface::class, HeuristicLlmClient::class);
        }

        $this->app->singleton(PermissionGatewayInterface::class, DefaultPermissionGateway::class);
        $this->app->singleton(ApprovalGatewayInterface::class, DatabaseApprovalGateway::class);
        $this->app->singleton(AuditGatewayInterface::class, DatabaseAuditGateway::class);
    }

    public function boot(): void
    {
        //
    }
}
