<?php

namespace Tests\Concerns;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Constrói um schema MÍNIMO e ISOLADO (apenas as tabelas que a feature
 * "Níveis de Acesso" toca) diretamente em sqlite :memory:.
 *
 * Por que não RefreshDatabase / migrations completas?
 *   O conjunto de 128 migrations do projeto NÃO é re-executável do zero:
 *   `2026_05_13_013206_create_user_funcionario_table` recria a tabela
 *   `user_funcionario` já criada por uma migration anterior, então
 *   migrate:fresh (usado pelo RefreshDatabase) explode com
 *   "table user_funcionario already exists". Isso é um problema PRÉ-EXISTENTE
 *   das migrations, alheio à feature sob teste. Para não depender disso — e
 *   para garantir isolamento total do banco de DEV (sys_engeativos) — montamos
 *   só as 7 tabelas necessárias à mão, em sqlite :memory:.
 *
 * GUARD: o método aborta com exceção se a conexão não for sqlite, tornando
 * IMPOSSÍVEL rodar este DDL contra o MySQL de desenvolvimento.
 */
trait BuildsAccessLevelSchema
{
    protected function bootAccessLevelSchema(): void
    {
        $connection = DB::connection();
        $driver     = $connection->getDriverName();
        $database   = (string) $connection->getDatabaseName();

        // ---- TRAVA DE SEGURANÇA (protege o banco de DEV) ---------------------
        if ($driver !== 'sqlite') {
            throw new RuntimeException(
                "ABORT QA: conexão '{$driver}' (db='{$database}') não é sqlite. "
                . 'Os testes de Níveis de Acesso exigem sqlite :memory:. Recusando DDL.'
            );
        }
        if ($database === 'sys_engeativos') {
            throw new RuntimeException('ABORT QA: apontando para o banco de DEV. Recusando DDL.');
        }

        // Recria do zero a cada teste (idempotente, ordem respeita dependências).
        foreach ([
            'module_permissions',
            'access_group_permissions',
            'access_groups',
            'company_user',
            'modules',
            'companies',
            'users',
        ] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('password')->nullable();
            $t->string('type')->nullable();          // 'super_admin' | null | 'user'...
            $t->boolean('is_active')->default(true);
            $t->timestamp('last_seen_at')->nullable();
            $t->timestamps();
        });

        Schema::create('companies', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->softDeletes();                        // Company usa SoftDeletes
            $t->timestamps();
        });

        Schema::create('modules', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->nullable();
            $t->string('route_name')->nullable();
            $t->unsignedBigInteger('parent_id')->nullable();
            $t->integer('ordem')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('company_user', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('user_id');
            $t->string('role')->default('user');
            $t->unsignedBigInteger('access_group_id')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'user_id']);
        });

        Schema::create('access_groups', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id');
            $t->string('name');
            $t->string('descricao')->nullable();
            $t->timestamps();
            $t->unique(['company_id', 'name']);
        });

        Schema::create('access_group_permissions', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('access_group_id');
            $t->unsignedBigInteger('module_id');
            $t->boolean('can_list')->default(false);
            $t->boolean('can_view')->default(false);
            $t->boolean('can_create')->default(false);
            $t->boolean('can_edit')->default(false);
            $t->boolean('can_delete')->default(false);
            $t->timestamps();
            $t->unique(['access_group_id', 'module_id']);
        });

        Schema::create('module_permissions', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('user_id');
            $t->unsignedBigInteger('module_id');
            $t->boolean('can_list')->default(false);
            $t->boolean('can_view')->default(false);
            $t->boolean('can_create')->default(false);
            $t->boolean('can_edit')->default(false);
            $t->boolean('can_delete')->default(false);
            $t->timestamps();
            $t->unique(['company_id', 'user_id', 'module_id']);
        });
    }

    // ----------------------------------------------------------------- seeds --

    protected function makeUser(?string $type = null): User
    {
        static $n = 0;
        $n++;

        return User::create([
            'name'      => 'User ' . $n,
            'email'     => 'user' . $n . '_' . uniqid() . '@qa.test',
            'password'  => 'secret-password',
            'type'      => $type,
            'is_active' => true,
        ]);
    }

    protected function makeCompany(string $name = 'Empresa'): Company
    {
        static $n = 0;
        $n++;

        return Company::create(['name' => $name . ' ' . $n]);
    }

    /** Vincula usuário↔empresa no pivot, opcionalmente com um grupo de acesso. */
    protected function linkUserCompany(User $user, Company $company, ?int $groupId = null, string $role = 'user'): void
    {
        DB::table('company_user')->insert([
            'company_id'      => $company->id,
            'user_id'         => $user->id,
            'role'            => $role,
            'access_group_id' => $groupId,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }

    protected function makeGroup(int $companyId, string $name = 'Grupo'): int
    {
        static $n = 0;
        $n++;

        return (int) DB::table('access_groups')->insertGetId([
            'company_id' => $companyId,
            'name'       => $name . ' ' . $n,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** Concede (ou não) habilidades a um grupo num módulo. */
    protected function grantGroup(int $groupId, int $moduleId, array $abilities): void
    {
        DB::table('access_group_permissions')->insert(array_merge(
            [
                'access_group_id' => $groupId,
                'module_id'       => $moduleId,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            $this->boolCols($abilities)
        ));
    }

    /** Cria uma linha de OVERRIDE (module_permissions) para (empresa, usuário, módulo). */
    protected function setOverride(int $companyId, int $userId, int $moduleId, array $abilities): void
    {
        DB::table('module_permissions')->insert(array_merge(
            [
                'company_id' => $companyId,
                'user_id'    => $userId,
                'module_id'  => $moduleId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            $this->boolCols($abilities)
        ));
    }

    protected function makeModule(int $id, string $routeName, string $name = 'Módulo', bool $active = true): void
    {
        DB::table('modules')->insert([
            'id'         => $id,
            'name'       => $name,
            'slug'       => 'mod-' . $id,
            'route_name' => $routeName,
            'is_active'  => $active,
            'ordem'      => $id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** Converte ['list'=>true,'edit'=>true] em colunas can_* (default false). */
    private function boolCols(array $abilities): array
    {
        return [
            'can_list'   => (bool) ($abilities['list']   ?? false),
            'can_view'   => (bool) ($abilities['view']   ?? false),
            'can_create' => (bool) ($abilities['create'] ?? false),
            'can_edit'   => (bool) ($abilities['edit']   ?? false),
            'can_delete' => (bool) ($abilities['delete'] ?? false),
        ];
    }
}
