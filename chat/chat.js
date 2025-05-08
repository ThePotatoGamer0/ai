document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const historyBox = document.getElementById('chat-history');
    
    const API_BASE = 'https://ai.potatogamer.uk';

    let ws;
    let typingEffectTimeout = null;

    function startTypingEffect(element, text, interval = 100) {
        let charIndex = 0;
        element.textContent = ''; // clear existing content

        function type() {
            if (charIndex < text.length) {
                element.textContent += text[charIndex++];
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

    function appendMessage(prompt, response = '', isLoading = false) {
        const item = document.createElement('div');
        item.className = 'chat-item';

        item.innerHTML = `<strong>You:</strong> ${prompt}<br><strong>PotatoGPT:</strong> `;
        const responseSpan = document.createElement('span');
        responseSpan.className = 'potato-response';
        item.appendChild(responseSpan);

        historyBox.appendChild(item);
        historyBox.scrollTop = historyBox.scrollHeight;

        if (isLoading) {
            startTypingEffect(responseSpan, 'Cooking up some goodness...', 150);
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
                    stopTypingEffect(); // Stop the loading animation
                    responseSpan.textContent = ''; // Clear "cooking" text
                    startTypingEffect(responseSpan, reply, 50); // Animate final response
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
        renderHistory();
    });

    settingsBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    renderHistory();
});
