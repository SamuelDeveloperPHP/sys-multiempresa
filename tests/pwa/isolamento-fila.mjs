import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// Executar na raiz do projeto com node tests/pwa/isolamento-fila.mjs <chrome>.
// A página recarrega entre sessões, preservando o IndexedDB do mesmo aparelho.
const chrome = process.argv[2];
assert.ok(chrome, 'Informe o executável do Chromium.');
const scopes = ['1:10', '1:11', '2:10', '1:10'];
const script = await build({
    stdin: { resolveDir: process.cwd(), contents: `
        import { allowsPage, permissionKey, requireLocalAction } from './resources/js/offline/modulePermissions.js';
        import { db, selectOfflineDatabase, getMeta, setMeta } from './resources/js/offline/db.js';
        (async () => {
            const step = Number(location.search.slice(1));
            const scope = ${JSON.stringify(scopes)}[step];
            await selectOfflineDatabase(scope);
            const pending = await db.sync_queue.toArray();
            if (step < 3) {
                if (pending.length) throw Error('Fila de outra sessão visível.');
                if (await getMeta(permissionKey)) throw Error('Permissão de outro contexto.');
                if (step === 0) {
                    await setMeta(permissionKey, [{ slug: 'frota.abastecimentos', can_create: true }]);
                    await requireLocalAction('abastecimentos', 'create');
                }
                await db.sync_queue.add({ status: 'pending', local_id: scope });
                location.replace('/?' + (step + 1));
            } else {
                if (pending.length !== 1 || pending[0].local_id !== scope) throw Error('Pendência original divergente.');
                if (!allowsPage(await getMeta(permissionKey), 'Mobile/Veiculos/Abastecimento/Create')) throw Error('Concessão offline perdida.');
                await setMeta(permissionKey, []);
                let blocked = false;
                try { await requireLocalAction('abastecimentos', 'create'); } catch { blocked = true; }
                if (!blocked || allowsPage([], 'Mobile/Veiculos/Abastecimento/Create')) throw Error('Revogação ignorada.');
                await fetch('/result', { method: 'POST', body: 'ok' });
            }
        })().catch(e => fetch('/result', { method: 'POST', body: e.message }));
    ` }, bundle: true, write: false,
});
const directory = resolve('storage/framework/testing');
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(resolve(directory, 'chromium-fila-'));
let finish;
const result = new Promise(resolveResult => { finish = resolveResult; });
const server = createServer(async (req, res) => {
    if (req.url === '/result' && req.method === 'POST') {
        let body = '';
        for await (const part of req) body += part;
        res.end();
        finish(body);
    } else if (req.url === '/app.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(script.outputFiles[0].contents);
    } else {
        res.setHeader('Content-Type', 'text/html');
        res.end('<script src="/app.js"></script>');
    }
});
let browser;
let timer;
try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking',
        '--user-data-dir=' + profile, 'http://127.0.0.1:' + server.address().port + '/?0'], { stdio: 'ignore' });
    browser.once('error', e => finish(e.message));
    browser.once('exit', code => finish('Chromium encerrou com código ' + code));
    timer = setTimeout(() => finish('Tempo limite da navegação excedido.'), 45000);
    assert.equal(await result, 'ok');
    console.log('Fila isolada entre usuários e empresas, com recuperação após retorno ao contexto original.');
} finally {
    clearTimeout(timer);
    if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
        const stopped = once(browser, 'exit');
        browser.kill();
        await stopped;
    }
    server.close();
    server.closeAllConnections();
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
