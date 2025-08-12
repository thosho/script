const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

if (typeof Fountain === 'undefined') {
  preview.innerHTML = '<span style="color:red">⚠ Fountain library failed to load.</span>';
} else {
  const fountain = new Fountain();

  function render() {
    const text = editor.value || '';
    if (!text.trim()) {
      preview.innerHTML = '<em>Live preview...</em>';
      return;
    }
    try {
      const parsed = fountain.parse(text, true);
      if (parsed && parsed.html && parsed.html.script) {
        preview.innerHTML = `<div class="screenplay-preview">${parsed.html.script}</div>`;
      } else {
        preview.textContent = text;
      }
    } catch (e) {
      preview.textContent = 'Parsing error: ' + e.message;
    }
  }

  editor.addEventListener('input', render);
  render();
}
