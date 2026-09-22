import {createHash} from 'node:crypto';
export const fields = {'Company':'company','Job title':'title','Location':'location','Job link':'url','Date found':'found','Date applied':'applied','Visa compatibility':'visa','CPT/OPT/Sponsorship notes':'sponsorship','Resume version':'resume','Resume link':'resumeUrl','Cover letter':'cover','Cover letter link':'coverUrl','Status':'status','Priority':'priority','Follow-up date':'followup','Notes':'notes','Job ID':'id'};
function safeUrl(value) {
  try {const url = new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';} catch {return '';}
}
function cellLink(cell) {
  return cell?.hyperlink||cell?.textFormatRuns?.find(run=>run.format?.link?.uri)?.format.link.uri||cell?.chipRuns?.find(run=>run.chip?.richLinkProperties?.uri)?.chip.richLinkProperties.uri||'';
}
export function parseRows(values, linkRows = []) {
  if (!Array.isArray(values) || !values.length) throw new Error('The Applications tab has no header row.');
  const headers = values[0].map(x => String(x).trim());
  for (const name of ['Company','Job title','Status']) if (!headers.includes(name)) throw new Error(`Missing column: ${name}`);
  const seen = new Map();
  return values.slice(1).map((row,index) => ({row,index:index+1})).filter(({row}) => row.some(x => String(x).trim())).map(({row,index}) => {
    const job = Object.fromEntries(Object.entries(fields).map(([header,key]) => [key,String(row[headers.indexOf(header)] ?? '').trim()]));
    const linked = header => cellLink(linkRows[index]?.[headers.indexOf(header)]);
    job.status ||= 'Found';
    const identity = job.id || createHash('sha256').update([job.company,job.title,job.url].join('\0')).digest('hex').slice(0,20);
    const count = seen.get(identity) || 0; seen.set(identity,count + 1);
    job.id = `${identity}:${count}`;
    job.url = safeUrl(job.url)||safeUrl(linked('Job link'));
    job.resumeUrl = safeUrl(job.resumeUrl)||safeUrl(job.resume)||safeUrl(linked('Resume link'))||safeUrl(linked('Resume version'));
    job.coverUrl = safeUrl(job.coverUrl)||safeUrl(job.cover)||safeUrl(linked('Cover letter link'))||safeUrl(linked('Cover letter'));
    return job;
  });
}
export function createSync(load, intervalMs = 60000) {
  let state = {jobs:[],lastSynced:null,error:null}, pending, lastAttempt = 0;
  return {
    snapshot: () => ({...state}),
    async refresh(force = false) {
      if (pending) return pending;
      if (Date.now() - lastAttempt < (force ? 5000 : intervalMs)) return state;
      lastAttempt = Date.now();
      pending = (async () => {try {const jobs = await load(); state = {jobs,lastSynced:new Date().toISOString(),error:null};} catch (err) {state = {...state,error:err.message};} return state;})().finally(() => {pending = null;});
      return pending;
    }
  };
}
