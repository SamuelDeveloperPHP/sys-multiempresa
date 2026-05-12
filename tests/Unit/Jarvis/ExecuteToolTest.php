<?php

namespace Tests\Unit\Jarvis;

use App\Application\UseCases\Jarvis\ExecuteTool;
use App\Domain\Jarvis\Contracts\ApprovalGatewayInterface;
use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use App\Domain\Jarvis\Contracts\ToolInterface;
use App\Domain\Jarvis\Exceptions\ToolAuthorizationException;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class ExecuteToolTest extends TestCase
{
    use RefreshDatabase;

    private ToolRegistry&MockObject $toolRegistry;
    private PermissionGatewayInterface&MockObject $permissionGateway;
    private ApprovalGatewayInterface&MockObject $approvalGateway;
    private AuditGatewayInterface&MockObject $auditGateway;
    private ExecuteTool $useCase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->toolRegistry      = $this->createMock(ToolRegistry::class);
        $this->permissionGateway = $this->createMock(PermissionGatewayInterface::class);
        $this->approvalGateway   = $this->createMock(ApprovalGatewayInterface::class);
        $this->auditGateway      = $this->createMock(AuditGatewayInterface::class);

        $this->useCase = new ExecuteTool(
            $this->toolRegistry,
            $this->permissionGateway,
            $this->approvalGateway,
            $this->auditGateway,
        );
    }

    public function test_executa_tool_com_sucesso_e_persiste_registro(): void
    {
        [$user, $conversation] = $this->criarContexto();
        $tool = $this->mockTool('system.healthcheck', 'jarvis.system.healthcheck', false);
        $tool->method('execute')->willReturn(['status' => 'ok']);

        $this->toolRegistry->method('get')->willReturn($tool);
        $this->permissionGateway->method('canExecuteTool')->willReturn(true);
        $this->auditGateway->expects($this->once())->method('log')
            ->with($this->arrayHasKey('event_type'));

        $result = $this->useCase->handle($conversation, $user, 'uuid-exec-001', 'system.healthcheck');

        $this->assertSame(['status' => 'ok'], $result);
        $this->assertDatabaseHas('jarvis_tool_executions', [
            'tool_name'    => 'system.healthcheck',
            'request_uuid' => 'uuid-exec-001',
            'status'       => 'success',
        ]);
    }

    public function test_lanca_excecao_quando_sem_permissao(): void
    {
        [$user, $conversation] = $this->criarContexto();
        $tool = $this->mockTool('ferramental.consultar', 'jarvis.ferramental.list', false);

        $this->toolRegistry->method('get')->willReturn($tool);
        $this->permissionGateway->method('canExecuteTool')->willReturn(false);

        $this->expectException(ToolAuthorizationException::class);

        $this->useCase->handle($conversation, $user, 'uuid-denied-001', 'ferramental.consultar');
    }

    public function test_retorna_approval_quando_tool_exige_aprovacao(): void
    {
        [$user, $conversation] = $this->criarContexto();
        $tool = $this->mockTool('acao.critica', 'jarvis.acao', true); // requiresApproval = true
        $tool->method('execute')->willReturn([]);

        $this->toolRegistry->method('get')->willReturn($tool);
        $this->permissionGateway->method('canExecuteTool')->willReturn(true);
        $this->approvalGateway->method('open')->willReturn([
            'id'     => 99,
            'uuid'   => 'approval-uuid',
            'status' => 'pending',
        ]);
        $this->auditGateway->expects($this->once())->method('log');

        $result = $this->useCase->handle($conversation, $user, 'uuid-approval-001', 'acao.critica');

        $this->assertSame('approval_requested', $result['status']);
        $this->assertDatabaseHas('jarvis_tool_executions', [
            'tool_name' => 'acao.critica',
            'status'    => 'approval_requested',
        ]);
    }

    public function test_idempotencia_retorna_resultado_existente_para_mesmo_uuid(): void
    {
        [$user, $conversation] = $this->criarContexto();
        $tool = $this->mockTool('system.healthcheck', 'jarvis.system.healthcheck', false);
        $tool->expects($this->once())->method('execute')->willReturn(['status' => 'ok']);

        $this->toolRegistry->method('get')->willReturn($tool);
        $this->permissionGateway->method('canExecuteTool')->willReturn(true);
        $this->auditGateway->method('log');

        // Primeira execução
        $first = $this->useCase->handle($conversation, $user, 'uuid-idem-001', 'system.healthcheck');

        // Segunda execução com mesmo UUID — tool.execute NÃO deve ser chamada novamente
        $second = $this->useCase->handle($conversation, $user, 'uuid-idem-001', 'system.healthcheck');

        $this->assertSame($first, $second);
    }

    public function test_persiste_status_failed_em_caso_de_excecao(): void
    {
        [$user, $conversation] = $this->criarContexto();
        $tool = $this->mockTool('tool.quebrada', 'jarvis.tool', false);
        $tool->method('execute')->willThrowException(new \RuntimeException('Erro interno'));

        $this->toolRegistry->method('get')->willReturn($tool);
        $this->permissionGateway->method('canExecuteTool')->willReturn(true);
        $this->auditGateway->method('log');

        $this->expectException(\RuntimeException::class);

        try {
            $this->useCase->handle($conversation, $user, 'uuid-fail-001', 'tool.quebrada');
        } finally {
            $this->assertDatabaseHas('jarvis_tool_executions', [
                'tool_name' => 'tool.quebrada',
                'status'    => 'failed',
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function criarContexto(): array
    {
        $user = User::factory()->create(['type' => 'user', 'is_active' => true]);
        $conversation = JarvisConversation::create([
            'uuid'       => \Illuminate\Support\Str::uuid(),
            'company_id' => null,
            'user_id'    => $user->id,
            'channel'    => 'web',
            'status'     => 'open',
            'started_at' => now(),
        ]);

        return [$user, $conversation];
    }

    private function mockTool(string $name, string $permission, bool $requiresApproval): ToolInterface&MockObject
    {
        $tool = $this->createMock(ToolInterface::class);
        $tool->method('name')->willReturn($name);
        $tool->method('permission')->willReturn($permission);
        $tool->method('requiresApproval')->willReturn($requiresApproval);

        return $tool;
    }
}
