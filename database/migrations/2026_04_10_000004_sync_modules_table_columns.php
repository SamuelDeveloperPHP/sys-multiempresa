<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('modules')) {
            return;
        }

        $columnsToAdd = [];

        foreach (['parent_id', 'route_name', 'show_in_menu', 'sort_order'] as $column) {
            if (! Schema::hasColumn('modules', $column)) {
                $columnsToAdd[] = $column;
            }
        }

        if ($columnsToAdd !== []) {
            Schema::table('modules', function (Blueprint $table) use ($columnsToAdd) {
                if (in_array('parent_id', $columnsToAdd, true)) {
                    $table->unsignedBigInteger('parent_id')->nullable();
                }

                if (in_array('route_name', $columnsToAdd, true)) {
                    $table->string('route_name')->nullable();
                }

                if (in_array('show_in_menu', $columnsToAdd, true)) {
                    $table->boolean('show_in_menu')->default(true);
                }

                if (in_array('sort_order', $columnsToAdd, true)) {
                    $table->unsignedInteger('sort_order')->default(0);
                }
            });
        }

        if (Schema::hasColumn('modules', 'parent_id') && Schema::hasColumn('modules', 'id_modulo_relacionamento')) {
            DB::statement("
                UPDATE modules
                SET parent_id = id_modulo_relacionamento
                WHERE parent_id IS NULL
                  AND id_modulo_relacionamento IS NOT NULL
                  AND id_modulo_relacionamento <> 0
            ");
        }

        if (Schema::hasColumn('modules', 'sort_order') && Schema::hasColumn('modules', 'ordem')) {
            DB::statement("
                UPDATE modules
                SET sort_order = ordem
                WHERE (sort_order IS NULL OR sort_order = 0)
                  AND ordem IS NOT NULL
            ");
        }

        if (Schema::hasColumn('modules', 'route_name') && Schema::hasColumn('modules', 'url')) {
            DB::table('modules')
                ->whereNull('route_name')
                ->whereNotNull('url')
                ->where('url', 'like', '%.%')
                ->where('url', 'not like', '%/%')
                ->update(['route_name' => DB::raw('url')]);
        }
    }

    public function down(): void
    {
        // Migracao corretiva: sem rollback destrutivo.
    }
};
