<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auditoria: e-mail de quem editou a movimentação (complementa user_create).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->string('user_edit')->nullable()->after('user_create');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentacoes', function (Blueprint $t) {
            $t->dropColumn('user_edit');
        });
    }
};
