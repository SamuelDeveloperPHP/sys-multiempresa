# Rota web para a tela React

No seu `routes/web.php`:

```php
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'jarvis.access'])->get('/jarvis', function () {
    return view('jarvis');
})->name('jarvis.index');
```
