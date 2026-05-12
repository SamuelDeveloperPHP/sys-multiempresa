<?php

namespace App\Application\UseCases\Jarvis;

use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;
use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\JarvisMessage;
use App\Models\JarvisToolExecution;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Solicita aprovação para executar uma tool que requer autorização humana.
 * Cria um JarvisToolExecution em status 'approval_requested' e uma
 * JarvisApprovalRequest via ApprovalGatewayInterface.
 */
class RequestApprovalForTool
{
    public function __construct(
        private readonly ToolRegistry $toolRegistry,
        private readonly ApprovalGatewayInterface $approvalGateway,
        private readonly AuditGatewayInterface $auditGateway,
    ) {}

    public function handle(
        JarvisConversation $conversation,
        User $user,
        string $requestUuid,
        string $toolName,
        array $arguments = [],
        array $context = []
    ): array {
        return DB::transaction(function () use ($conversation, $user, $requestUuid, $toolName, $arguments, $context) {
            $tool      = $this->toolRegistry->get($toolName);
            $companyId = (int) ($context['company_id'] ?? $conversation->company_id);

            $approval = $this->approvalGateway->open([
                'company_id'      => $companyId,
                'user_id'         => $user->id,
                'tool_name'       => $tool->name(),
                'arguments'       => $arguments,
                'conversation_id' => $conversation->id,
                'request_uuid'    => $requestUuid,
            ]);

            $execution = JarvisToolExecution::updateOrCreate(
                ['tool_name' => $tool->name(), 'request_uuid' => $requestUuid],
                [
                    'conversation_id'     => $conversation->id,
                    'company_id'          => $companyId ?: null,
                    'user_id'             => $user->id,
                    'input_payload'       => $arguments,
                    'status'              => 'approval_requested',
                    'approval_request_id' => (string) ($approval['id'] ?? ''),
                    'output_payload'      => [
                        'status'    => 'approval_requested',
                        'tool_name' => $tool->name(),
                        'approval'  => $approval,
                    ],
                    'meta' => ['permission' => $tool->permission()],
                ]
            );

            JarvisMessage::create([
                'conversation_id' => $conversation->id,
                'role'            => 'assistant',
                'content'         => "A ação \"{$tool->name()}\" requer aprovação. Uma solicitação foi criada e aguarda autorização.",
                'meta'            => [
                    'request_uuid'    => $requestUuid,
                    'source'          => 'approval_requested',
                    'approval_id'     => $approval['id'] ?? null,
                ],
            ]);

            $this->auditGateway->log([
                'event_type'      => 'jarvis.tool.approval_requested',
                'company_id'      => $companyId,
                'user_id'         => $user->id,
                'tool_name'       => $tool->name(),
                'request_uuid'    => $requestUuid,
                'conversation_id' => $conversation->id,
                'payload'         => ['approval' => $approval],
            ]);

            return [
                'status'    => 'approval_requested',
                'tool_name' => $tool->name(),
                'execution' => $execution->only(['id', 'status', 'approval_request_id']),
                'approval'  => $approval,
            ];
        });
    }
}
