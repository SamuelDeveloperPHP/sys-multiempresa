<?php
// database/migrations/xxxx_xx_xx_xxxxxx_alter_modules_for_menu_fields.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('modules', 'id_modulo_relacionamento')) {
            return;
        }

        Schema::table('modules', function (Blueprint $table) {
            // módulo "pai" (0 ou null = item de topo)
            $table->unsignedBigInteger('id_modulo_relacionamento')
                  ->default(0)
                  ->after('id');

            // nome da rota (web.php), ex: 'users.index'
            $table->string('route_name')->nullable()->after('slug');

            // se aparece na sidebar
            $table->boolean('show_in_menu')->default(true)->after('is_active');

            // ordenação
            $table->unsignedInteger('sort_order')->default(0)->after('show_in_menu');
        });
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn([
                'id_modulo_relacionamento',
                'route_name',
                'show_in_menu',
                'sort_order',
            ]);
        });
    }
};
