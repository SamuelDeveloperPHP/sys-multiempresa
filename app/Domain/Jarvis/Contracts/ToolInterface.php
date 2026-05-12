<?php

namespace App\Domain\Jarvis\Contracts;

interface ToolInterface
{
    public function name(): string;
    public function description(): string;
    public function permission(): string;
    public function schema(): array;
    public function requiresApproval(array $arguments, array $context = []): bool;
    public function execute(array $arguments, array $context = []): array;
}
