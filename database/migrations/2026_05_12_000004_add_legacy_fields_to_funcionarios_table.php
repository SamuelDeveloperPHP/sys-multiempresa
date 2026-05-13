<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('funcionarios', function (Blueprint $t) {
            if (!Schema::hasColumn('funcionarios', 'rg')) {
                $t->string('rg', 30)->nullable();
                $t->string('cep', 15)->nullable();
                $t->string('endereco', 191)->nullable();
                $t->string('numero', 20)->nullable();
                $t->string('bairro', 100)->nullable();
                $t->string('cidade', 100)->nullable();
                $t->string('estado', 2)->nullable();
                $t->string('email', 191)->nullable();
                $t->string('celular', 20)->nullable();
                $t->string('nome_mae', 191)->nullable();
                $t->string('genero', 20)->nullable();
                $t->string('pis', 30)->nullable();
                $t->string('estado_civil', 30)->nullable();
                $t->integer('dependentes')->default(0)->nullable();
                $t->date('data_adminssao')->nullable();
                $t->date('data_demissao')->nullable();
                $t->string('situacao', 50)->nullable();
                $t->boolean('afastado')->default(0)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('funcionarios', function (Blueprint $t) {
            $t->dropColumn([
                'rg', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado',
                'email', 'celular', 'nome_mae', 'genero', 'pis', 'estado_civil',
                'dependentes', 'data_adminssao', 'data_demissao', 'situacao', 'afastado'
            ]);
        });
    }
};
