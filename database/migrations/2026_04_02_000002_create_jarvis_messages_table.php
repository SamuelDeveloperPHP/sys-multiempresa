<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jarvis_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('jarvis_conversations')->cascadeOnDelete();
            $table->string('role', 30)->index();
            $table->longText('content')->nullable();
            $table->string('tool_name', 120)->nullable()->index();
            $table->json('tool_payload')->nullable();
            $table->json('tool_result')->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['conversation_id', 'created_at'], 'jarvis_messages_conversation_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jarvis_messages');
    }
};
