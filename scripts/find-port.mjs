import { createServer } from 'net';
import { execSync, spawn } from 'child_process';

const mode = process.argv[2] || 'dev';
const PREFERRED = 3000;
const MAX_TRIES = 10;

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(); resolve(true); });
    srv.listen(port);
  });
}

async function findPort() {
  for (let i = 0; i < MAX_TRIES; i++) {
    const port = PREFERRED + i;
    if (await isPortFree(port)) return port;
    console.log(`Port ${port} in use, trying ${port + 1}...`);
  }
  console.error(`No free port found in range ${PREFERRED}-${PREFERRED + MAX_TRIES - 1}`);
  process.exit(1);
}

const port = await findPort();
console.log(`Starting Next.js ${mode} on port ${port}`);

const child = spawn('npx', ['next', mode, '--port', String(port)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
