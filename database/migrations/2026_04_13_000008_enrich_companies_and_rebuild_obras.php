<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1. Adiciona campos ricos à tabela companies (CNPJ, endereço, etc.)
 * 2. Recria a tabela obras com a estrutura completa
 * 3. Cria a tabela obra_user (pivot de acesso por usuário)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. Enriquece companies com dados fiscais e de endereço
        // ----------------------------------------------------------------
        Schema::table('companies', function (Blueprint $table) {
            // Dados fiscais
            $table->string('nome_fantasia', 191)->nullable()->after('name');
            $table->string('razao_social', 191)->nullable()->after('nome_fantasia');
            $table->string('cnpj', 20)->nullable()->after('razao_social');

            // Endereço
            $table->string('cep', 10)->nullable()->after('cnpj');
            $table->string('endereco', 191)->nullable()->after('cep');
            $table->string('numero', 20)->nullable()->after('endereco');
            $table->string('bairro', 191)->nullable()->after('numero');
            $table->string('cidade', 191)->nullable()->after('bairro');
            $table->string('estado', 2)->nullable()->after('cidade');

            // Contato
            $table->string('email', 191)->nullable()->after('estado');
            $table->string('celular', 20)->nullable()->after('email');

            // Soft-delete
            $table->softDeletes()->after('is_active');
        });

        // ----------------------------------------------------------------
        // 2. Recria obras com estrutura completa
        // ----------------------------------------------------------------
        Schema::dropIfExists('obras');

        Schema::create('obras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Identificação
            $table->string('nome_fantasia', 191);
            $table->string('razao_social', 191)->nullable();
            $table->string('cnpj', 20)->nullable();
            $table->string('code', 100)->nullable()->comment('Código interno da obra');

            // Endereço
            $table->string('cep', 10)->nullable();
            $table->string('endereco', 191)->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('complemento', 100)->nullable();
            $table->string('bairro', 191)->nullable();
            $table->string('cidade', 191)->nullable();
            $table->string('estado', 2)->nullable();

            // Contato
            $table->string('email', 191)->nullable();
            $table->string('celular', 20)->nullable();

            // Controle
            $table->enum('status', ['Ativa', 'Concluida', 'Paralisada', 'Cancelada'])->default('Ativa');
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        // ----------------------------------------------------------------
        // 3. Pivot obra_user (controle de acesso por usuário)
        // ----------------------------------------------------------------
        Schema::create('obra_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obra_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 50)->default('member'); // admin | member | viewer
            $table->timestamps();

            $table->unique(['obra_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('obra_user');
        Schema::dropIfExists('obras');

        Schema::table('companies', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'nome_fantasia', 'razao_social', 'cnpj',
                'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
                'email', 'celular',
            ]);
        });

        // Restaura obras simples
        Schema::create('obras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['ativa', 'concluida', 'paralisada', 'cancelada'])->default('ativa');
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();
            $table->timestamps();
        });
    }
};
