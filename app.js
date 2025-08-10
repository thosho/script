const titleEl = document.getElementById('title');
const editorEl = document.getElementById('editor');
const wordCountEl = document.getElementById('wordCount');
const charCountEl = document.getElementById('charCount');
const exportMdBtn = document.getElementById('exportMd');
const exportTxtBtn = document.getElementById('exportTxt');

const STORAGE_KEY = 'free_writer_v1';

// Load from localStorage
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    titleEl.value = data.title || '';
    editorEl.value = data.body || '';
  } catch {}
  updateStats();
}
load();

// Debounced autosave
let t;
function scheduleSave() {
  clearTimeout(t);
  t = setTimeout(save, 400);
}
function save() {
  const data = { title: titleEl.value, body: editorEl.value, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateStats();
}

titleEl.addEventListener('input', scheduleSave);
editorEl.addEventListener('input', scheduleSave);

// Stats
function wordsOf(text) {
  const m = text.trim().match(/\b[\p{L}\p{N}'’-]+\b/gu);
  return m ? m.length : 0;
}
function updateStats() {
  const text = editorEl.value;
  wordCountEl.textContent = `${wordsOf(text)} words`;
  charCountEl.textContent = `${text.length} chars`;
}

// Export helpers
function download(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

exportMdBtn.addEventListener('click', () => {
  const t = titleEl.value.trim() || 'Untitled';
  const md = `# ${t}\n\n${editorEl.value}`;
  download(`${t.replace(/[^a-z0-9-_]+/gi,'-')}.md`, md);
});

exportTxtBtn.addEventListener('click', () => {
  const t = titleEl.value.trim() || 'Untitled';
  download(`${t.replace(/[^a-z0-9-_]+/gi,'-')}.txt`, editorEl.value);
});

// Keyboard shortcuts: Ctrl/Cmd+S to save to local
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});
