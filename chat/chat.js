document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const historyBox = document.getElementById('chat-history');
    
    const API_BASE = 'https://ai.potatogamer.uk';
  
    let ws;
    
    function startTypingEffect(element, phrases, interval = 100, pause = 1500) {
        let index = 0;
        let charIndex = 0;
        let deleting = false;
      
        function type() {
            const currentPhrase = phrases[index];
            if (deleting) {
                charIndex--;
                if (charIndex === 0) deleting = false;
            } else {
                charIndex++;
                if (charIndex === currentPhrase.length) deleting = true;
            }
      
            element.textContent = currentPhrase.substring(0, charIndex);
      
            if (!deleting && charIndex === currentPhrase.length) {
                setTimeout(type, pause);
            } else if (deleting && charIndex === 0) {
                index = (index + 1) % phrases.length;
                setTimeout(type, interval);
            } else {
                setTimeout(type, interval);
            }
        }
      
        type();
    }
    
    function typeTextWithinTime(element, text, duration = 1000) {
        const totalChars = text.length;
        if (totalChars === 0) return;
      
        const delay = duration / totalChars;
        let i = 0;
      
        const interval = setInterval(() => {
            element.textContent += text[i++];
            if (i >= totalChars) clearInterval(interval);
        }, delay);
    }
    
    function loadConfig() {
        const raw = localStorage.getItem('chatConfig');
        return raw ? JSON.parse(raw) : {};
    }
  
    function saveHistory(history) {
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }
  
    function loadHistory() {
        const raw = localStorage.getItem('chatHistory');
        try {
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
  
    function renderHistory() {
        const history = loadHistory();
        historyBox.innerHTML = '';
        history.forEach(({ prompt, response }) => {
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `<strong>You:</strong> ${prompt}<br><strong>PotatoGPT:</strong> ${response}`;
            historyBox.appendChild(item);
        });
    }
  
    function appendMessage(prompt, response = '', isLoading = false) {
        const historyBox = document.getElementById('chat-history');
        const item = document.createElement('div');
        item.className = 'chat-item';
      
        const userText = `<strong>You:</strong> ${prompt}<br><strong>PotatoGPT:</strong> `;
        item.innerHTML = userText;
      
        const potatoResponse = document.createElement('span');
        potatoResponse.className = 'potato-response';
        item.appendChild(potatoResponse);
      
        historyBox.appendChild(item);
        historyBox.scrollTop = historyBox.scrollHeight;
      
        if (isLoading) {
            startTypingEffect(potatoResponse, [
                'Cooking up some goodness...',
                'Writing fire...',
                'Consulting the potato gods...',
                'Warming up the circuits...',
                'Typing furiously...'
            ]);
        } else {
            // Clear any typing animation and type out the response
            setTimeout(() => {
                typeTextWithinTime(potatoResponse, response, 1000); // Finish typing within 1 second
            }, 0); // Start immediately after stopping animation
        }
      
        return potatoResponse;
    }
    
    function connectWebSocket(taskId, onDone) {
        ws = new WebSocket(`wss://ai.potatogamer.uk/ws/${taskId}`);
      
        ws.onopen = () => {
            console.log('[WebSocket] Connection established');
        };
      
        ws.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.status === 'done') {
                    onDone(data.response);
                    ws.close();
                }
            } catch (err) {
                console.error('WebSocket parse error:', err);
            }
        };
      
        ws.onerror = (err) => {
            console.error('[WebSocket] Error:', err);
        };
      
        ws.onclose = (event) => {
            console.log('[WebSocket] Connection closed:', event);
        };
    }
  
    function sendPrompt() {
        const prompt = input.value.trim();
        if (!prompt) return;
        input.value = '';
      
        const config = loadConfig();
        const history = loadHistory();
      
        const formatted = `You are PotatoGPT.\nStyles: ${config.styles?.join(', ') || 'None'}\n\nPrevious conversation:\n${history.map(h => `You: ${h.prompt}\nPotatoGPT: ${h.response}`).join('\n')}\nYou: ${prompt}\nPotatoGPT:`;

        // Immediately show the user prompt and loading animation
        const tempMessage = appendMessage(prompt, '', true);
      
        fetch(`${API_BASE}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: config.systemPrompt ? `${config.systemPrompt}\n${formatted}` : formatted,
                model: config.model || 'llama3'
            })
        })
            .then(res => res.json())
            .then(data => {
                const taskId = data.task_id;
                connectWebSocket(taskId, (reply) => {
                    // Clear any typing animation and update the response
                    tempMessage.innerHTML = `
                        <strong>You:</strong> ${prompt}<br>
                        <strong>PotatoGPT:</strong> ${reply}
                    `;
                    // Save to history
                    const history = loadHistory();
                    history.push({ prompt, response: reply });
                    if (history.length > 100) history.shift();
                    saveHistory(history);
                });
            })
            .catch(err => {
                console.error('Fetch error:', err);
                tempMessage.innerHTML = `<strong>You:</strong> ${prompt}<br><strong>PotatoGPT:</strong> <em>Error: failed to connect</em>`;
            });
    }
  
    sendBtn.addEventListener('click', sendPrompt);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendPrompt();
        }
    });
  
    newChatBtn.addEventListener('click', () => {
        localStorage.removeItem('chatHistory');
        renderHistory();
    });
  
    settingsBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
  
    renderHistory();
});
