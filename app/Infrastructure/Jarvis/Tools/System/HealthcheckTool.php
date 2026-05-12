<?php

namespace App\Infrastructure\Jarvis\Tools\System;

use App\Domain\Jarvis\Contracts\ToolInterface;

class HealthcheckTool implements ToolInterface
{
    public function name(): string { return 'system.healthcheck'; }
    public function description(): string { return 'Valida se o módulo Jarvis está respondendo e mostra informações básicas do ambiente.'; }
    public function permission(): string { return 'jarvis.system.healthcheck'; }
    public function schema(): array { return ['type' => 'object', 'properties' => []]; }
    public function requiresApproval(array $arguments, array $context = []): bool { return false; }
    public function execute(array $arguments, array $context = []): array
    {
        return [
            'app_name' => config('app.name'),
            'app_env' => config('app.env'),
            'php_version' => PHP_VERSION,
            'timestamp' => now()->toIso8601String(),
            'company_id' => $context['company_id'] ?? null,
            'user_id' => $context['user_id'] ?? null,
        ];
    }
}
