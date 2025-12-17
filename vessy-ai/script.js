const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const bgLayer = document.getElementById('bgLayer');
const gameOverlay = document.getElementById('gameOverlay');
const gameFrame = document.getElementById('gameFrame');

// --- 1. SETTINGS ---
document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsModal.classList.toggle('hidden');
});

function setBg(type) {
    bgLayer.style.backgroundImage = ''; 
    bgLayer.className = ''; 
    bgLayer.classList.add('bg-' + type);
}

document.getElementById('customBgInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            bgLayer.className = ''; 
            bgLayer.style.backgroundImage = `url(${event.target.result})`;
        };
        reader.readAsDataURL(file);
    }
});

// --- 2. SECRET GAME ---
function openGame() {
    gameFrame.src = "https://classic.minecraft.net/";
    gameOverlay.classList.add('active');
}

function closeGame() {
    gameOverlay.classList.remove('active');
    gameFrame.src = "";
}

// --- 3. CHAT LOGIC (THE FIX IS HERE) ---
marked.setOptions({ highlight: (code) => code });

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    const card = document.createElement('div');
    card.className = 'glass-card';
    
    if (sender === 'bot') {
        let htmlContent = marked.parse(text);
        if (text.includes("```html") || text.includes("<!DOCTYPE html>")) {
            const codeMatch = text.match(/```html([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
            if (codeMatch) {
                htmlContent += `<button class="run-btn" onclick="openPreview(decodeURIComponent('${encodeURIComponent(codeMatch[1])}'))">▶ Run App</button>`;
            }
        }
        card.innerHTML = htmlContent;
    } else {
        card.textContent = text;
    }
    div.appendChild(card);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    // Secret Code
    if (text === 's1c1d3') {
        userInput.value = '';
        addMessage("ACCESS GRANTED.", 'bot');
        setTimeout(openGame, 1500);
        return; 
    }

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-card">...</div>';
    chatWindow.appendChild(loadingDiv);
    
    try {
        // *** CRITICAL FIX: MUST BE /api/chat ***
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });
        
        const data = await response.json();
        chatWindow.removeChild(loadingDiv);
        
        if (data.error) addMessage("Error: " + data.error, 'bot');
        else addMessage(data.reply, 'bot');
    } catch (e) {
        chatWindow.removeChild(loadingDiv);
        console.error(e); // Look at console for details
        addMessage("Connection Failed. (Check Vercel Logs)", 'bot');
    }

    userInput.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Preview Logic
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');
window.openPreview = (code) => {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    doc.open(); doc.write(code); doc.close();
};
window.closePreview = () => previewModal.classList.add('hidden');
