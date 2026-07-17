<?php
/**
 * scripts/prune-build.php
 * ---------------------------------------------------------------------------
 * Higieniza public/build/ removendo APENAS os assets órfãos (de builds
 * antigas) que a build ATUAL não referencia mais. Zero downtime: os arquivos
 * em uso permanecem.
 *
 * Segurança:
 *   - DRY-RUN por padrão (só LISTA). Só apaga com --apply.
 *   - Aborta se o manifest não existir (nunca apaga "no escuro").
 *   - keep-set = tudo referenciado pelo manifest do Vite + o que o sw.js
 *     atual precacheia + sw.js, workbox e manifest sempre preservados.
 *
 * Uso (na raiz do projeto, no servidor — precisa só de PHP CLI):
 *   php scripts/prune-build.php            # dry-run: mostra os órfãos
 *   php scripts/prune-build.php --apply    # apaga os órfãos de fato
 * ---------------------------------------------------------------------------
 */

$root = dirname(__DIR__);
$buildDir = $root . '/public/build';
$apply = in_array('--apply', $argv, true);

if (!is_dir($buildDir)) {
    fwrite(STDERR, "ERRO: public/build não existe em {$buildDir}\n");
    exit(1);
}

// 1) Manifest do Vite (pode estar em build/manifest.json ou build/.vite/manifest.json)
$manifestPath = file_exists("$buildDir/manifest.json")
    ? "$buildDir/manifest.json"
    : (file_exists("$buildDir/.vite/manifest.json") ? "$buildDir/.vite/manifest.json" : null);

if (!$manifestPath) {
    fwrite(STDERR, "ERRO: manifest não encontrado — abortando por segurança (nada apagado).\n");
    exit(1);
}

$manifest = json_decode(file_get_contents($manifestPath), true);
if (!is_array($manifest) || !count($manifest)) {
    fwrite(STDERR, "ERRO: manifest inválido/vazio — abortando por segurança.\n");
    exit(1);
}

// 2) keep-set: todo arquivo referenciado pelo manifest (file + css + assets)
$keep = [];
foreach ($manifest as $entry) {
    if (!empty($entry['file']))   $keep[$entry['file']] = true;
    foreach (['css', 'assets'] as $k) {
        if (!empty($entry[$k]) && is_array($entry[$k])) {
            foreach ($entry[$k] as $f) $keep[$f] = true;
        }
    }
}

// 3) Sempre preservar (não estão no manifest, mas são essenciais)
foreach (['manifest.json', 'manifest.webmanifest', '.vite/manifest.json', 'sw.js'] as $f) {
    $keep[$f] = true;
}

// 3.5) Preservar TUDO que o sw.js atual referencia (precache) — cinto e suspensório
if (file_exists("$buildDir/sw.js")) {
    $sw = file_get_contents("$buildDir/sw.js");
    if (preg_match_all('#["\'](?:\./)?((?:assets/)?[\w./-]+\.(?:js|mjs|css|woff2|png|svg|ico|json|wasm))["\']#', $sw, $m)) {
        foreach ($m[1] as $ref) $keep[ltrim($ref, '/')] = true;
    }
}

// 4) Varre public/build e classifica
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($buildDir, FilesystemIterator::SKIP_DOTS)
);
$toDelete = [];
$keptCount = 0; $keptBytes = 0; $delBytes = 0;

foreach ($it as $file) {
    if (!$file->isFile()) continue;
    $rel = str_replace('\\', '/', substr($file->getPathname(), strlen($buildDir) + 1));

    // Runtime do Workbox (nome com hash) — sempre preservar
    if (preg_match('#^workbox-[^/]+\.js$#', $rel)) { $keptCount++; $keptBytes += $file->getSize(); continue; }

    if (isset($keep[$rel])) { $keptCount++; $keptBytes += $file->getSize(); continue; }

    $toDelete[] = $rel;
    $delBytes += $file->getSize();
}

// 5) Relatório
$mb = fn ($b) => number_format($b / 1048576, 2) . ' MB';
echo "Manifest:  {$manifestPath}\n";
echo "Mantidos:  {$keptCount} arquivos ({$mb($keptBytes)})\n";
echo "Órfãos:    " . count($toDelete) . " arquivos ({$mb($delBytes)})" . ($apply ? '' : '  [DRY-RUN]') . "\n";
foreach ($toDelete as $r) echo '  ' . ($apply ? 'apagado  ' : 'órfão    ') . $r . "\n";

if (!$toDelete) { echo "\nNada a limpar. ✔\n"; exit(0); }

if ($apply) {
    $ok = 0;
    foreach ($toDelete as $r) { if (@unlink("$buildDir/$r")) $ok++; }
    echo "\nApagados {$ok}/" . count($toDelete) . " arquivos. ✔\n";
} else {
    echo "\n(dry-run — nada apagado. Rode com --apply para efetivar.)\n";
}
