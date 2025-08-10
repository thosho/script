:root {
  --bg:#0f172a; --panel:#111827; --text:#e5e7eb; --muted:#94a3b8; --border:#1f2937;
  --preview-bg:#0b1220; --accent:#22c55e;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:var(--bg);color:var(--text);
  font:16px/1.5 'Courier Prime', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* Courier Prime for screenplay[16][7][13] */
}
header{position:sticky;top:0;background:linear-gradient(180deg,var(--bg),#0f172aee 70%,transparent);
  backdrop-filter:saturate(120%) blur(6px);padding:10px 12px;border-bottom:1px solid var(--border)}
h1{margin:0;font-size:18px}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
.toolbar .sep{width:1px;height:24px;background:var(--border);display:inline-block;margin:0 4px}
.toolbar .right{margin-left:auto}
.toolbar button{background:var(--panel);border:1px solid var(--border);color:var(--text);
  padding:6px 10px;border-radius:8px;cursor:pointer}
.toolbar button:hover{border-color:var(--accent);color:var(--accent)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:1200px;margin:12px auto;padding:0 12px}
.editor-pane,.preview-pane{min-height:76vh;background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
#title{width:100%;padding:12px 14px;background:transparent;border:0;border-bottom:1px solid var(--border);color:var(--text);font-size:18px}
#editor{flex:1;width:100%;resize:none;padding:14px 16px;background:transparent;color:var(--text);font-size:16px;line-height:1.7;border:0}
.preview-pane{background:var(--preview-bg)}
#preview{flex:1;padding:20px;color:var(--text);overflow:auto}
.script{font-size:12pt;line-height:1.4} /* screenplay default is 12pt[16] */
footer{max-width:1200px;margin:10px auto 24px;padding:0 12px;color:var(--muted)}
.light body{background:#f8fafc;color:#0f172a}

// Elements
const titleEl = document.getElementById('title');
const editorEl = document.getElementById('editor');
const previewEl = document.getElementById('preview');
const statsEl = document.getElementById('stats');

const openBtn = document.getElementById('openFountain');
const fileInput = document.getElementById('fileInput');
const exportFtnBtn = document.getElementById('exportFountain');
const exportPdfBtn = document.getElementById('exportPdf');
const exportMdBtn = document.getElementById('exportMd');
const exportTxtBtn = document.getElementById('exportTxt');
const themeToggle = document.getElementById('themeToggle');

const STORAGE_KEY = 'screenplay_writer_v1';

// Utilities
function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function slugify(s){ return (s||'Untitled').trim().replace(/[^a-z0-9-_]+/gi,'-'); }

// Fountain parsing and preview
function renderPreview() {
  const text = buildFountain();
  // fountain is provided by vendor/fountain/fountain.min.js[9][6]
  try {
    const output = fountain.parse(text); // output.html.script, output.html.title_page[6][9]
    const titleHtml = output.html && output.html.title_page ? `<div class="title-page">${output.html.title_page}</div>` : '';
    const bodyHtml = output.html && output.html.script ? output.html.script : '';
    previewEl.innerHTML = `${titleHtml}${bodyHtml}`;
    updateStats(text, output);
  } catch (e) {
    previewEl.textContent = 'Preview error: ' + e.message;
  }
}

function buildFountain(){
  // Prepend title page Title: from the title input if present
  const t = titleEl.value.trim();
  const titleBlock = t ? `Title: ${t}\n\n` : '';
  return `${titleBlock}${editorEl.value}`;
}

// Stats
function wordsOf(text) {
  const m = text.trim().match(/\b[\p{L}\p{N}'’-]+\b/gu);
  return m ? m.length : 0;
}
function estimatePages(output){
  // If fountain-js tokens available, a rough estimate: 55 lines ≈ 1 page (very rough).
  // For accurate pagination, integrate afterwriting-labs PDF engine in next step[4][3][2].
  const html = (output && output.html && output.html.script) ? output.html.script : '';
  const lines = html.split(/<br\s*\/?>|<\/p>|<\/h\d>/i).length;
  return Math.max(1, Math.round(lines / 55));
}
function updateStats(text, output){
  statsEl.textContent = `${wordsOf(text)}w • ${estimatePages(output)}p`;
}

// Autosave
let t;
function scheduleSave(){
  clearTimeout(t);
  t = setTimeout(save, 300);
}
function save(){
  const data = { title: titleEl.value, body: editorEl.value, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderPreview();
}
function load(){
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    titleEl.value = data.title || '';
    editorEl.value = data.body || '';
  } catch {}
  renderPreview();
}
load();

// Events
titleEl.addEventListener('input', scheduleSave);
editorEl.addEventListener('input', scheduleSave);

openBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    // If the file looks like Markdown, just load it; parser will ignore unknowns
    editorEl.value = String(reader.result || '');
    scheduleSave();
  };
  reader.readAsText(file);
});

exportFtnBtn.addEventListener('click', ()=>{
  const name = slugify(titleEl.value || 'Screenplay');
  download(`${name}.fountain`, buildFountain(), 'text/plain;charset=utf-8');
});

// Simple PDF via html2pdf from preview HTML.
// For professional pagination/watermarks/headers, switch to afterwriting-labs PDF in next step[4][3][2].
exportPdfBtn.addEventListener('click', ()=>{
  const name = slugify(titleEl.value || 'Screenplay');
  const element = previewEl.cloneNode(true);
  element.style.fontFamily = "'Courier Prime', monospace";
  const opt = {
    margin: [10,10,10,10],
    filename: `${name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' } // US Letter typical for screenplays
  };
  html2pdf().from(element).set(opt).save();
});

exportMdBtn.addEventListener('click', ()=>{
  const name = slugify(titleEl.value || 'Screenplay');
  const md = '``````';
  download(`${name}.md`, md, 'text/markdown;charset=utf-8');
});
exportTxtBtn.addEventListener('click', ()=>{
  const name = slugify(titleEl.value || 'Screenplay');
  download(`${name}.txt`, buildFountain(), 'text/plain;charset=utf-8');
});

themeToggle.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('light');
});

// Keyboard shortcut: Ctrl/Cmd+S to save local
window.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){
    e.preventDefault();
    save();
  }
});
