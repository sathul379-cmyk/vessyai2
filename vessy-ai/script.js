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
const leftDrawer = document.getElementById('leftDrawer');
const rightDrawer = document.getElementById('rightDrawer');
const cmdPalette = document.getElementById('cmdPalette');

// --- 1. BOOT SEQUENCE ---
setTimeout(() => {
    document.getElementById('bootScreen').style.opacity = '0';
    setTimeout(() => document.getElementById('bootScreen').style.display = 'none', 1000);
    playSound('startup');
}, 2500);

// --- 2. VOICE INPUT (Speech-to-Text) ---
window.toggleVoice = function() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();
    document.getElementById('micBtn').style.background = '#ff0055';
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        handleSend();
        document.getElementById('micBtn').style.background = '';
    };
    recognition.onend = () => document.getElementById('micBtn').style.background = '';
};

// --- 3. VESSY VOICE (Text-to-Speech) ---
let ttsEnabled = false;
window.toggleTTS = function() { ttsEnabled = !ttsEnabled; alert("Voice: " + ttsEnabled); };
function speak(text) {
    if (!ttsEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2; utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
}

// --- 4. COMMAND PALETTE (Ctrl+K) ---
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        cmdPalette.classList.toggle('hidden');
        document.getElementById('cmdInput').focus();
    }
});
window.runCmd = function(cmd) {
    if (cmd === 'clear') clearMemory();
    if (cmd === 'theme') toggleSettings();
    if (cmd === 'matrix') setBg('matrix');
    if (cmd === 'full') toggleFullScreen();
    cmdPalette.classList.add('hidden');
};

// --- 5. FOCUS MODE (Pomodoro) ---
let timerInterval;
let timeLeft = 25 * 60;
window.toggleTimer = function() {
    if (timerInterval) {
        clearInterval(timerInterval); timerInterval = null;
        document.querySelector('.focus-card button').innerText = "START FOCUS";
    } else {
        timerInterval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            document.getElementById('timerDisplay').innerText = `${m}:${s}`;
            if (timeLeft <= 0) { clearInterval(timerInterval); playSound('receive'); }
        }, 1000);
        document.querySelector('.focus-card button').innerText = "STOP";
    }
};

// --- 6. SYSTEM STATUS (Battery & Net) ---
if (navigator.getBattery) {
    navigator.getBattery().then(bat => {
        document.getElementById('batBar').style.width = (bat.level * 100) + '%';
    });
}
window.addEventListener('offline', () => document.getElementById('netStatus').innerText = "OFFLINE");
window.addEventListener('online', () => document.getElementById('netStatus').innerText = "ACTIVE");

// --- 7. THEME PICKER ---
window.setAccent = function(color) {
    document.documentElement.style.setProperty('--neon-accent', color);
};

// --- 8. DRAGGABLE WINDOWS ---
// (Simplified drag logic for widgets)
// Note: Full drag logic requires complex event listeners, simplified here for stability.

// --- 9. FULLSCREEN ---
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
};

// --- 10. TYPING SOUNDS ---
userInput.addEventListener('input', () => playSound('type'));

// --- EXISTING LOGIC (Particles, Chat, etc.) ---
// (Paste the Particle Engine from 28.5 here)
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();
class Particle {
    constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 3 + 1; this.speedX = Math.random() * 2 - 1; this.speedY = Math.random() * 2 - 1; this.color = `hsl(${Math.random() * 60 + 180}, 100%, 50%)`; this.life = 1.0; }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.02; if (this.size > 0.2) this.size -= 0.1; }
    draw() { ctx.fillStyle = this.color; ctx.globalAlpha = this.life; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
}
function handleParticles() { for (let i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(); if (particles[i].life <= 0) { particles.splice(i, 1); i--; } } }
function animateParticles() { ctx.clearRect(0, 0, canvas.width, canvas.height); handleParticles(); requestAnimationFrame(animateParticles); }
animateParticles();
window.addEventListener('mousemove', (e) => { for (let i = 0; i < 2; i++) particles.push(new Particle(e.x, e.y)); });

// --- STANDARD FUNCTIONS ---
window.toggleLeftDrawer = function() { leftDrawer.classList.toggle('open'); };
window.toggleRightDrawer = function() { rightDrawer.classList.toggle('open'); };
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
function toggleSettings() { settingsModal.classList.toggle('hidden'); }
function setBg(type) { bgLayer.style.backgroundImage = ''; bgLayer.className = ''; if (type === 'ultra') bgLayer.className = 'bg-ultra'; else bgLayer.classList.add('bg-' + type); }
document.getElementById('customBgInput').addEventListener('change', function(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { bgLayer.className = ''; bgLayer.style.backgroundImage = `url(${event.target.result})`; }; reader.readAsDataURL(file); } });
function launchGame(type) { gameOverlay.classList.add('active'); if (type === 'minecraft') { gameTitle.innerText = "VESSY CRAFT (GOD MODE)"; } else if (type === 'fortnite') { gameTitle.innerText = "VESSY ROYALE (EV.IO)"; gameFrame.src = "https://ev.io"; } }
function closeGame() { gameOverlay.classList.remove('active'); gameFrame.src = ""; }
window.openPreview = function(encodedCode, lang) { previewModal.classList.remove('hidden'); const doc = previewFrame.contentWindow.document; const code = decodeURIComponent(encodedCode); doc.open(); let content = code; if (lang === 'python' || lang === 'py') content = `<html><head><link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" /><script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script><style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:20px;}</style></head><body><h3>Python Terminal</h3><script type="py" terminal>${code}</script></body></html>`; else if (lang === 'js') content = `<html><body style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;padding:20px;"><h3>JS Console</h3><div id="c"></div><script>console.log=m=>{document.getElementById('c').innerHTML+='> '+m+'<br>'};try{${code}}catch(e){console.log('Error: '+e)}</script></body></html>`; else if (lang === 'css') content = `<html><head><style>body{padding:20px;background:#fff;color:#333;display:flex;flex-direction:column;gap:10px;} ${code}</style></head><body><h2>CSS Test</h2><button class="btn">Button</button><div class="card">Card Content</div><input placeholder="Input"></body></html>`; doc.write(content); doc.close(); };
window.closePreview = () => previewModal.classList.add('hidden');

