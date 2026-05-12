<?php

namespace App\Http\Requests\Jarvis;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:20000'],
            'request_uuid' => ['required', 'uuid'],
        ];
    }
}
