const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data = {jobs:[]}, view = 'list', page = 'toapply', selectedId = null, busy = false;
const statusClass = status => /interview|offer/i.test(status)?'green':/applied/i.test(status)?'blue':/reject|withdraw/i.test(status)?'muted':'amber';
const badge = status => `<span class="badge ${statusClass(status)}">${escape(status)}</span>`;
const priorityRank = priority => {const value=Number(String(priority||'').trim());return Number.isInteger(value)&&value>=1&&value<=4?value-1:4;};
const priorityClass = priority => {const value=String(priority||'').trim();return ['1','2','3','4'].includes(value)?value:'none';};
const priorityBadge = priority => `<span class="priority priority-${priorityClass(priority)}">${escape(priority||'Not set')}</span>`;
const compactDocumentLinks = job => [[job.resumeUrl,'Resume'],[job.coverUrl,'Cover letter']].filter(([url])=>url).map(([url,label])=>`<a class="document-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')||'<span class="no-documents">—</span>';
function dateValue(value) {if(!value)return null;const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value);return Number.isNaN(date.getTime())?null:date;}
const dateText = value => {const date=dateValue(value);return date?date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):value||'Not recorded';};
const due = job => {const d=dateValue(job.followup),today=new Date();today.setHours(23,59,59,999);return d&&d<=today&&!/rejected|withdrawn|offer|accepted/i.test(job.status);};
const hasApplied = job => Boolean(job.applied)||/applied|interview|offer|accepted/i.test(job.status);
function updateOptions(id,values,label){const old=$(id).value;$(id).innerHTML=`<option value="">${label}</option>`+[...new Set(values.filter(Boolean))].sort().map(x=>`<option value="${escape(x)}">${escape(x)}</option>`).join('');if([...$(id).options].some(x=>x.value===old))$(id).value=old;}
function render() {
 const jobs=data.jobs, term=$('search').value.toLowerCase();
 const onPage=j=>page==='followup'?due(j):page==='applied'?hasApplied(j):!hasApplied(j);
 const filtered=jobs.filter(j=>onPage(j)&&(!$('status').value||j.status===$('status').value)&&(!$('visa').value||j.visa===$('visa').value)&&Object.values(j).join(' ').toLowerCase().includes(term));
 const newestFirst=(a,b)=>(dateValue(b.found)?.getTime()||0)-(dateValue(a.found)?.getTime()||0);
 filtered.sort((a,b)=>$('sort').value==='company'?a.company.localeCompare(b.company):$('sort').value==='followup'?(dateValue(a.followup)?.getTime()||Infinity)-(dateValue(b.followup)?.getTime()||Infinity):$('sort').value==='priority'?priorityRank(a.priority)-priorityRank(b.priority)||newestFirst(a,b):newestFirst(a,b));
 $('total').textContent=jobs.length;$('shortlisted').textContent=jobs.filter(j=>j.status.toLowerCase()==='shortlisted').length;$('applied').textContent=jobs.filter(hasApplied).length;$('interview').textContent=jobs.filter(j=>/interview/i.test(j.status)).length;
 $('to-apply-count').textContent=jobs.filter(j=>!hasApplied(j)).length;$('applied-count').textContent=jobs.filter(hasApplied).length;$('follow-count').textContent=jobs.filter(due).length;$('result-count').textContent=filtered.length;
 $('section-title').firstChild.textContent=page==='followup'?'Follow-ups due ':page==='applied'?'Applied applications ':'Jobs to apply for ';
 $('footer-count').textContent=`Showing ${filtered.length} of ${jobs.length} applications`;
 $('results').setAttribute('aria-busy','false');
 if(!filtered.length){$('results').innerHTML=`<div class="empty"><h3>${!jobs.length?(data.mode==='setup'?'Your workspace is ready':'No applications yet'):'Nothing matches this view'}</h3><p>${!jobs.length?'Connect your sheet to bring your opportunities into focus.':'Try another filter or reset this view.'}</p></div>`;return;}
 if(view==='list') {const appliedPage=page==='applied';$('results').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Company / Role</th><th>Priority</th><th>Location</th><th>${appliedPage?'Date applied':'Status'}</th><th>Visa fit</th><th>Date found</th><th>Documents</th><th></th></tr></thead><tbody>${filtered.map(j=>`<tr><td><div class="job-cell"><span class="avatar">${escape(j.company.slice(0,2).toUpperCase())}</span><div><button class="job-title" data-job="${escape(j.id)}">${escape(j.company||'Unnamed company')}</button><p>${escape(j.title)}</p></div></div></td><td>${priorityBadge(j.priority)}</td><td class="location">${escape(j.location||'Not recorded')}</td><td class="${appliedPage?'date':''}">${appliedPage?escape(dateText(j.applied)):badge(j.status)}</td><td><span class="visa ${j.visa==='Good Fit'?'good':''}">${escape(j.visa||'Not reviewed')}</span></td><td class="date">${escape(dateText(j.found))}</td><td><div class="document-links">${compactDocumentLinks(j)}</div></td><td><button class="text-button" data-job="${escape(j.id)}" aria-label="View ${escape(j.company)} details">View ↗</button></td></tr>`).join('')}</tbody></table></div>`;}
 else {const baseStatuses=page==='toapply'?['Found','Shortlisted']:page==='applied'?['Applied','Interview','Offer','Accepted']:[];const statuses=[...new Set([...baseStatuses,...filtered.map(j=>j.status)])];$('results').innerHTML=`<div class="board">${statuses.map(s=>{const group=filtered.filter(j=>j.status===s);return `<section class="column"><h3>${escape(s)} <span>${group.length}</span></h3>${group.map(j=>`<button class="job-card" data-job="${escape(j.id)}"><span class="card-priority">${priorityBadge(j.priority)}</span><strong>${escape(j.company)}</strong><span>${escape(j.title)}</span><small>${escape(j.location)}</small><span class="visa">${escape(j.visa||'Not reviewed')}</span></button>`).join('')||'<p class="column-empty">No applications</p>'}</section>`;}).join('')}</div>`;}
}
function showDetail(id) {
 selectedId=id;const j=data.jobs.find(j=>j.id===id);if(!j){$('detail').close();return;}
 const actions=[[j.url,'Open job posting','primary'],[j.resumeUrl,'Open resume',''],[j.coverUrl,'Open cover letter','']].filter(([url])=>url).map(([url,label,style])=>`<a class="button ${style}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('');
 $('detail-content').innerHTML=`${badge(j.status)} ${priorityBadge(j.priority)}<h2>${escape(j.company)}</h2><p class="detail-role">${escape(j.title)}</p><p class="detail-location">${escape(j.location)}</p>${actions?`<div class="document-actions">${actions}</div>`:''}<dl>${[['Priority',j.priority],['Visa compatibility',j.visa],['Date found',dateText(j.found)],['Date applied',dateText(j.applied)],['Follow-up date',dateText(j.followup)],['Resume version',j.resume],['Cover letter',j.cover]].map(([key,value])=>`<div><dt>${key}</dt><dd>${escape(value||'Not recorded')}</dd></div>`).join('')}</dl><h3>CPT / OPT / sponsorship</h3><p class="notes">${escape(j.sponsorship||'No notes yet.')}</p><h3>Research & notes</h3><p class="notes">${escape(j.notes||'No notes yet.')}</p><p class="detail-foot">To update this application, edit your Google Sheet or ask Muse. Changes appear here automatically.</p>`;
 if(!$('detail').open)$('detail').showModal();
}
async function refresh(force=false) {
 if(busy)return;busy=true;$('refresh').disabled=true;
 try {const response=await fetch(`/api/jobs${force?'?refresh=true':''}`,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error();data=await response.json();
 updateOptions('status',data.jobs.map(j=>j.status),'All statuses');updateOptions('visa',data.jobs.map(j=>j.visa),'All visa fits');
 $('notice').hidden=!data.error&&data.mode!=='demo';$('notice').textContent=data.mode==='demo'?'Demo workspace · Sample applications only. Connect Google Sheets for your live data.':data.error||'';
 $('sync-status').textContent=data.mode==='demo'?'Demo data':data.lastSynced?`${data.error?'Sync delayed · ':''}Last synced ${new Date(data.lastSynced).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'Sheet not connected';
 for(const id of ['sheet-link','sheet-side']){ $(id).hidden=!data.sheetUrl;if(data.sheetUrl)$(id).href=data.sheetUrl;}
 render();if($('detail').open)showDetail(selectedId);
 }catch{$('notice').hidden=false;$('notice').textContent='Cannot reach the app server. Showing the last loaded data; retry shortly.';$('sync-status').textContent='Connection interrupted';$('results').setAttribute('aria-busy','false');}
 finally{busy=false;$('refresh').disabled=false;}
}
$('refresh').onclick=()=>refresh(true);
for(const id of ['search','status','visa','sort'])$(id).addEventListener('input',render);
$('clear').onclick=()=>{for(const id of ['search','status','visa'])$(id).value='';$('sort').value='priority';render();};
for(const mode of ['list','board'])$(`${mode}-view`).onclick=()=>{view=mode;for(const m of ['list','board'])$(`${m}-view`).setAttribute('aria-pressed',String(m===mode));render();};
document.addEventListener('click',e=>{const job=e.target.closest('[data-job]');if(job)showDetail(job.dataset.job);const nav=e.target.closest('[data-page]');if(nav){page=nav.dataset.page;$('status').value='';document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x===nav));render();}const metric=e.target.closest('[data-filter]');if(metric){page=metric.dataset.metricPage||(/applied|interview/i.test(metric.dataset.filter)?'applied':'toapply');document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('status').value=metric.dataset.filter;render();}});
$('close-detail').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>selectedId=null);
void refresh();setInterval(()=>{if(!document.hidden)void refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
