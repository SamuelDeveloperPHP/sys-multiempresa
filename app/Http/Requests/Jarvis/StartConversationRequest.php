<?php

namespace App\Http\Requests\Jarvis;

use Illuminate\Foundation\Http\FormRequest;

class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'channel' => ['nullable', 'string', 'max:30'],
            'title' => ['nullable', 'string', 'max:255'],
            'company_id' => ['nullable', 'integer'],
        ];
    }
}
