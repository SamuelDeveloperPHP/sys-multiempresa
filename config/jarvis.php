<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver do LLM
    |--------------------------------------------------------------------------
    | 'heuristic' → HeuristicLlmClient (sem API externa, para dev/testes)
    | 'anthropic'  → AnthropicLlmClient (Claude via API Anthropic, produção)
    */
    'llm_driver' => env('JARVIS_LLM_DRIVER', 'heuristic'),

    /*
    |--------------------------------------------------------------------------
    | Configurações da API Anthropic
    |--------------------------------------------------------------------------
    */
    'anthropic' => [
        'api_key'    => env('ANTHROPIC_API_KEY'),
        'model'      => env('JARVIS_ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
        'max_tokens' => (int) env('JARVIS_ANTHROPIC_MAX_TOKENS', 1024),
    ],

    /*
    |--------------------------------------------------------------------------
    | Limites operacionais
    |--------------------------------------------------------------------------
    */
    'default_tool_timeout_seconds'    => (int) env('JARVIS_TOOL_TIMEOUT', 30),
    'max_messages_per_conversation'   => (int) env('JARVIS_MAX_MESSAGES', 1000),

    /*
    |--------------------------------------------------------------------------
    | Tools registradas
    |--------------------------------------------------------------------------
    | Cada classe deve implementar App\Domain\Jarvis\Contracts\ToolInterface.
    */
    'tools' => [
        App\Infrastructure\Jarvis\Tools\System\HealthcheckTool::class,
        App\Infrastructure\Jarvis\Tools\Ferramental\ConsultarFerramentasDisponiveisTool::class,
    ],

];
