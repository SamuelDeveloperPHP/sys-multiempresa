<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            if (! Schema::hasColumn('posts', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')
                    ->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('posts', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('user_id')
                    ->constrained('categories')->nullOnDelete();
            }
            if (! Schema::hasColumn('posts', 'title')) {
                $table->string('title')->after('category_id');
            }
            if (! Schema::hasColumn('posts', 'slug')) {
                $table->string('slug')->unique()->after('title');
            }
            if (! Schema::hasColumn('posts', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }
            if (! Schema::hasColumn('posts', 'content')) {
                $table->longText('content')->nullable()->after('description');
            }
            if (! Schema::hasColumn('posts', 'is_published')) {
                $table->boolean('is_published')->default(false)->after('content');
            }
            if (! Schema::hasColumn('posts', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('is_published');
            }
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['category_id']);
            $table->dropColumn([
                'user_id', 'category_id', 'title', 'slug',
                'description', 'content', 'is_published', 'published_at',
            ]);
        });
    }
};
