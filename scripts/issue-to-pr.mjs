import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSubmission, parseSubmission } from './schema.mjs';
import { loadGroups } from './validate.mjs';

const COMMENT_MARKER='<!-- ncor-directory-bot:v1 -->';
async function comment(api, base, issueNumber, message) {
  const comments=await api('GET',`${base}/issues/${issueNumber}/comments?per_page=100`);
  const existing=comments.find(c=>c.user?.type==='Bot' && c.user?.login==='github-actions[bot]' && c.body?.startsWith(COMMENT_MARKER));
  const body=`${COMMENT_MARKER}\n${message}`;
  if (existing) return api('PATCH',`${base}/issues/comments/${existing.id}`,{body});
  return api('POST',`${base}/issues/${issueNumber}/comments`,{body});
}
async function maybe(api,route) { try { return await api('GET',route); } catch(e) { if(e.status===404) return null; throw e; } }

export async function processIssue({api,owner,repo,issueNumber,defaultBranch,existingGroups=[],now=new Date()}) {
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo) || !Number.isSafeInteger(issueNumber) || issueNumber<1) throw new Error('Invalid repository context.');
  const base=`/repos/${owner}/${repo}`;
  // Always read the latest issue, so queued edit events cannot restore older content.
  const issue=await api('GET',`${base}/issues/${issueNumber}`);
  if (issue.pull_request || issue.state!=='open' || !issue.title.startsWith('[New group]')) return {skipped:true};
  const branch=`directory/issue-${issueNumber}`;
  const prs=await api('GET',`${base}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`);
  if (prs.some(p=>p.state==='closed')) return {skipped:true,reason:'A reviewer already closed or merged this proposal. Submit a new issue for another proposal.'};
  let record;
  try {
    record=normalizeSubmission(parseSubmission(issue.body),issueNumber,now);
    if (existingGroups.some(g=>g.id!==record.id && g.name.toLowerCase().trim()===record.name.toLowerCase().trim())) throw new Error('A group with this name is already listed. Please submit a correction issue instead.');
  } catch(e) {
    await comment(api,base,issueNumber,`This proposal needs a correction before a pull request can be created or updated.\n\n${e.message}\n\nEdit the original issue and save it to retry. No directory change has been made by this run.`);
    return {invalid:true,error:e.message};
  }
  // The branch and filename are derived ONLY from GitHub's integer issue number.
  // Untrusted text is serialized as JSON; it is never evaluated or used in shell commands.
  const file=`data/groups/${record.id}.json`;
  let ref=await maybe(api,`${base}/git/ref/heads/${branch}`);
  if (!ref) {
    const main=await api('GET',`${base}/git/ref/heads/${encodeURIComponent(defaultBranch)}`);
    await api('POST',`${base}/git/refs`,{ref:`refs/heads/${branch}`,sha:main.object.sha});
  }
  const current=await maybe(api,`${base}/contents/${file}?ref=${encodeURIComponent(branch)}`);
  const serialized=JSON.stringify(record,null,2)+'\n';
  const previous=current?.content ? Buffer.from(current.content,'base64').toString('utf8') : '';
  if (previous!==serialized) {
    await api('PUT',`${base}/contents/${file}`,{
      message:`Propose working group from issue #${issueNumber}`,
      content:Buffer.from(serialized).toString('base64'),branch,...(current?.sha?{sha:current.sha}:{})
    });
  }
  let pr=prs.find(p=>p.state==='open');
  const title=`Add working group: ${record.name.replace(/[\r\n]/g,' ')}`;
  const body=`## Community directory proposal\n\nCloses #${issueNumber}.\n\nThis pull request adds one validated JSON listing. Review the purpose, public contact details, participation status, and links before merging. The submitter has confirmed permission to publish the supplied information.\n\nThe directory will rebuild after a maintainer merges this pull request. No automatic merge or approval is performed.\n\nIf GitHub shows **Approve workflows to run**, approve the validation run before merging.\n\nEditing the original issue updates this proposal while it remains open and replaces this proposal’s JSON file. Once merged or closed, use a new issue for further changes.\n\nSchema validation succeeded in the submission workflow. Public source claims and contact authorization still require editorial review.`;
  if (!pr) pr=await api('POST',`${base}/pulls`,{title,body,head:branch,base:defaultBranch,maintainer_can_modify:true});
  else await api('PATCH',`${base}/pulls/${pr.number}`,{title,body});
  await comment(api,base,issueNumber,`Your proposal is ready for review: ${pr.html_url}\n\nA maintainer will review and merge it before the group appears on the directory. You can edit this issue to update the proposal while the pull request is open.`);
  return {pr:pr.html_url,record};
}

async function run() {
  const token=process.env.GITHUB_TOKEN;
  if (!token || !process.env.GITHUB_EVENT_PATH) throw new Error('Run this script through its GitHub Actions workflow.');
  const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  const [owner,repo]=(process.env.GITHUB_REPOSITORY || '').split('/');
  const api=async(method,route,body)=>{
    const response=await fetch(`https://api.github.com${route}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if (!response.ok) { const e=new Error(`GitHub API returned ${response.status} for ${method} ${route.split('?')[0]}. Check Actions permissions, repository rules, and the setup guide.`); e.status=response.status; throw e; }
    return response.status===204?null:response.json();
  };
  const result=await processIssue({api,owner,repo,issueNumber:event.issue.number,defaultBranch:event.repository.default_branch,existingGroups:await loadGroups()});
  console.log(result.pr ? `Created or updated proposal: ${result.pr}` : result.invalid ? `Proposal validation failed: ${result.error}` : 'No change needed.');
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) run().catch(e=>{console.error(e.message);process.exitCode=1;});
