(function () {
  const textarea = document.getElementById('editor');
  const preview = document.getElementById('preview');

  // Ensure Fountain is available
  if (typeof Fountain === 'undefined') {
    preview.innerHTML = '<span style="color:#c00">Fountain library failed to load.</span>';
    return;
  }

  const fountain = new Fountain();

  function updatePreview() {
    const text = textarea.value;
    if (!text.trim()) {
      preview.innerHTML = '<em>Start typing to see preview…</em>';
      return;
    }
    try {
      // includeTokens = true to ensure API is correct and available[1][2]
      const parsed = fountain.parse(text, true);
      if (parsed && parsed.html && parsed.html.script) {
        preview.innerHTML = `<div class="screenplay-preview">${parsed.html.script}</div>`;
      } else {
        preview.innerHTML = simpleFormat(text);
      }
    } catch (e) {
      console.warn('Fountain parse error:', e);
      preview.innerHTML = simpleFormat(text);
    }
  }

  function simpleFormat(text) {
    const lines = text.split('\n');
    let html = '<div class="screenplay-preview">';
    for (const line of lines) {
      const trimmed = line.trim();
      const upper = trimmed.toUpperCase();
      if (!trimmed) { html += '<br>'; continue; }
      if (isScene(upper)) html += `<div class="scene-heading">${trimmed}</div>`;
      else if (trimmed === upper && !isScene(upper)) html += `<div class="character">${trimmed}</div>`;
      else if (line.startsWith('        ')) html += `<div class="dialogue">${trimmed}</div>`;
      else html += `<div class="action">${trimmed}</div>`;
    }
    html += '</div>';
    return html;
  }

  function isScene(upper) {
    return upper.startsWith('INT.') || upper.startsWith('EXT.') || upper.startsWith('FADE IN:') || upper.startsWith('FADE OUT:') || upper.endsWith('TO:');
  }

  textarea.addEventListener('input', updatePreview);
  updatePreview();
})();
