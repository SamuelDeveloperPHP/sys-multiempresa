<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $columnsToAdd = [];

        if (! Schema::hasColumn('post_images', 'sort_order')) {
            $columnsToAdd[] = 'sort_order';
        }

        if (! Schema::hasColumn('post_images', 'is_cover')) {
            $columnsToAdd[] = 'is_cover';
        }

        if (! Schema::hasColumn('post_images', 'alt_text')) {
            $columnsToAdd[] = 'alt_text';
        }

        if ($columnsToAdd === []) {
            return;
        }

        Schema::table('post_images', function (Blueprint $table) use ($columnsToAdd) {
            if (in_array('sort_order', $columnsToAdd, true)) {
                $table->unsignedInteger('sort_order')->default(0)->after('path');
            }

            if (in_array('is_cover', $columnsToAdd, true)) {
                $table->boolean('is_cover')->default(false)->after('sort_order');
            }

            if (in_array('alt_text', $columnsToAdd, true)) {
                $table->string('alt_text', 255)->nullable()->after('is_cover');
            }
        });
    }

    public function down(): void
    {
        $columnsToDrop = array_values(array_filter([
            Schema::hasColumn('post_images', 'sort_order') ? 'sort_order' : null,
            Schema::hasColumn('post_images', 'is_cover') ? 'is_cover' : null,
            Schema::hasColumn('post_images', 'alt_text') ? 'alt_text' : null,
        ]));

        if ($columnsToDrop === []) {
            return;
        }

        Schema::table('post_images', function (Blueprint $table) use ($columnsToDrop) {
            $table->dropColumn($columnsToDrop);
        });
    }
};
