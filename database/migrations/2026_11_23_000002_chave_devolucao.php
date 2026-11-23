<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_devolucoes', function (Blueprint $t) {
            $t->uuid('chave_reenvio')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_devolucoes', function (Blueprint $t) {
            $t->dropUnique(['chave_reenvio']);
            $t->dropColumn('chave_reenvio');
        });
    }
};
