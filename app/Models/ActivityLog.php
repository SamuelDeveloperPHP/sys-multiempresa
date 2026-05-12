<?php

// app/Models/ActivityLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use \App\Models\Traits\Tenantable;
    protected $fillable = [
        'company_id',
        'user_id',
        'action',
        'module',
        'route_name',
        'url',
        'method',
        'model_type',
        'model_id',
        'before',
        'after',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'before' => 'array',
        'after'  => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    
}
