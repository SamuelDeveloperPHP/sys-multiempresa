<?php

namespace App\Infrastructure\Jarvis\Approval;

use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;
use App\Models\JarvisApprovalRequest;
use Illuminate\Support\Str;

class DatabaseApprovalGateway implements ApprovalGatewayInterface
{
    /**
     * Abre uma solicitação de aprovação para execução de tool.
     *
     * Retorno esperado pelo ExecuteTool:
     *   ['id' => int|null, 'status' => string, 'metadata' => array]
     */
    public function open(array $payload): array
    {
        $request = JarvisApprovalRequest::create([
            'uuid'            => (string) Str::uuid(),
            'company_id'      => (int) ($payload['company_id'] ?? 0),
            'user_id'         => (int) ($payload['user_id'] ?? 0),
            'conversation_id' => isset($payload['conversation_id']) ? (int) $payload['conversation_id'] : null,
            'tool_name'       => (string) ($payload['tool_name'] ?? ''),
            'arguments'       => $payload['arguments'] ?? [],
            'status'          => 'pending',
            'meta'            => $payload,
        ]);

        return [
            'id'       => $request->id,
            'uuid'     => $request->uuid,
            'status'   => 'pending',
            'metadata' => $payload,
        ];
    }
}
