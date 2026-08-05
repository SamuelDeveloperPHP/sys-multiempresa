<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot GRUPO DE ACESSO <-> OBRA.
 *
 * Complementa `obra_user` (vínculo direto usuário <-> obra). As obras efetivas
 * de um usuário são a UNIÃO das duas fontes — ver App\Services\ObraAccess.
 *
 * ATENÇÃO: isso é DIFERENTE da regra de MÓDULOS (App\Services\EffectivePermissions),
 * onde o override por usuário VENCE por inteiro sobre o grupo. Aqui é UNIÃO, não
 * override. Decisão do dono, imutável.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('access_group_obra', function (Blueprint $table) {
            $table->id();

            // cascadeOnDelete nos dois lados: o vínculo só faz sentido enquanto
            // grupo E obra existirem.
            $table->foreignId('access_group_id')->constrained('access_groups')->cascadeOnDelete();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();

            $table->timestamps();

            // Um vínculo por (grupo, obra).
            $table->unique(['access_group_id', 'obra_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_group_obra');
    }
};
