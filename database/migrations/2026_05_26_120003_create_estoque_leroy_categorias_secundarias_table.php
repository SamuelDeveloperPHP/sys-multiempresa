<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 3º nível da hierarquia: categoria SECUNDÁRIA (folha — debaixo dela
 * é que entram os produtos).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_leroy_categorias_secundarias', function (Blueprint $table) {
            $table->id();
            $table->string('leroy_id', 64)->unique()->comment('ID na Leroy (campo secondary)');
            $table->foreignId('categoria_principal_id')
                  ->constrained('estoque_leroy_categorias_principais', 'id', 'fk_lm_sec_princ')
                  ->cascadeOnDelete();
            $table->foreignId('categoria_primaria_id')
                  ->constrained('estoque_leroy_categorias_primarias', 'id', 'fk_lm_sec_prim')
                  ->cascadeOnDelete();
            $table->string('leroy_principal_id', 64);
            $table->string('leroy_primaria_id', 64);
            $table->string('nome', 255);
            $table->timestamps();
            $table->softDeletes();
            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_leroy_categorias_secundarias');
    }
};
