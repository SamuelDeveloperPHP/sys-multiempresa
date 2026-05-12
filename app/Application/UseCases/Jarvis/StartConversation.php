<?php

namespace App\Application\UseCases\Jarvis;

use App\Models\JarvisConversation;
use App\Models\User;
use Illuminate\Support\Str;

class StartConversation
{
    public function handle(User $user, ?int $companyId = null, array $payload = []): JarvisConversation
    {
        return JarvisConversation::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'user_id' => $user->id,
            'channel' => (string) ($payload['channel'] ?? 'web'),
            'status' => 'open',
            'title' => $payload['title'] ?? null,
            'started_at' => now(),
            'meta' => $payload['meta'] ?? null,
        ]);
    }
}
