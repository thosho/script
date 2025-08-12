<script src="https://unpkg.com/fountain-js@1.9.1/dist/fountain.js"></script>
<script>
  (function () {
    const textarea = document.getElementById('editor');   // your textarea id
    const preview  = document.getElementById('preview');  // your preview div id

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
        const parsed = fountain.parse(text, true); // include tokens
        if (parsed && parsed.html && parsed.html.script) {
          preview.innerHTML = '<div class="screenplay-preview">' + parsed.html.script + '</div>';
        } else {
          preview.textContent = 'Parsed, but no html.script output.';
        }
      } catch (e) {
        preview.textContent = 'Fountain parse error: ' + e.message;
      }
    }

    textarea.addEventListener('input', updatePreview);
    updatePreview();
  })();
</script>
