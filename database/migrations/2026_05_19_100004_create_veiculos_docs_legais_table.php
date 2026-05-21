<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculos_docs_legais', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('id_veiculo')->constrained('veiculos')->cascadeOnDelete();
            $t->unsignedBigInteger('id_tipo_veiculo')->nullable();
            $t->unsignedBigInteger('id_doc_legal')->nullable();
            $t->string('nome_documento', 191)->nullable();
            $t->string('arquivo', 255)->nullable();
            $t->date('data_documento')->nullable();
            $t->integer('validade')->nullable();
            $t->date('data_validade')->nullable();
            $t->string('status', 30)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'id_veiculo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculos_docs_legais');
    }
};
