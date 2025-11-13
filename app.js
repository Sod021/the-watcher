// app.js
import { supabase } from './supabase.js';
import { qs, show, hide, toBool } from './utils.js';

const tabDaily = qs('#tab-daily');
const tabWebsites = qs('#tab-websites');
const tabReport = qs('#tab-report');

const panelDaily = qs('#panel-daily');
const panelWebsites = qs('#panel-websites');
const panelReport = qs('#panel-report');

const startBtn = qs('#start-checks');
const checker = qs('#checker');
const currentIndexEl = qs('#current-index');
const siteTitleEl = qs('#site-title');
const openSiteLink = qs('#open-site');
const checkForm = qs('#check-form');
const skipBtn = qs('#skip-site');
const stopBtn = qs('#stop-checks');
const sessionSummary = qs('#session-summary');

const addSiteForm = qs('#add-site-form');
const siteNameInput = qs('#site-name');
const siteUrlInput = qs('#site-url');
const sitesList = qs('#sites-list');

const recentList = qs('#recent-list');

const reportDate = qs('#report-date');
const generateReportBtn = qs('#generate-report');
const reportOutput = qs('#report-output');
const downloadReportBtn = qs('#download-report');

// Auth controls
const emailInput = qs('#email');
const passInput = qs('#password');
const btnLogin = qs('#btn-login');
const btnSignup = qs('#btn-signup');
const signoutBtn = qs('#signout');
const userInfo = qs('#user-info');
const userEmail = qs('#user-email');

let websites = [];
let currentUser = null;
let runIndex = 0;
let runSession = [];

function showPanel(name){
  tabDaily.classList.toggle('active', name==='daily');
  tabWebsites.classList.toggle('active', name==='websites');
  tabReport.classList.toggle('active', name==='report');
  panelDaily.classList.toggle('hidden', name!=='daily');
  panelWebsites.classList.toggle('hidden', name!=='websites');
  panelReport.classList.toggle('hidden', name!=='report');
}

tabDaily.addEventListener('click', ()=> showPanel('daily'));
tabWebsites.addEventListener('click', ()=> showPanel('websites'));
tabReport.addEventListener('click', ()=> showPanel('report'));

// AUTH
async function handleAuth(){
  const { data } = await supabase.auth.getUser();
  currentUser = data.user ?? null;
  if(currentUser){
    userInfo.classList.remove('hidden');
    qs('#auth-forms').classList.add('hidden');
    userEmail.textContent = currentUser.email;
    fetchWebsites();
    loadRecent();
  } else {
    userInfo.classList.add('hidden');
    qs('#auth-forms').classList.remove('hidden');
  }
}
handleAuth();

btnLogin.addEventListener('click', async ()=>{
  const email = emailInput.value.trim();
  const password = passInput.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) return alert(error.message);
  handleAuth();
});
btnSignup.addEventListener('click', async ()=>{
  const email = emailInput.value.trim();
  const password = passInput.value;
  const { error } = await supabase.auth.signUp({ email, password });
  if(error) return alert(error.message);
  alert('Sign-up requested. Confirm email if required, then log in.');
});
signoutBtn.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  currentUser = null;
  handleAuth();
});

// WEBSITES
async function fetchWebsites(){
  const { data, error } = await supabase.from('websites').select('*').order('name', { ascending:true });
  if(error) return console.error(error);
  websites = data || [];
  renderSitesList();
}

function renderSitesList(){
  sitesList.innerHTML = '';
  if(websites.length === 0){
    sitesList.innerHTML = '<div class="muted">No sites yet</div>';
    return;
  }
  websites.forEach(s=>{
    const el = document.createElement('div');
    el.className = 'site-item';
    el.innerHTML = `
      <div class="site-meta">
        <div style="font-weight:700">${s.name || s.url}</div>
        <div style="font-size:12px;color:var(--muted)">${s.url}</div>
      </div>
      <div class="site-actions">
        <button class="small-btn edit" data-id="${s.id}">Edit</button>
        <button class="small-btn outline delete" data-id="${s.id}">Delete</button>
      </div>
    `;
    sitesList.appendChild(el);
  });

  sitesList.querySelectorAll('.edit').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.target.dataset.id;
      const site = websites.find(x=>x.id===id);
      const newName = prompt('Name', site.name || '');
      const newUrl = prompt('URL', site.url);
      if(!newUrl) return;
      const { error } = await supabase.from('websites').update({ name:newName, url:newUrl }).eq('id', id);
      if(error) return alert(error.message);
      fetchWebsites();
    });
  });

  sitesList.querySelectorAll('.delete').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      if(!confirm('Delete site?')) return;
      const id = e.target.dataset.id;
      const { error } = await supabase.from('websites').delete().eq('id', id);
      if(error) return alert(error.message);
      fetchWebsites();
    });
  });
}

addSiteForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const url = siteUrlInput.value.trim();
  if(!url) return alert('URL required');
  const name = siteNameInput.value.trim();
  const payload = { name, url };
  if(currentUser) payload.owner_id = currentUser.id;
  const { error } = await supabase.from('websites').insert(payload);
  if(error) return alert(error.message);
  siteNameInput.value = siteUrlInput.value = '';
  fetchWebsites();
});

