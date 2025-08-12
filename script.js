<!-- Add this line before <script src="script.js"></script> -->
<script src="https://unpkg.com/fountain-js@1.9.1/dist/fountain.js"></script>
<script src="script.js"></script>


class ScreenplayWriter {
    constructor() {
        this.editor = document.getElementById('scriptEditor');
        this.previewPane = document.getElementById('previewPane');
        this.wordCount = document.getElementById('wordCount');
        this.lastSaved = document.getElementById('lastSaved');
        this.autoSaveStatus = document.getElementById('autoSaveStatus');
        
        this.currentView = 'editor';
        this.fountain = new Fountain();
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
        // Text editing events
        this.editor.addEventListener('input', () => {
            this.updateAll();
            this.markAsUnsaved();
        });
        
        // Toolbar buttons
        document.getElementById('newBtn').addEventListener('click', () => this.newScript());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToFile());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFromFile());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPDF());
        
        // Format buttons
        document.getElementById('sceneBtn').addEventListener('click', () => this.insertFormat('scene'));
        document.getElementById('characterBtn').addEventListener('click', () => this.insertFormat('character'));
        document.getElementById('actionBtn').addEventListener('click', () => this.insertFormat('action'));
        document.getElementById('dialogueBtn').addEventListener('click', () => this.insertFormat('dialogue'));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveToFile();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newScript();
                        break;
                    case '1':
                        e.preventDefault();
                        this.switchTab('editor');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('preview');
                        break;
                }
            }
        });
        
        // Format shortcuts
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
        const before = value.substring(0, cursor);
        const after = value.substring(cursor);
        
        // Insert 4 spaces for tab
        this.editor.value = before + '    ' + after;
        this.editor.selectionStart = this.editor.selectionEnd = cursor + 4;
    }
    
    handleEnterKey(e) {
        const cursor = this.editor.selectionStart;
        const value = this.editor.value;
        const lines = value.substring(0, cursor).split('\n');
        const currentLine = lines[lines.length - 1].trim().toUpperCase();
        
        // Auto-format based on current line context
        if (this.isSceneHeading(currentLine)) {
            // After scene heading, next line should be action
            setTimeout(() => {
                this.insertLineBreak();
            }, 10);
        } else if (this.isCharacterName(currentLine)) {
            // After character name, indent for dialogue
            setTimeout(() => {
                this.insertText('        ');
            }, 10);
        }
    }
    
    isSceneHeading(line) {
        const sceneStarters = ['INT.', 'EXT.', 'FADE IN:', 'FADE OUT:', 'CUT TO:'];
        return sceneStarters.some(starter => line.startsWith(starter));
    }
    
    isCharacterName(line) {
        // Character names are typically all caps and not scene headings
        return line === line.toUpperCase() && 
               line.length > 0 && 
               !this.isSceneHeading(line) &&
               !line.includes('.');
    }
    
    insertFormat(type) {
        const cursor = this.editor.selectionStart;
        const value = this.editor.value;
        let insertion = '';
        
        switch(type) {
            case 'scene':
                insertion = '\n\nINT. LOCATION - DAY\n\n';
                break;
            case 'character':
                insertion = '\n\nCHARACTER NAME\n        ';
                break;
            case 'action':
                insertion = '\n\n';
                break;
            case 'dialogue':
                insertion = '\n        ';
                break;
        }
        
        this.insertText(insertion);
    }
    
    insertText(text) {
        const cursor = this.editor.selectionStart;
        const value = this.editor.value;
        const before = value.substring(0, cursor);
        const after = value.substring(cursor);
        
        this.editor.value = before + text + after;
        this.editor.selectionStart = this.editor.selectionEnd = cursor + text.length;
        this.editor.focus();
        this.updateAll();
    }
    
    insertLineBreak() {
        this.insertText('\n\n');
    }
    
    updateAll() {
        this.updateWordCount();
        this.parseScript();
        this.updateStats();
        this.updateCharactersList();
        this.updateScenesList();
        if (this.currentView === 'preview') {
            this.updatePreview();
        }
    }
    
    updateWordCount() {
        const text = this.editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const pages = Math.ceil(words / 250); // Rough estimate: 250 words per page
        this.wordCount.textContent = `Words: ${words} | Pages: ~${pages}`;
    }
    
    parseScript() {
        const text = this.editor.value;
        if (!text.trim()) {
            this.characters.clear();
            this.scenes = [];
            return;
        }
        
        try {
            // Parse with Fountain.js
            const parsed = this.fountain.parse(text, true);
            if (parsed && parsed.tokens) {
                this.extractCharactersAndScenes(parsed.tokens);
            }
        } catch (error) {
            console.warn('Fountain parsing error:', error);
            // Fallback to simple parsing
            this.simpleParse(text);
        }
    }
    
    extractCharactersAndScenes(tokens) {
        this.characters.clear();
        this.scenes = [];
        
        tokens.forEach((token, index) => {
            if (token.type === 'character') {
                // Extract character name (remove parentheticals)
                const name = token.text.replace(/\([^)]*\)/g, '').trim();
                if (name) {
                    this.characters.add(name);
                }
            } else if (token.type === 'scene_heading') {
                this.scenes.push({
                    heading: token.text,
                    number: this.scenes.length + 1,
                    index: index
                });
            }
        });
    }
    
    simpleParse(text) {
        // Fallback parsing method
        const lines = text.split('\n');
        this.characters.clear();
        this.scenes = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Scene headings
            if (this.isSceneHeading(trimmed.toUpperCase())) {
                this.scenes.push({
                    heading: trimmed,
                    number: this.scenes.length + 1,
                    line: index + 1
                });
            }
            
            // Character names (all caps, not scene headings)
            if (trimmed === trimmed.toUpperCase() && 
                trimmed.length > 0 && 
                !this.isSceneHeading(trimmed) &&
                !trimmed.includes('.') &&
                trimmed.length < 30) {
                this.characters.add(trimmed.replace(/\([^)]*\)/g, '').trim());
            }
        });
    }
    
    updateStats() {
        const text = this.editor.value;
        this.stats = {
            characters: this.characters.size,
            scenes: this.scenes.length,
            dialogueLines: (text.match(/\n\s{4,}\w/g) || []).length,
            actionLines: (text.match(/\n[A-Z]/g) || []).length
        };
    }
    
    updateCharactersList() {
        const charactersList = document.getElementById('charactersList');
        if (!charactersList) return;
        
        charactersList.innerHTML = '';
        
        Array.from(this.characters).sort().forEach(character => {
            const item = document.createElement('div');
            item.className = 'character-item';
            item.textContent = character;
            item.addEventListener('click', () => {
                this.jumpToCharacter(character);
            });
            charactersList.appendChild(item);
        });
    }
    
    updateScenesList() {
        const scenesList = document.getElementById('scenesList');
        if (!scenesList) return;
        
        scenesList.innerHTML = '';
        
        this.scenes.forEach(scene => {
            const item = document.createElement('div');
            item.className = 'scene-item';
            item.innerHTML = `
                <div class="scene-title">Scene ${scene.number}</div>
                <div class="scene-info">${scene.heading}</div>
            `;
            item.addEventListener('click', () => {
                this.jumpToScene(scene);
            });
            scenesList.appendChild(item);
        });
    }
    
    updatePreview() {
        const text = this.editor.value;
        if (!text.trim()) {
            this.previewPane.innerHTML = '<p style="color: #666; font-style: italic;">Start writing to see preview...</p>';
            return;
        }
        
        try {
            const parsed = this.fountain.parse(text);
            if (parsed && parsed.html && parsed.html.script) {
                this.previewPane.innerHTML = `<div class="screenplay-preview">${parsed.html.script}</div>`;
            } else {
                this.previewPane.innerHTML = this.simpleFormat(text);
            }
        } catch (error) {
            console.warn('Preview error:', error);
            this.previewPane.innerHTML = this.simpleFormat(text);
        }
    }
    
    simpleFormat(text) {
        // Simple formatting fallback
        const lines = text.split('\n');
        let html = '<div class="screenplay-preview">';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                html += '<br>';
                return;
            }
            
            if (this.isSceneHeading(trimmed.toUpperCase())) {
                html += `<div class="scene-heading">${trimmed}</div>`;
            } else if (trimmed === trimmed.toUpperCase() && !this.isSceneHeading(trimmed)) {
                html += `<div class="character">${trimmed}</div>`;
            } else if (line.startsWith('        ')) {
                html += `<div class="dialogue">${trimmed}</div>`;
            } else {
                html += `<div class="action">${trimmed}</div>`;
            }
        });
        
        html += '</div>';
        return html;
    }
    
    jumpToCharacter(character) {
        // Find first occurrence of character in text
        const text = this.editor.value;
        const index = text.indexOf(character);
        if (index !== -1 && this.currentView === 'editor') {
            this.editor.focus();
            this.editor.setSelectionRange(index, index + character.length);
        }
    }
    
    jumpToScene(scene) {
        // Find scene in text and jump to it
        const text = this.editor.value;
        const index = text.indexOf(scene.heading);
        if (index !== -1 && this.currentView === 'editor') {
            this.editor.focus();
            this.editor.setSelectionRange(index, index + scene.heading.length);
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
            if (timestamp) {
                const date = new Date(timestamp);
                this.lastSaved.textContent = `Last saved: ${date.toLocaleTimeString()}`;
            }
            this.markAsSaved();
        }
    }
    
    startAutoSave() {
        setInterval(() => {
            if (this.editor.value.trim()) {
                this.saveToStorage();
            }
        }, 30000);
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
        
        if (!content.trim()) {
            alert('Nothing to save!');
            return;
        }
        
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'screenplay.fountain',
                    types: [{
                        description: 'Fountain files',
                        accept: { 'text/fountain': ['.fountain'] }
                    }, {
                        description: 'Text files',
                        accept: { 'text/plain': ['.txt'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                alert('File saved successfully!');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Save failed:', err);
                    this.fallbackSave(content);
                }
            }
        } else {
            this.fallbackSave(content);
        }
    }
    
    fallbackSave(content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'screenplay.fountain';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.fountain,.txt';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.editor.value = e.target.result;
                    this.updateAll();
                    this.saveToStorage();
                };
                reader.readAsText(file);
            }
        });
        
        input.click();
    }
    
    exportToPDF() {
        // For now, show the formatted preview and let user print to PDF
        this.switchTab('preview');
        setTimeout(() => {
            if (confirm('This will open the print dialog. Choose "Save as PDF" in your browser to export as PDF.')) {
                window.print();
            }
        }, 100);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ScreenplayWriter();
});
