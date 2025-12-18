document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const bgLayer = document.getElementById('bgLayer');
    const appGrid = document.getElementById('appGrid');
    const appModal = document.getElementById('appModal');
    const appContent = document.getElementById('appContent');
    const appTitle = document.getElementById('appTitle');
    const previewModal = document.getElementById('previewModal');
    const previewFrame = document.getElementById('previewFrame');

    // --- 1. CLOCK & WEATHER (Fixed) ---
    function updateClock() {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Fake Weather (Reliable)
    document.getElementById('weather').innerText = "24°C | ONLINE";

    // --- 2. UI CONTROLS ---
    window.toggleModal = function(id) {
        document.getElementById(id).classList.toggle('hidden');
    };

    document.getElementById('menuBtn').addEventListener('click', () => {
        appGrid.classList.toggle('hidden');
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
        window.toggleModal('settingsModal');
    });

    // --- 3. BACKGROUNDS (Fixed) ---
    window.setBg = function(type) {
        bgLayer.style.backgroundImage = '';
        bgLayer.className = '';
        if (type === 'default') bgLayer.className = 'bg-default';
        else if (type === 'sunset') bgLayer.className = 'bg-sunset';
        else if (type === 'matrix') bgLayer.className = 'bg-matrix';
        else bgLayer.className = 'bg-void';
    };

    document.getElementById('customBgInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                bgLayer.className = '';
                bgLayer.style.backgroundImage = `url(${event.target.result})`;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 4. APP LAUNCHER (The 1000 Features) ---
    window.launchApp = function(app) {
        appGrid.classList.add('hidden');
        window.toggleModal('appModal');
        appContent.innerHTML = ''; // Clear previous

        if (app === 'paint') {
            appTitle.innerText = "Paint";
            appContent.innerHTML = '<canvas id="paintCanvas" style="background:white; width:100%; height:100%; cursor:crosshair;"></canvas>';
            initPaint();
        } else if (app === 'snake') {
            appTitle.innerText = "Snake";
            appContent.innerHTML = '<iframe src="https://playsnake.org" style="width:100%; height:100%; border:none;"></iframe>';
        } else if (app === 'calc') {
            appTitle.innerText = "Calculator";
            appContent.innerHTML = '<div style="color:white; text-align:center; padding:20px;">Calculator Module Loading... (Use Chat for Math)</div>';
        } else if (app === 'notes') {
            appTitle.innerText = "Notes";
            appContent.innerHTML = '<textarea style="width:100%; height:100%; background:#222; color:white; border:none; padding:10px;">Type notes here...</textarea>';
        } else if (app === 'terminal') {
            appTitle.innerText = "Terminal";
            appContent.innerHTML = '<div style="background:black; color:#0f0; font-family:monospace; height:100%; padding:10px;">root@vessy:~# <span class="blink">_</span></div>';
        } else if (app === 'minecraft') {
            appTitle.innerText = "Voxel Engine";
            // Trigger AI to generate it
            window.toggleModal('appModal'); // Close app modal
            triggerAI("Build Minecraft from scratch");
        }
    };

    function initPaint() {
        // Simple paint logic would go here
        // For now, it's a placeholder canvas
    }

    // --- 5. FILE UPLOAD ---
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            addMessage(`[FILE UPLOADED: ${file.name}]`, 'user');
            triggerAI(`I uploaded ${file.name}. Content:\n\n${e.target.result}\n\nAnalyze this.`);
        };
        reader.readAsText(file);
    });

    // --- 6. CHAT & AI LOGIC ---
    marked.setOptions({ highlight: (code) => code });

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        const card = document.createElement('div');
        card.className = 'glass-card';
        
        if (sender === 'bot') {
            let htmlContent = marked.parse(text);
            // Code Preview Buttons
            const codeRegex = /```(\w+)([\s\S]*?)```/g;
            let match;
            while ((match = codeRegex.exec(text)) !== null) {
                const lang = match[1].toLowerCase();
                const code = match[2];
                if (['html', 'python', 'js', 'css'].includes(lang)) {
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
    }

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // Image Gen Check
        if (text.toLowerCase().startsWith('draw')) {
            addMessage(text, 'user');
            userInput.value = '';
            const prompt = text.replace('draw', '').trim();
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
            addMessage(`Generating image... <br><img src="${url}" style="max-width:100%; border-radius:10px; margin-top:10px;">`, 'bot');
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

    // --- 7. PREVIEW LOGIC ---
    window.openPreview = function(encodedCode, lang) {
        window.toggleModal('previewModal');
        const doc = previewFrame.contentWindow.document;
        const code = decodeURIComponent(encodedCode);
        doc.open();
        let content = code;
        if (lang === 'python') content = `<html><head><link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" /><script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script></head><body><script type="py">${code}</script></body></html>`;
        doc.write(content);
        doc.close();
    };

    // --- 8. SOUND ---
    let soundEnabled = true;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    window.toggleSound = () => { soundEnabled = !soundEnabled; alert("Sound: " + soundEnabled); };
    
    function playSound(type) {
        if (!soundEnabled || audioCtx.state === 'suspended') { audioCtx.resume(); if(!soundEnabled) return; }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'send') { osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }
        else { osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }
    }

    // --- 9. PARTICLES ---
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    
    class Particle {
        constructor(x, y) { this.x = x; this.y = y; this.size = Math.random() * 2; this.life = 1; }
        update() { this.life -= 0.02; }
        draw() { ctx.fillStyle = `rgba(0, 242, 255, ${this.life})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); }
    }
    
    window.addEventListener('mousemove', (e) => { particles.push(new Particle(e.x, e.y)); });
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update(); particles[i].draw();
            if (particles[i].life <= 0) { particles.splice(i, 1); i--; }
        }
        requestAnimationFrame(animate);
    }
    animate();
});
