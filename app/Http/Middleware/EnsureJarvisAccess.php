<?php

namespace App\Http\Middleware;

use App\Domain\Jarvis\Contracts\PermissionGatewayInterface;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJarvisAccess
{
    public function __construct(private readonly PermissionGatewayInterface $permissionGateway)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $companyId = (int) ($request->header('X-Company-Id')
            ?? $request->attributes->get('current_company_id')
            ?? session('current_company_id'));

        if (! $this->permissionGateway->canAccessJarvis($user, $companyId ?: null)) {
            abort(403, 'Você não tem permissão para acessar o Jarvis.');
        }

        return $next($request);
    }
}
