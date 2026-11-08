import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSubmission, normalizeSubmission, validateGroup } from '../scripts/schema.mjs';
import { processIssue } from '../scripts/issue-to-pr.mjs';
import { loadGroups } from '../scripts/validate.mjs';

const draft = () => ({name:'Geospatial Ontology Working Group',summary:'Develop reusable geospatial ontology patterns and evaluate their application across domains.',category:'Domain ontologies',status:'open',contacts:[{name:'Example Organizer',email:'organizer@example.org'}],website:'https://example.org/group',cadence:'Monthly; contact for details.',participation:'Contact the organizer for an invitation.',tags:['Geospatial','OWL'],consent:true});
const body = (data=draft()) => `<!-- ncor-directory-submission:v1 -->\n\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\``;
const now=new Date('2026-11-07T22:00:00Z');

test('all 11 supplied groups validate with distinct IDs and names',async()=>{const groups=await loadGroups();assert.ok(groups.length>=11);assert.equal(groups.filter(g=>g.status==='open').length>=2,true);assert.ok(groups.some(g=>g.id==='ncor-bfo-cco-office-hours'));});
test('website form round-trips through issue JSON into a bounded listing',()=>{const result=normalizeSubmission(parseSubmission(body()),123,now);assert.equal(result.id,'submission-123');assert.equal(result.contacts[0].email,'organizer@example.org');assert.equal(result.status,'open');assert.equal(validateGroup(result),true);});
test('GitHub native issue form accepts optional omissions and consent',()=>{
  const native=`### Working group name\n\nExample Native Group\n\n### Purpose\n\nBuild and evaluate practical ontology patterns across multiple domains.\n\n### Focus area\n\nStandards\n\n### Participation\n\nOpen to join\n\n### Contact name\n\nExample Person\n\n### Contact email\n\nperson@example.org\n\n### Website or repository\n\n_No response_\n\n### Meeting schedule\n\n_No response_\n\n### How to participate\n\n_No response_\n\n### Topics\n\nOWL, BFO\n\n### Publication permission\n\n- [x] I have permission to publish these details and contacts, and this submission contains only public, non-sensitive information.\n`;
  const result=normalizeSubmission(parseSubmission(native),99,now);assert.equal(result.name,'Example Native Group');assert.equal(result.status,'open');assert.equal(result.resources.length,0);assert.deepEqual(result.tags,['OWL','BFO']);
});
test('invalid links, missing consent, invalid email, oversized fields and contacts are rejected',()=>{
  for (const change of [{website:'javascript:alert(1)'},{website:'https://user:password@example.org'},{consent:false},{contacts:[{name:'Someone',email:'x@example.org?subject=spam'}]},{summary:'short'},{name:'x'.repeat(111)},{category:'arbitrary'},{status:'accepted'},{tags:['x'.repeat(33)]},{contacts:Array(6).fill({name:'Name',email:'x@example.org'})}]) assert.throws(()=>normalizeSubmission({...draft(),...change},1,now));
  assert.throws(()=>parseSubmission('x'.repeat(14001)));
});
test('untrusted path/code fields never become paths or executable content',()=>{const raw={...draft(),id:'../../.github/workflows/evil',path:'../evil',script:'$(whoami)',name:'A <script>alert(1)</script> working group'};const result=normalizeSubmission(raw,7,now);assert.equal(result.id,'submission-7');assert.equal(result.script,undefined);assert.equal(result.path,undefined);assert.match(result.name,/<script>/);});

