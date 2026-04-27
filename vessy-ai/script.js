document.addEventListener('DOMContentLoaded', () => {
    // 1. FIX: Terms Checkbox Logic (Runs Immediately)
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const authOverlay = document.getElementById('authOverlay');
    const sendBtn = document.getElementById('sendBtn');
    const restrictionStorageKey = 'vessy_restriction_notice';

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
    let restrictionTriggered = false;
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

    const restrictionInterval = setInterval(() => {
        if (currentUsername) checkRestrictionStatus(true);
    }, 30000);

    consumeStoredRestrictionNotice();

    sendBtn.addEventListener('click', handleSend);
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
            const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u, password:p}) });
            const d = await r.json();
            if(d.banned || d.restricted) {
                showRestrictionScreen(d);
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
        checkRestrictionStatus(Boolean(readStoredRestrictionNotice()));
    }
    
    window.logoutUser = () => { localStorage.removeItem('vessy_session'); location.reload(); };
    window.launchApp = (a) => { if(a==='browser') { document.getElementById('appModal').classList.remove('hidden'); document.getElementById('appContent').innerHTML='<iframe src="https://www.wikipedia.org"></iframe>'; document.getElementById('appTitle').innerText='Browser'; }};
    window.closeApp = () => document.getElementById('appModal').classList.add('hidden');
    document.getElementById('menuBtn').addEventListener('click', ()=>document.getElementById('appGrid').classList.toggle('hidden'));
    document.getElementById('settingsBtn').addEventListener('click', ()=>document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.setBg = (t) => document.getElementById('bgLayer').className = 'bg-'+t;

    function consumeStoredRestrictionNotice() {
        const stored = readStoredRestrictionNotice();
        if (stored && localStorage.getItem('vessy_session')) {
            showRestrictionScreen(stored);
        }
    }

    function readStoredRestrictionNotice() {
        try {
            return JSON.parse(localStorage.getItem(restrictionStorageKey) || 'null');
        } catch {
            return null;
        }
    }

    async function checkRestrictionStatus(skipReload) {
        if (!currentUsername) return;
        try {
            const r = await fetch('/api/ban-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-status', username: currentUsername })
            });
            const d = await r.json();
            if (d.restricted) {
                localStorage.setItem(restrictionStorageKey, JSON.stringify(d));
                if (!skipReload && !restrictionTriggered) {
                    restrictionTriggered = true;
                    location.reload();
                    return;
                }
                showRestrictionScreen(d);
            } else {
                localStorage.removeItem(restrictionStorageKey);
                clearRestrictionScreen();
            }
        } catch {}
    }

    function clearRestrictionScreen() {
        const existing = document.getElementById('banScreen');
        if (existing) existing.remove();
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.placeholder = 'Ask Vessy OS...';
    }

    function showRestrictionScreen(d) {
        let existing = document.getElementById('banScreen');
        if (existing) existing.remove();

        const title = getRestrictionTitle(d);
        const reason = escHtml(d.reason || 'Classified');
        const timeLeft = escHtml(d.timeLeft || 'Unknown time');
        const typeLabel = d.type === 'ip' ? 'Your IP address has been restricted' : 'Your account has been restricted';
        const accent = d.kind === 'kicked' ? '#ffaa00' : '#ff0055';
        const border = d.kind === 'kicked' ? 'rgba(255,170,0,.2)' : 'rgba(255,0,85,.2)';
        const boxBg = d.kind === 'kicked' ? 'rgba(255,170,0,.05)' : 'rgba(255,0,85,.04)';
        const boxBorder = d.kind === 'kicked' ? 'rgba(255,170,0,.16)' : 'rgba(255,0,85,.1)';

        userInput.disabled = true;
        sendBtn.disabled = true;
        userInput.placeholder = title;

        const overlay = document.createElement('div');
        overlay.id = 'banScreen';
        overlay.className = 'overlay-screen';
        overlay.innerHTML = `
            <div class="overlay-backdrop"></div>
            <div class="overlay-modal" style="max-width:440px;text-align:center;border-color:${border}">
                <div class="overlay-glow"></div>
                <div class="overlay-header">
                    <div class="overlay-icon" style="background:${boxBg};border-color:${border};color:${accent}">
                        <i class="fa-solid ${d.kind === 'kicked' ? 'fa-arrow-right-from-bracket' : 'fa-ban'}"></i>
                    </div>
                    <h1>${title}</h1>
                    <p class="overlay-subtitle">${typeLabel}</p>
                </div>
                <div class="overlay-body" style="text-align:center">
                    <div style="background:${boxBg};border:1px solid ${boxBorder};border-radius:12px;padding:16px;margin-bottom:16px">
                        <div style="font-size:16px;color:${accent};font-weight:700;line-height:1.5">You have been ${escHtml(d.kind || 'banned')}.</div>
                        <div style="font-size:12px;color:#999;margin-top:10px">Because: <span style="color:#ddd;font-weight:600">${reason}</span></div>
                        <div style="font-size:12px;color:#999;margin-top:8px">For: <span style="color:${accent};font-weight:700">${timeLeft}</span></div>
                        <div style="font-size:9px;color:#444;margin-top:10px">${typeLabel}</div>
                    </div>
                </div>
                <div class="overlay-footer">
                    <button class="ghost-btn" onclick="location.reload()">Reload</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    function getRestrictionTitle(data) {
        if (data.kind === 'kicked') return 'You have been kicked';
        if (data.kind === 'temp banned') return 'You have been temp banned';
        return 'You have been banned';
    }

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
});
