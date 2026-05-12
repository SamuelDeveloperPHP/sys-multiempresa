<?php

namespace App\Domain\Jarvis\DTOs;

final class ToolCallData
{
    public function __construct(
        public readonly string $type,
        public readonly string $content,
        public readonly ?string $toolName = null,
        public readonly array $arguments = [],
    ) {
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            type: (string) ($payload['type'] ?? 'text'),
            content: (string) ($payload['content'] ?? ''),
            toolName: isset($payload['tool_name']) ? (string) $payload['tool_name'] : null,
            arguments: (array) ($payload['arguments'] ?? []),
        );
    }

    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'content' => $this->content,
            'tool_name' => $this->toolName,
            'arguments' => $this->arguments,
        ];
    }
}
