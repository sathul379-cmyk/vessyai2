const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const bgLayer = document.getElementById('bgLayer');
const gameOverlay = document.getElementById('gameOverlay');
const gameFrame = document.getElementById('gameFrame');
const gameTitle = document.getElementById('gameTitle');
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');

// --- 1. SOUND ENGINE (Web Audio API) ---
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'receive') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}

window.toggleSound = function() {
    soundEnabled = !soundEnabled;
    alert("Sound Enabled: " + soundEnabled);
};

// --- 2. MEMORY SYSTEM (Local Storage) ---
function loadHistory() {
    const saved = localStorage.getItem('vessy_history');
    const savedNote = localStorage.getItem('vessy_note');
    if (saved) {
        // Keep the welcome message, append history
        chatWindow.innerHTML += saved;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    if (savedNote) {
        document.getElementById('notepad').value = savedNote;
    }
}

function saveHistory() {
    // Save only the inner HTML of messages (excluding the first welcome one if you want)
    // For simplicity, we save the whole window content minus the default bot message
    // Actually, let's just append new messages to storage
}

window.clearMemory = function() {
    localStorage.removeItem('vessy_history');
    localStorage.removeItem('vessy_note');
    location.reload();
};

// Notepad Auto-Save
document.getElementById('notepad').addEventListener('input', (e) => {
    localStorage.setItem('vessy_note', e.target.value);
});

// --- 3. WIDGETS (Clock) ---
function updateClock() {
    const now = new Date();
    document.getElementById('clockTime').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('clockDate').innerText = "SYSTEM ONLINE";
}
setInterval(updateClock, 1000);
updateClock();

// --- 4. SETTINGS ---
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
function toggleSettings() { settingsModal.classList.toggle('hidden'); }

function setBg(type) {
    bgLayer.style.backgroundImage = ''; bgLayer.className = ''; 
    if (type === 'ultra') bgLayer.className = 'bg-ultra';
    else bgLayer.classList.add('bg-' + type);
}
document.getElementById('customBgInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => { bgLayer.className = ''; bgLayer.style.backgroundImage = `url(${event.target.result})`; };
        reader.readAsDataURL(file);
    }
});

// --- 5. GAME LOGIC ---
function launchGame(type) {
    gameOverlay.classList.add('active');
    if (type === 'minecraft') { gameTitle.innerText = "VESSY CRAFT (GOD MODE)"; }
    else if (type === 'fortnite') { gameTitle.innerText = "VESSY ROYALE (EV.IO)"; gameFrame.src = "https://ev.io"; }
}
function closeGame() { gameOverlay.classList.remove('active'); gameFrame.src = ""; }

// --- 6. PREVIEW LOGIC ---
window.openPreview = function(encodedCode, lang) {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    const code = decodeURIComponent(encodedCode);
    doc.open();
    let content = code;
    if (lang === 'python' || lang === 'py') content = `<html><head><link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" /><script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script><style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:20px;}</style></head><body><h3>Python Terminal</h3><script type="py" terminal>${code}</script></body></html>`;
    else if (lang === 'js') content = `<html><body style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;padding:20px;"><h3>JS Console</h3><div id="c"></div><script>console.log=m=>{document.getElementById('c').innerHTML+='> '+m+'<br>'};try{${code}}catch(e){console.log('Error: '+e)}</script></body></html>`;
    else if (lang === 'css') content = `<html><head><style>body{padding:20px;background:#fff;color:#333;display:flex;flex-direction:column;gap:10px;} ${code}</style></head><body><h2>CSS Test</h2><button class="btn">Button</button><div class="card">Card Content</div><input placeholder="Input"></body></html>`;
    doc.write(content); doc.close();
};
window.closePreview = () => previewModal.classList.add('hidden');

// --- 7. CHAT LOGIC ---
marked.setOptions({ highlight: (code) => code });

function addMessage(text, sender, save = true) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    const card = document.createElement('div');
    card.className = 'glass-card';
    
    if (sender === 'bot') {
        let htmlContent = marked.parse(text);
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase();
            const code = match[2];
            if (['html', 'python', 'py', 'javascript', 'js', 'css', 'java'].includes(lang)) {
                const safeCode = encodeURIComponent(code);
                htmlContent += `<button class="run-btn" onclick="openPreview('${safeCode}', '${lang}')">▶ Run ${lang.toUpperCase()}</button>`;
            }
        }
        card.innerHTML = htmlContent;
        playSound('receive');
    } else {
        card.textContent = text;
        playSound('send');
    }
    div.appendChild(card);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Save to Memory
    if (save) {
        const currentHistory = localStorage.getItem('vessy_history') || "";
        localStorage.setItem('vessy_history', currentHistory + div.outerHTML);
    }
}

// Load memory on start
loadHistory();

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    if (text === '20154') { userInput.value = ''; addMessage("🔒 AUTHENTICATING...", 'bot', false); setTimeout(() => { addMessage("✅ ACCESS GRANTED.", 'bot', false); triggerAI("Build Minecraft from scratch"); }, 1000); return; }
    if (text.toLowerCase() === 'play fortnite') { userInput.value = ''; addMessage("🚀 LAUNCHING EV.IO...", 'bot', false); setTimeout(() => launchGame('fortnite'), 1000); return; }

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    triggerAI(text);
}

async function triggerAI(promptText) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-card">...</div>';
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
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