function mockGitHub(data=draft()) {
  const state={issue:{number:5,state:'open',title:'[New group] Example',body:body(data)},ref:null,file:null,pr:null,comments:[],writes:[],calls:[]};
  const api=async(method,route,payload)=>{
    state.calls.push({method,route,payload}); const r=route.replace('/repos/ncor/example','');
    if (method!=='GET') state.writes.push({method,r,payload});
    if(method==='GET'&&r==='/issues/5')return state.issue;
    if(method==='GET'&&r.startsWith('/pulls?'))return state.pr?[state.pr]:[];
    if(method==='GET'&&r==='/git/ref/heads/directory/issue-5'){if(state.ref)return state.ref;throw Object.assign(new Error('missing'),{status:404});}
    if(method==='GET'&&r==='/git/ref/heads/main')return {object:{sha:'main-sha'}};
    if(method==='POST'&&r==='/git/refs'){state.ref={object:{sha:payload.sha}};return state.ref;}
    if(method==='GET'&&r.startsWith('/contents/data/groups/submission-5.json')){if(state.file)return state.file;throw Object.assign(new Error('missing'),{status:404});}
    if(method==='PUT'&&r==='/contents/data/groups/submission-5.json'){state.file={sha:'file-sha',content:payload.content};return {};}
    if(method==='POST'&&r==='/pulls'){state.pr={number:8,state:'open',html_url:'https://github.com/ncor/example/pull/8',...payload};return state.pr;}
    if(method==='PATCH'&&r==='/pulls/8'){Object.assign(state.pr,payload);return state.pr;}
    if(method==='GET'&&r==='/issues/5/comments?per_page=100')return state.comments;
    if(method==='POST'&&r==='/issues/5/comments'){const c={id:10,user:{type:'Bot',login:'github-actions[bot]'},...payload};state.comments.push(c);return c;}
    if(method==='PATCH'&&r==='/issues/comments/10'){Object.assign(state.comments[0],payload);return state.comments[0];}
    throw new Error(`Unmocked ${method} ${r}`);
  };
  return {state,api,run:()=>processIssue({api,owner:'ncor',repo:'example',issueNumber:5,defaultBranch:'main',now})};
}
test('new issue creates exactly one isolated data-file commit and review PR',async()=>{const m=mockGitHub();const r=await m.run();assert.equal(r.pr,'https://github.com/ncor/example/pull/8');assert.equal(m.state.writes.filter(c=>c.method==='PUT').length,1);assert.equal(m.state.pr.head,'directory/issue-5');assert.equal(m.state.pr.base,'main');assert.match(m.state.pr.body,/Closes #5/);assert.equal(m.state.comments.length,1);assert.equal(JSON.parse(Buffer.from(m.state.file.content,'base64')).id,'submission-5');});
test('reruns do not duplicate branches, commits, PRs or comments',async()=>{const m=mockGitHub();await m.run();await m.run();assert.equal(m.state.writes.filter(c=>c.r==='/git/refs').length,1);assert.equal(m.state.writes.filter(c=>c.method==='PUT').length,1);assert.equal(m.state.writes.filter(c=>c.method==='POST'&&c.r==='/pulls').length,1);assert.equal(m.state.comments.length,1);});
test('editing the original issue updates the existing proposal, not another file',async()=>{const m=mockGitHub();await m.run();m.state.issue.body=body({...draft(),name:'Updated Geospatial Working Group'});await m.run();const writes=m.state.writes.filter(c=>c.method==='PUT');assert.equal(writes.length,2);assert.equal(writes[1].payload.sha,'file-sha');assert.equal(JSON.parse(Buffer.from(m.state.file.content,'base64')).name,'Updated Geospatial Working Group');assert.equal(m.state.comments.length,1);});
test('invalid submissions explain the error without creating a branch or PR',async()=>{const m=mockGitHub({...draft(),consent:false});const r=await m.run();assert.equal(r.invalid,true);assert.equal(m.state.file,null);assert.equal(m.state.ref,null);assert.equal(m.state.pr,null);assert.match(m.state.comments[0].body,/permission/);});
test('closed proposals and closed issues are never reopened by edits',async()=>{const m=mockGitHub();await m.run();m.state.pr.state='closed';const writes=m.state.writes.length;assert.equal((await m.run()).skipped,true);assert.equal(m.state.writes.length,writes);m.state.issue.state='closed';assert.equal((await m.run()).skipped,true);});
test('API authorization failures stop execution without pretending success',async()=>{await assert.rejects(()=>processIssue({api:async()=>{throw Object.assign(new Error('Forbidden'),{status:403});},owner:'ncor',repo:'example',issueNumber:5,defaultBranch:'main'}),/Forbidden/);});
