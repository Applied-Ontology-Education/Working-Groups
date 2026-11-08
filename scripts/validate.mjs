import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGroup } from './schema.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function loadGroups() {
  const dir=path.join(root,'data/groups');
  const files=(await fs.readdir(dir)).filter(f=>f.endsWith('.json')).sort();
  const groups=[]; const ids=new Set(); const names=new Set();
  for (const file of files) {
    let g; try { g=JSON.parse(await fs.readFile(path.join(dir,file),'utf8')); validateGroup(g); } catch(e) { throw new Error(`${file}: ${e.message}`); }
    if (file!==`${g.id}.json`) throw new Error(`File name must match group ID: ${file}`);
    if (ids.has(g.id) || names.has(g.name.toLowerCase().trim())) throw new Error(`Duplicate group: ${g.name}`);
    ids.add(g.id); names.add(g.name.toLowerCase().trim()); groups.push(g);
  }
  if (!groups.length) throw new Error('Directory cannot be empty.');
  return groups.sort((a,b)=>a.order-b.order || a.name.localeCompare(b.name));
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(`Validated ${(await loadGroups()).length} working groups.`);
