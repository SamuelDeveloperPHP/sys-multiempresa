<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O app mobile Engeativos espera o campo `codigo_obra` (legado).
 * O schema do sys-multiempresa usa `code`. Criamos `codigo_obra`
 * como mirror para compatibilidade do payload de download.
 *
 * Tambem garantimos campos extras opcionais usados em telas mobile.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('obras', function (Blueprint $t) {
            if (!Schema::hasColumn('obras', 'codigo_obra')) {
                $t->string('codigo_obra', 60)->nullable()->after('code');
            }
            if (!Schema::hasColumn('obras', 'id_empresa')) {
                // mirror de company_id para compat com o app — preenchido via observer/accessor
                $t->unsignedBigInteger('id_empresa')->nullable()->after('company_id');
                $t->index('id_empresa');
            }
        });

        // Copia code -> codigo_obra e company_id -> id_empresa (uma vez)
        \DB::statement('UPDATE obras SET codigo_obra = code WHERE codigo_obra IS NULL AND code IS NOT NULL');
        \DB::statement('UPDATE obras SET id_empresa = company_id WHERE id_empresa IS NULL AND company_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::table('obras', function (Blueprint $t) {
            if (Schema::hasColumn('obras', 'codigo_obra')) $t->dropColumn('codigo_obra');
            if (Schema::hasColumn('obras', 'id_empresa')) {
                $t->dropIndex(['id_empresa']);
                $t->dropColumn('id_empresa');
            }
        });
    }
};
