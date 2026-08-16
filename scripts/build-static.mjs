import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('docs', 'dist', { recursive: true });
console.log('Site da Lu Fashion Hair preparado em dist/.');
