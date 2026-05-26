<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 2º nível da hierarquia: categoria PRIMÁRIA (filha de PRINCIPAL).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_leroy_categorias_primarias', function (Blueprint $table) {
            $table->id();
            $table->string('leroy_id', 64)->unique()->comment('ID na Leroy (campo first)');
            $table->foreignId('categoria_principal_id')
                  ->constrained('estoque_leroy_categorias_principais', 'id', 'fk_lm_prim_princ')
                  ->cascadeOnDelete();
            $table->string('leroy_principal_id', 64)->comment('father id na Leroy (denormalizado)');
            $table->string('nome', 255);
            $table->timestamps();
            $table->softDeletes();
            $table->index('nome');
            $table->index('leroy_principal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_leroy_categorias_primarias');
    }
};
