<?php

namespace App\Domain\Jarvis\Services;

class PromptBuilder
{
    /**
     * Monta o system prompt enviado à API do LLM em cada conversa.
     */
    public function buildSystemPrompt(array $context = []): string
    {
        $appName     = config('app.name', 'Sistema');
        $companyName = $context['company_name'] ?? 'empresa';
        $userName    = $context['user_name'] ?? 'usuário';
        $today       = now()->format('d/m/Y \à\s H:i');

        return <<<PROMPT
Você é Jarvis, o assistente inteligente integrado ao {$appName}, operando no contexto da empresa "{$companyName}".

Data e hora atual: {$today}
Usuário autenticado: {$userName}

## Sua função
Você auxilia os usuários a consultar informações, executar ações seguras no sistema e responder perguntas sobre os dados da empresa.
Você tem acesso a um conjunto de ferramentas (tools). Use-as sempre que a intenção do usuário exigir busca de dados ou execução de ações.

## Regras de comportamento
- Responda sempre em português do Brasil.
- Seja objetivo e direto. Não invente dados que não foram retornados pelas ferramentas.
- Quando uma ferramenta retornar resultados, apresente-os de forma clara e resumida.
- Se não souber a resposta e não houver ferramenta adequada, diga que não tem essa informação disponível.
- Nunca revele detalhes internos de implementação, configuração ou infraestrutura.
- Não execute ações destrutivas sem confirmação explícita do usuário.
PROMPT;
    }

    /**
     * Converte as tools do ToolRegistry para o formato aceito pela API Anthropic.
     *
     * @param  array<int, array{name: string, description: string, schema: array}>  $tools
     * @return array<int, array{name: string, description: string, input_schema: array}>
     */
    public function buildToolsPayload(array $tools): array
    {
        return collect($tools)
            ->map(fn (array $tool) => [
                'name'         => $tool['name'],
                'description'  => $tool['description'],
                'input_schema' => ! empty($tool['schema'])
                    ? $tool['schema']
                    : ['type' => 'object', 'properties' => []],
            ])
            ->values()
            ->all();
    }

    /**
     * Converte as mensagens armazenadas no banco para o formato aceito pela API Anthropic.
     * Filtra mensagens com role='tool' (resultado interno) e garante alternância user/assistant.
     *
     * @param  array<int, array{role: string, content: string, ...}>  $messages
     * @return array<int, array{role: string, content: string}>
     */
    public function buildMessages(array $messages): array
    {
        $filtered = collect($messages)
            ->filter(fn (array $msg) => in_array($msg['role'] ?? '', ['user', 'assistant'], true))
            ->map(fn (array $msg) => [
                'role'    => $msg['role'],
                'content' => (string) ($msg['content'] ?? ''),
            ])
            ->values()
            ->all();

        return $this->mergeConsecutiveSameRole($filtered);
    }

    /**
     * A API Anthropic exige que as roles se alternem (user → assistant → user...).
     * Mensagens consecutivas com a mesma role são fundidas em uma só.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @return array<int, array{role: string, content: string}>
     */
    private function mergeConsecutiveSameRole(array $messages): array
    {
        $result = [];

        foreach ($messages as $msg) {
            if (! empty($result) && $result[count($result) - 1]['role'] === $msg['role']) {
                $result[count($result) - 1]['content'] .= "\n\n" . $msg['content'];
            } else {
                $result[] = $msg;
            }
        }

        return $result;
    }
}
