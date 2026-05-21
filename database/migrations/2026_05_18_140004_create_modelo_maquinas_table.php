<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('modelo_maquinas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->foreignId('marca_id')->nullable()->constrained('marca_maquinas')->nullOnDelete();
            $t->string('modelo', 120);
            $t->string('user_create', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'modelo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modelo_maquinas');
    }
};
