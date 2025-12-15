const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Auto-scroll to bottom
function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Add message to UI
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.textContent = sender === 'user' ? 'U' : 'V';
    
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    // Simple formatting for code blocks if Gemini sends them
    if (sender === 'bot') {
        // Convert newlines to breaks for display
        bubble.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        bubble.textContent = text;
    }

    if (sender === 'user') {
        div.appendChild(bubble);
        div.appendChild(avatar);
    } else {
        div.appendChild(avatar);
        div.appendChild(bubble);
    }

    chatWindow.appendChild(div);
    scrollToBottom();
}

// Handle sending
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Add User Message
    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;

    // 2. Show Loading Indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'bot-message');
    loadingDiv.innerHTML = `
        <div class="avatar">V</div>
        <div class="bubble" style="color: #888;">Thinking...</div>
    `;
    chatWindow.appendChild(loadingDiv);
    scrollToBottom();

    try {
        // 3. Call Netlify Function (The Secure Backend)
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });

        const data = await response.json();

        // Remove loading indicator
        chatWindow.removeChild(loadingDiv);

        if (data.error) {
            addMessage("Error: " + data.error, 'bot');
        } else {
            addMessage(data.reply, 'bot');
        }

    } catch (error) {
        chatWindow.removeChild(loadingDiv);
        addMessage("Connection error. Please try again.", 'bot');
    }

    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});