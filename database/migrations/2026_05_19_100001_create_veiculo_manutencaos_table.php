<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('veiculo_manutencaos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $t->foreignId('veiculo_id')->constrained('veiculos')->cascadeOnDelete();
            // fornecedor_id e servico_id apontam para tabelas legadas nao migradas ainda — sem FK
            $t->unsignedBigInteger('fornecedor_id')->nullable();
            $t->unsignedBigInteger('servico_id')->nullable();
            $t->foreignId('id_obra')->nullable()->constrained('obras')->nullOnDelete();
            $t->unsignedBigInteger('id_usuario')->nullable();

            $t->string('tipo', 50)->nullable();
            $t->decimal('valor_do_servico', 12, 2)->nullable();

            $t->integer('quilometragem_atual')->nullable();
            $t->integer('quilometragem_nova')->nullable();
            $t->integer('horimetro_atual')->nullable();
            $t->integer('horimetro_proximo')->nullable();

            $t->date('data_de_execucao')->nullable();
            $t->date('data_previsao_termino')->nullable();
            $t->date('data_conclusao')->nullable();
            $t->date('data_de_vencimento')->nullable();

            $t->longText('descricao')->nullable();
            // 1=Pendente, 2=Em Execução, 3=Concluído, 4=Cancelado
            $t->tinyInteger('situacao')->default(1);
            $t->tinyInteger('status')->nullable();
            $t->string('arquivo', 255)->nullable();
            $t->string('user_create', 191)->nullable();
            $t->string('user_edit', 191)->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['company_id', 'veiculo_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veiculo_manutencaos');
    }
};
