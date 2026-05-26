<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Produtos do catálogo da Leroy Merlin (referência externa).
 *
 * NÃO é o estoque real da empresa — é catálogo de mercado.
 * O usuário pode (futuramente) "importar" um produto daqui pro seu
 * estoque_produtos da empresa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_leroy_produtos', function (Blueprint $table) {
            $table->id();
            $table->string('leroy_id', 64)->unique()->comment('ID do produto na Leroy Merlin');
            $table->foreignId('categoria_principal_id')->nullable()
                  ->constrained('estoque_leroy_categorias_principais', 'id', 'fk_lm_prod_princ')->nullOnDelete();
            $table->foreignId('categoria_primaria_id')->nullable()
                  ->constrained('estoque_leroy_categorias_primarias', 'id', 'fk_lm_prod_prim')->nullOnDelete();
            $table->foreignId('categoria_secundaria_id')->nullable()
                  ->constrained('estoque_leroy_categorias_secundarias', 'id', 'fk_lm_prod_sec')->nullOnDelete();

            $table->string('nome', 500);
            $table->string('marca', 255)->nullable();
            $table->decimal('valor_unitario', 12, 2)->default(0);
            $table->string('unidade', 16)->default('UN');
            $table->string('imagem_path', 500)->nullable()->comment('Path relativo em storage/app/public/leroy_merlin/');
            $table->string('imagem_url_original', 1000)->nullable()->comment('URL original na CDN da Leroy (re-download se necessário)');
            $table->boolean('ativo')->default(true);

            $table->foreignId('ultimo_sync_user_id')->nullable()
                  ->constrained('users', 'id', 'fk_lm_prod_user')->nullOnDelete();
            $table->timestamp('ultimo_sync_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('nome');
            $table->index('marca');
            $table->index('ultimo_sync_at');
        });

        // FULLTEXT separado pra MySQL/MariaDB (alguns drivers SQLite-test não suportam)
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            \DB::statement('ALTER TABLE estoque_leroy_produtos ADD FULLTEXT idx_leroy_produtos_fulltext (nome, marca)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_leroy_produtos');
    }
};
