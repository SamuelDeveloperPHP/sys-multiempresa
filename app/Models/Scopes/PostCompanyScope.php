<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use App\Helpers\CompanyContext;

class PostCompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        if (app()->runningInConsole() && !CompanyContext::hasCurrent()) {
            return;
        }

        $companyId = CompanyContext::id();

        if ($companyId) {
            $builder->whereHas('companies', function ($q) use ($companyId) {
                $q->where('companies.id', $companyId);
            });
        }
    }
}
