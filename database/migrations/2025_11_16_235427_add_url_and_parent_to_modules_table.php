<?php

// database/migrations/xxxx_xx_xx_xxxxxx_add_url_and_parent_to_modules_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            // nome da rota (ex: users.index, users.create, modules.index)
            $table->string('url')->nullable()->after('icon');

            // módulo pai: 0 ou null => item principal do menu
            $table->unsignedBigInteger('id_modulo_relacionamento')
                  ->default(0)
                  ->after('url');

            // opcional, se quiser ordenar no menu
            $table->unsignedInteger('ordem')->default(0)->after('id_modulo_relacionamento');
        });
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn(['url', 'id_modulo_relacionamento', 'ordem']);
        });
    }
};