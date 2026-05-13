<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anexos_funcionarios', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_funcionario')->nullable();
            $table->unsignedBigInteger('id_funcao')->nullable();
            $table->unsignedBigInteger('id_qualificacao')->nullable();
            
            $table->string('nome_arquivo')->nullable();
            $table->string('arquivo')->nullable();
            $table->date('data_conclusao')->nullable();
            $table->date('data_validade_doc')->nullable();
            $table->dateTime('data_aprovacao')->nullable();
            
            $table->integer('situacao_doc')->default(1)->comment('1: Pendente, 2: Aprovado, 18: Reprovado');
            
            $table->string('usuario_cad')->nullable();
            $table->string('usuario_aprov')->nullable();
            $table->string('usuario_reprov')->nullable();
            $table->text('observacoes')->nullable();
            $table->string('ativo')->nullable();
            
            $table->string('user_edit')->nullable();
            $table->string('user_create')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('anexos_funcionarios_historico', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_anexo')->nullable();
            $table->unsignedBigInteger('id_funcionario')->nullable();
            $table->unsignedBigInteger('id_qualificacao')->nullable();
            $table->unsignedBigInteger('id_obra')->nullable();
            
            $table->text('historico')->nullable();
            
            $table->string('user_create')->nullable();
            $table->string('user_edit')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anexos_funcionarios_historico');
        Schema::dropIfExists('anexos_funcionarios');
    }
};
