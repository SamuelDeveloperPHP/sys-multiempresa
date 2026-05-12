<?php

namespace App\Http\Controllers\Api\Jarvis;

use App\Domain\Jarvis\Services\ToolRegistry;
use App\Http\Controllers\Controller;
use App\Support\Jarvis\CurrentCompanyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BootstrapController extends Controller
{
    public function __construct(
        private readonly ToolRegistry $toolRegistry,
        private readonly CurrentCompanyResolver $companyResolver
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => ['id' => $user?->id, 'name' => $user?->name, 'email' => $user?->email],
            'company_id' => $this->companyResolver->resolve($request),
            'tools' => $this->toolRegistry->all(),
        ]);
    }
}
