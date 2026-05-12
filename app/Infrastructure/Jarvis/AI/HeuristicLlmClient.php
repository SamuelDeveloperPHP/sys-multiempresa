<?php

namespace App\Infrastructure\Jarvis\AI;

use App\Domain\Jarvis\Contracts\LlmClientInterface;
use App\Domain\Jarvis\DTOs\ToolCallData;
use App\Models\JarvisConversation;

class HeuristicLlmClient implements LlmClientInterface
{
    public function decide(JarvisConversation $conversation, array $messages, array $availableTools = []): ToolCallData
    {
        $last = collect($messages)->last();
        $original = trim((string) ($last['content'] ?? ''));
        $content = mb_strtolower($original);

        if (preg_match('/^\/tool\s+([a-z0-9_\.:-]+)\s*(.*)$/i', $original, $matches)) {
            $tool = (string) $matches[1];
            $arguments = [];
            $raw = trim((string) ($matches[2] ?? ''));

            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $arguments = $decoded;
                }
            }

            return new ToolCallData('tool', 'Comando explícito de tool.', $tool, $arguments);
        }

        if (str_contains($content, 'healthcheck') || str_contains($content, 'status do jarvis')) {
            return new ToolCallData('tool', 'Consulta de healthcheck.', 'system.healthcheck', []);
        }

        if (str_contains($content, 'ferramenta') || str_contains($content, 'ferramental') || str_contains($content, 'estoque')) {
            return new ToolCallData('tool', 'Consulta de ferramental por heurística.', 'ferramental.consultar_disponiveis', [
                'search' => $content,
            ]);
        }

        return new ToolCallData(
            'text',
            'Ainda estou em modo de integração. Para testar tools, use /tool system.healthcheck {} ou pergunte por ferramentas disponíveis.'
        );
    }
}
