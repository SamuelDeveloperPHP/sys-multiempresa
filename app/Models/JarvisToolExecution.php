<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JarvisToolExecution extends Model
{
    use HasFactory, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'conversation_id',
        'company_id',
        'user_id',
        'tool_name',
        'request_uuid',
        'input_payload',
        'output_payload',
        'status',
        'approval_request_id',
        'execution_time_ms',
        'error_message',
        'meta',
    ];

    protected $casts = [
        'input_payload' => 'array',
        'output_payload' => 'array',
        'meta' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(JarvisConversation::class, 'conversation_id');
    }
}
