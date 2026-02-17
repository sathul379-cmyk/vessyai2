document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const bgLayer = document.getElementById('bgLayer');
    const appGrid = document.getElementById('appGrid');
    const appModal = document.getElementById('appModal');
    const appContent = document.getElementById('appContent');
    const appTitle = document.getElementById('appTitle');

    let currentUsername = null;
    let currentEmail = null;
    let conversationHistory = [];
    let sessionToken = null;

    // ===================================================
    //  COOKIE SYSTEM
    // ===================================================
    function setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax;Secure`;
    }

    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }

    function setAllCookies(session) {
        const consent = getCookie('vessy_cookie_consent');
        if (consent === 'all') {
            setCookie('vessy_username', session.username, 30);
            setCookie('vessy_token', session.token, 30);
            setCookie('vessy_email', session.email || '', 30);
            setCookie('vessy_last_visit', new Date().toISOString(), 30);
            setCookie('vessy_theme', getCookie('vessy_theme') || 'default', 30);
        } else {
            // Essential only
            setCookie('vessy_username', session.username, 1);
            setCookie('vessy_token', session.token, 1);
        }
    }

    function clearAllCookies() {
        ['vessy_username', 'vessy_token', 'vessy_email', 'vessy_last_visit', 'vessy_theme'].forEach(deleteCookie);
    }

    // Cookie consent banner
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieConsent = getCookie('vessy_cookie_consent');

    if (!cookieConsent && !localStorage.getItem('vessy_cookie_consent')) {
        // Show after a tiny delay
        setTimeout(() => cookieBanner.classList.remove('hidden'), 1000);
    }

    document.getElementById('cookieAcceptAll').addEventListener('click', () => {
        setCookie('vessy_cookie_consent', 'all', 365);
        localStorage.setItem('vessy_cookie_consent', 'all');
        cookieBanner.classList.add('hidden');
        updateCookieStatusUI();
    });

    document.getElementById('cookieEssentialOnly').addEventListener('click', () => {
        setCookie('vessy_cookie_consent', 'essential', 365);
        localStorage.setItem('vessy_cookie_consent', 'essential');
        cookieBanner.classList.add('hidden');
        updateCookieStatusUI();
    });

    window.resetCookieConsent = function () {
        deleteCookie('vessy_cookie_consent');
        localStorage.removeItem('vessy_cookie_consent');
        cookieBanner.classList.remove('hidden');
        document.getElementById('settingsModal').classList.add('hidden');
    };

    function updateCookieStatusUI() {
        const status = getCookie('vessy_cookie_consent') || localStorage.getItem('vessy_cookie_consent');
        const el = document.getElementById('cookieStatusText');
        if (el) {
            if (status === 'all') { el.textContent = 'All Accepted'; el.style.color = 'var(--success)'; }
            else if (status === 'essential') { el.textContent = 'Essential Only'; el.style.color = 'var(--warning)'; }
            else { el.textContent = 'Not set'; el.style.color = '#666'; }
        }
    }


    // ===================================================
    //  TERMS & CONDITIONS
    // ===================================================
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const termsDeclineBtn = document.getElementById('termsDeclineBtn');
    const authOverlay = document.getElementById('authOverlay');

    function checkExistingSession() {
        // Check localStorage first, then cookies
        let session = null;
        const savedLS = localStorage.getItem('vessy_session');
        if (savedLS) {
            try { session = JSON.parse(savedLS); } catch { localStorage.removeItem('vessy_session'); }
        }

        // Also check cookies
        if (!session) {
            const cookieUser = getCookie('vessy_username');
            const cookieToken = getCookie('vessy_token');
            if (cookieUser && cookieToken) {
                session = { username: cookieUser, token: cookieToken, email: getCookie('vessy_email') || '' };
            }
        }

        if (session && session.username && session.token) {
            currentUsername = session.username;
            currentEmail = session.email || '';
            sessionToken = session.token;
            termsOverlay.classList.add('hidden');
            authOverlay.classList.add('hidden');
            onUserReady();
            return true;
        }
        return false;
    }

    if (localStorage.getItem('vessy_terms_accepted') === 'true') {
        if (!checkExistingSession()) {
            termsOverlay.classList.add('hidden');
            authOverlay.classList.remove('hidden');
        }
    }

    termsCheckbox.addEventListener('change', () => { termsAcceptBtn.disabled = !termsCheckbox.checked; });

    termsAcceptBtn.addEventListener('click', () => {
        if (!termsCheckbox.checked) return;
        localStorage.setItem('vessy_terms_accepted', 'true');
        localStorage.setItem('vessy_terms_date', new Date().toISOString());
        closeOverlay(termsOverlay, () => {
            if (!checkExistingSession()) authOverlay.classList.remove('hidden');
        });
    });

    termsDeclineBtn.addEventListener('click', () => {
        showToastInOverlay(termsOverlay, 'You must accept the terms to use Vessy OS.');
    });

    window.showTermsAgain = function () {
        document.getElementById('settingsModal').classList.add('hidden');
        termsOverlay.classList.remove('hidden');
        termsOverlay.classList.remove('closing');
        termsCheckbox.checked = true;
        termsAcceptBtn.disabled = false;
    };

    function closeOverlay(overlay, cb) {
        overlay.classList.add('closing');
        setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('closing'); if (cb) cb(); }, 450);
    }

    function showToastInOverlay(overlay, msg) {
        const existing = overlay.querySelector('.overlay-toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'overlay-toast';
        el.style.cssText = 'text-align:center;padding:8px;color:#ff0055;font-size:11px;margin-top:6px;';
        el.textContent = msg;
        (overlay.querySelector('.overlay-footer') || overlay.querySelector('.auth-body')).appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }


    // ===================================================
    //  AUTH SYSTEM (FIXED — works without KV too)
    // ===================================================
    window.switchAuth = function (view) {
        document.getElementById('loginView').classList.toggle('hidden', view !== 'login');
        document.getElementById('signupView').classList.toggle('hidden', view !== 'signup');
        document.getElementById('loginError').textContent = '';
        document.getElementById('signupError').textContent = '';
    };

    window.togglePw = function (id, btn) {
        const input = document.getElementById(id);
        const icon = btn.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.className = 'fa-solid fa-eye-slash'; }
        else { input.type = 'password'; icon.className = 'fa-solid fa-eye'; }
    };

    // Password strength
    document.getElementById('signupPassword').addEventListener('input', function () {
        const pw = this.value, fill = document.getElementById('strengthFill'), txt = document.getElementById('strengthText');
        let s = 0;
        if (pw.length >= 6) s++; if (pw.length >= 10) s++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
        if (/\d/.test(pw)) s++; if (/[^a-zA-Z0-9]/.test(pw)) s++;
        fill.className = 'strength-fill';
        if (pw.length === 0) { txt.textContent = ''; return; }
        if (s <= 1) { fill.classList.add('weak'); txt.textContent = 'Weak'; }
        else if (s === 2) { fill.classList.add('fair'); txt.textContent = 'Fair'; }
        else if (s === 3) { fill.classList.add('good'); txt.textContent = 'Good'; }
        else { fill.classList.add('strong'); txt.textContent = 'Strong'; }
    });

    // Username check
    let unTimer = null;
    document.getElementById('signupUsername').addEventListener('input', function () {
        const val = this.value.trim(), st = document.getElementById('signupUsernameStatus');
        clearTimeout(unTimer);
        if (val.length < 3) { st.textContent = val.length > 0 ? 'Min 3 characters' : ''; st.className = 'field-status' + (val.length > 0 ? ' error' : ''); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(val)) { st.textContent = 'Letters, numbers, underscores only'; st.className = 'field-status error'; return; }
        st.textContent = 'Checking...'; st.className = 'field-status checking';
        unTimer = setTimeout(async () => {
            try {
                const res = await fetch('/api/check-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: val }) });
                const data = await res.json();
                st.textContent = data.available ? '✓ Available' : '✕ Already taken';
                st.className = 'field-status ' + (data.available ? 'success' : 'error');
            } catch { st.textContent = '⚡ Will verify on submit'; st.className = 'field-status checking'; }
        }, 500);
    });

    // LOGIN
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', doLogin);
    document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('loginUsername').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginPassword').focus(); });

    async function doLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const err = document.getElementById('loginError');
        const remember = document.getElementById('rememberMe').checked;
        err.textContent = '';
        if (!username || !password) { err.textContent = 'Please fill in all fields.'; return; }

        loginBtn.classList.add('loading'); loginBtn.disabled = true;
        try {
            const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await res.json();
            if (data.success) {
                currentUsername = data.username; currentEmail = data.email || ''; sessionToken = data.token;
                const session = { username: data.username, email: data.email || '', token: data.token };
                if (remember) localStorage.setItem('vessy_session', JSON.stringify(session));
                setAllCookies(session);
                closeOverlay(authOverlay, onUserReady);
            } else {
                err.textContent = data.error || 'Invalid username or password.';
            }
        } catch {
            err.textContent = 'Connection failed. Check your network.';
        }
        loginBtn.classList.remove('loading'); loginBtn.disabled = false;
    }

    // SIGNUP
    const signupBtn = document.getElementById('signupBtn');
    signupBtn.addEventListener('click', doSignup);
    document.getElementById('signupConfirm').addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });

    async function doSignup() {
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        const err = document.getElementById('signupError');
        err.textContent = '';

        if (!username || !password) { err.textContent = 'Username and password required.'; return; }
        if (username.length < 3 || username.length > 24) { err.textContent = 'Username: 3-24 characters.'; return; }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) { err.textContent = 'Letters, numbers, underscores only.'; return; }
        if (password.length < 6) { err.textContent = 'Password: min 6 characters.'; return; }
        if (password !== confirm) { err.textContent = 'Passwords do not match.'; return; }

        signupBtn.classList.add('loading'); signupBtn.disabled = true;
        try {
            const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
            const data = await res.json();
            if (data.success) {
                currentUsername = data.username; currentEmail = email; sessionToken = data.token;
                const session = { username: data.username, email, token: data.token };
                localStorage.setItem('vessy_session', JSON.stringify(session));
                setAllCookies(session);
                closeOverlay(authOverlay, onUserReady);
            } else {
                err.textContent = data.error || 'Signup failed.';
            }
        } catch {
            err.textContent = 'Connection failed. Check your network.';
        }
        signupBtn.classList.remove('loading'); signupBtn.disabled = false;
    }

    // LOGOUT
    window.logoutUser = function () {
        localStorage.removeItem('vessy_session');
        clearAllCookies();
        currentUsername = null; sessionToken = null; conversationHistory = [];
        chatWindow.innerHTML = '';
        document.getElementById('settingsModal').classList.add('hidden');
        authOverlay.classList.remove('hidden'); authOverlay.classList.remove('closing');
        switchAuth('login');
    };


    // ===================================================
    //  USER READY
    // ===================================================
    function onUserReady() {
        document.getElementById('userBadgeName').textContent = currentUsername;
        document.getElementById('settingsUsername').textContent = currentUsername;
        document.getElementById('settingsEmail').textContent = currentEmail || 'No email';
        userInput.placeholder = `Message as @${currentUsername}...`;
        updateCookieStatusUI();
        setCookie('vessy_last_visit', new Date().toISOString(), 30);
        loadChatHistory();
    }

    async function loadChatHistory() {
        try {
            const res = await fetch('/api/chat-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUsername, token: sessionToken }) });
            const data = await res.json();
            if (data.history && data.history.length > 0) {
                conversationHistory = data.history;
                data.history.slice(-8).forEach(msg => {
                    if (msg.role === 'user') addMessage(msg.content, 'user');
                    else if (msg.role === 'assistant') addMessage(msg.content, 'bot');
                });
            }
        } catch { /* offline */ }
    }


    // ===================================================
    //  CLOCK
    // ===================================================
    const updateClock = () => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    updateClock(); setInterval(updateClock, 1000);


    // ===================================================
    //  UI CONTROLS
    // ===================================================
    document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); appGrid.classList.toggle('hidden'); });
    document.getElementById('settingsBtn').addEventListener('click', () => { document.getElementById('settingsModal').classList.toggle('hidden'); updateCookieStatusUI(); });
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp = () => { appModal.classList.add('hidden'); appContent.innerHTML = ''; };
    document.addEventListener('click', e => { if (!e.target.closest('.app-grid') && !e.target.closest('#menuBtn')) appGrid.classList.add('hidden'); });
    window.setBg = t => { bgLayer.className = 'bg-' + t; bgLayer.style.backgroundImage = ''; setCookie('vessy_theme', t, 30); };
    document.getElementById('customBgInput').addEventListener('change', e => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => { bgLayer.className = ''; bgLayer.style.cssText = `background-image:url(${ev.target.result});background-size:cover;background-position:center;`; }; r.readAsDataURL(f); } });

    // Restore theme from cookie
    const savedTheme = getCookie('vessy_theme');
    if (savedTheme && savedTheme !== 'default') { bgLayer.className = 'bg-' + savedTheme; }


    // ===================================================
    //  APP LAUNCHER
    // ===================================================
    window.launchApp = function (app) {
        appGrid.classList.add('hidden'); appModal.classList.remove('hidden'); appContent.innerHTML = '';
        if (app === 'paint') initPaint();
        else if (app === 'snake') initSnake();
        else if (app === 'calc') initCalc();
        else if (app === 'minecraft') initMinecraft();
        else if (app === 'chatlog') initChatLog();
        else if (app === 'browser') { appTitle.innerText = 'Browser'; appContent.innerHTML = '<iframe src="https://www.wikipedia.org"></iframe>'; }
    };


    // ===================================================
    //  CHAT LOG VIEWER APP
    // ===================================================
    async function initChatLog() {
        appTitle.innerText = 'Chat Log';
        appContent.innerHTML = '<div class="chatlog-container"><div style="text-align:center;padding:40px;color:#555;"><span class="generating-loader">Loading your chats...</span></div></div>';

        let history = [];

        // Get from server
        try {
            const res = await fetch('/api/chat-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUsername, token: sessionToken }) });
            const data = await res.json();
            if (data.history) history = data.history;
        } catch { /* offline */ }

        // Also merge local conversation history
        if (history.length === 0 && conversationHistory.length > 0) {
            history = conversationHistory;
        }

        // Render
        const container = appContent.querySelector('.chatlog-container');

        if (history.length === 0) {
            container.innerHTML = `
                <div class="chatlog-empty">
                    <i class="fa-solid fa-message"></i>
                    <p>No saved chats yet.<br>Start a conversation and your messages will appear here.</p>
                </div>`;
            return;
        }

        const userMsgs = history.filter(m => m.role === 'user').length;
        const aiMsgs = history.filter(m => m.role === 'assistant').length;

        let html = `
            <div class="chatlog-header-bar">
                <h2><i class="fa-solid fa-clock-rotate-left"></i> Your Chat History</h2>
                <span>${history.length} messages</span>
            </div>
            <div class="chatlog-stats">
                <div class="chatlog-stat">
                    <span class="stat-number">${userMsgs}</span>
                    <span class="stat-label">Your Messages</span>
                </div>
                <div class="chatlog-stat">
                    <span class="stat-number">${aiMsgs}</span>
                    <span class="stat-label">AI Responses</span>
                </div>
                <div class="chatlog-stat">
                    <span class="stat-number">${history.length}</span>
                    <span class="stat-label">Total</span>
                </div>
            </div>
            <div class="chatlog-actions">
                <button class="chatlog-action-btn" onclick="exportChatLog()">
                    <i class="fa-solid fa-download"></i> Export as TXT
                </button>
                <button class="chatlog-action-btn" onclick="exportChatLogJSON()">
                    <i class="fa-solid fa-code"></i> Export as JSON
                </button>
                <button class="chatlog-action-btn danger" onclick="clearChatLog()">
                    <i class="fa-solid fa-trash"></i> Clear History
                </button>
            </div>
        `;

        // Show messages newest first
        const reversed = [...history].reverse();
        reversed.forEach((msg, i) => {
            const preview = msg.content.substring(0, 80).replace(/</g, '&lt;');
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
            const role = msg.role === 'user' ? 'YOU' : 'AI';
            const roleColor = msg.role === 'user' ? 'style="color:var(--accent2);background:rgba(255,0,255,0.08);"' : '';

            html += `
                <div class="chatlog-entry">
                    <div class="chatlog-entry-header" onclick="this.nextElementSibling.classList.toggle('open')">
                        <span class="entry-role" ${roleColor}>${role}</span>
                        <span class="entry-preview">${preview}...</span>
                        <span class="entry-time">${time}</span>
                    </div>
                    <div class="chatlog-entry-body">${msg.content.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Export functions
        window.exportChatLog = function () {
            let txt = `=== VESSY OS 31 CHAT LOG ===\nUser: ${currentUsername}\nExported: ${new Date().toLocaleString()}\n${'='.repeat(40)}\n\n`;
            history.forEach(msg => {
                const role = msg.role === 'user' ? currentUsername : 'Vessy AI';
                const time = msg.timestamp ? `[${new Date(msg.timestamp).toLocaleString()}]` : '';
                txt += `${time} ${role}:\n${msg.content}\n\n---\n\n`;
            });
            downloadFile(txt, `vessy-chat-${currentUsername}.txt`, 'text/plain');
        };

        window.exportChatLogJSON = function () {
            const data = { username: currentUsername, exportDate: new Date().toISOString(), messageCount: history.length, messages: history };
            downloadFile(JSON.stringify(data, null, 2), `vessy-chat-${currentUsername}.json`, 'application/json');
        };

        window.clearChatLog = async function () {
            if (!confirm('Are you sure you want to delete ALL your chat history? This cannot be undone.')) return;
            try {
                await fetch('/api/clear-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUsername, token: sessionToken }) });
            } catch { /* offline */ }
            conversationHistory = [];
            initChatLog(); // Refresh
        };
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }


    // ===================================================
    //  APPS (Calculator, Paint, Snake, Voxel)
    // ===================================================
    function initCalc() {
        appTitle.innerText = 'Calculator';
        const btns = ['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];
        let h = '<div class="calc-grid"><div class="calc-display" id="cd">0</div>';
        btns.forEach(b => { h += `<button class="calc-btn${['÷','×','−','+','='].includes(b)?' accent':''}" onclick="cp('${b}')">${b}</button>`; });
        appContent.innerHTML = h + '</div>';
        let cur='0',op=null,prev=null,rst=false;
        window.cp = v => { const d=document.getElementById('cd'); if(v==='C'){cur='0';op=null;prev=null;}else if(v==='⌫'){cur=cur.length>1?cur.slice(0,-1):'0';}else if(v==='±'){cur=String(-parseFloat(cur));}else if(v==='%'){cur=String(parseFloat(cur)/100);}else if(['+','−','×','÷'].includes(v)){prev=parseFloat(cur);op=v;rst=true;}else if(v==='='){if(prev!==null&&op){const c=parseFloat(cur);if(op==='+')cur=String(prev+c);else if(op==='−')cur=String(prev-c);else if(op==='×')cur=String(prev*c);else if(op==='÷')cur=c?String(prev/c):'Error';op=null;prev=null;}}else{if(rst){cur='';rst=false;}if(v==='.'&&cur.includes('.'))return;cur=cur==='0'&&v!=='.'?v:cur+v;}d.innerText=cur; };
    }

    function initPaint() {
        appTitle.innerText = 'Paint';
        const cols = ['#000','#fff','#ff0055','#00f2ff','#00ff00','#ffaa00','#9b59b6','#ff6600'];
        let h = '<div class="paint-toolbar">'; cols.forEach(c => h += `<div class="color-btn" style="background:${c}" onclick="spc('${c}')"></div>`);
        h += '<input type="range" min="1" max="30" value="3" id="bs" style="margin-left:auto;width:70px;"></div><canvas id="paintCanvas"></canvas>';
        appContent.innerHTML = h;
        const c=document.getElementById('paintCanvas'),ctx=c.getContext('2d'); let p=false,col='#000';
        c.width=c.parentElement.getBoundingClientRect().width; c.height=c.parentElement.getBoundingClientRect().height-44;
        window.spc = v => col=v;
        c.addEventListener('mousedown',e=>{p=true;ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY);});
        c.addEventListener('mousemove',e=>{if(!p)return;ctx.lineWidth=document.getElementById('bs').value;ctx.lineCap='round';ctx.strokeStyle=col;ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();});
        c.addEventListener('mouseup',()=>p=false); c.addEventListener('mouseleave',()=>p=false);
        c.addEventListener('touchstart',e=>{e.preventDefault();p=true;const t=e.touches[0],r=c.getBoundingClientRect();ctx.beginPath();ctx.moveTo(t.clientX-r.left,t.clientY-r.top);});
        c.addEventListener('touchmove',e=>{e.preventDefault();if(!p)return;const t=e.touches[0],r=c.getBoundingClientRect();ctx.lineWidth=document.getElementById('bs').value;ctx.lineCap='round';ctx.strokeStyle=col;ctx.lineTo(t.clientX-r.left,t.clientY-r.top);ctx.stroke();});
        c.addEventListener('touchend',()=>p=false);
    }

    function initSnake() {
        appTitle.innerText='Snake'; appContent.innerHTML='<canvas id="snakeCanvas"></canvas>';
        const c=document.getElementById('snakeCanvas'),ctx=c.getContext('2d'); c.width=400;c.height=400;
        const sz=20,cl=20,rw=20; let sn=[{x:5,y:5}],dr={x:1,y:0},fd=sp(),sc=0,lp;
        function sp(){return{x:Math.floor(Math.random()*cl),y:Math.floor(Math.random()*rw)};}
        function dw(){ctx.fillStyle='#0a0a10';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.shadowColor='#ff0055';ctx.shadowBlur=10;ctx.fillRect(fd.x*sz+2,fd.y*sz+2,sz-4,sz-4);ctx.shadowBlur=0;sn.forEach((s,i)=>{ctx.fillStyle=i===0?'#00f2ff':'#00aa88';ctx.fillRect(s.x*sz+1,s.y*sz+1,sz-2,sz-2);});ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='13px monospace';ctx.fillText('Score: '+sc,10,18);}
        function up(){const h={x:sn[0].x+dr.x,y:sn[0].y+dr.y};if(h.x<0||h.x>=cl||h.y<0||h.y>=rw||sn.some(s=>s.x===h.x&&s.y===h.y)){go();return;}sn.unshift(h);if(h.x===fd.x&&h.y===fd.y){sc+=10;fd=sp();}else sn.pop();dw();}
        function go(){clearInterval(lp);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('GAME OVER',200,190);ctx.fillStyle='#888';ctx.font='13px monospace';ctx.fillText('Score: '+sc+' • Click restart',200,220);ctx.textAlign='left';c.addEventListener('click',rs,{once:true});}
        function rs(){sn=[{x:5,y:5}];dr={x:1,y:0};fd=sp();sc=0;lp=setInterval(up,120);}
        document.addEventListener('keydown',e=>{if(e.key==='ArrowUp'&&dr.y===0)dr={x:0,y:-1};else if(e.key==='ArrowDown'&&dr.y===0)dr={x:0,y:1};else if(e.key==='ArrowLeft'&&dr.x===0)dr={x:-1,y:0};else if(e.key==='ArrowRight'&&dr.x===0)dr={x:1,y:0};});
        lp=setInterval(up,120);dw();
    }

    function initMinecraft() {
        appTitle.innerText='Voxel';
        appContent.innerHTML=`<div style="padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;"><div style="width:70px;height:70px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.2);border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;"><i class="fa-solid fa-cube" style="font-size:28px;color:#ffaa00;"></i></div><h2 style="margin-bottom:6px;font-size:18px;">VessyCraft</h2><p style="color:#555;margin-bottom:20px;font-size:12px;">3D Voxel Engine</p><button onclick="openVoxel()" style="background:linear-gradient(135deg,#ffaa00,#ff8800);color:#000;border:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-rocket"></i> Launch</button></div>`;
        window.openVoxel=()=>{const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>VessyCraft</title><style>body{margin:0;overflow:hidden;background:#000;color:#fff;font-family:monospace}#h{position:fixed;top:10px;left:10px;background:rgba(0,0,0,.7);padding:8px 12px;border-radius:8px;font-size:10px;z-index:10}#c{position:fixed;top:50%;left:50%;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}</style></head><body><div id="c"></div><div id="h"><b>VessyCraft</b><br>WASD=Move Space=Jump<br>Click=Place Shift+Click=Break</div><script type="module">import*as T from"https://unpkg.com/three@0.160.0/build/three.module.js";import{PointerLockControls as P}from"https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";const s=new T.Scene;s.background=new T.Color(8900331);s.fog=new T.Fog(8900331,20,80);const c=new T.PerspectiveCamera(75,innerWidth/innerHeight,.1,1e3),r=new T.WebGLRenderer({antialias:1});r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);s.add(new T.AmbientLight(16777215,.6));const d=new T.DirectionalLight(16777215,.8);d.position.set(50,50,50);s.add(d);const g=new T.BoxGeometry,m=[new T.MeshLambertMaterial({color:5592405}),new T.MeshLambertMaterial({color:8930099}),new T.MeshLambertMaterial({color:8947848})];const o=[];for(let x=-15;x<15;x++)for(let z=-15;z<15;z++){const v=new T.Mesh(g,m[0]);v.position.set(x,-1,z);s.add(v);o.push(v)}const ct=new P(c,document.body);document.body.onclick=()=>ct.lock();const rc=new T.Raycaster;let mi=0;document.onmousedown=e=>{if(!ct.isLocked)return;rc.setFromCamera(new T.Vector2,c);const h=rc.intersectObjects(o);if(h.length){if(e.shiftKey){const b=h[0].object;b.position.y!==-1&&(s.remove(b),o.splice(o.indexOf(b),1))}else{const v=new T.Mesh(g,m[mi%3]);v.position.copy(h[0].point).add(h[0].face.normal).round();s.add(v);o.push(v)}}};document.onkeydown=e=>{"123".includes(e.key)&&(mi=+e.key-1)};const vel=new T.Vector3;let F=0,B=0,L=0,R=0,J=0;document.addEventListener("keydown",e=>{e.code=="KeyW"&&(F=1);e.code=="KeyS"&&(B=1);e.code=="KeyA"&&(L=1);e.code=="KeyD"&&(R=1);e.code=="Space"&&J&&(vel.y=15,J=0)});document.addEventListener("keyup",e=>{e.code=="KeyW"&&(F=0);e.code=="KeyS"&&(B=0);e.code=="KeyA"&&(L=0);e.code=="KeyD"&&(R=0)});let pt=performance.now();!function a(){requestAnimationFrame(a);const t=performance.now(),dt=(t-pt)/1e3;pt=t;if(ct.isLocked){vel.x-=vel.x*10*dt;vel.z-=vel.z*10*dt;vel.y-=40*dt;const dir=new T.Vector3(R-L,0,F-B).normalize();(F||B)&&(vel.z-=dir.z*80*dt);(L||R)&&(vel.x-=dir.x*80*dt);ct.moveRight(-vel.x*dt);ct.moveForward(-vel.z*dt);c.position.y+=vel.y*dt;c.position.y<2&&(vel.y=0,c.position.y=2,J=1)}r.render(s,c)}();onresize=()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight)}<\/script></body></html>`);w.document.close();};
    }


    // ===================================================
    //  IMPROVED IMAGE GENERATION
    // ===================================================
    function generateImage(prompt) {
        const id = Date.now(); const div = document.createElement('div'); div.className = 'message bot';
        div.innerHTML = `<div class="bot-avatar"><i class="fa-solid fa-palette"></i></div><div class="glass-card"><p class="generating-loader" id="is-${id}">🎨 <strong>Generating:</strong> "${prompt}"</p><div class="img-skeleton" id="isk-${id}"><span>Loading...</span></div></div>`;
        chatWindow.appendChild(div); chatWindow.scrollTop = chatWindow.scrollHeight;
        const seed = Math.floor(Math.random() * 999999);
        const urls = [
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&seed=${seed+1}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=turbo&nologo=true&seed=${seed+2}`
        ];
        let done=false, attempt=0;
        function tryNext(){
            if(done||attempt>=urls.length){if(!done){const s=document.getElementById(`is-${id}`),k=document.getElementById(`isk-${id}`);if(s)s.innerHTML='⚠️ <strong>Timed out.</strong> Try simpler prompt.';if(k)k.remove();}return;}
            const img=new Image();img.className='generated-media';
            const to=setTimeout(()=>{if(!done){attempt++;const s=document.getElementById(`is-${id}`);if(s)s.innerHTML=`🎨 <strong>Retrying</strong> (${attempt+1}/3)...`;tryNext();}},15000);
            img.onload=()=>{done=true;clearTimeout(to);const s=document.getElementById(`is-${id}`),k=document.getElementById(`isk-${id}`);if(s)s.innerHTML=`🎨 <strong>Generated:</strong> "${prompt}"`;if(k)k.remove();s?.parentElement?.appendChild(img);img.scrollIntoView({behavior:'smooth'});};
            img.onerror=()=>{clearTimeout(to);if(!done){attempt++;tryNext();}};
            img.src=urls[attempt];
        }
        tryNext();
    }


    // ===================================================
    //  MAIN CHAT
    // ===================================================
    async function handleSend() {
        const text = userInput.value.trim(); if (!text) return;

        if (/^(draw|generate image|make an image|create image|imagine)\b/i.test(text)) {
            addMessage(text,'user'); userInput.value='';
            const prompt = text.replace(/^(draw|generate image|make an image|create image|imagine)\s*(of|a|an|the)?\s*/i,'').trim()||text;
            generateImage(prompt); saveChatLog(text,'[Image: '+prompt+']'); return;
        }
        if (/^(video|make a video|animate)\b/i.test(text)) {
            addMessage(text,'user'); userInput.value='';
            const prompt = text.replace(/^(video|make a video|animate)\s*(of|a|an|the)?\s*/i,'').trim()||text;
            const seed = Math.floor(Math.random()*99999);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
            const div = document.createElement('div'); div.className='message bot';
            div.innerHTML=`<div class="bot-avatar"><i class="fa-solid fa-video"></i></div><div class="glass-card"><p class="generating-loader">🎥 <strong>Rendering:</strong> "${prompt}"...</p><img src="${url}" class="generated-media" onload="this.previousElementSibling.innerText='🎥 Complete.';this.scrollIntoView({behavior:'smooth'})" onerror="this.previousElementSibling.innerHTML='⚠️ <strong>Failed.</strong> Try different prompt.'"></div>`;
            chatWindow.appendChild(div); chatWindow.scrollTop=chatWindow.scrollHeight;
            saveChatLog(text,'[Video: '+prompt+']'); return;
        }

        addMessage(text,'user'); userInput.value=''; userInput.disabled=true;
        conversationHistory.push({role:'user',content:text});
        await triggerAI(text);
    }

    function addMessage(text, sender) {
        const div = document.createElement('div'); div.className=`message ${sender}`;
        div.innerHTML = sender==='bot'
            ? `<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card">${marked.parse(text)}</div>`
            : `<div class="glass-card">${marked.parse(text)}</div>`;
        chatWindow.appendChild(div); chatWindow.scrollTop=chatWindow.scrollHeight;
    }

    async function triggerAI(promptText) {
        const ld=document.createElement('div'); ld.className='message bot';
        ld.innerHTML=`<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card"><span class="generating-loader">Thinking...</span></div>`;
        chatWindow.appendChild(ld);
        try {
            const res = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:promptText,username:currentUsername,history:conversationHistory.slice(-20),token:sessionToken})});
            const data = await res.json(); chatWindow.removeChild(ld);
            if(data.error) addMessage('⚠️ '+data.error,'bot');
            else { addMessage(data.reply,'bot'); conversationHistory.push({role:'assistant',content:data.reply}); saveChatLog(promptText,data.reply); }
        } catch { chatWindow.removeChild(ld); addMessage('❌ Connection failed.','bot'); }
        userInput.disabled=false; userInput.focus();
    }

    async function saveChatLog(userMsg, aiMsg) {
        try { await fetch('/api/save-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUsername,userMessage:userMsg,aiMessage:aiMsg,timestamp:new Date().toISOString(),token:sessionToken})}); } catch { /* silent */ }
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
});
