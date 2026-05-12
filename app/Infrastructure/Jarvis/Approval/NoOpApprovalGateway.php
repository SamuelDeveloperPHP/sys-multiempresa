<?php

namespace App\Infrastructure\Jarvis\Approval;

use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;

class NoOpApprovalGateway implements ApprovalGatewayInterface
{
    public function open(array $payload): array
    {
        return [
            'id' => null,
            'status' => 'not_configured',
            'metadata' => $payload,
        ];
    }
}
