<?php

// app/Support/permissions.php

if (! function_exists('ability_for_route')) {
    function ability_for_route(string $routeName, string $method = 'GET'): string
    {
        // Padrão por HTTP method
        $method = strtoupper($method);

        // Se quiser, primeiro checa pelo sufixo do nome da rota:
        if (str_ends_with($routeName, '.index') || str_contains($routeName, '.list')) {
            return 'list';
        }
        if (str_ends_with($routeName, '.show')) {
            return 'view';
        }
        if (str_ends_with($routeName, '.create') || str_ends_with($routeName, '.store')) {
            return 'create';
        }
        if (str_ends_with($routeName, '.edit') || str_ends_with($routeName, '.update')) {
            return 'edit';
        }
        if (str_ends_with($routeName, '.destroy') || str_contains($routeName, '.delete')) {
            return 'delete';
        }

        

        // Fallback por método HTTP
        return match ($method) {
            'POST'   => 'create',
            'PUT', 'PATCH' => 'edit',
            'DELETE' => 'delete',
            default  => 'view', // GET
        };
    }
}
