const { spawn, spawnSync } = require('node:child_process');

const mode = process.argv[2] || 'all';

if (!['all', 'migrate', 'start'].includes(mode)) {
  console.error(`Unknown Qube container mode: ${mode}`);
  process.exit(2);
}

if (mode !== 'start') {
  console.log('Running Qube database migrations...');
  const migration = spawnSync(
    process.execPath,
    ['/app/scripts/run-qube-migrations.cjs'],
    { cwd: '/app', env: process.env, stdio: 'inherit' },
  );

  if (migration.error) {
    console.error('Qube migration command could not start:', migration.error.message);
    process.exit(1);
  }
  if (migration.status !== 0) {
    console.error(`Qube database migrations failed (exit ${migration.status ?? 'unknown'}); applications were not started.`);
    process.exit(migration.status ?? 1);
  }
}

if (mode === 'migrate') {
  process.exit(0);
}

const api = spawn(process.execPath, ['/app/apps/api/dist/src/main.js'], {
  cwd: '/app/apps/api',
  env: process.env,
  stdio: 'inherit',
});
const web = spawn(process.execPath, ['/app/apps/web/server.js'], {
  cwd: '/app/apps/web',
  env: { ...process.env, PORT: process.env.WEB_PORT || '3001', HOSTNAME: '0.0.0.0' },
  stdio: 'inherit',
});

let shuttingDown = false;
function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill(signal);
  web.kill(signal);
  const forceStop = setTimeout(() => {
    api.kill('SIGKILL');
    web.kill('SIGKILL');
  }, 20_000);
  forceStop.unref();
  const exited = (child) =>
    child.exitCode !== null || child.signalCode !== null
      ? Promise.resolve()
      : new Promise((resolve) => child.once('exit', resolve));
  Promise.all([exited(api), exited(web)]).finally(() => process.exit(exitCode));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT', 130));
api.on('error', (error) => {
  console.error('Qube API process failed to start:', error.message);
  shutdown('SIGTERM', 1);
});
web.on('error', (error) => {
  console.error('Qube web process failed to start:', error.message);
  shutdown('SIGTERM', 1);
});
api.on('exit', (code) => {
  if (!shuttingDown) shutdown('SIGTERM', code ?? 1);
});
web.on('exit', (code) => {
  if (!shuttingDown) shutdown('SIGTERM', code ?? 1);
});
