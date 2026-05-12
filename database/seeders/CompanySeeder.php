<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        // Se já tiver empresas, não faz nada
        if (Company::count() > 0) {
            return;
        }

        Company::create([
            'name'      => 'Intranet IRRP',
            'slug'      => Str::slug('Intranet IRRP'),
            'logo_path' => null,
            'is_active' => true,
        ]);
    }
}
