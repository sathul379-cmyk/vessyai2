const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'glass-bubble';
    
    if (sender === 'bot') {
        // THIS IS THE MAGIC: Converts Markdown to HTML
        bubble.innerHTML = marked.parse(text);
    } else {
        bubble.textContent = text;
    }
    
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    
    // Show loading dots
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-bubble" style="color:#888">...</div>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });
        
        const data = await response.json();
        chatWindow.removeChild(loadingDiv); // Remove loading dots
        
        if (data.error) {
            addMessage("Error: " + data.error, 'bot');
        } else {
            addMessage(data.reply, 'bot');
        }
    } catch (e) {
        chatWindow.removeChild(loadingDiv);
        addMessage("Connection failed.", 'bot');
    }

    userInput.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
