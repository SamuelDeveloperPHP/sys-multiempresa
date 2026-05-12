<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JarvisConversation extends Model
{
    use HasFactory, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'uuid',
        'company_id',
        'user_id',
        'channel',
        'status',
        'title',
        'started_at',
        'ended_at',
        'meta',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(JarvisMessage::class, 'conversation_id');
    }

    public function toolExecutions(): HasMany
    {
        return $this->hasMany(JarvisToolExecution::class, 'conversation_id');
    }
}
