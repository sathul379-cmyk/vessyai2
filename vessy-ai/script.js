const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const bgLayer = document.getElementById('bgLayer');
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');
const leftDrawer = document.getElementById('leftDrawer');
const rightDrawer = document.getElementById('rightDrawer');

// --- 1. SOUND ENGINE V2 (FIXED) ---
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// FIX: Resume audio context on first click
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

function playSound(type) {
    if (!soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'send') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'receive') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}
window.toggleSound = function() { soundEnabled = !soundEnabled; alert("Sound: " + soundEnabled); };

// --- 2. IMAGE GENERATION (Pollinations) ---
function generateImage(prompt) {
    const cleanPrompt = prompt.replace(/draw|generate|image|picture|of/gi, '').trim();
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=600&nologo=true`;
    
    const div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML = `
        <div class="glass-card">
            <p>Generating visual: "${cleanPrompt}"...</p>
            <img src="${url}" class="generated-image" onload="this.scrollIntoView()">
        </div>
    `;
    chatWindow.appendChild(div);
    playSound('receive');
}

// --- 3. FILE UPLOAD ---
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // Inject file content into chat as a user message
        addMessage(`[FILE: ${file.name}]\n\n${content}`, 'user');
        // Trigger AI to analyze it
        triggerAI(`I have uploaded a file named ${file.name}. Here is the content:\n\n${content}\n\nPlease analyze this.`);
    };
    reader.readAsText(file);
});

// --- 4. WEATHER WIDGET ---
async function fetchWeather() {
    try {
        // Default to London if geo fails, or use IP based if available (simplified here)
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.50&longitude=-0.12&current_weather=true');
        const data = await res.json();
        document.getElementById('weatherTemp').innerText = data.current_weather.temperature + "°C";
        document.getElementById('weatherDesc').innerText = "WIND: " + data.current_weather.windspeed + " KM/H";
    } catch(e) {
        document.getElementById('weatherDesc').innerText = "OFFLINE";
    }
}
fetchWeather();

// --- 5. EXPORT CHAT ---
window.exportChat = function() {
    const history = localStorage.getItem('vessy_history') || "";
    // Strip HTML tags for text file
    const text = history.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vessy_log.txt';
    a.click();
};

// --- 6. STANDARD LOGIC (Particles, Drawers, etc.) ---
window.toggleLeftDrawer = function() { leftDrawer.classList.toggle('open'); };
window.toggleRightDrawer = function() { rightDrawer.classList.toggle('open'); };
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
function toggleSettings() { settingsModal.classList.toggle('hidden'); }
function setBg(type) { bgLayer.style.backgroundImage = ''; bgLayer.className = ''; if (type === 'ultra') bgLayer.className = 'bg-ultra'; else bgLayer.classList.add('bg-' + type); }
document.getElementById('customBgInput').addEventListener('change', function(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { bgLayer.className = ''; bgLayer.style.backgroundImage = `url(${event.target.result})`; }; reader.readAsDataURL(file); } });

// Particles
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

// Clock & Memory
function updateClock() { const now = new Date(); document.getElementById('clockTime').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
setInterval(updateClock, 1000); updateClock();
function loadHistory() { const saved = localStorage.getItem('vessy_history'); const savedNote = localStorage.getItem('vessy_note'); if (saved) { chatWindow.innerHTML += saved; chatWindow.scrollTop = chatWindow.scrollHeight; } if (savedNote) { document.getElementById('notepad').value = savedNote; } }
window.clearMemory = function() { localStorage.removeItem('vessy_history'); localStorage.removeItem('vessy_note'); location.reload(); };
document.getElementById('notepad').addEventListener('input', (e) => { localStorage.setItem('vessy_note', e.target.value); });
loadHistory();

// Preview
window.openPreview = function(encodedCode, lang) { previewModal.classList.remove('hidden'); const doc = previewFrame.contentWindow.document; const code = decodeURIComponent(encodedCode); doc.open(); let content = code; if (lang === 'python' || lang === 'py') content = `<html><head><link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" /><script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script><style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:20px;}</style></head><body><h3>Python Terminal</h3><script type="py" terminal>${code}</script></body></html>`; else if (lang === 'js') content = `<html><body style="background:#1e1e1e;color:#d4d4d4;font-family:monospace;padding:20px;"><h3>JS Console</h3><div id="c"></div><script>console.log=m=>{document.getElementById('c').innerHTML+='> '+m+'<br>'};try{${code}}catch(e){console.log('Error: '+e)}</script></body></html>`; else if (lang === 'css') content = `<html><head><style>body{padding:20px;background:#fff;color:#333;display:flex;flex-direction:column;gap:10px;} ${code}</style></head><body><h2>CSS Test</h2><button class="btn">Button</button><div class="card">Card Content</div><input placeholder="Input"></body></html>`; doc.write(content); doc.close(); };
window.closePreview = () => previewModal.classList.add('hidden');

// --- CHAT LOGIC ---
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
        card.innerHTML = htmlContent; playSound('receive');
    } else { card.textContent = text; playSound('send'); }
    div.appendChild(card); chatWindow.appendChild(div); chatWindow.scrollTop = chatWindow.scrollHeight;
    if (save) { const currentHistory = localStorage.getItem('vessy_history') || ""; localStorage.setItem('vessy_history', currentHistory + div.outerHTML); }
}

async function handleSend() {
    const text = userInput.value.trim(); if (!text) return;
    
    // IMAGE GENERATION CHECK
    if (text.toLowerCase().startsWith('draw') || text.toLowerCase().startsWith('generate image')) {
        addMessage(text, 'user');
        userInput.value = '';
        generateImage(text);
        return;
    }

    addMessage(text, 'user'); userInput.value = ''; userInput.disabled = true; triggerAI(text);
}

async function triggerAI(promptText) {
    const loadingDiv = document.createElement('div'); loadingDiv.className = 'message bot'; loadingDiv.innerHTML = '<div class="glass-card">...</div>'; chatWindow.appendChild(loadingDiv);
    try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: promptText }) }); const data = await response.json(); chatWindow.removeChild(loadingDiv); if (data.error) addMessage("Error: " + data.error, 'bot'); else addMessage(data.reply, 'bot'); } catch (e) { chatWindow.removeChild(loadingDiv); addMessage("Connection Failed.", 'bot'); }
    userInput.disabled = false; userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
