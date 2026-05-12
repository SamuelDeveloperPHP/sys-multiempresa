<?php

namespace App\Domain\Jarvis\Contracts;

interface AuditGatewayInterface
{
    public function log(array $payload): void;
}
