<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jarvis_conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 30)->default('web');
            $table->string('status', 30)->default('open')->index();
            $table->string('title')->nullable();
            $table->timestamp('started_at')->nullable()->index();
            $table->timestamp('ended_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'user_id', 'status'], 'jarvis_conversations_company_user_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jarvis_conversations');
    }
};
