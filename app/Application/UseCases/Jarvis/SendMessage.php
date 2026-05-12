<?php

namespace App\Application\UseCases\Jarvis;

use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\JarvisMessage;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SendMessage
{
    public function __construct(
        private readonly LlmClientInterface $llmClient,
        private readonly ToolRegistry $toolRegistry,
        private readonly ExecuteTool $executeTool,
        private readonly AuditGatewayInterface $auditGateway,
    ) {}

    public function handle(
        JarvisConversation $conversation,
        User $user,
        string $content,
        string $requestUuid,
        array $context = []
    ): array {
        return DB::transaction(function () use ($conversation, $user, $content, $requestUuid, $context) {
            JarvisMessage::create([
                'conversation_id' => $conversation->id,
                'role' => 'user',
                'content' => $content,
                'meta' => ['request_uuid' => $requestUuid],
            ]);

            $messages = $conversation->messages()->orderBy('id')->get(['role', 'content', 'tool_name', 'tool_payload', 'tool_result'])
                ->map(fn (JarvisMessage $message) => [
                    'role' => $message->role,
                    'content' => $message->content,
                    'tool_name' => $message->tool_name,
                    'tool_payload' => $message->tool_payload,
                    'tool_result' => $message->tool_result,
                ])->values()->all();

            $decision = $this->llmClient->decide($conversation, $messages, $this->toolRegistry->all());

            if ($decision->type === 'tool' && $decision->toolName) {
                $toolResult = $this->executeTool->handle($conversation, $user, $requestUuid, $decision->toolName, $decision->arguments, $context);

                JarvisMessage::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'tool',
                    'content' => 'Tool executada: ' . $decision->toolName,
                    'tool_name' => $decision->toolName,
                    'tool_payload' => $decision->arguments,
                    'tool_result' => $toolResult,
                ]);

                $assistantText = $this->formatToolResponse($decision->toolName, $toolResult);
                $assistantMessage = JarvisMessage::create([
                    'conversation_id' => $conversation->id,
                    'role' => 'assistant',
                    'content' => $assistantText,
                    'meta' => ['request_uuid' => $requestUuid, 'source' => 'tool'],
                ]);

                $this->auditGateway->log([
                    'event_type' => 'jarvis.response.generated',
                    'company_id' => $conversation->company_id,
                    'user_id' => $user->id,
                    'conversation_id' => $conversation->id,
                    'request_uuid' => $requestUuid,
                    'source' => 'tool',
                ]);

                return [
                    'conversation_id' => $conversation->id,
                    'assistant_message' => ['id' => $assistantMessage->id, 'role' => $assistantMessage->role, 'content' => $assistantMessage->content],
                    'tool' => ['name' => $decision->toolName, 'arguments' => $decision->arguments, 'result' => $toolResult],
                ];
            }

            $assistantMessage = JarvisMessage::create([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $decision->content,
                'meta' => ['request_uuid' => $requestUuid, 'source' => 'llm_fallback'],
            ]);

            $this->auditGateway->log([
                'event_type' => 'jarvis.response.generated',
                'company_id' => $conversation->company_id,
                'user_id' => $user->id,
                'conversation_id' => $conversation->id,
                'request_uuid' => $requestUuid,
                'source' => 'text',
            ]);

            return [
                'conversation_id' => $conversation->id,
                'assistant_message' => ['id' => $assistantMessage->id, 'role' => $assistantMessage->role, 'content' => $assistantMessage->content],
                'tool' => null,
            ];
        }, 3);
    }

    private function formatToolResponse(string $toolName, array $result): string
    {
        if (($result['status'] ?? null) === 'approval_requested') {
            return 'A ação exige aprovação. Solicitação de aprovação criada com sucesso.';
        }
        if ($toolName === 'system.healthcheck') {
            return 'Healthcheck OK. Ambiente: ' . ($result['app_env'] ?? 'n/a') . '. PHP: ' . ($result['php_version'] ?? 'n/a');
        }
        if ($toolName === 'ferramental.consultar_disponiveis') {
            $total = (int) ($result['total'] ?? 0);
            return $total === 0
                ? 'Não encontrei ferramentas disponíveis com os filtros informados.'
                : "Encontrei {$total} ferramenta(s) disponível(is). Veja o card de resultado para os detalhes.";
        }
        return 'Ação processada com sucesso.';
    }
}