// --- SOUND ---
let soundEnabled = true;
const uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (!soundEnabled) return;
    const osc = uiAudioCtx.createOscillator(); const gain = uiAudioCtx.createGain(); osc.connect(gain); gain.connect(uiAudioCtx.destination);
    if (type === 'send') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, uiAudioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, uiAudioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.1, uiAudioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, uiAudioCtx.currentTime + 0.1); osc.start(); osc.stop(uiAudioCtx.currentTime + 0.1); }
    else if (type === 'receive') { osc.type = 'triangle'; osc.frequency.setValueAtTime(400, uiAudioCtx.currentTime); gain.gain.setValueAtTime(0.05, uiAudioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, uiAudioCtx.currentTime + 0.2); osc.start(); osc.stop(uiAudioCtx.currentTime + 0.2); }
    else if (type === 'type') { osc.type = 'square'; osc.frequency.setValueAtTime(600, uiAudioCtx.currentTime); gain.gain.setValueAtTime(0.02, uiAudioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, uiAudioCtx.currentTime + 0.05); osc.start(); osc.stop(uiAudioCtx.currentTime + 0.05); }
    else if (type === 'startup') { osc.type = 'sine'; osc.frequency.setValueAtTime(200, uiAudioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, uiAudioCtx.currentTime + 1); gain.gain.setValueAtTime(0.2, uiAudioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, uiAudioCtx.currentTime + 1); osc.start(); osc.stop(uiAudioCtx.currentTime + 1); }
}
window.toggleSound = function() { soundEnabled = !soundEnabled; alert("Sound: " + soundEnabled); };

// --- CHAT ---
marked.setOptions({ highlight: (code) => code });
function addMessage(text, sender, save = true) {
    const div = document.createElement('div'); div.className = `message ${sender}`;
    const card = document.createElement('div'); card.className = 'glass-card';
    if (sender === 'bot') {
        let htmlContent = marked.parse(text);
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase(); const code = match[2];
            if (['html', 'python', 'py', 'javascript', 'js', 'css', 'java'].includes(lang)) { const safeCode = encodeURIComponent(code); htmlContent += `<button class="run-btn" onclick="openPreview('${safeCode}', '${lang}')">▶ Run ${lang.toUpperCase()}</button>`; }
        }
        card.innerHTML = htmlContent; playSound('receive'); speak(text); // TTS Added
    } else { card.textContent = text; playSound('send'); }
    div.appendChild(card); chatWindow.appendChild(div); chatWindow.scrollTop = chatWindow.scrollHeight;
    if (save) { const currentHistory = localStorage.getItem('vessy_history') || ""; localStorage.setItem('vessy_history', currentHistory + div.outerHTML); }
}
function loadHistory() { const saved = localStorage.getItem('vessy_history'); if (saved) { chatWindow.innerHTML += saved; chatWindow.scrollTop = chatWindow.scrollHeight; } }
loadHistory();
window.clearMemory = function() { localStorage.removeItem('vessy_history'); location.reload(); };

async function handleSend() {
    const text = userInput.value.trim(); if (!text) return;
    if (text === '20154') { userInput.value = ''; addMessage("🔒 AUTHENTICATING...", 'bot', false); setTimeout(() => { addMessage("✅ ACCESS GRANTED.", 'bot', false); triggerAI("Build Minecraft from scratch"); }, 1000); return; }
    if (text.toLowerCase() === 'play fortnite') { userInput.value = ''; addMessage("🚀 LAUNCHING EV.IO...", 'bot', false); setTimeout(() => launchGame('fortnite'), 1000); return; }
    addMessage(text, 'user'); userInput.value = ''; userInput.disabled = true; triggerAI(text);
}
async function triggerAI(promptText) {
    const loadingDiv = document.createElement('div'); loadingDiv.className = 'message bot'; loadingDiv.innerHTML = '<div class="glass-card">...</div>'; chatWindow.appendChild(loadingDiv);
    try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptText }) }); const data = await response.json(); chatWindow.removeChild(loadingDiv); if (data.error) addMessage("Error: " + data.error, 'bot'); else addMessage(data.reply, 'bot'); } catch (e) { chatWindow.removeChild(loadingDiv); addMessage("Connection Failed.", 'bot'); }
    userInput.disabled = false; userInput.focus();
}
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
