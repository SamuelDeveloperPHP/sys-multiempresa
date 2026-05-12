<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jarvis_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type');
            $table->unsignedBigInteger('company_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('conversation_id')->nullable();
            $table->string('tool_name')->nullable();
            $table->string('request_uuid', 36)->nullable();
            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'event_type']);
            $table->index(['user_id', 'created_at']);
            $table->index('request_uuid');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jarvis_audit_logs');
    }
};
