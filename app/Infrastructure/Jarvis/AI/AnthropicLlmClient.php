<?php

namespace App\Infrastructure\Jarvis\AI;

use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\DTOs\ToolCallData;
use App\Domain\Jarvis\Exceptions\JarvisException;
use App\Domain\Jarvis\Services\PromptBuilder;
use App\Models\JarvisConversation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicLlmClient implements LlmClientInterface
{
    private const API_URL = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION = '2023-06-01';

    public function __construct(
        private readonly PromptBuilder $promptBuilder,
    ) {}

    public function decide(JarvisConversation $conversation, array $messages, array $availableTools = []): ToolCallData
    {
        $apiKey = config('jarvis.anthropic.api_key');

        if (empty($apiKey)) {
            throw new JarvisException('ANTHROPIC_API_KEY não configurada. Defina a variável no .env.');
        }

        $company = $conversation->company_id
            ? \App\Models\Company::find($conversation->company_id)
            : null;

        $user = $conversation->user;

        $systemPrompt = $this->promptBuilder->buildSystemPrompt([
            'company_name' => $company?->name,
            'user_name'    => $user?->name,
        ]);

        $anthropicMessages = $this->promptBuilder->buildMessages($messages);

        // A API exige pelo menos uma mensagem
        if (empty($anthropicMessages)) {
            $anthropicMessages = [['role' => 'user', 'content' => '']];
        }

        $payload = [
            'model'      => config('jarvis.anthropic.model', 'claude-sonnet-4-6'),
            'max_tokens' => (int) config('jarvis.anthropic.max_tokens', 1024),
            'system'     => $systemPrompt,
            'messages'   => $anthropicMessages,
        ];

        if (! empty($availableTools)) {
            $payload['tools'] = $this->promptBuilder->buildToolsPayload($availableTools);
        }

        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => self::API_VERSION,
            'content-type'      => 'application/json',
        ])
        ->timeout(config('jarvis.default_tool_timeout_seconds', 30))
        ->post(self::API_URL, $payload);

        if ($response->failed()) {
            $status = $response->status();
            $body   = $response->body();

            Log::error('jarvis.anthropic.api_error', [
                'status'          => $status,
                'body'            => $body,
                'conversation_id' => $conversation->id,
            ]);

            throw new JarvisException("Falha na API Anthropic (HTTP {$status}): {$body}");
        }

        return $this->parseResponse($response->json());
    }

    private function parseResponse(array $data): ToolCallData
    {
        $content    = $data['content'] ?? [];
        $stopReason = $data['stop_reason'] ?? 'end_turn';

        if ($stopReason === 'tool_use') {
            /** @var array|null $toolBlock */
            $toolBlock = collect($content)->firstWhere('type', 'tool_use');

            if ($toolBlock !== null) {
                $textBlock = collect($content)->firstWhere('type', 'text');

                return new ToolCallData(
                    type: 'tool',
                    content: (string) ($textBlock['text'] ?? 'Executando ferramenta...'),
                    toolName: (string) ($toolBlock['name'] ?? ''),
                    arguments: (array) ($toolBlock['input'] ?? []),
                );
            }
        }

        $textBlock = collect($content)->firstWhere('type', 'text');

        return new ToolCallData(
            type: 'text',
            content: (string) ($textBlock['text'] ?? 'Não consegui gerar uma resposta. Tente novamente.'),
        );
    }
}
