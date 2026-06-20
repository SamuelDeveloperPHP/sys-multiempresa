<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $company = \App\Helpers\CompanyContext::current();

        $menuSections = [];
        if ($user && $company) {
            $query = \App\Models\Module::query()
                ->active()
                ->showInMenu()
                ->orderBy('parent_id')
                ->orderBy('sort_order')
                ->orderBy('name');

            if ($user->type !== 'super_admin') {
                $query->whereHas('permissions', function ($q) use ($user, $company) {
                    $q->where('user_id', $user->id)
                      ->where('company_id', $company->id)
                      ->where('can_list', true);
                });
            }

            $modules = $query->get();
            $roots    = $modules->where('parent_id', null)->values();
            $children = $modules->where('parent_id', '!=', null)->groupBy('parent_id');

            foreach ($roots as $root) {
                $childrenForRoot = $children->get($root->id, collect());
                $items = $childrenForRoot->map(function ($child) {
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

        // Política biométrica — quantas credenciais WebAuthn ativas o user tem.
        // Banner global no AuthenticatedLayout alerta se < 2.
        $biometricStatus = null;
        if ($user) {
            try {
                $count = \Laragear\WebAuthn\Models\WebAuthnCredential::query()
                    ->where('authenticatable_type', get_class($user))
                    ->where('authenticatable_id', $user->id)
                    ->whereNull('disabled_at')
                    ->count();
                $biometricStatus = [
                    'total'            => $count,
                    'atende_requisito' => $count >= 2,
                ];
            } catch (\Throwable $e) {
                // Sem tabela / sem laragear — ignora silenciosamente
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'company' => $company,
                'menuSections' => $menuSections,
                'biometric_status' => $biometricStatus,
            ],
            'flash' => [
                'message'              => fn () => $request->session()->get('message'),
                'success'              => fn () => $request->session()->get('success'),
                'error'                => fn () => $request->session()->get('error'),
                'comprovante_lote_ids' => fn () => $request->session()->get('comprovante_lote_ids'),
                'comprovante_mov_id'   => fn () => $request->session()->get('comprovante_mov_id'),
            ],
        ];
    }
}
