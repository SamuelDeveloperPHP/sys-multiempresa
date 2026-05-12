<?php

namespace App\Domain\Jarvis\Contracts;

interface ApprovalGatewayInterface
{
    public function open(array $payload): array;
}
