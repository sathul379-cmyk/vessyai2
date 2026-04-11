document.addEventListener('DOMContentLoaded', () => {
    // 1. FIX: Terms Checkbox Logic (Runs Immediately)
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const authOverlay = document.getElementById('authOverlay');

    if(termsCheckbox && termsAcceptBtn) {
        termsCheckbox.checked = false; // Reset on load
        termsAcceptBtn.disabled = true;

        termsCheckbox.addEventListener('change', function() {
            termsAcceptBtn.disabled = !this.checked;
            termsAcceptBtn.style.opacity = this.checked ? '1' : '0.3';
        });

        termsAcceptBtn.addEventListener('click', () => {
            if (!termsCheckbox.checked) return;
            localStorage.setItem('vessy_terms_accepted', 'true');
            termsOverlay.classList.add('hidden');
            if (!checkSession()) authOverlay.classList.remove('hidden');
        });
    }

    // Session Check
    let currentUsername = null, sessionToken = null;
    function checkSession() {
        try {
            const s = JSON.parse(localStorage.getItem('vessy_session'));
            if(s && s.username) {
                currentUsername = s.username; sessionToken = s.token;
                onUserReady(); return true;
            }
        } catch {}
        return false;
    }

    // Skip terms if already accepted
    if(localStorage.getItem('vessy_terms_accepted') === 'true') {
        termsOverlay.classList.add('hidden');
        if(!checkSession()) authOverlay.classList.remove('hidden');
    }

    // 2. Chat & Image Generation
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    let conversationHistory = [];

    // Kick check every 30 seconds
    const kickInterval = setInterval(async () => {
        if (!currentUsername) return;
        try {
            const r = await fetch('/api/ban-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-kick', username: currentUsername, adminPassword: 'vessy@2015' })
            });
            const d = await r.json();
            if (d.kicked) {
                addMsg(`<p style="color:#ff0055;font-weight:700"><i class="fa-solid fa-arrow-right-from-bracket"></i> You have been kicked from Vessy OS. Reason: ${escHtml(d.reason)}</p>`, 'bot');
                userInput.disabled = true;
                userInput.placeholder = 'You have been kicked.';
                clearInterval(kickInterval);
            }
        } catch {}
    }, 30000);

    document.getElementById('sendBtn').addEventListener('click', handleSend);
    userInput.addEventListener('keypress', e => { if(e.key==='Enter') handleSend(); });

    async function handleSend() {
        const text = userInput.value.trim();
        if(!text) return;

        // Image Gen
        if(/^(draw|generate image|image)/i.test(text)) {
            addMsg(text, 'user'); userInput.value = '';
            const prompt = text.replace(/^(draw|generate image|image)\s*/i, '');
            generateImage(prompt);
            return;
        }
        
        // Video Gen
        if(/^(video|animate)/i.test(text)) {
            addMsg(text, 'user'); userInput.value = '';
            const prompt = text.replace(/^(video|animate)\s*/i, '');
            generateVideo(prompt);
            return;
        }

        addMsg(text, 'user'); userInput.value = '';
        conversationHistory.push({role:'user', content:text});
        await triggerAI(text);
    }

    function generateImage(prompt) {
        const id = Date.now();
        addMsg(`<p>🎨 Generating "${prompt}"...</p><div class="img-skeleton" id="skel-${id}">Loading...</div>`, 'bot');
        const img = new Image();
        img.className = 'generated-media';
        const seed = Math.floor(Math.random()*1000000);
        img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&seed=${seed}&nologo=true`;
        img.onload = () => { document.getElementById(`skel-${id}`).replaceWith(img); saveChat(prompt, `[Image: ${prompt}]`); };
        img.onerror = () => { document.getElementById(`skel-${id}`).innerHTML = '⚠️ Failed.'; };
    }

    function generateVideo(prompt) {
        const id = Date.now();
        addMsg(`<p>🎥 Rendering "${prompt}"...</p><div class="img-skeleton" id="skel-${id}">Rendering...</div>`, 'bot');
        const img = new Image();
        img.className = 'generated-media';
        const seed = Math.floor(Math.random()*1000000);
        img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=turbo`;
        img.onload = () => { document.getElementById(`skel-${id}`).replaceWith(img); saveChat(prompt, `[Video: ${prompt}]`); };
    }

    async function triggerAI(text) {
        const id = Date.now();
        addMsg('...', 'bot', id);
        try {
            const r = await fetch('/api/chat', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ prompt: text, username: currentUsername, history: conversationHistory.slice(-10) })
            });
            const d = await r.json();
            const el = document.getElementById(`msg-${id}`);
            if(el) {
                el.innerHTML = marked.parse(d.reply || d.error);
                conversationHistory.push({role:'assistant', content:d.reply});
                saveChat(text, d.reply);
            }
        } catch { document.getElementById(`msg-${id}`).innerHTML = 'Connection failed.'; }
    }

    function addMsg(html, role, id) {
        const d = document.createElement('div'); d.className = `message ${role}`;
        d.innerHTML = `<div class="glass-card" ${id?`id="msg-${id}"`:''}>${role==='user'?html:html}</div>`;
        chatWindow.appendChild(d); chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function saveChat(u, a) {
        try { await fetch('/api/save-chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:currentUsername, userMessage:u, aiMessage:a, timestamp:new Date()}) }); } catch {}
    }

    // Login/Signup UI Logic
    window.switchAuth = v => { document.getElementById('loginView').classList.toggle('hidden', v!=='login'); document.getElementById('signupView').classList.toggle('hidden', v!=='signup'); };
    
    // API calls for Auth (Mocked locally if offline, real if online)
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ ip: 'unknown' }));
            const ip = ipRes.ip || 'unknown';
            const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p, clientIp: ip}) });
            const d = await r.json();
            if(d.banned) {
                showBanScreen(d);
                return;
            }
            if(d.success) {
                localStorage.setItem('vessy_session', JSON.stringify({username:d.username, token:d.token}));
                currentUsername = d.username; authOverlay.classList.add('hidden'); onUserReady();
            } else if(d.error) {
                document.getElementById('loginError').textContent = d.error;
            }
        } catch { document.getElementById('loginError').textContent = 'Connection Error'; }
    });

    document.getElementById('signupBtn').addEventListener('click', async () => {
        const u = document.getElementById('signupUsername').value;
        const p = document.getElementById('signupPassword').value;
        if(u.toLowerCase()==='admin') { alert('Reserved username'); return; }
        try {
            const r = await fetch('/api/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
            const d = await r.json();
            if(d.success) {
                localStorage.setItem('vessy_session', JSON.stringify({username:d.username, token:d.token}));
                currentUsername = d.username; authOverlay.classList.add('hidden'); onUserReady();
            } else alert(d.error);
        } catch { alert('Connection Error'); }
    });

    function onUserReady() { 
        document.getElementById('userBadgeName').textContent = currentUsername; 
        document.getElementById('settingsUsername').textContent = currentUsername;
    }
    
    window.logoutUser = () => { localStorage.removeItem('vessy_session'); location.reload(); };
    window.launchApp = (a) => { if(a==='browser') { document.getElementById('appModal').classList.remove('hidden'); document.getElementById('appContent').innerHTML='<iframe src="https://www.wikipedia.org"></iframe>'; document.getElementById('appTitle').innerText='Browser'; }};
    window.closeApp = () => document.getElementById('appModal').classList.add('hidden');
    document.getElementById('menuBtn').addEventListener('click', ()=>document.getElementById('appGrid').classList.toggle('hidden'));
    document.getElementById('settingsBtn').addEventListener('click', ()=>document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.setBg = (t) => document.getElementById('bgLayer').className = 'bg-'+t;

    function showBanScreen(d) {
        let existing = document.getElementById('banScreen');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'banScreen';
        overlay.className = 'overlay-screen';
        overlay.innerHTML = `
            <div class="overlay-backdrop"></div>
            <div class="overlay-modal" style="max-width:440px;text-align:center;border-color:rgba(255,0,85,.2)">
                <div class="overlay-glow"></div>
                <div class="overlay-header">
                    <div class="overlay-icon" style="background:rgba(255,0,85,.06);border-color:rgba(255,0,85,.2);color:#ff0055">
                        <i class="fa-solid fa-ban"></i>
                    </div>
                    <h1>Account Banned</h1>
                    <p class="overlay-subtitle">You are restricted from accessing Vessy OS</p>
                </div>
                <div class="overlay-body" style="text-align:center">
                    <div style="background:rgba(255,0,85,.04);border:1px solid rgba(255,0,85,.1);border-radius:12px;padding:16px;margin-bottom:16px">
                        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Reason</div>
                        <div style="font-size:14px;color:#ff6688;font-weight:600;margin-bottom:12px">${escHtml(d.reason || 'Violated community guidelines')}</div>
                        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Time Remaining</div>
                        <div style="font-size:18px;font-weight:800;color:#ff0055">${d.timeLeft || 'N/A'}</div>
                        <div style="font-size:9px;color:#444;margin-top:4px">${d.type === 'ip' ? 'Your IP address has been banned' : 'Your account has been banned'}</div>
                    </div>
                </div>
                <div class="overlay-footer">
                    <button class="ghost-btn" onclick="document.getElementById('banScreen').remove()">Close</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
});
