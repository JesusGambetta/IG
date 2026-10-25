import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/overlay',{recursive:true});
await writeFile('dist/overlay/index.html',await readFile('dist/index.html','utf8'));
