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
    //  FLOW: Terms → Login/Signup → Main App
    // ===================================================

    // --- TERMS ---
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const termsDeclineBtn = document.getElementById('termsDeclineBtn');
    const authOverlay = document.getElementById('authOverlay');

    function checkExistingSession() {
        const saved = localStorage.getItem('vessy_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                if (session.username && session.token) {
                    currentUsername = session.username;
                    currentEmail = session.email || '';
                    sessionToken = session.token;
                    termsOverlay.classList.add('hidden');
                    authOverlay.classList.add('hidden');
                    onUserReady();
                    return true;
                }
            } catch (e) { localStorage.removeItem('vessy_session'); }
        }
        return false;
    }

    if (localStorage.getItem('vessy_terms_accepted') === 'true') {
        if (!checkExistingSession()) {
            termsOverlay.classList.add('hidden');
            authOverlay.classList.remove('hidden');
        }
    }

    termsCheckbox.addEventListener('change', () => {
        termsAcceptBtn.disabled = !termsCheckbox.checked;
    });

    termsAcceptBtn.addEventListener('click', () => {
        if (!termsCheckbox.checked) return;
        localStorage.setItem('vessy_terms_accepted', 'true');
        localStorage.setItem('vessy_terms_date', new Date().toISOString());
        closeOverlay(termsOverlay, () => {
            if (!checkExistingSession()) {
                authOverlay.classList.remove('hidden');
            }
        });
    });

    termsDeclineBtn.addEventListener('click', () => {
        showOverlayError(termsOverlay, 'You must accept the terms to use Vessy OS.');
    });

    window.showTermsAgain = function () {
        document.getElementById('settingsModal').classList.add('hidden');
        termsOverlay.classList.remove('hidden');
        termsOverlay.classList.remove('closing');
        termsCheckbox.checked = true;
        termsAcceptBtn.disabled = false;
    };

    function closeOverlay(overlay, callback) {
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('closing');
            if (callback) callback();
        }, 450);
    }

    function showOverlayError(overlay, msg) {
        const existing = overlay.querySelector('.overlay-error-toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'overlay-error-toast';
        el.style.cssText = 'text-align:center;padding:8px;color:#ff0055;font-size:11px;margin-top:6px;animation:msgSlide 0.3s ease;';
        el.textContent = msg;
        overlay.querySelector('.overlay-footer').appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }


    // ===================================================
    //  AUTH SYSTEM
    // ===================================================
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const signupUsernameInput = document.getElementById('signupUsername');
    const signupPasswordInput = document.getElementById('signupPassword');
    const signupConfirmInput = document.getElementById('signupConfirm');
    const signupEmailInput = document.getElementById('signupEmail');

    window.switchAuth = function (view) {
        document.getElementById('loginView').classList.toggle('hidden', view !== 'login');
        document.getElementById('signupView').classList.toggle('hidden', view !== 'signup');
        document.getElementById('loginError').textContent = '';
        document.getElementById('signupError').textContent = '';
    };

    window.togglePw = function (inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    };

    // --- Password Strength ---
    signupPasswordInput.addEventListener('input', () => {
        const pw = signupPasswordInput.value;
        const fill = document.getElementById('strengthFill');
        const text = document.getElementById('strengthText');
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;

        fill.className = 'strength-fill';
        if (score <= 1) { fill.classList.add('weak'); text.textContent = 'Weak'; }
        else if (score === 2) { fill.classList.add('fair'); text.textContent = 'Fair'; }
        else if (score === 3) { fill.classList.add('good'); text.textContent = 'Good'; }
        else { fill.classList.add('strong'); text.textContent = 'Strong'; }

        if (pw.length === 0) { fill.className = 'strength-fill'; text.textContent = ''; }
    });

    // --- Check username availability ---
    let usernameTimer = null;
    signupUsernameInput.addEventListener('input', () => {
        const val = signupUsernameInput.value.trim();
        const status = document.getElementById('signupUsernameStatus');
        clearTimeout(usernameTimer);

        if (val.length < 3) {
            status.textContent = val.length > 0 ? 'Username must be at least 3 characters' : '';
            status.className = 'field-status' + (val.length > 0 ? ' error' : '');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            status.textContent = 'Only letters, numbers, and underscores';
            status.className = 'field-status error';
            return;
        }

        status.textContent = 'Checking...';
        status.className = 'field-status checking';

        usernameTimer = setTimeout(async () => {
            try {
                const res = await fetch('/api/check-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: val })
                });
                const data = await res.json();
                if (data.available) {
                    status.textContent = '✓ Available';
                    status.className = 'field-status success';
                } else {
                    status.textContent = '✕ Already taken';
                    status.className = 'field-status error';
                }
            } catch {
                status.textContent = '⚡ Offline — will check on submit';
                status.className = 'field-status checking';
            }
        }, 500);
    });

    // --- LOGIN ---
    loginBtn.addEventListener('click', doLogin);
    loginPasswordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    loginUsernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') loginPasswordInput.focus(); });

    async function doLogin() {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value;
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = '';

        if (!username || !password) {
            errorEl.textContent = 'Please fill in all fields.';
            return;
        }

        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                currentUsername = data.username;
                currentEmail = data.email || '';
                sessionToken = data.token;
                localStorage.setItem('vessy_session', JSON.stringify({
                    username: data.username,
                    email: data.email || '',
                    token: data.token
                }));
                closeOverlay(authOverlay, onUserReady);
            } else {
                errorEl.textContent = data.error || 'Invalid username or password.';
            }
        } catch {
            errorEl.textContent = 'Connection failed. Please try again.';
        }

        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }

    // --- SIGNUP ---
    signupBtn.addEventListener('click', doSignup);
    signupConfirmInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); });

    async function doSignup() {
        const username = signupUsernameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirm = signupConfirmInput.value;
        const errorEl = document.getElementById('signupError');
        errorEl.textContent = '';

        if (!username || !password) {
            errorEl.textContent = 'Username and password are required.';
            return;
        }
        if (username.length < 3 || username.length > 24) {
            errorEl.textContent = 'Username must be 3-24 characters.';
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorEl.textContent = 'Username: letters, numbers, underscores only.';
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (password !== confirm) {
            errorEl.textContent = 'Passwords do not match.';
            return;
        }

        signupBtn.classList.add('loading');
        signupBtn.disabled = true;

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();

            if (data.success) {
                currentUsername = data.username;
                currentEmail = email;
                sessionToken = data.token;
                localStorage.setItem('vessy_session', JSON.stringify({
                    username: data.username,
                    email: email,
                    token: data.token
                }));
                closeOverlay(authOverlay, onUserReady);
            } else {
                errorEl.textContent = data.error || 'Signup failed. Try another username.';
            }
        } catch {
            errorEl.textContent = 'Connection failed. Please try again.';
        }

        signupBtn.classList.remove('loading');
        signupBtn.disabled = false;
    }

    // --- LOGOUT ---
    window.logoutUser = function () {
        localStorage.removeItem('vessy_session');
        currentUsername = null;
        sessionToken = null;
        conversationHistory = [];
        chatWindow.innerHTML = '';
        document.getElementById('settingsModal').classList.add('hidden');
        authOverlay.classList.remove('hidden');
        authOverlay.classList.remove('closing');
        switchAuth('login');
    };


    // ===================================================
    //  USER READY
    // ===================================================
    function onUserReady() {
        document.getElementById('userBadgeName').textContent = currentUsername;
        document.getElementById('settingsUsername').textContent = currentUsername;
        document.getElementById('settingsEmail').textContent = currentEmail || 'No email set';
        userInput.placeholder = `Message as @${currentUsername}...`;
        loadChatHistory();
    }

    async function loadChatHistory() {
        try {
            const res = await fetch('/api/chat-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername, token: sessionToken })
            });
            const data = await res.json();
            if (data.history && data.history.length > 0) {
                conversationHistory = data.history;
                data.history.slice(-10).forEach(msg => {
                    if (msg.role === 'user') addMessage(msg.content, 'user', false);
                    else if (msg.role === 'assistant') addMessage(msg.content, 'bot', false);
                });
            }
        } catch (e) { /* offline */ }
    }


    // ===================================================
    //  CLOCK
    // ===================================================
    const updateClock = () => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    updateClock();
    setInterval(updateClock, 1000);


    // ===================================================
    //  UI CONTROLS
    // ===================================================
    document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); appGrid.classList.toggle('hidden'); });
    document.getElementById('settingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp = () => { appModal.classList.add('hidden'); appContent.innerHTML = ''; };
    document.addEventListener('click', e => { if (!e.target.closest('.app-grid') && !e.target.closest('#menuBtn')) appGrid.classList.add('hidden'); });
    window.setBg = t => { bgLayer.className = 'bg-' + t; bgLayer.style.backgroundImage = ''; };
    document.getElementById('customBgInput').addEventListener('change', e => {
        const f = e.target.files[0];
        if (f) { const r = new FileReader(); r.onload = ev => { bgLayer.className = ''; bgLayer.style.cssText = `background-image:url(${ev.target.result});background-size:cover;background-position:center;`; }; r.readAsDataURL(f); }
    });


    // ===================================================
    //  APP LAUNCHER
    // ===================================================
    window.launchApp = function (app) {
        appGrid.classList.add('hidden'); appModal.classList.remove('hidden'); appContent.innerHTML = '';
        if (app === 'paint') initPaint();
        else if (app === 'snake') initSnake();
        else if (app === 'calc') initCalc();
        else if (app === 'minecraft') initMinecraft();
        else if (app === 'browser') { appTitle.innerText = 'Browser'; appContent.innerHTML = '<iframe src="https://www.wikipedia.org"></iframe>'; }
    };

    // --- CALC ---
    function initCalc() {
        appTitle.innerText = 'Calculator';
        const btns = ['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];
        let h = '<div class="calc-grid"><div class="calc-display" id="cd">0</div>';
        btns.forEach(b => { h += `<button class="calc-btn${['÷','×','−','+','='].includes(b)?' accent':''}" onclick="cp('${b}')">${b}</button>`; });
        appContent.innerHTML = h + '</div>';
        let cur='0',op=null,prev=null,rst=false;
        window.cp = v => {
            const d = document.getElementById('cd');
            if(v==='C'){cur='0';op=null;prev=null;}else if(v==='⌫'){cur=cur.length>1?cur.slice(0,-1):'0';}
            else if(v==='±'){cur=String(-parseFloat(cur));}else if(v==='%'){cur=String(parseFloat(cur)/100);}
            else if(['+','−','×','÷'].includes(v)){prev=parseFloat(cur);op=v;rst=true;}
            else if(v==='='){if(prev!==null&&op){const c=parseFloat(cur);if(op==='+')cur=String(prev+c);else if(op==='−')cur=String(prev-c);else if(op==='×')cur=String(prev*c);else if(op==='÷')cur=c?String(prev/c):'Error';op=null;prev=null;}}
            else{if(rst){cur='';rst=false;}if(v==='.'&&cur.includes('.'))return;cur=cur==='0'&&v!=='.'?v:cur+v;}
            d.innerText=cur;
        };
    }

    // --- PAINT ---
    function initPaint() {
        appTitle.innerText = 'Paint';
        const cols = ['#000','#fff','#ff0055','#00f2ff','#00ff00','#ffaa00','#9b59b6','#ff6600'];
        let h = '<div class="paint-toolbar">';
        cols.forEach(c => h += `<div class="color-btn" style="background:${c}" onclick="spc('${c}')"></div>`);
        h += '<input type="range" min="1" max="30" value="3" id="bs" style="margin-left:auto;width:70px;"></div><canvas id="paintCanvas"></canvas>';
        appContent.innerHTML = h;
        const c = document.getElementById('paintCanvas'), ctx = c.getContext('2d');
        let p = false, col = '#000';
        c.width = c.parentElement.getBoundingClientRect().width;
        c.height = c.parentElement.getBoundingClientRect().height - 44;
        window.spc = v => col = v;
        const dr = e => { if(!p)return; ctx.lineWidth=document.getElementById('bs').value; ctx.lineCap='round'; ctx.strokeStyle=col; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); };
        c.addEventListener('mousedown', e => { p=true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); });
        c.addEventListener('mousemove', dr); c.addEventListener('mouseup', ()=>p=false); c.addEventListener('mouseleave', ()=>p=false);
        c.addEventListener('touchstart', e => { e.preventDefault(); p=true; const t=e.touches[0],r=c.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX-r.left,t.clientY-r.top); });
        c.addEventListener('touchmove', e => { e.preventDefault(); if(!p)return; const t=e.touches[0],r=c.getBoundingClientRect(); ctx.lineWidth=document.getElementById('bs').value; ctx.lineCap='round'; ctx.strokeStyle=col; ctx.lineTo(t.clientX-r.left,t.clientY-r.top); ctx.stroke(); });
        c.addEventListener('touchend', ()=>p=false);
    }

    // --- SNAKE ---
    function initSnake() {
        appTitle.innerText = 'Snake'; appContent.innerHTML = '<canvas id="snakeCanvas"></canvas>';
        const c = document.getElementById('snakeCanvas'), ctx = c.getContext('2d');
        c.width=400;c.height=400; const sz=20,cl=20,rw=20;
        let sn=[{x:5,y:5}],dr={x:1,y:0},fd=sp(),sc=0,lp;
        function sp(){return{x:Math.floor(Math.random()*cl),y:Math.floor(Math.random()*rw)};}
        function dw(){ctx.fillStyle='#0a0a10';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.shadowColor='#ff0055';ctx.shadowBlur=10;ctx.fillRect(fd.x*sz+2,fd.y*sz+2,sz-4,sz-4);ctx.shadowBlur=0;sn.forEach((s,i)=>{ctx.fillStyle=i===0?'#00f2ff':'#00aa88';ctx.fillRect(s.x*sz+1,s.y*sz+1,sz-2,sz-2);});ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='13px monospace';ctx.fillText('Score: '+sc,10,18);}
        function up(){const h={x:sn[0].x+dr.x,y:sn[0].y+dr.y};if(h.x<0||h.x>=cl||h.y<0||h.y>=rw||sn.some(s=>s.x===h.x&&s.y===h.y)){go();return;}sn.unshift(h);if(h.x===fd.x&&h.y===fd.y){sc+=10;fd=sp();}else sn.pop();dw();}
        function go(){clearInterval(lp);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('GAME OVER',200,190);ctx.fillStyle='#888';ctx.font='13px monospace';ctx.fillText('Score: '+sc+' • Click restart',200,220);ctx.textAlign='left';c.addEventListener('click',rs,{once:true});}
        function rs(){sn=[{x:5,y:5}];dr={x:1,y:0};fd=sp();sc=0;lp=setInterval(up,120);}
        document.addEventListener('keydown',e=>{if(e.key==='ArrowUp'&&dr.y===0)dr={x:0,y:-1};else if(e.key==='ArrowDown'&&dr.y===0)dr={x:0,y:1};else if(e.key==='ArrowLeft'&&dr.x===0)dr={x:-1,y:0};else if(e.key==='ArrowRight'&&dr.x===0)dr={x:1,y:0};});
        lp=setInterval(up,120);dw();
    }

    // --- VOXEL ---
    function initMinecraft() {
        appTitle.innerText = 'Voxel World';
        appContent.innerHTML = `<div style="padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
            <div style="width:70px;height:70px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.2);border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;"><i class="fa-solid fa-cube" style="font-size:28px;color:#ffaa00;"></i></div>
            <h2 style="margin-bottom:6px;font-size:18px;">VessyCraft</h2>
            <p style="color:#555;margin-bottom:20px;font-size:12px;">3D Voxel Engine</p>
            <button onclick="openVoxel()" style="background:linear-gradient(135deg,#ffaa00,#ff8800);color:#000;border:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-rocket"></i> Launch</button></div>`;
        window.openVoxel = () => {
            const w=window.open('','_blank');
            w.document.write(`<!DOCTYPE html><html><head><title>VessyCraft</title><style>body{margin:0;overflow:hidden;background:#000;color:#fff;font-family:monospace}#h{position:fixed;top:10px;left:10px;background:rgba(0,0,0,.7);padding:8px 12px;border-radius:8px;font-size:10px;z-index:10}#c{position:fixed;top:50%;left:50%;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}</style></head><body><div id="c"></div><div id="h"><b>VessyCraft</b><br>Click=Start WASD=Move Space=Jump<br>Click=Place Shift+Click=Break 1/2/3=Block</div><script type="module">import*as T from"https://unpkg.com/three@0.160.0/build/three.module.js";import{PointerLockControls as P}from"https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";const s=new T.Scene;s.background=new T.Color(8900331);s.fog=new T.Fog(8900331,20,80);const c=new T.PerspectiveCamera(75,innerWidth/innerHeight,.1,1e3),r=new T.WebGLRenderer({antialias:1});r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);s.add(new T.AmbientLight(16777215,.6));const d=new T.DirectionalLight(16777215,.8);d.position.set(50,50,50);s.add(d);const g=new T.BoxGeometry,m=[new T.MeshLambertMaterial({color:5592405}),new T.MeshLambertMaterial({color:8930099}),new T.MeshLambertMaterial({color:8947848})];const o=[];for(let x=-15;x<15;x++)for(let z=-15;z<15;z++){const v=new T.Mesh(g,m[0]);v.position.set(x,-1,z);s.add(v);o.push(v)}const ct=new P(c,document.body);document.body.onclick=()=>ct.lock();const rc=new T.Raycaster;let mi=0;document.onmousedown=e=>{if(!ct.isLocked)return;rc.setFromCamera(new T.Vector2,c);const h=rc.intersectObjects(o);if(h.length){if(e.shiftKey){const b=h[0].object;b.position.y!==-1&&(s.remove(b),o.splice(o.indexOf(b),1))}else{const v=new T.Mesh(g,m[mi%3]);v.position.copy(h[0].point).add(h[0].face.normal).round();s.add(v);o.push(v)}}};document.onkeydown=e=>{"123".includes(e.key)&&(mi=+e.key-1)};const vel=new T.Vector3;let F=0,B=0,L=0,R=0,J=0;document.addEventListener("keydown",e=>{e.code=="KeyW"&&(F=1);e.code=="KeyS"&&(B=1);e.code=="KeyA"&&(L=1);e.code=="KeyD"&&(R=1);e.code=="Space"&&J&&(vel.y=15,J=0)});document.addEventListener("keyup",e=>{e.code=="KeyW"&&(F=0);e.code=="KeyS"&&(B=0);e.code=="KeyA"&&(L=0);e.code=="KeyD"&&(R=0)});let pt=performance.now();!function a(){requestAnimationFrame(a);const t=performance.now(),dt=(t-pt)/1e3;pt=t;if(ct.isLocked){vel.x-=vel.x*10*dt;vel.z-=vel.z*10*dt;vel.y-=40*dt;const dir=new T.Vector3(R-L,0,F-B).normalize();(F||B)&&(vel.z-=dir.z*80*dt);(L||R)&&(vel.x-=dir.x*80*dt);ct.moveRight(-vel.x*dt);ct.moveForward(-vel.z*dt);c.position.y+=vel.y*dt;c.position.y<2&&(vel.y=0,c.position.y=2,J=1)}r.render(s,c)}();onresize=()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight)}<\/script></body></html>`);
            w.document.close();
        };
    }


    // ===================================================
    //  IMAGE GENERATION (IMPROVED)
    // ===================================================
    function generateImage(prompt) {
        const id = Date.now();
        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `<div class="bot-avatar"><i class="fa-solid fa-palette"></i></div>
            <div class="glass-card">
                <p class="generating-loader" id="is-${id}">🎨 <strong>Generating:</strong> "${prompt}"</p>
                <div class="img-skeleton" id="isk-${id}"><span>Loading...</span></div>
            </div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const seed = Math.floor(Math.random() * 999999);
        const urls = [
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&seed=${seed+1}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=turbo&nologo=true&seed=${seed+2}`
        ];
        let done = false, attempt = 0;

        function tryNext() {
            if (done || attempt >= urls.length) {
                if (!done) {
                    const s = document.getElementById(`is-${id}`);
                    const k = document.getElementById(`isk-${id}`);
                    if (s) s.innerHTML = '⚠️ <strong>Generation timed out.</strong> Try simpler prompt.';
                    if (k) k.remove();
                }
                return;
            }
            const img = new Image();
            img.className = 'generated-media';
            const timeout = setTimeout(() => { if (!done) { attempt++; const s = document.getElementById(`is-${id}`); if (s) s.innerHTML = `🎨 <strong>Retrying</strong> (${attempt+1}/3)...`; tryNext(); } }, 15000);
            img.onload = () => { done = true; clearTimeout(timeout); const s = document.getElementById(`is-${id}`); const k = document.getElementById(`isk-${id}`); if (s) s.innerHTML = `🎨 <strong>Generated:</strong> "${prompt}"`; if (k) k.remove(); s?.parentElement?.appendChild(img); img.scrollIntoView({ behavior: 'smooth' }); };
            img.onerror = () => { clearTimeout(timeout); if (!done) { attempt++; tryNext(); } };
            img.src = urls[attempt];
        }
        tryNext();
    }


    // ===================================================
    //  MAIN CHAT HANDLER
    // ===================================================
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        if (/^(draw|generate image|make an image|create image|imagine)\b/i.test(text)) {
            addMessage(text, 'user'); userInput.value = '';
            const prompt = text.replace(/^(draw|generate image|make an image|create image|imagine)\s*(of|a|an|the)?\s*/i, '').trim() || text;
            generateImage(prompt);
            saveChatLog(text, '[Image: ' + prompt + ']');
            return;
        }

        if (/^(video|make a video|animate)\b/i.test(text)) {
            addMessage(text, 'user'); userInput.value = '';
            const prompt = text.replace(/^(video|make a video|animate)\s*(of|a|an|the)?\s*/i, '').trim() || text;
            const seed = Math.floor(Math.random() * 99999);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `<div class="bot-avatar"><i class="fa-solid fa-video"></i></div><div class="glass-card"><p class="generating-loader">🎥 <strong>Rendering:</strong> "${prompt}"...</p><img src="${url}" class="generated-media" onload="this.previousElementSibling.innerText='🎥 Complete.';this.scrollIntoView({behavior:'smooth'})" onerror="this.previousElementSibling.innerHTML='⚠️ <strong>Failed.</strong> Try different prompt.'"></div>`;
            chatWindow.appendChild(div); chatWindow.scrollTop = chatWindow.scrollHeight;
            saveChatLog(text, '[Video: ' + prompt + ']');
            return;
        }

        addMessage(text, 'user'); userInput.value = '';
        userInput.disabled = true;
        conversationHistory.push({ role: 'user', content: text });
        await triggerAI(text);
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = sender === 'bot'
            ? `<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card">${marked.parse(text)}</div>`
            : `<div class="glass-card">${marked.parse(text)}</div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function triggerAI(promptText) {
        const ld = document.createElement('div');
        ld.className = 'message bot';
        ld.innerHTML = `<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card"><span class="generating-loader">Thinking...</span></div>`;
        chatWindow.appendChild(ld);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText, username: currentUsername, history: conversationHistory.slice(-20), token: sessionToken })
            });
            const data = await res.json();
            chatWindow.removeChild(ld);
            if (data.error) addMessage('⚠️ ' + data.error, 'bot');
            else {
                addMessage(data.reply, 'bot');
                conversationHistory.push({ role: 'assistant', content: data.reply });
                saveChatLog(promptText, data.reply);
            }
        } catch {
            chatWindow.removeChild(ld);
            addMessage('❌ Connection failed.', 'bot');
        }
        userInput.disabled = false;
        userInput.focus();
    }

    async function saveChatLog(userMsg, aiMsg) {
        try {
            await fetch('/api/save-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername, userMessage: userMsg, aiMessage: aiMsg, timestamp: new Date().toISOString(), token: sessionToken })
            });
        } catch { /* silent */ }
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
});
