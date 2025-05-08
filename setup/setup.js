document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setup-form');
    const importBtn = document.getElementById('import-config');
    const exportBtn = document.getElementById('export-config');
    const importFile = document.getElementById('import-file');
    const skipBtn = document.getElementById('skip-setup');
    const generateBtn = document.getElementById('generate-chars');
    const charForms = document.getElementById('character-forms');

    generateBtn.addEventListener('click', () => {
      const count = parseInt(document.getElementById('char-count').value);
      charForms.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const charSection = document.createElement('section');
        charSection.className = 'char-box';
        charSection.innerHTML = `
          <h3>Character ${i + 1}</h3>
          <label>Name <input type="text" name="char-name-${i}" /></label>
          <label>Age <input type="number" name="char-age-${i}" /></label>
          <label>Gender <input type="text" name="char-gender-${i}" /></label>
          <label>Species <input type="text" name="char-species-${i}" /></label>
          <label>Height <input type="text" name="char-height-${i}" /></label>
          <label>Weight <input type="text" name="char-weight-${i}" /></label>
          <label>Physique <input type="text" name="char-physique-${i}" /></label>
          <label>Relationships <input type="text" name="char-relationships-${i}" /></label>
        `;
        charForms.appendChild(charSection);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const config = Object.fromEntries(formData.entries());

      const styles = Array.from(document.querySelectorAll("input[name='styles']:checked"))
        .map(el => el.value);
      config.styles = styles;

      const characters = [];
      for (let [key, value] of formData.entries()) {
        const match = key.match(/^char-(\w+)-(\d+)$/);
        if (match) {
          const [_, prop, index] = match;
          if (!characters[index]) characters[index] = {};
          characters[index][prop] = value;
        }
      }
      config.characters = characters;

      localStorage.setItem('chatConfig', JSON.stringify(config));
      window.location.href = 'chat.html';
    });

    exportBtn.addEventListener('click', () => {
      const formData = new FormData(form);
      const config = Object.fromEntries(formData.entries());
      config.styles = Array.from(document.querySelectorAll("input[name='styles']:checked"))
        .map(el => el.value);

      const characters = [];
      for (let [key, value] of formData.entries()) {
        const match = key.match(/^char-(\w+)-(\d+)$/);
        if (match) {
          const [_, prop, index] = match;
          if (!characters[index]) characters[index] = {};
          characters[index][prop] = value;
        }
      }
      config.characters = characters;

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'setup-config.json';
      a.click();
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          document.getElementById('char-count').value = config.characters?.length || 1;
          generateBtn.click();
          config.characters?.forEach((char, i) => {
            for (let key in char) {
              const input = form.querySelector(`[name='char-${key}-${i}']`);
              if (input) input.value = char[key];
            }
          });
          form.elements['plot'].value = config.plot || '';
          form.elements['systemPrompt'].value = config.systemPrompt || '';
          form.elements['model'].value = config.model || 'llama3';
          if (Array.isArray(config.styles)) {
            config.styles.forEach(style => {
              const checkbox = document.querySelector(`input[name='styles'][value='${style}']`);
              if (checkbox) checkbox.checked = true;
            });
          }
        } catch (err) {
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    });

    skipBtn.addEventListener('click', () => {
      window.location.href = '../chat';
    });
  })