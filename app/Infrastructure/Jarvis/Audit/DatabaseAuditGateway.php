<?php

namespace App\Infrastructure\Jarvis\Audit;

use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Models\JarvisAuditLog;
use Illuminate\Support\Facades\Log;

class DatabaseAuditGateway implements AuditGatewayInterface
{
    public function log(array $payload): void
    {
        try {
            JarvisAuditLog::create([
                'event_type'      => (string) ($payload['event_type'] ?? 'jarvis.unknown'),
                'company_id'      => isset($payload['company_id']) ? (int) $payload['company_id'] : null,
                'user_id'         => isset($payload['user_id']) ? (int) $payload['user_id'] : null,
                'conversation_id' => isset($payload['conversation_id']) ? (int) $payload['conversation_id'] : null,
                'tool_name'       => isset($payload['tool_name']) ? (string) $payload['tool_name'] : null,
                'request_uuid'    => isset($payload['request_uuid']) ? (string) $payload['request_uuid'] : null,
                'error_message'   => isset($payload['error_message']) ? (string) $payload['error_message'] : null,
                'payload'         => array_diff_key($payload, array_flip([
                    'event_type', 'company_id', 'user_id', 'conversation_id',
                    'tool_name', 'request_uuid', 'error_message',
                ])),
            ]);
        } catch (\Throwable $e) {
            // Falha de auditoria nunca deve quebrar o fluxo principal
            Log::error('jarvis.audit.db_failed', [
                'error'           => $e->getMessage(),
                'original_payload' => $payload,
            ]);
        }
    }
}
