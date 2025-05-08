document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const historyBox = document.getElementById('chat-history');
    
    const API_BASE = 'https://ai.potatogamer.uk';

    let ws;
    let typingEffectTimeout = null;

    function startTypingEffect(element, text, maxDuration = 2000) {
        let charIndex = 0;
        let displayText = '';
    
        const interval = Math.max(10, Math.floor(maxDuration / text.length));
    
        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        }
    
        function applyFormatting(str) {
            // Basic markdown: **bold**, *italic*
            return str
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
        }
    
        function type() {
            if (charIndex < text.length) {
                displayText += escapeHtml(text[charIndex++]);
                element.innerHTML = applyFormatting(displayText);
                typingEffectTimeout = setTimeout(type, interval);
            }
        }
    
        type();
    }
    
    

    function stopTypingEffect() {
        clearTimeout(typingEffectTimeout);
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

    function getRandomString(strings) {
        if (!Array.isArray(strings) || strings.length === 0) return '';
        const index = Math.floor(Math.random() * strings.length);
        return strings[index];
    }    

    function appendMessage(prompt, response = '', isLoading = false) {
        const item = document.createElement('div');
        item.className = 'chat-item';

        item.innerHTML = `<strong>You:</strong> ${prompt}<br><strong>PotatoGPT:</strong> `;
        const responseSpan = document.createElement('span');
        responseSpan.className = 'potato-response';
        item.appendChild(responseSpan);

        historyBox.appendChild(item);
        historyBox.scrollTop = historyBox.scrollHeight;

        const phrases = [
            'Cooking up some goodness...',
            'Writing fire...',
            'Consulting the potato gods...',
            'Warming up the circuits...',
            'Typing furiously...'
        ];
        
        const randomPhrase = getRandomString(phrases);
        
        if (isLoading) {
            startTypingEffect(responseSpan, randomPhrase, 150);;
        } else if (response) {
            startTypingEffect(responseSpan, response, 50);
        }

        return responseSpan; // Return the span so we can update it later
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

        const responseSpan = appendMessage(prompt, '', true);

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
                    stopTypingEffect();
                    responseSpan.textContent = '';
                    startTypingEffect(responseSpan, reply, 2000);
                    const history = loadHistory();
                    history.push({ prompt, response: reply });
                    if (history.length > 100) history.shift();
                    saveHistory(history);
                });
            })
            .catch(err => {
                console.error('Fetch error:', err);
                responseSpan.innerHTML = '<em>Error: failed to connect</em>';
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
        localStorage.removeItem('chatConfig');
        renderHistory();
        window.location.href = '../setup';
    });

    settingsBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    renderHistory();
});
