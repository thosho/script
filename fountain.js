class ScreenplayWriter {
    constructor() {
        this.editor = document.getElementById('scriptEditor');
        this.wordCount = document.getElementById('wordCount');
        this.lastSaved = document.getElementById('lastSaved');
        this.autoSaveStatus = document.getElementById('autoSaveStatus');
        
        this.init();
    }
    
    init() {
        // Load saved content
        this.loadFromStorage();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start auto-save timer
        this.startAutoSave();
        
        // Update word count initially
        this.updateWordCount();
    }
    
    setupEventListeners() {
        // Text editing events
        this.editor.addEventListener('input', () => {
            this.updateWordCount();
            this.markAsUnsaved();
        });
        
        // Toolbar buttons
        document.getElementById('newBtn').addEventListener('click', () => this.newScript());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToFile());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFromFile());
        
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
                }
            }
        });
    }
    
    updateWordCount() {
        const text = this.editor.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.wordCount.textContent = `Words: ${words}`;
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
        }, 30000); // Auto-save every 30 seconds
    }
    
    newScript() {
        if (confirm('Start a new screenplay? Any unsaved changes will be lost.')) {
            this.editor.value = '';
            this.updateWordCount();
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
        
        // Check if File System Access API is supported
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
        // Fallback: trigger download
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
                    this.updateWordCount();
                    this.saveToStorage();
                };
                reader.readAsText(file);
            }
        });
        
        input.click();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ScreenplayWriter();
});
