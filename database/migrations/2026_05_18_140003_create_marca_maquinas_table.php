<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('marca_maquinas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->nullable()->constrained('companies')->cascadeOnDelete();
            $t->string('marca', 120);
            $t->string('user_create', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'marca']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marca_maquinas');
    }
};
