import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGroups } from './validate.mjs';
import { categories, webUrl, email } from './schema.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const groups=await loadGroups();
const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
config.repository=process.env.GITHUB_REPOSITORY || config.repository || '';
if (config.repository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository)) throw new Error('Repository must be OWNER/REPO.');
webUrl(config.homeUrl); email(config.contactEmail);
const output=path.join(root,'dist');
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(path.join(output,'data'),{recursive:true});
await fs.cp(path.join(root,'public'),output,{recursive:true});
const payload=JSON.stringify({groups,config,categories}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
await fs.writeFile(path.join(output,'directory-data.js'),`window.NCOR_DIRECTORY=${payload};\n`);
await fs.writeFile(path.join(output,'data/groups.json'),JSON.stringify(groups,null,2)+'\n');
await fs.writeFile(path.join(output,'.nojekyll'),'');
// A portable, fully functional preview: open locally without a web server.
let preview=await fs.readFile(path.join(root,'public/index.html'),'utf8');
const css=await fs.readFile(path.join(root,'public/styles.css'),'utf8');
const app=await fs.readFile(path.join(root,'public/app.js'),'utf8');
const favicon=await fs.readFile(path.join(root,'public/favicon.svg'),'utf8');
preview=preview.replace('<link rel="stylesheet" href="./styles.css">',`<style>${css}</style>`)
 .replace('<script src="./directory-data.js" defer></script>','')
 .replace('<script src="./app.js" defer></script>','')
 .replaceAll('./favicon.svg',`data:image/svg+xml,${encodeURIComponent(favicon)}`)
 .replace('</body>',`<script>window.NCOR_DIRECTORY=${payload};<\/script><script>${app.replaceAll('</script','<\\/script')}<\/script></body>`);
await fs.writeFile(path.join(root,'PREVIEW.html'),preview);
console.log(`Built ${groups.length} groups into dist/; portable PREVIEW.html ready. Repository: ${config.repository || '(configured automatically on GitHub)'}`);
