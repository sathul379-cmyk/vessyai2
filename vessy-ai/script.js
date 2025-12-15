const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const island = document.querySelector('.dynamic-island');
const statusText = document.querySelector('.ai-name');

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Typewriter Effect for AI Response
function typeWriter(element, text, speed = 10) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i) === '\n' ? '<br>' : text.charAt(i);
            i++;
            scrollToBottom();
            setTimeout(type, speed);
        }
    }
    type();
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    // UI Updates
    userInput.value = '';
    userInput.blur(); // Close keyboard on mobile
    
    // Add User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user-message';
    userDiv.innerHTML = `<div class="glass-bubble">${text}</div>`;
    chatWindow.appendChild(userDiv);
    scrollToBottom();

    // Animate Island (Loading State)
    island.style.width = '200px';
    statusText.textContent = 'Vessy is thinking...';
    
    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });

        const data = await response.json();

        // Reset Island
        island.style.width = '';
        statusText.textContent = 'Vessy Intelligence';

        // Add Bot Message
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-message';
        const bubble = document.createElement('div');
        bubble.className = 'glass-bubble';
        botDiv.appendChild(bubble);
        chatWindow.appendChild(botDiv);

        if (data.error) {
            bubble.style.color = '#ff4444';
            bubble.textContent = "Error: " + data.error;
        } else {
            // Use Typewriter effect
            typeWriter(bubble, data.reply);
        }

    } catch (error) {
        island.style.width = '';
        statusText.textContent = 'Connection Lost';
        const errDiv = document.createElement('div');
        errDiv.className = 'message bot-message';
        errDiv.innerHTML = `<div class="glass-bubble" style="color:#ff4444">System Failure. Please retry.</div>`;
        chatWindow.appendChild(errDiv);
    }
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
