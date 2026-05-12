<?php

namespace App\Application\UseCases\Jarvis;

use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;
use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use App\Domain\Jarvis\Exceptions\ToolAuthorizationException;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\JarvisToolExecution;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ExecuteTool
{
    public function __construct(
        private readonly ToolRegistry $toolRegistry,
        private readonly PermissionGatewayInterface $permissionGateway,
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
        $tool = $this->toolRegistry->get($toolName);
        $companyId = (int) ($context['company_id'] ?? $conversation->company_id);

        if (! $this->permissionGateway->canExecuteTool($user, $tool->permission(), $companyId ?: null)) {
            throw new ToolAuthorizationException("Sem permissão para executar [{$tool->permission()}].");
        }

        $lockKey = 'jarvis:tool:' . $tool->name() . ':' . $requestUuid;
        $lock = Cache::lock($lockKey, config('jarvis.default_tool_timeout_seconds', 30));

        if (! $lock->get()) {
            $existing = JarvisToolExecution::query()->where('tool_name', $tool->name())->where('request_uuid', $requestUuid)->first();
            return $existing?->output_payload ?? ['status' => 'duplicate_request', 'message' => 'Esta execução já está sendo processada ou já foi concluída.'];
        }

        $startedAt = microtime(true);

        try {
            return DB::transaction(function () use ($conversation, $user, $requestUuid, $tool, $arguments, $context, $companyId, $startedAt) {
                $execution = JarvisToolExecution::query()->firstOrCreate(
                    ['tool_name' => $tool->name(), 'request_uuid' => $requestUuid],
                    [
                        'conversation_id' => $conversation->id,
                        'company_id' => $companyId ?: null,
                        'user_id' => $user->id,
                        'input_payload' => $arguments,
                        'status' => 'pending',
                        'meta' => ['permission' => $tool->permission()],
                    ]
                );

                if ($execution->status === 'success' && is_array($execution->output_payload)) {
                    return $execution->output_payload;
                }

                if ($tool->requiresApproval($arguments, $context)) {
                    $approval = $this->approvalGateway->open([
                        'company_id' => $companyId,
                        'user_id' => $user->id,
                        'tool_name' => $tool->name(),
                        'arguments' => $arguments,
                        'conversation_id' => $conversation->id,
                    ]);

                    $payload = ['status' => 'approval_requested', 'tool_name' => $tool->name(), 'approval' => $approval];

                    $execution->update([
                        'status' => 'approval_requested',
                        'approval_request_id' => (string) ($approval['id'] ?? ''),
                        'output_payload' => $payload,
                        'execution_time_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                    ]);

                    $this->auditGateway->log([
                        'event_type' => 'jarvis.tool.approval_requested',
                        'company_id' => $companyId,
                        'user_id' => $user->id,
                        'tool_name' => $tool->name(),
                        'request_uuid' => $requestUuid,
                        'payload' => $payload,
                    ]);

                    return $payload;
                }

                $result = $tool->execute($arguments, [...$context, 'company_id' => $companyId ?: null, 'user_id' => $user->id, 'conversation_id' => $conversation->id]);

                $execution->update([
                    'status' => 'success',
                    'output_payload' => $result,
                    'execution_time_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                ]);

                $this->auditGateway->log([
                    'event_type' => 'jarvis.tool.executed',
                    'company_id' => $companyId,
                    'user_id' => $user->id,
                    'tool_name' => $tool->name(),
                    'request_uuid' => $requestUuid,
                    'payload' => $result,
                ]);

                return $result;
            }, 3);
        } catch (\Throwable $e) {
            JarvisToolExecution::query()->updateOrCreate(
                ['tool_name' => $tool->name(), 'request_uuid' => $requestUuid],
                [
                    'conversation_id' => $conversation->id,
                    'company_id' => $companyId ?: null,
                    'user_id' => $user->id,
                    'input_payload' => $arguments,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                    'execution_time_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                ]
            );

            $this->auditGateway->log([
                'event_type' => 'jarvis.tool.failed',
                'company_id' => $companyId,
                'user_id' => $user->id,
                'tool_name' => $tool->name(),
                'request_uuid' => $requestUuid,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        } finally {
            optional($lock)->release();
        }
    }
}
