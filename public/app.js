(() => {
  'use strict';
  const payload = window.NCOR_DIRECTORY;
  if (!payload) { document.getElementById('result-count').textContent = 'The directory could not load. Please refresh the page.'; return; }
  const { groups, config, categories } = payload;
  const $ = (id) => document.getElementById(id);
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const state = { category: 'All groups', query: '', participation: 'all', sort: 'curated' };
  const statusNames = { open: 'Open to join', contact: 'Contact organizers', 'invite-only': 'Invitation only', paused: 'Paused' };
  const icons = {
    Cybersecurity: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    Standards: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6m-6 4 2 2 4-4"/>',
    'Semantic mappings': '<rect x="2" y="5" width="7" height="7" rx="1.5"/><rect x="15" y="12" width="7" height="7" rx="1.5"/><path d="M9 8h7l3 4M5 12v4h10"/>',
    'AI & trust': '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/><path d="m18 3 3 3"/>',
    'Domain ontologies': '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
    'Learning & support': '<path d="m2 9 10-5 10 5-10 5L2 9ZM6 11v6c4 3 8 3 12 0v-6M22 9v8"/>'
  };
  const iconColors = { 'Semantic mappings': 'mappings', 'AI & trust': 'ai', 'Domain ontologies': 'domains', 'Learning & support': 'learning' };
  let repo = config.repository;
  if (!repo && location.hostname.endsWith('.github.io')) { const owner = location.hostname.split('.')[0]; const folder = location.pathname.split('/').filter(Boolean)[0]; repo = `${owner}/${folder || `${owner}.github.io`}`; }
  const repoUrl = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '') ? `https://github.com/${repo}` : '';
  if (repoUrl) { $('repo-link').href = repoUrl; $('repo-link').hidden = false; }
  else $('form-preview-note').hidden = false;
  document.querySelectorAll('[data-home]').forEach(a => a.href = config.homeUrl);
  $('group-count').textContent = groups.length;
  $('area-count').textContent = new Set(groups.map(g => g.category)).size;
  function icon(category) { const node = el('span', `category-icon ${iconColors[category] || ''}`); node.setAttribute('aria-hidden', 'true'); node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${icons[category] || icons.Standards}</svg>`; return node; }
  function badge(status) { const b = el('span', `status-badge ${status}`); b.append(el('span', `status-dot ${status}`), document.createTextNode(statusNames[status])); return b; }
  function link(label, href) { const a = el('a', '', label.replace(/ ↗$/, '')); if (label.endsWith('↗')) { const arrow=el('span','arrow-up-right'); arrow.setAttribute('aria-hidden','true'); a.append(arrow); } a.href = href; if (href.startsWith('https://') || href.startsWith('http://')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } return a; }
  function tags(g) { const list = el('div', 'tags'); g.tags.forEach(t => list.append(el('span', 'tag', t))); return list; }
  function card(g) {
    const article = el('article', 'group-card');
    const top = el('div', 'card-top'); top.append(icon(g.category), badge(g.status));
    const heading = el('h3'); const open = el('button', '', g.name); open.type = 'button'; open.addEventListener('click', () => openGroup(g)); heading.append(open);
    const bottom = el('div', 'card-bottom'); const contact = el('div', 'contact-preview'); contact.append(el('span', '', 'POINTS OF CONTACT'), el('p', '', g.contacts.map(c => c.name).join(' · ')));
    const button = el('button', 'card-details', 'Details'); button.setAttribute('aria-label', `View details for ${g.name}`); button.append(el('span', 'arrow-up-right')); button.addEventListener('click', () => openGroup(g));
    bottom.append(contact, button);
    article.append(top, el('p', 'card-category', g.category), heading, el('p', 'card-summary', g.summary), tags(g), bottom);
    return article;
  }
  function render() {
    const query = state.query.toLowerCase().trim();
    let matches = groups.filter(g => (state.category === 'All groups' || state.category === g.category) && (state.participation === 'all' || state.participation === g.status) && (!query || [g.name, g.summary, g.category, ...g.tags, ...g.contacts.flatMap(c => [c.name, c.email || ''])].join(' ').toLowerCase().includes(query)));
    if (state.sort === 'az') matches.sort((a,b) => a.name.localeCompare(b.name));
    $('group-grid').replaceChildren(...matches.map(card));
    $('result-count').textContent = `Showing ${matches.length} of ${groups.length} groups`;
    $('empty').hidden = matches.length !== 0;
    document.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === state.category)));
  }
  ['All groups', ...categories].forEach(category => { const b = el('button', 'chip', category); b.dataset.category = category; b.setAttribute('aria-pressed', String(category === state.category)); b.append(el('span', 'chip-count', category === 'All groups' ? groups.length : groups.filter(g => g.category === category).length)); b.addEventListener('click', () => { state.category = category; render(); }); $('topic-filters').append(b); });
  categories.forEach(c => { const option = el('option', '', c); option.value = c; $('form-category').append(option); });
  $('search').addEventListener('input', e => { state.query = e.target.value; render(); });
  $('participation-filter').addEventListener('change', e => { state.participation = e.target.value; render(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('clear-filters').addEventListener('click', () => { Object.assign(state, { category: 'All groups', query: '', participation: 'all' }); $('search').value = ''; $('participation-filter').value = 'all'; render(); $('search').focus(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); $('search').focus(); } });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  $('about-data').addEventListener('click', () => $('about-dialog').showModal());
  function openGroup(g, updateUrl = true) {
    const root = $('detail-content'); root.replaceChildren();
    root.append(el('p', 'eyebrow', g.category.toUpperCase()));
    const badges = el('div', 'detail-badges'); badges.append(icon(g.category), badge(g.status));
    const h = el('h2', '', g.name); h.id = 'detail-title';
    root.append(badges, h, el('p', 'detail-description', g.summary));
    if (g.context) root.append(el('p', '', g.context));
    root.append(tags(g));
    const meta = el('div', 'detail-section detail-meta');
    for (const [title, value] of [['Participation', g.participation], ['Meetings', g.cadence]]) { const block = el('div'); block.append(el('h3', '', title), el('p', '', value)); meta.append(block); } root.append(meta);
    const contacts = el('section', 'detail-section'); contacts.append(el('h3', '', 'Get in touch')); const list = el('ul', 'detail-contact');
    g.contacts.forEach(c => { const li = el('li'); li.append(el('strong', '', c.name)); if (c.email) li.append(link(c.email, `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Interest in ${g.name}`)}`)); else li.append(document.createTextNode(c.note || 'Contact through the listed organizer.')); list.append(li); }); contacts.append(list); root.append(contacts);
    if (g.resources.length) { const section = el('section', 'detail-section detail-resources'); section.append(el('h3', '', 'Explore the work')); const list = el('ul'); g.resources.forEach(r => { const li = el('li'); li.append(link(`${r.label} ↗`, r.url)); list.append(li); }); section.append(list); root.append(section); }
    const sources = el('details', 'detail-section detail-sources'); sources.append(el('summary', '', 'Listing notes & sources')); const notes = el('p', 'detail-footnote', g.provenance); sources.append(notes); if (g.reviewedAt) sources.append(el('p', 'detail-footnote', `Public-source review: ${g.reviewedAt}. Confirm current details with organizers.`));
    const refs = el('ul'); g.sources.forEach(s => { const li = el('li'); li.append(link(`${s.label} ↗`, s.url)); refs.append(li); }); sources.append(refs); root.append(sources);
    const footer = el('div', 'detail-footer'); const share = el('button', 'text-button', 'Copy group link'); share.addEventListener('click', async () => { try { await navigator.clipboard.writeText(`${location.href.split('#')[0]}#group=${encodeURIComponent(g.id)}`); share.textContent = 'Link copied ✓'; } catch { share.textContent = 'Copy the URL from your address bar'; } });
    const correction = repoUrl ? link('Suggest a correction ↗', `${repoUrl}/issues/new?${new URLSearchParams({title:`[Correction] ${g.name}`,body:`Group: ${g.name}\nListing ID: ${g.id}\n\nSuggested correction:\n\nSource or organizer confirmation:\n`})}`) : link('Suggest a correction ↗', `mailto:${config.contactEmail}?subject=${encodeURIComponent(`Directory correction: ${g.name}`)}`);
    footer.append(share, correction); root.append(footer);
    if (!$('details-dialog').open) $('details-dialog').showModal(); $('details-dialog').scrollTop = 0;
    if (updateUrl) history.replaceState(null, '', `#group=${encodeURIComponent(g.id)}`);
  }
  $('details-dialog').addEventListener('close', () => { if (location.hash.startsWith('#group=')) history.replaceState(null, '', `${location.pathname}${location.search}#directory`); });
  function openFromHash() { if (!location.hash.startsWith('#group=')) return; let id; try { id = decodeURIComponent(location.hash.slice(7)); } catch { return; } const g = groups.find(g => g.id === id); if (g) openGroup(g, false); }
  window.addEventListener('hashchange', openFromHash);
  function addContact() {
    const count = $('contact-fields').children.length; if (count >= 5) return;
    const row = el('div', 'contact-row');
    for (const [key, title, type] of [['contactName', 'Name *', 'text'], ['contactEmail', 'Public email *', 'email']]) { const label = el('label', '', title); const input = el('input'); input.name = key; input.type = type; input.required = true; input.maxLength = key === 'contactName' ? 100 : 180; input.placeholder = key === 'contactName' ? 'Full name' : 'name@organization.org'; label.append(input); row.append(label); }
    if (count) { const remove = el('button', 'remove-contact', '×'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove this contact'); remove.addEventListener('click', () => { row.remove(); $('add-contact').hidden = false; }); row.append(remove); }
    $('contact-fields').append(row); $('add-contact').hidden = count >= 4;
  }
  addContact(); $('add-contact').addEventListener('click', addContact);
  document.querySelectorAll('[data-submit]').forEach(b => b.addEventListener('click', () => { $('form-error').hidden = true; $('submit-dialog').showModal(); }));
  function collect() { const data = new FormData($('submission-form')); return { name:data.get('name').trim(), summary:data.get('summary').trim(), category:data.get('category'), status:data.get('status'), contacts:Array.from(document.querySelectorAll('.contact-row')).map(row => ({ name:row.querySelector('[name=contactName]').value.trim(), email:row.querySelector('[name=contactEmail]').value.trim() })), website:data.get('website').trim(), cadence:data.get('cadence').trim(), participation:data.get('participation').trim(), tags:data.get('tags').split(',').map(t=>t.trim()).filter(Boolean), consent:data.get('consent') === 'on' }; }
  function download(value) { const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})); const a = el('a'); a.href=url; a.download='working-group-submission.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $('download-draft').addEventListener('click',()=>{ download(collect()); });
  $('submission-form').addEventListener('submit', e => {
    e.preventDefault(); const err=$('form-error'); err.hidden=true;
    const data=collect();
    if (data.website && !/^https?:\/\//i.test(data.website)) { err.textContent='Use an https:// or http:// website address.'; err.hidden=false; return; }
    if (data.tags.length>6 || data.tags.some(t=>t.length>32)) { err.textContent='Use no more than six topics, each under 33 characters.'; err.hidden=false; return; }
    if (!repoUrl) { err.textContent='GitHub submission is available after deployment. Use “Save draft JSON” to keep your details now.'; err.hidden=false; return; }
    const body=`<!-- ncor-directory-submission:v1 -->\nPlease leave the structured block below intact. NCOR will review this proposal before publication.\n\n\`\`\`json\n${JSON.stringify(data,null,2)}\n\`\`\`\n`;
    const url=`${repoUrl}/issues/new?${new URLSearchParams({title:`[New group] ${data.name}`,body})}`;
    if (url.length>7800) { err.textContent='This submission is too long for the GitHub link. Shorten the description or save your draft and paste it into a GitHub issue with a fenced json block.'; err.hidden=false; return; }
    window.location.assign(url);
  });
  render(); openFromHash();
})();
