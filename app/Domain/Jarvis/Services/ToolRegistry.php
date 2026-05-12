<?php

namespace App\Domain\Jarvis\Services;

use App\Domain\Jarvis\Contracts\ToolInterface;
use App\Domain\Jarvis\Exceptions\ToolNotFoundException;
use Illuminate\Contracts\Container\Container;

class ToolRegistry
{
    private array $tools = [];

    public function __construct(private readonly Container $container)
    {
        $this->boot();
    }

    private function boot(): void
    {
        foreach (config('jarvis.tools', []) as $class) {
            $tool = $this->container->make($class);
            $this->tools[$tool->name()] = $tool;
        }
    }

    public function all(): array
    {
        return collect($this->tools)->map(fn (ToolInterface $tool) => [
            'name' => $tool->name(),
            'description' => $tool->description(),
            'permission' => $tool->permission(),
            'schema' => $tool->schema(),
        ])->values()->all();
    }

    public function get(string $name): ToolInterface
    {
        if (! isset($this->tools[$name])) {
            throw new ToolNotFoundException("Tool [{$name}] não encontrada.");
        }

        return $this->tools[$name];
    }
}
