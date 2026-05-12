<?php

namespace App\Application\UseCases\Jarvis;

use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\JarvisMessage;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Gera uma resposta textual do assistente baseada no histórico atual da conversa.
 * Útil para re-invocar o LLM após resultados de tools ou para respostas follow-up.
 */
class GenerateAssistantResponse
{
    public function __construct(
        private readonly LlmClientInterface $llmClient,
        private readonly ToolRegistry $toolRegistry,
        private readonly AuditGatewayInterface $auditGateway,
    ) {}

    public function handle(
        JarvisConversation $conversation,
        User $user,
        string $requestUuid,
        array $context = []
    ): JarvisMessage {
        return DB::transaction(function () use ($conversation, $user, $requestUuid, $context) {
            $messages = $conversation->messages()
                ->orderBy('id')
                ->get(['role', 'content', 'tool_name', 'tool_payload', 'tool_result'])
                ->map(fn (JarvisMessage $msg) => [
                    'role'         => $msg->role,
                    'content'      => $msg->content,
                    'tool_name'    => $msg->tool_name,
                    'tool_payload' => $msg->tool_payload,
                    'tool_result'  => $msg->tool_result,
                ])
                ->values()
                ->all();

            $decision = $this->llmClient->decide($conversation, $messages, $this->toolRegistry->all());

            $assistantMessage = JarvisMessage::create([
                'conversation_id' => $conversation->id,
                'role'            => 'assistant',
                'content'         => $decision->content,
                'meta'            => [
                    'request_uuid' => $requestUuid,
                    'source'       => 'generate_response',
                ],
            ]);

            $this->auditGateway->log([
                'event_type'      => 'jarvis.response.generated',
                'company_id'      => $conversation->company_id,
                'user_id'         => $user->id,
                'conversation_id' => $conversation->id,
                'request_uuid'    => $requestUuid,
                'source'          => 'generate_response',
            ]);

            return $assistantMessage;
        });
    }
}
