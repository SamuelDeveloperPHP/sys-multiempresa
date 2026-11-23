<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class InitialPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('As permissões são concedidas na administração de usuários.');
    }
}
