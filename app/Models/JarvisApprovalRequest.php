<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JarvisApprovalRequest extends Model
{
    use HasFactory, \App\Models\Traits\Tenantable;

    protected $fillable = [
        'uuid',
        'user_id',
        'conversation_id',
        'tool_name',
        'arguments',
        'status',
        'resolved_by',
        'resolved_at',
        'rejection_reason',
        'meta',
    ];

    protected $casts = [
        'arguments'   => 'array',
        'meta'        => 'array',
        'resolved_at' => 'datetime',
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

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function approve(int $approvedById): void
    {
        $this->update([
            'status'      => 'approved',
            'resolved_by' => $approvedById,
            'resolved_at' => now(),
        ]);
    }

    public function reject(int $rejectedById, ?string $reason = null): void
    {
        $this->update([
            'status'           => 'rejected',
            'resolved_by'      => $rejectedById,
            'resolved_at'      => now(),
            'rejection_reason' => $reason,
        ]);
    }
}
