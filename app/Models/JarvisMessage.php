<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JarvisMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'tool_name',
        'tool_payload',
        'tool_result',
        'latency_ms',
        'meta',
    ];

    protected $casts = [
        'tool_payload' => 'array',
        'tool_result' => 'array',
        'meta' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(JarvisConversation::class, 'conversation_id');
    }
}
