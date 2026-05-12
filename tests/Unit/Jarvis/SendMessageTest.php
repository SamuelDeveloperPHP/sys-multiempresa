<?php

namespace Tests\Unit\Jarvis;

use App\Application\UseCases\Jarvis\ExecuteTool;
use App\Application\UseCases\Jarvis\SendMessage;
use App\Domain\Jarvis\Contracts\AuditGatewayInterface;
use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\DTOs\ToolCallData;
use App\Domain\Jarvis\Services\ToolRegistry;
use App\Models\JarvisConversation;
use App\Models\JarvisMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class SendMessageTest extends TestCase
{
    use RefreshDatabase;

    private LlmClientInterface&MockObject $llmClient;
    private ToolRegistry&MockObject $toolRegistry;
    private ExecuteTool&MockObject $executeTool;
    private AuditGatewayInterface&MockObject $auditGateway;
    private SendMessage $useCase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->llmClient    = $this->createMock(LlmClientInterface::class);
        $this->toolRegistry = $this->createMock(ToolRegistry::class);
        $this->executeTool  = $this->createMock(ExecuteTool::class);
        $this->auditGateway = $this->createMock(AuditGatewayInterface::class);

        $this->useCase = new SendMessage(
            $this->llmClient,
            $this->toolRegistry,
            $this->executeTool,
            $this->auditGateway,
        );
    }

    public function test_text_response_persiste_mensagens_e_retorna_estrutura_correta(): void
    {
        [$user, $conversation] = $this->criarContexto();

        $this->toolRegistry->method('all')->willReturn([]);
        $this->llmClient->method('decide')->willReturn(
            new ToolCallData('text', 'Olá! Como posso ajudar?')
        );
        $this->auditGateway->expects($this->once())->method('log');

        $result = $this->useCase->handle($conversation, $user, 'Oi Jarvis', 'uuid-text-001');

        $this->assertSame($conversation->id, $result['conversation_id']);
        $this->assertSame('assistant', $result['assistant_message']['role']);
        $this->assertSame('Olá! Como posso ajudar?', $result['assistant_message']['content']);
        $this->assertNull($result['tool']);

        // Deve ter persistido mensagem do usuário e do assistente
        $this->assertDatabaseHas('jarvis_messages', [
            'conversation_id' => $conversation->id,
            'role'            => 'user',
            'content'         => 'Oi Jarvis',
        ]);
        $this->assertDatabaseHas('jarvis_messages', [
            'conversation_id' => $conversation->id,
            'role'            => 'assistant',
            'content'         => 'Olá! Como posso ajudar?',
        ]);
    }

    public function test_tool_response_executa_tool_e_persiste_mensagens(): void
    {
        [$user, $conversation] = $this->criarContexto();

        $this->toolRegistry->method('all')->willReturn([]);
        $this->llmClient->method('decide')->willReturn(
            new ToolCallData('tool', 'Consultando healthcheck...', 'system.healthcheck', [])
        );

        $toolResult = ['app_env' => 'testing', 'php_version' => PHP_VERSION];
        $this->executeTool->method('handle')->willReturn($toolResult);
        $this->auditGateway->expects($this->once())->method('log');

        $result = $this->useCase->handle($conversation, $user, '/tool system.healthcheck', 'uuid-tool-001');

        $this->assertSame($conversation->id, $result['conversation_id']);
        $this->assertSame('system.healthcheck', $result['tool']['name']);
        $this->assertSame($toolResult, $result['tool']['result']);
        $this->assertSame('assistant', $result['assistant_message']['role']);

        // Deve ter persistido a mensagem da tool
        $this->assertDatabaseHas('jarvis_messages', [
            'conversation_id' => $conversation->id,
            'role'            => 'tool',
            'tool_name'       => 'system.healthcheck',
        ]);
    }

    public function test_audit_e_chamado_mesmo_em_resposta_de_texto(): void
    {
        [$user, $conversation] = $this->criarContexto();

        $this->toolRegistry->method('all')->willReturn([]);
        $this->llmClient->method('decide')->willReturn(
            new ToolCallData('text', 'Tudo certo.')
        );

        $this->auditGateway->expects($this->once())
            ->method('log')
            ->with($this->arrayHasKey('event_type'));

        $this->useCase->handle($conversation, $user, 'teste', 'uuid-audit-001');
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
}
