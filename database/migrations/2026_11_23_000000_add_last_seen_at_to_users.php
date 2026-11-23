<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    // Nenhuma migration anterior criava a coluna: ela só existia em bancos legados.
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'last_seen_at')) {
            Schema::table('users', function (Blueprint $t) {
                $t->timestamp('last_seen_at')->nullable();
            });
        }
    }

    // Mantém a coluna: em bancos legados ela existia antes desta migration.
    public function down(): void
    {
    }
};
