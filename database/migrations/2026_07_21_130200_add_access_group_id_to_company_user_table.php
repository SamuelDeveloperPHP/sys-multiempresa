<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_user', function (Blueprint $table) {
            // Grupo de acesso do usuário NAQUELA empresa (1 grupo por usuário/empresa).
            // nullOnDelete: se o grupo for apagado, o vínculo volta a null (herança some,
            // o usuário passa a depender só dos overrides em module_permissions).
            $table->foreignId('access_group_id')
                ->nullable()
                ->after('role')
                ->constrained('access_groups')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('company_user', function (Blueprint $table) {
            $table->dropForeign(['access_group_id']);
            $table->dropColumn('access_group_id');
        });
    }
};
