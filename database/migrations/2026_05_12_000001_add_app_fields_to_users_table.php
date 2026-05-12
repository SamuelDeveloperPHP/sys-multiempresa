<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos exigidos pelo app mobile Engeativos:
 *  - password_app: hash SHA-256 da senha (login offline)
 *  - perfil_offline: snapshot JSON do perfil para uso sem internet
 *  - biometria: usuario habilitou login biometrico
 *  - geolocalizacao: usuario consentiu coleta de GPS
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (!Schema::hasColumn('users', 'password_app')) {
                $t->string('password_app', 191)->nullable()->after('password');
            }
            if (!Schema::hasColumn('users', 'perfil_offline')) {
                $t->longText('perfil_offline')->nullable()->after('password_app');
            }
            if (!Schema::hasColumn('users', 'biometria')) {
                $t->boolean('biometria')->default(false)->after('perfil_offline');
            }
            if (!Schema::hasColumn('users', 'geolocalizacao')) {
                $t->boolean('geolocalizacao')->default(false)->after('biometria');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            foreach (['password_app','perfil_offline','biometria','geolocalizacao'] as $col) {
                if (Schema::hasColumn('users', $col)) $t->dropColumn($col);
            }
        });
    }
};
