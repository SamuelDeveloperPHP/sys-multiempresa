<?php

namespace App\Infrastructure\Jarvis\Audit;

use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use Illuminate\Support\Facades\Log;

class NoOpAuditGateway implements AuditGatewayInterface
{
    public function log(array $payload): void
    {
        Log::channel(config('logging.default'))->info('jarvis.audit', $payload);
    }
}
