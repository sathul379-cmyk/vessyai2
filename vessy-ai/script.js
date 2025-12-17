const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const gameOverlay = document.getElementById('gameOverlay');
const gameFrame = document.getElementById('gameFrame');
const gameTitle = document.getElementById('gameTitle');
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');

// --- SETTINGS ---
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
function toggleSettings() { settingsModal.classList.toggle('hidden'); }

// --- GAME LOGIC ---
// ... inside script.js ...

// --- GAME LOGIC ---
function launchGame(type) {
    gameOverlay.classList.add('active');
    
    if (type === 'minecraft') {
        gameTitle.innerText = "VESSY CRAFT (GOD MODE)";
        // The API will handle the code generation for this
    } else if (type === 'fortnite') {
        gameTitle.innerText = "VESSY ROYALE (EV.IO)";
        // SWITCHED TO EV.IO (Better Fortnite clone for browsers)
        gameFrame.src = "https://ev.io"; 
    }
}

// --- SETTINGS LOGIC ---
function setBg(type) {
    bgLayer.style.backgroundImage = ''; 
    bgLayer.className = ''; // Clear old classes
    
    if (type === 'ultra') {
        document.querySelector('.nebula-bg').style.display = 'block';
    } else {
        document.querySelector('.nebula-bg').style.display = 'none';
        bgLayer.classList.add('bg-' + type);
    }
}

// ... rest of script.js stays the same ...
function launchGame(type) {
    gameOverlay.classList.add('active');
    
    if (type === 'minecraft') {
        gameTitle.innerText = "VESSY CRAFT (GOD MODE)";
        // We use the API to generate the engine, but here we simulate the launch
        // For the '20154' code, we will trigger the API to send the engine code
        // But for a quick play, we can use a web-based voxel viewer if preferred.
        // However, per instructions, we will ask the API for the engine.
    } else if (type === 'fortnite') {
        gameTitle.innerText = "VESSY ROYALE (1v1.LOL)";
        gameFrame.src = "https://1v1.lol"; // The best browser Fortnite clone
    }
}

function closeGame() {
    gameOverlay.classList.remove('active');
    gameFrame.src = "";
}

// --- PREVIEW LOGIC ---
window.openPreview = function(encodedCode, lang) {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    const code = decodeURIComponent(encodedCode);
    doc.open();
    
    let content = code;
    if (lang === 'python' || lang === 'py') {
        content = `<html><head><link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" /><script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script><style>body{background:#111;color:#fff;font-family:monospace;padding:20px;}</style></head><body><h3>Python Output:</h3><script type="py">${code}</script></body></html>`;
    } else if (lang === 'js') {
        content = `<html><body style="background:#111;color:#0f0;font-family:monospace;padding:20px;"><h3>Console:</h3><div id="c"></div><script>console.log=m=>{document.getElementById('c').innerHTML+=m+'<br>'};try{${code}}catch(e){console.log(e)}</script></body></html>`;
    }
    
    doc.write(content);
    doc.close();
};
window.closePreview = () => previewModal.classList.add('hidden');

// --- CHAT LOGIC ---
marked.setOptions({ highlight: (code) => code });

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    const card = document.createElement('div');
    card.className = sender === 'bot' ? 'glass-card ultra-card' : 'glass-card';
    
    if (sender === 'bot') {
        let htmlContent = marked.parse(text);
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase();
            const code = match[2];
            if (['html', 'python', 'py', 'javascript', 'js', 'css'].includes(lang)) {
                const safeCode = encodeURIComponent(code);
                htmlContent += `<button class="run-btn" onclick="openPreview('${safeCode}', '${lang}')">▶ Run ${lang.toUpperCase()}</button>`;
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

    // --- SPECIAL CODES ---
    
    // 1. MINECRAFT (Special User Code)
    if (text === '20154') {
        userInput.value = '';
        addMessage("🔒 AUTHENTICATING SPECIAL USER...", 'bot');
        setTimeout(() => {
            addMessage("✅ ACCESS GRANTED. GENERATING VOXEL ENGINE...", 'bot');
            // We trigger the API to send the Minecraft code
            triggerAI("Build Minecraft from scratch");
        }, 1000);
        return;
    }

    // 2. FORTNITE
    if (text.toLowerCase() === 'play fortnite' || text.toLowerCase() === 'fortnite') {
        userInput.value = '';
        addMessage("🚀 LAUNCHING VESSY ROYALE...", 'bot');
        setTimeout(() => {
            launchGame('fortnite');
        }, 1000);
        return;
    }

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    triggerAI(text);
}

async function triggerAI(promptText) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-card">Processing...</div>';
    chatWindow.appendChild(loadingDiv);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
        });
        
        const data = await response.json();
        chatWindow.removeChild(loadingDiv);
        
        if (data.error) addMessage("Error: " + data.error, 'bot');
        else addMessage(data.reply, 'bot');
    } catch (e) {
        chatWindow.removeChild(loadingDiv);
        addMessage("Connection Failed.", 'bot');
    }
    userInput.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

