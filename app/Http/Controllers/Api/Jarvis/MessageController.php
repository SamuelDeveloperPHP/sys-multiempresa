<?php

namespace App\Http\Controllers\Api\Jarvis;

use App\Application\UseCases\Jarvis\SendMessage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Jarvis\SendMessageRequest;
use App\Models\JarvisConversation;
use App\Support\Jarvis\CurrentCompanyResolver;
use Illuminate\Http\JsonResponse;

class MessageController extends Controller
{
    public function __construct(
        private readonly SendMessage $sendMessage,
        private readonly CurrentCompanyResolver $companyResolver
    ) {}

    public function store(SendMessageRequest $request, JarvisConversation $conversation): JsonResponse
    {
        abort_unless((int) $conversation->user_id === (int) $request->user()->id, 403);

        $payload = $this->sendMessage->handle(
            conversation: $conversation,
            user: $request->user(),
            content: (string) $request->validated('content'),
            requestUuid: (string) $request->validated('request_uuid'),
            context: ['company_id' => $this->companyResolver->resolve($request)],
        );

        return response()->json(['data' => $payload], 201);
    }
}
