export const categories = ['Cybersecurity', 'Standards', 'Semantic mappings', 'AI & trust', 'Domain ontologies', 'Learning & support'];
export const statuses = ['open', 'contact', 'invite-only', 'paused'];
const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
export function text(value, label, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || control.test(value)) throw new Error(`${label} must be text between ${min} and ${max} characters.`);
  return value.trim();
}
export function webUrl(value) {
  const valueText = text(value, 'Website', 1, 500);
  let url; try { url = new URL(valueText); } catch { throw new Error('Website must be a complete http:// or https:// URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only public http:// or https:// links without embedded credentials are accepted.');
  return valueText;
}
export function email(value) {
  const e = text(value, 'Contact email', 3, 180);
  if (!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(e)) throw new Error('Contact email must be a valid public email address.');
  return e;
}
export function normalizeSubmission(raw, issueNumber, now = new Date()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Submission must be a JSON object.');
  if (raw.consent !== true) throw new Error('Confirm that you have permission to publish the details and contacts.');
  if (!categories.includes(raw.category)) throw new Error('Choose one of the listed focus areas.');
  if (!statuses.includes(raw.status)) throw new Error('Choose a valid participation option.');
  if (!Array.isArray(raw.contacts) || raw.contacts.length < 1 || raw.contacts.length > 5) throw new Error('Provide between one and five contacts.');
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) throw new Error('Invalid issue number.');
  const contacts = raw.contacts.map(c => ({ name: text(c?.name, 'Contact name', 1, 100), email: email(c?.email) }));
  const tags = raw.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 6) throw new Error('Provide no more than six topics.');
  const website = raw.website ? webUrl(raw.website) : '';
  const record = {
    id: `submission-${issueNumber}`,
    name: text(raw.name, 'Working group name', 3, 110),
    category: raw.category,
    summary: text(raw.summary, 'Purpose', 30, 600),
    contacts, tags: tags.map(t => text(t, 'Topic', 1, 32)), status: raw.status,
    participation: raw.participation ? text(raw.participation, 'How to participate', 1, 400) : 'Contact the listed organizers for eligibility and joining details.',
    cadence: raw.cadence ? text(raw.cadence, 'Meeting schedule', 1, 160) : 'Contact the organizers for the current schedule.',
    context: '',
    resources: website ? [{ label:'Group website / repository', url:website }] : [],
    sources: website ? [{ label:'Submitter-provided group resource', url:website }] : [],
    provenance: 'Community-submitted listing. Participation and meeting details are reported by the submitter; directory review does not independently verify these claims.',
    submittedAt: now.toISOString().slice(0,10),
    order: 1000 + issueNumber
  };
  validateGroup(record);
  return record;
}
export function validateGroup(g) {
  if (!g || typeof g !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id || '') || g.id.length > 100) throw new Error('Invalid group ID.');
  text(g.name,'Name',3,110); text(g.summary,'Purpose',30,600);
  if (!categories.includes(g.category) || !statuses.includes(g.status)) throw new Error(`Invalid category or participation: ${g.id}`);
  if (!Array.isArray(g.contacts) || g.contacts.length < 1 || g.contacts.length > 6) throw new Error('Invalid contact list.');
  for (const c of g.contacts) { text(c.name,'Contact name',1,100); if (c.email) email(c.email); if (c.note) text(c.note,'Contact note',1,250); }
  if (!g.contacts.some(c => c.email)) throw new Error('At least one contact must have an email.');
  if (!Array.isArray(g.tags) || g.tags.length > 6) throw new Error('Invalid topics.');
  g.tags.forEach(t=>text(t,'Topic',1,32));
  text(g.participation,'Participation',1,500); text(g.cadence,'Schedule',1,300);
  if (g.context) text(g.context,'Context',1,1000);
  text(g.provenance,'Provenance',1,1000);
  for (const key of ['resources','sources']) { if (!Array.isArray(g[key]) || g[key].length>10) throw new Error('Invalid resources.'); for (const r of g[key]) { text(r.label,'Resource label',1,140); webUrl(r.url); } }
  if (!Number.isSafeInteger(g.order) || g.order < 0) throw new Error('Order must be a nonnegative integer.');
  for (const field of ['reviewedAt','submittedAt']) if (g[field] && !/^\d{4}-\d{2}-\d{2}$/.test(g[field])) throw new Error('Dates must use YYYY-MM-DD.');
  return true;
}
export function parseSubmission(body) {
  if (typeof body !== 'string' || body.length > 14000) throw new Error('Submission is missing or too long.');
  const json = body.match(/```json\s*\n([\s\S]*?)\n```/i);
  if (json) { try { return JSON.parse(json[1]); } catch { throw new Error('The submission JSON is not valid. Keep the structured JSON block intact.'); } }
  // GitHub Issue Forms render their labeled fields as level-three headings.
  const sections = Object.create(null);
  const re = /^### ([^\r\n]+)\r?\n+([\s\S]*?)(?=^### |$(?![\s\S]))/gm;
  for (const m of body.matchAll(re)) { const value = m[2].trim(); sections[m[1].trim()] = value === '_No response_' ? '' : value; }
  const participationMap = { 'Contact organizers':'contact', 'Open to join':'open', 'Invitation only':'invite-only', 'Paused':'paused' };
  return {
    name: sections['Working group name'], summary: sections['Purpose'], category: sections['Focus area'],
    status: participationMap[sections['Participation']],
    contacts: [{ name:sections['Contact name'], email:sections['Contact email'] }],
    website: sections['Website or repository'] || '', cadence: sections['Meeting schedule'] || '',
    participation: sections['How to participate'] || '', tags: (sections['Topics'] || '').split(',').map(t=>t.trim()).filter(Boolean),
    consent: /\[x\]/i.test(sections['Publication permission'] || '')
  };
}
