<?php

// app/Models/AuditLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use \App\Models\Traits\Tenantable;
    protected $fillable = [
        'user_id',
        'company_id',
        'module',
        'action',
        'route_name',
        'model_type',
        'model_id',
        'description',
        'before',
        'after',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'before' => 'array',
        'after'  => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // public function company() provido pela trait Tenantable
}
