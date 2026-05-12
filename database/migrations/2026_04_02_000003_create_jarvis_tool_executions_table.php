<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jarvis_tool_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->nullable()->constrained('jarvis_conversations')->nullOnDelete();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tool_name', 120)->index();
            $table->uuid('request_uuid');
            $table->json('input_payload');
            $table->json('output_payload')->nullable();
            $table->string('status', 30)->default('pending')->index();
            $table->string('approval_request_id')->nullable()->index();
            $table->unsignedInteger('execution_time_ms')->nullable();
            $table->text('error_message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->unique(['tool_name', 'request_uuid'], 'jarvis_tool_executions_tool_request_uuid_unique');
            $table->index(['company_id', 'user_id', 'created_at'], 'jarvis_tool_executions_company_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jarvis_tool_executions');
    }
};
