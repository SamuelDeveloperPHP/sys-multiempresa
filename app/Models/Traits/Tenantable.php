<?php

namespace App\Models\Traits;

use App\Models\Scopes\CompanyScope;
use App\Models\Company;

trait Tenantable
{
    protected static function bootTenantable()
    {
        static::addGlobalScope(new CompanyScope);
        
        static::creating(function ($model) {
            if (!$model->company_id && \App\Helpers\CompanyContext::hasCurrent()) {
                $model->company_id = \App\Helpers\CompanyContext::id();
            }
        });
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
