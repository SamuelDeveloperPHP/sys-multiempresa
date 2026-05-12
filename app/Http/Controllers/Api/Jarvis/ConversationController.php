<?php

namespace App\Http\Controllers\Api\Jarvis;

use App\Application\UseCases\Jarvis\StartConversation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Jarvis\StartConversationRequest;
use App\Models\JarvisConversation;
use App\Support\Jarvis\CurrentCompanyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(
        private readonly StartConversation $startConversation,
        private readonly CurrentCompanyResolver $companyResolver
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = JarvisConversation::query()
            ->where('user_id', $user->id)
            ->when($companyId = $this->companyResolver->resolve($request), fn ($q) => $q->where('company_id', $companyId))
            ->latest('id')
            ->limit(50)
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(StartConversationRequest $request): JsonResponse
    {
        $conversation = $this->startConversation->handle(
            $request->user(),
            $request->input('company_id', $this->companyResolver->resolve($request)),
            $request->validated(),
        );

        return response()->json(['data' => $conversation], 201);
    }

    public function show(Request $request, JarvisConversation $conversation): JsonResponse
    {
        abort_unless((int) $conversation->user_id === (int) $request->user()->id, 403);
        $conversation->load(['messages' => fn ($q) => $q->orderBy('id')]);
        return response()->json(['data' => $conversation]);
    }
}
