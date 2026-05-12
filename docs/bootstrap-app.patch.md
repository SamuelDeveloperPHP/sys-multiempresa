# Patch para `bootstrap/app.php`

Adicione o provider e o alias do middleware.

```php
->withProviders([
    App\Providers\JarvisServiceProvider::class,
])

->withMiddleware(function ($middleware) {
    $middleware->alias([
        'jarvis.access' => App\Http\Middleware\EnsureJarvisAccess::class,
    ]);
})
```
