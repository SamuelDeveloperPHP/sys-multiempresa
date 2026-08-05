<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Flag "enxerga TODAS as obras", em DOIS lugares (decisão do dono, imutável):
 *
 *   1) `company_user.todas_obras`  -> por USUÁRIO **por empresa**.
 *   2) `access_groups.todas_obras` -> por GRUPO de acesso.
 *
 * Qualquer uma das duas sendo true já libera tudo (ver App\Services\ObraAccess).
 *
 * RETROCOMPAT: o up() marca TRUE para TODAS as linhas já existentes, então no
 * deploy nada muda de comportamento — ninguém perde acesso. O DEFAULT da coluna
 * é FALSE, de modo que linhas NOVAS (usuário/grupo criado depois) já nascem
 * RESTRITAS e precisam de liberação explícita.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('company_user', function (Blueprint $table) {
            $table->boolean('todas_obras')->default(false)->after('access_group_id');
        });

        Schema::table('access_groups', function (Blueprint $table) {
            $table->boolean('todas_obras')->default(false)->after('descricao');
        });

        // Retrocompat: tudo que JÁ existia continua enxergando todas as obras.
        DB::table('company_user')->update(['todas_obras' => true]);
        DB::table('access_groups')->update(['todas_obras' => true]);
    }

    public function down(): void
    {
        Schema::table('company_user', function (Blueprint $table) {
            $table->dropColumn('todas_obras');
        });

        Schema::table('access_groups', function (Blueprint $table) {
            $table->dropColumn('todas_obras');
        });
    }
};
