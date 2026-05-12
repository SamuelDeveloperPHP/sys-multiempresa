<?php

namespace App\Domain\Jarvis\Contracts;

use App\Domain\Jarvis\DTOs\ToolCallData;
use App\Models\JarvisConversation;

interface LlmClientInterface
{
    public function decide(JarvisConversation $conversation, array $messages, array $availableTools = []): ToolCallData;
}
