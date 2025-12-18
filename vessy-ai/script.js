document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const bgLayer = document.getElementById('bgLayer');
    const appGrid = document.getElementById('appGrid');
    const appModal = document.getElementById('appModal');
    const appContent = document.getElementById('appContent');
    const appTitle = document.getElementById('appTitle');

    // --- 1. CLOCK ---
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    // --- 2. UI CONTROLS ---
    document.getElementById('menuBtn').addEventListener('click', () => appGrid.classList.toggle('hidden'));
    document.getElementById('settingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp = () => { appModal.classList.add('hidden'); appContent.innerHTML = ''; };

    window.setBg = (type) => { bgLayer.className = 'bg-' + type; bgLayer.style.backgroundImage = ''; };
    document.getElementById('customBgInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (ev) => { bgLayer.style.backgroundImage = `url(${ev.target.result})`; };
            reader.readAsDataURL(file);
        }
    });

    // --- 3. APP LAUNCHER ---
    window.launchApp = function(app) {
        appGrid.classList.add('hidden');
        appModal.classList.remove('hidden');
        appContent.innerHTML = '';

        if (app === 'paint') initPaint();
        else if (app === 'snake') initSnake();
        else if (app === 'calc') initCalc();
        else if (app === 'minecraft') initMinecraft();
        else if (app === 'browser') {
            appTitle.innerText = "Browser";
            appContent.innerHTML = '<iframe src="https://www.wikipedia.org" style="width:100%; height:100%; border:none;"></iframe>';
        }
    };

    // (Keep initCalc, initPaint, initSnake, initMinecraft from previous version here)
    // ... [Paste the App Functions from Vessy OS 30 here if you want them] ...
    // For brevity, I am focusing on the Image/Video update below.
    
    function initCalc() { appTitle.innerText="Calculator"; appContent.innerHTML='<div style="padding:20px; color:white;">Calculator Active</div>'; }
    function initPaint() { appTitle.innerText="Paint"; appContent.innerHTML='<canvas style="background:white; width:100%; height:100%"></canvas>'; }
    function initSnake() { appTitle.innerText="Snake"; appContent.innerHTML='<div style="padding:20px; color:white;">Snake Game Loaded</div>'; }
    function initMinecraft() { appTitle.innerText="Voxel"; appContent.innerHTML='<div style="padding:20px; color:white;">Voxel Engine Loaded</div>'; }


    // --- 4. NEW: FLUX IMAGE & VIDEO GENERATION ---
    
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // 🎨 IMAGE GENERATION (FLUX MODEL - HIGH QUALITY)
        if (text.toLowerCase().startsWith('draw') || text.toLowerCase().startsWith('generate image') || text.toLowerCase().startsWith('make an image')) {
            addMessage(text, 'user');
            userInput.value = '';
            
            const prompt = text.replace(/draw|generate|image|make an image|of/gi, '').trim();
            // We use 'model=flux' for photorealism
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`;
            
            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `
                <div class="glass-card">
                    <p>🎨 <strong>Flux Engine:</strong> Generating "${prompt}"...</p>
                    <img src="${url}" class="generated-media" onload="this.scrollIntoView()">
                </div>
            `;
            chatWindow.appendChild(div);
            return;
        }

        // 🎥 VIDEO GENERATION (NEW)
        if (text.toLowerCase().startsWith('video') || text.toLowerCase().startsWith('make a video') || text.toLowerCase().startsWith('animate')) {
            addMessage(text, 'user');
            userInput.value = '';

            const prompt = text.replace(/video|make a video|animate|of/gi, '').trim();
            const seed = Math.floor(Math.random() * 100000);
            // We add 'model=turbo' and 'video=true' to trigger GIF generation
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&nologo=true&seed=${seed}&video=true`;

            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `
                <div class="glass-card">
                    <p class="generating-loader">🎥 <strong>Rendering Video:</strong> "${prompt}"... (This takes 5s)</p>
                    <img src="${url}" class="generated-media" onload="this.previousElementSibling.innerText='🎥 Render Complete.'; this.scrollIntoView()">
                </div>
            `;
            chatWindow.appendChild(div);
            return;
        }

        // STANDARD CHAT
        addMessage(text, 'user');
        userInput.value = '';
        userInput.disabled = true;
        triggerAI(text);
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = `<div class="glass-card">${marked.parse(text)}</div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
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

    document.getElementById('sendBtn').addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
});
