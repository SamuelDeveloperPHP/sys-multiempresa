<?php

namespace App\Providers;

use App\Helpers\CompanyContext;
use App\Models\Module;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class ViewServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        View::composer('layouts.sidebar', function ($view) {
            $user    = Auth::user();
            $company = CompanyContext::current();

            $menuSections = [];

            if ($user && $company) {
                // Query base: só módulos ativos e que aparecem no menu
                $query = Module::query()
                    ->active()
                    ->showInMenu()
                    ->orderBy('parent_id')
                    ->orderBy('sort_order')
                    ->orderBy('name');

                // 🔹 Se NÃO for super_admin, filtra pelas permissões
                if ($user->type !== 'super_admin') {
                    $query->whereHas('permissions', function ($q) use ($user, $company) {
                        $q->where('user_id', $user->id)
                          ->where('company_id', $company->id)
                          ->where('can_list', true);
                    });
                }

                $modules = $query->get();

                // Separa raiz e filhos
                $roots    = $modules->where('parent_id', null)->values();
                $children = $modules->where('parent_id', '!=', null)->groupBy('parent_id');

                foreach ($roots as $root) {
                    $childrenForRoot = $children->get($root->id, collect());

                    $items = $childrenForRoot->map(function (Module $child) {
                        return [
                            'label'      => $child->name,
                            'route_name' => $child->route_name,
                            'icon'       => $child->icon,
                        ];
                    })->values()->all();

                    $menuSections[] = [
                        'label'      => $root->name,
                        'icon'       => $root->icon,
                        'route_name' => $root->route_name,
                        'items'      => $items,
                    ];
                }
            }

            $view->with('menuSections', $menuSections);
        });
    }
}
