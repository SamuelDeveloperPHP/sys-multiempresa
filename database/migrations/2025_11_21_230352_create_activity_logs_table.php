<?php

// database/migrations/2025_11_21_000000_create_activity_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('company_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('action', 100);      // ex: 'login', 'view', 'create', 'update', 'delete', 'permission_granted'
            $table->string('module', 150)->nullable(); // ex: 'blog-posts'
            $table->string('route_name')->nullable();
            $table->string('url', 500)->nullable();
            $table->string('method', 10)->nullable(); // GET, POST...

            $table->string('model_type')->nullable(); // ex: App\Models\Post
            $table->unsignedBigInteger('model_id')->nullable();

            $table->json('before')->nullable();
            $table->json('after')->nullable();

            $table->string('ip_address', 100)->nullable();
            $table->string('user_agent', 500)->nullable();

            $table->timestamps();

            $table->index(['company_id', 'user_id']);
            $table->index(['route_name', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
