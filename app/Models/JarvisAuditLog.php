<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JarvisAuditLog extends Model
{
    use HasFactory, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'event_type',
        'company_id',
        'user_id',
        'conversation_id',
        'tool_name',
        'request_uuid',
        'payload',
        'error_message',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // public function company() provido pela trait Tenantable

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(JarvisConversation::class, 'conversation_id');
    }
}
