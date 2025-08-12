class ScreenplayWriter {
  constructor() {
    this.editor = document.getElementById('scriptEditor');
    this.previewPane = document.getElementById('previewPane');
    this.wordCount = document.getElementById('wordCount');
    this.lastSaved = document.getElementById('lastSaved');
    this.autoSaveStatus = document.getElementById('autoSaveStatus');

    this.currentView = 'editor';
    this.fountain = new Fountain(); // from fountain-js CDN
    this.characters = new Set();
    this.scenes = [];
    this.stats = {};

    this.init();
  }

  init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.startAutoSave();
    this.updateAll();
    this.setupTabs();
  }

  setupTabs() {
    const editorTab = document.getElementById('editorTab');
    const previewTab = document.getElementById('previewTab');
    editorTab.addEventListener('click', () => this.switchTab('editor'));
    previewTab.addEventListener('click', () => this.switchTab('preview'));
  }

  switchTab(tab) {
    const editorTab = document.getElementById('editorTab');
    const previewTab = document.getElementById('previewTab');
    const editor = document.getElementById('scriptEditor');
    const preview = document.getElementById('previewPane');

    if (tab === 'editor') {
      this.currentView = 'editor';
      editorTab.classList.add('active');
      previewTab.classList.remove('active');
      editor.style.display = 'block';
      preview.style.display = 'none';
    } else {
      this.currentView = 'preview';
      previewTab.classList.add('active');
      editorTab.classList.remove('active');
      editor.style.display = 'none';
      preview.style.display = 'block';
      this.updatePreview();
    }
  }

  setupEventListeners() {
    this.editor.addEventListener('input', () => {
      this.updateAll();
      this.markAsUnsaved();
    });

    document.getElementById('newBtn').addEventListener('click', () => this.newScript());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveToFile());
    document.getElementById('loadBtn').addEventListener('click', () => this.loadFromFile());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportToPDF());

    document.getElementById('sceneBtn').addEventListener('click', () => this.insertFormat('scene'));
    document.getElementById('characterBtn').addEventListener('click', () => this.insertFormat('character'));
    document.getElementById('actionBtn').addEventListener('click', () => this.insertFormat('action'));
    document.getElementById('dialogueBtn').addEventListener('click', () => this.insertFormat('dialogue'));

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's': e.preventDefault(); this.saveToFile(); break;
          case 'n': e.preventDefault(); this.newScript(); break;
          case '1': e.preventDefault(); this.switchTab('editor'); break;
          case '2': e.preventDefault(); this.switchTab('preview'); break;
        }
      }
    });

    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabKey();
      } else if (e.key === 'Enter') {
        this.handleEnterKey(e);
      }
    });
  }

  handleTabKey() {
    const cursor = this.editor.selectionStart;
    const value = this.editor.value;
    this.editor.value = value.slice(0, cursor) + '    ' + value.slice(cursor);
    this.editor.selectionStart = this.editor.selectionEnd = cursor + 4;
  }

  handleEnterKey() {
    const cursor = this.editor.selectionStart;
    const lines = this.editor.value.substring(0, cursor).split('\n');
    const currentLine = lines[lines.length - 1].trim().toUpperCase();
    if (this.isSceneHeading(currentLine)) {
      setTimeout(() => this.insertLineBreak(), 10);
    } else if (this.isCharacterName(currentLine)) {
      setTimeout(() => this.insertText('        '), 10);
    }
  }

  isSceneHeading(line) {
    const starters = ['INT.', 'EXT.', 'FADE IN:', 'FADE OUT:', 'CUT TO:'];
    return starters.some(s => line.startsWith(s));
  }

  isCharacterName(line) {
    return line === line.toUpperCase() && line.length > 0 && !this.isSceneHeading(line) && !line.includes('.');
  }

  insertFormat(type) {
    let insertion = '';
    switch (type) {
      case 'scene': insertion = '\n\nINT. LOCATION - DAY\n\n'; break;
      case 'character': insertion = '\n\nCHARACTER NAME\n        '; break;
      case 'action': insertion = '\n\n'; break;
      case 'dialogue': insertion = '\n        '; break;
    }
    this.insertText(insertion);
  }

  insertText(text) {
    const cursor = this.editor.selectionStart;
    const value = this.editor.value;
    this.editor.value = value.slice(0, cursor) + text + value.slice(cursor);
    this.editor.selectionStart = this.editor.selectionEnd = cursor + text.length;
    this.editor.focus();
    this.updateAll();
  }

  insertLineBreak() { this.insertText('\n\n'); }

  updateAll() {
    this.updateWordCount();
    this.parseScript();
    this.updateStats();
    this.updateCharactersList();
    this.updateScenesList();
    if (this.currentView === 'preview') this.updatePreview();
  }

  updateWordCount() {
    const text = this.editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const pages = Math.ceil(words / 250);
    this.wordCount.textContent = `Words: ${words} | Pages: ~${pages}`;
  }

  parseScript() {
    const text = this.editor.value;
    if (!text.trim()) { this.characters.clear(); this.scenes = []; return; }
    try {
      const parsed = this.fountain.parse(text, true); // include tokens
      if (parsed && parsed.tokens) this.extractCharactersAndScenes(parsed.tokens);
    } catch {
      this.simpleParse(text);
    }
  }

  extractCharactersAndScenes(tokens) {
    this.characters.clear();
    this.scenes = [];
    tokens.forEach((t, i) => {
      if (t.type === 'character') {
        const name = (t.text || '').replace(/\([^)]*\)/g, '').trim();
        if (name) this.characters.add(name);
      } else if (t.type === 'scene_heading') {
        this.scenes.push({ heading: t.text || 'Scene', number: this.scenes.length + 1, index: i });
      }
    });
  }

  simpleParse(text) {
    const lines = text.split('\n');
    this.characters.clear();
    this.scenes = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const upper = trimmed.toUpperCase();
      if (this.isSceneHeading(upper)) {
        this.scenes.push({ heading: trimmed, number: this.scenes.length + 1, line: idx + 1 });
      }
      if (trimmed === upper && trimmed && !this.isSceneHeading(upper) && !trimmed.includes('.') && trimmed.length < 30) {
        this.characters.add(trimmed.replace(/\([^)]*\)/g, '').trim());
      }
    });
  }

  updateStats() {
    const text = this.editor.value;
    this.stats = {
      characters: this.characters.size,
      scenes: this.scenes.length,
      dialogueLines: (text.match(/\n\s{4,}\w/g) || []).length
    };
    document.getElementById('characterCount').textContent = this.stats.characters;
    document.getElementById('sceneCount').textContent = this.stats.scenes;
    document.getElementById('dialogueCount').textContent = this.stats.dialogueLines;
  }

  updateCharactersList() {
    const list = document.getElementById('charactersList');
    list.innerHTML = '';
    Array.from(this.characters).sort().forEach(name => {
      const item = document.createElement('div');
      item.className = 'character-item';
      item.textContent = name;
      item.addEventListener('click', () => this.jumpToText(name));
      list.appendChild(item);
    });
    if (!list.children.length) list.innerHTML = '<p style="color:#666;font-size:.875rem;">No characters yet</p>';
  }

  updateScenesList() {
    const list = document.getElementById('scenesList');
    list.innerHTML = '';
    this.scenes.forEach(scene => {
      const item = document.createElement('div');
      item.className = 'scene-item';
      item.innerHTML = `<div class="scene-title">Scene ${scene.number}</div><div class="scene-info">${scene.heading}</div>`;
      item.addEventListener('click', () => this.jumpToText(scene.heading));
      list.appendChild(item);
    });
    if (!list.children.length) list.innerHTML = '<p style="color:#666;font-size:.875rem;">No scenes yet</p>';
  }

  updatePreview() {
    const text = this.editor.value;
    if (!text.trim()) {
      this.previewPane.innerHTML = '<p style="color:#666;font-style:italic;">Start writing to see preview...</p>';
      return;
    }
    try {
      const parsed = this.fountain.parse(text);
      if (parsed && parsed.html && parsed.html.script) {
        this.previewPane.innerHTML = `<div class="screenplay-preview">${parsed.html.script}</div>`;
      } else {
        this.previewPane.innerHTML = this.simpleFormat(text);
      }
    } catch {
      this.previewPane.innerHTML = this.simpleFormat(text);
    }
  }

  simpleFormat(text) {
    const lines = text.split('\n');
    let html = '<div class="screenplay-preview">';
    lines.forEach(line => {
      const trimmed = line.trim();
      const upper = trimmed.toUpperCase();
      if (!trimmed) { html += '<br>'; return; }
      if (this.isSceneHeading(upper)) html += `<div class="scene-heading">${trimmed}</div>`;
      else if (trimmed === upper && !this.isSceneHeading(upper)) html += `<div class="character">${trimmed}</div>`;
      else if (line.startsWith('        ')) html += `<div class="dialogue">${trimmed}</div>`;
      else html += `<div class="action">${trimmed}</div>`;
    });
    html += '</div>';
    return html;
  }

  jumpToText(text) {
    const idx = this.editor.value.indexOf(text);
    if (idx !== -1 && this.currentView === 'editor') {
      this.editor.focus();
      this.editor.setSelectionRange(idx, idx + text.length);
    }
  }

  markAsUnsaved() {
    this.autoSaveStatus.textContent = 'Unsaved changes';
    this.autoSaveStatus.style.color = '#e74c3c';
  }

  markAsSaved() {
    this.autoSaveStatus.textContent = 'Auto-saved';
    this.autoSaveStatus.style.color = '#27ae60';
    this.lastSaved.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
  }

  saveToStorage() {
    const content = this.editor.value;
    localStorage.setItem('screenplay-content', content);
    localStorage.setItem('screenplay-timestamp', new Date().toISOString());
    this.markAsSaved();
  }

  loadFromStorage() {
    const saved = localStorage.getItem('screenplay-content');
    const timestamp = localStorage.getItem('screenplay-timestamp');
    if (saved) {
      this.editor.value = saved;
      if (timestamp) this.lastSaved.textContent = `Last saved: ${new Date(timestamp).toLocaleTimeString()}`;
      this.markAsSaved();
    }
  }

  startAutoSave() {
    setInterval(() => { if (this.editor.value.trim()) this.saveToStorage(); }, 30000);
  }

  newScript() {
    if (confirm('Start a new screenplay? Any unsaved changes will be lost.')) {
      this.editor.value = '';
      this.updateAll();
      localStorage.removeItem('screenplay-content');
      localStorage.removeItem('screenplay-timestamp');
      this.lastSaved.textContent = 'Never saved';
    }
  }

  async saveToFile() {
    const content = this.editor.value;
    if (!content.trim()) { alert('Nothing to save!'); return; }

    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'screenplay.fountain',
          types: [
            { description: 'Fountain files', accept: { 'text/fountain': ['.fountain'] } },
            { description: 'Text files', accept: { 'text/plain': ['.txt'] } }
          ]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        alert('File saved successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') this.fallbackSave(content);
      }
    } else {
      this.fallbackSave(content);
    }
  }

  fallbackSave(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'screenplay.fountain'; a.click();
    URL.revokeObjectURL(url);
  }

  loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.fountain,.txt';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          this.editor.value = ev.target.result;
          this.updateAll();
          this.saveToStorage();
        };
        reader.readAsText(file);
      }
    });
    input.click();
  }

  exportToPDF() {
    this.switchTab('preview');
    setTimeout(() => {
      if (confirm('This opens the Print dialog. Choose "Save as PDF".')) window.print();
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => new ScreenplayWriter());