// RECENT
async function loadRecent(){
  const { data } = await supabase.from('checks').select('*, website_id(id,name,url)').order('checked_at', { ascending:false }).limit(6);
  recentList.innerHTML = '';
  if(!data || data.length===0) { recentList.innerHTML = '<div class="muted">No checks yet</div>'; return; }
  data.forEach(c=>{
    const s = c.website_id || {};
    const el = document.createElement('div');
    el.innerHTML = `<div style="font-weight:700">${s.name || s.url}</div>
      <div style="font-size:12px;color:var(--muted)">${new Date(c.checked_at).toLocaleString()}</div>
      <div>Live: ${c.status_live} • Functional: ${c.status_functional}</div>`;
    recentList.appendChild(el);
  });
}

// MANUAL CHECK FLOW
startBtn.addEventListener('click', ()=>{
  if(!websites || websites.length === 0) return alert('No websites to check. Add some first.');
  runIndex = 0;
  runSession = [];
  showCheckerForIndex(runIndex);
});

function showCheckerForIndex(i){
  if(i >= websites.length){
    finalizeSession();
    return;
  }
  const site = websites[i];
  show(checker);
  currentIndexEl.textContent = `Site ${i+1} of ${websites.length}`;
  siteTitleEl.textContent = site.name || site.url;
  openSiteLink.href = site.url;
  // reset form
  checkForm.reset();
  sessionSummary.textContent = '';
}

skipBtn.addEventListener('click', async ()=>{
  // save a skipped note
  const site = websites[runIndex];
  await saveCheck(site.id, { skipped:true, notes: 'Skipped by user' });
  runSession.push({ site, skipped:true });
  runIndex++;
  if(runIndex < websites.length) showCheckerForIndex(runIndex); else finalizeSession();
});

stopBtn.addEventListener('click', ()=>{
  hide(checker);
  sessionSummary.textContent = 'Session stopped';
});

checkForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const site = websites[runIndex];
  if(!site) return;
  const live = (qs('#status_live').value);
  const functional = (qs('#status_functional').value);
  const formSubmission = (qs('#form_submission').value);
  const loadTime = qs('#load_time').value.trim();
  const notes = qs('#notes').value.trim();

  // Validate yes/no fields
  if(live === '' || functional === '' || formSubmission === ''){
    return alert('Please answer all Yes/No questions before submitting.');
  }

  const payload = {
    status_live: toBool(live),
    status_functional: toBool(functional),
    form_submission_works: toBool(formSubmission),
    load_time_text: loadTime || null,
    notes: notes || null,
    meta: { manual_by: currentUser ? currentUser.id : null }
  };

  await saveCheck(site.id, payload);
  runSession.push({ site, payload });
  runIndex++;
  if(runIndex < websites.length){
    showCheckerForIndex(runIndex);
  } else {
    finalizeSession();
  }
});

async function saveCheck(website_id, payload){
  const insert = {
    website_id,
    status_live: payload.status_live ?? null,
    status_functional: payload.status_functional ?? null,
    form_submission_works: payload.form_submission_works ?? null,
    load_time_text: payload.load_time_text ?? null,
    notes: payload.notes ?? null,
    meta: payload.meta ?? null
  };
  if(currentUser) insert.checked_by = currentUser.id;
  const { error } = await supabase.from('checks').insert(insert);
  if(error) console.error('save error', error);
}

function finalizeSession(){
  hide(checker);
  sessionSummary.innerHTML = `<strong>Completed</strong>: ${runSession.length} sites processed.`;
  loadRecent();
}

// REPORT
generateReportBtn.addEventListener('click', async ()=>{
  const d = reportDate.value;
  if(!d) return alert('Pick a date');
  const start = new Date(d);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(end.getDate()+1);

  const { data, error } = await supabase
    .from('checks')
    .select('*, website_id(id,name,url)')
    .gte('checked_at', start.toISOString())
    .lt('checked_at', end.toISOString())
    .order('checked_at', { ascending: true });

  if(error) return alert(error.message);
  if(!data || data.length === 0){
    reportOutput.innerHTML = '<div class="muted">No checks for that date.</div>';
    return;
  }
  reportOutput.innerHTML = data.map(c=>{
    const s = c.website_id || {};
    return `<div style="padding:8px;border-bottom:1px solid #f1f3f6">
      <div style="font-weight:700">${s.name || s.url}</div>
      <div style="font-size:12px;color:var(--muted)">${new Date(c.checked_at).toLocaleString()}</div>
      <div>Live: ${c.status_live} • Functional: ${c.status_functional} • Form: ${c.form_submission_works}</div>
      <div style="font-size:13px;color:var(--muted)">Load: ${c.load_time_text || '-'} — Notes: ${c.notes || '-'}</div>
    </div>`;
  }).join('');
});

// Optional: simple PDF download using jsPDF can be added (not included out-of-the-box)

(async function init(){
  const { data } = await supabase.auth.getSession();
  if(data?.session) currentUser = data.session.user;
  await fetchWebsites();
  await loadRecent();

  // Subscribe to realtime changes (optional)
  supabase.channel('public:checks')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'checks' }, () => loadRecent())
    .subscribe();
})();
