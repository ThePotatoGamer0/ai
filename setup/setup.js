document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setup-form');
    const importBtn = document.getElementById('import-config');
    const exportBtn = document.getElementById('export-config');
    const importFile = document.getElementById('import-file');
    const skipBtn = document.getElementById('skip-setup');
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const config = Object.fromEntries(formData.entries());
  
      const styles = Array.from(
        document.querySelectorAll("input[name='styles']:checked")
      ).map((el) => el.value);
      config.styles = styles;
  
      localStorage.setItem('chatConfig', JSON.stringify(config));
      window.location.href = 'chat.html';
    });
  
    exportBtn.addEventListener('click', () => {
      const formData = new FormData(form);
      const config = Object.fromEntries(formData.entries());
      config.styles = Array.from(
        document.querySelectorAll("input[name='styles']:checked")
      ).map((el) => el.value);
  
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'setup-config.json';
      a.click();
    });
  
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
  
    importFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          for (const [key, value] of Object.entries(config)) {
            if (key === 'styles') continue;
            const field = form.elements[key];
            if (field) field.value = value;
          }
          if (Array.isArray(config.styles)) {
            config.styles.forEach((style) => {
              const checkbox = document.querySelector(
                `input[name='styles'][value='${style}']`
              );
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
  });
  