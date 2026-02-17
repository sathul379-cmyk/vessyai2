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
    let currentEmail = '';
    let conversationHistory = [];
    let sessionToken = null;
    let isAdmin = false;

    // ===================================================
    //  COOKIES
    // ===================================================
    const setCookie = (n,v,d) => { const dt=new Date(); dt.setTime(dt.getTime()+(d*864e5)); document.cookie=`${n}=${encodeURIComponent(v)};expires=${dt.toUTCString()};path=/;SameSite=Lax`; };
    const getCookie = n => { const m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)')); return m?decodeURIComponent(m[2]):null; };
    const delCookie = n => { document.cookie=`${n}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;`; };

    const cookieBanner = document.getElementById('cookieBanner');
    if (!getCookie('vessy_cookies') && !localStorage.getItem('vessy_cookies')) {
        setTimeout(() => cookieBanner.classList.remove('hidden'), 800);
    }
    document.getElementById('cookieAcceptAll').addEventListener('click', () => { setCookie('vessy_cookies','all',365); localStorage.setItem('vessy_cookies','all'); cookieBanner.classList.add('hidden'); });
    document.getElementById('cookieEssentialOnly').addEventListener('click', () => { setCookie('vessy_cookies','essential',365); localStorage.setItem('vessy_cookies','essential'); cookieBanner.classList.add('hidden'); });

    // ===================================================
    //  TERMS
    // ===================================================
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const authOverlay = document.getElementById('authOverlay');

    function checkSession() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem('vessy_session')); } catch {}
        if (!s) { const u=getCookie('vessy_u'),t=getCookie('vessy_t'); if(u&&t) s={username:u,token:t,email:getCookie('vessy_e')||''}; }
        if (s && s.username && s.token) {
            currentUsername=s.username; currentEmail=s.email||''; sessionToken=s.token;
            isAdmin = s.username.toLowerCase() === 'admin';
            termsOverlay.classList.add('hidden'); authOverlay.classList.add('hidden');
            onReady(); return true;
        }
        return false;
    }

    if (localStorage.getItem('vessy_terms') === '1') { if (!checkSession()) { termsOverlay.classList.add('hidden'); authOverlay.classList.remove('hidden'); } }

    termsCheckbox.addEventListener('change', () => { termsAcceptBtn.disabled = !termsCheckbox.checked; });
    termsAcceptBtn.addEventListener('click', () => {
        if (!termsCheckbox.checked) return;
        localStorage.setItem('vessy_terms','1');
        closeOv(termsOverlay, () => { if (!checkSession()) authOverlay.classList.remove('hidden'); });
    });
    document.getElementById('termsDeclineBtn').addEventListener('click', () => showOvToast(termsOverlay, 'You must accept the terms to use Vessy AI.'));
    window.showTermsAgain = () => { document.getElementById('settingsModal').classList.add('hidden'); termsOverlay.classList.remove('hidden'); termsOverlay.classList.remove('closing'); termsCheckbox.checked=true; termsAcceptBtn.disabled=false; };

    function closeOv(ov, cb) { ov.classList.add('closing'); setTimeout(() => { ov.classList.add('hidden'); ov.classList.remove('closing'); if(cb)cb(); }, 450); }
    function showOvToast(ov, msg) { const x=ov.querySelector('.ov-toast'); if(x)x.remove(); const e=document.createElement('div'); e.className='ov-toast'; e.style.cssText='text-align:center;padding:8px;color:#ff0055;font-size:11px;margin-top:6px;'; e.textContent=msg; (ov.querySelector('.overlay-footer')||ov.querySelector('.auth-body')).appendChild(e); setTimeout(()=>e.remove(),4000); }

    // ===================================================
    //  AUTH
    // ===================================================
    window.switchAuth = v => { document.getElementById('loginView').classList.toggle('hidden',v!=='login'); document.getElementById('signupView').classList.toggle('hidden',v!=='signup'); document.getElementById('loginError').textContent=''; document.getElementById('signupError').textContent=''; };
    window.togglePw = (id,btn) => { const i=document.getElementById(id),ic=btn.querySelector('i'); if(i.type==='password'){i.type='text';ic.className='fa-solid fa-eye-slash';}else{i.type='password';ic.className='fa-solid fa-eye';} };

    document.getElementById('signupPassword').addEventListener('input', function() {
        const pw=this.value,f=document.getElementById('strengthFill'),t=document.getElementById('strengthText');
        let s=0; if(pw.length>=6)s++; if(pw.length>=10)s++; if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))s++; if(/\d/.test(pw))s++; if(/[^a-zA-Z0-9]/.test(pw))s++;
        f.className='strength-fill'; if(!pw.length){t.textContent='';return;}
        if(s<=1){f.classList.add('weak');t.textContent='Weak';}else if(s===2){f.classList.add('fair');t.textContent='Fair';}else if(s===3){f.classList.add('good');t.textContent='Good';}else{f.classList.add('strong');t.textContent='Strong';}
    });

    let unT=null;
    document.getElementById('signupUsername').addEventListener('input', function() {
        const v=this.value.trim(),st=document.getElementById('signupUsernameStatus'); clearTimeout(unT);
        if(v.length<3){st.textContent=v.length?'Min 3 chars':'';st.className='field-status'+(v.length?' error':'');return;}
        if(!/^[a-zA-Z0-9_]+$/.test(v)){st.textContent='Letters, numbers, _ only';st.className='field-status error';return;}
        if(v.toLowerCase()==='admin'){st.textContent='Reserved username';st.className='field-status error';return;}
        st.textContent='Checking...';st.className='field-status checking';
        unT=setTimeout(async()=>{try{const r=await fetch('/api/check-username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:v})});const d=await r.json();st.textContent=d.available?'✓ Available':'✕ Taken';st.className='field-status '+(d.available?'success':'error');}catch{st.textContent='⚡ Will check on submit';st.className='field-status checking';}},500);
    });

    // LOGIN
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', doLogin);
    document.getElementById('loginPassword').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
    document.getElementById('loginUsername').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('loginPassword').focus(); });

    async function doLogin() {
        const u=document.getElementById('loginUsername').value.trim(), p=document.getElementById('loginPassword').value, err=document.getElementById('loginError'), rem=document.getElementById('rememberMe').checked;
        err.textContent=''; if(!u||!p){err.textContent='Fill in all fields.';return;}
        loginBtn.classList.add('loading'); loginBtn.disabled=true;
        try {
            const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
            const d=await r.json();
            if(d.success){
                currentUsername=d.username; currentEmail=d.email||''; sessionToken=d.token; isAdmin=d.username.toLowerCase()==='admin';
                const sess={username:d.username,email:d.email||'',token:d.token};
                if(rem) localStorage.setItem('vessy_session',JSON.stringify(sess));
                setCookie('vessy_u',d.username,30); setCookie('vessy_t',d.token,30); setCookie('vessy_e',d.email||'',30);
                closeOv(authOverlay, onReady);
            } else err.textContent=d.error||'Invalid credentials.';
        } catch { err.textContent='Connection failed.'; }
        loginBtn.classList.remove('loading'); loginBtn.disabled=false;
    }

    // SIGNUP
    const signupBtn = document.getElementById('signupBtn');
    signupBtn.addEventListener('click', doSignup);
    document.getElementById('signupConfirm').addEventListener('keydown', e => { if(e.key==='Enter') doSignup(); });

    async function doSignup() {
        const u=document.getElementById('signupUsername').value.trim(), em=document.getElementById('signupEmail').value.trim(), p=document.getElementById('signupPassword').value, c=document.getElementById('signupConfirm').value, err=document.getElementById('signupError');
        err.textContent='';
        if(!u||!p){err.textContent='Username and password required.';return;}
        if(u.length<3||u.length>24){err.textContent='Username: 3-24 chars.';return;}
        if(!/^[a-zA-Z0-9_]+$/.test(u)){err.textContent='Letters, numbers, _ only.';return;}
        if(u.toLowerCase()==='admin'){err.textContent='This username is reserved.';return;}
        if(p.length<6){err.textContent='Password: min 6 chars.';return;}
        if(p!==c){err.textContent='Passwords don\'t match.';return;}

        signupBtn.classList.add('loading'); signupBtn.disabled=true;
        try {
            const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,email:em,password:p})});
            const d=await r.json();
            if(d.success){
                currentUsername=d.username; currentEmail=em; sessionToken=d.token; isAdmin=false;
                localStorage.setItem('vessy_session',JSON.stringify({username:d.username,email:em,token:d.token}));
                setCookie('vessy_u',d.username,30); setCookie('vessy_t',d.token,30);
                closeOv(authOverlay, onReady);
            } else err.textContent=d.error||'Signup failed.';
        } catch { err.textContent='Connection failed.'; }
        signupBtn.classList.remove('loading'); signupBtn.disabled=false;
    }

    window.logoutUser = () => {
        localStorage.removeItem('vessy_session'); ['vessy_u','vessy_t','vessy_e'].forEach(delCookie);
        currentUsername=null; sessionToken=null; conversationHistory=[]; isAdmin=false;
        chatWindow.innerHTML=''; document.getElementById('settingsModal').classList.add('hidden');
        document.querySelectorAll('.admin-only-app').forEach(e=>e.classList.add('hidden'));
        authOverlay.classList.remove('hidden'); authOverlay.classList.remove('closing'); switchAuth('login');
    };

    // ===================================================
    //  USER READY
    // ===================================================
    function onReady() {
        document.getElementById('userBadgeName').textContent = currentUsername;
        document.getElementById('settingsUsername').textContent = currentUsername;
        document.getElementById('settingsEmail').textContent = currentEmail || 'No email';
        userInput.placeholder = `Message as @${currentUsername}...`;
        if (isAdmin) document.querySelectorAll('.admin-only-app').forEach(e => e.classList.remove('hidden'));
        loadHistory();
    }

    async function loadHistory() {
        try {
            const r = await fetch('/api/chat-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUsername,token:sessionToken})});
            const d = await r.json();
            if(d.history && d.history.length) {
                conversationHistory = d.history;
                d.history.slice(-8).forEach(m => { if(m.role==='user') addMsg(m.content,'user'); else if(m.role==='assistant') addMsg(m.content,'bot'); });
            }
        } catch {}
    }

    // ===================================================
    //  CLOCK & UI
    // ===================================================
    const tick = () => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }; tick(); setInterval(tick,1000);
    document.getElementById('menuBtn').addEventListener('click', e => { e.stopPropagation(); appGrid.classList.toggle('hidden'); });
    document.getElementById('settingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp = () => { appModal.classList.add('hidden'); appContent.innerHTML=''; };
    document.addEventListener('click', e => { if(!e.target.closest('.app-grid')&&!e.target.closest('#menuBtn')) appGrid.classList.add('hidden'); });
    window.setBg = t => { bgLayer.className='bg-'+t; bgLayer.style.backgroundImage=''; setCookie('vessy_bg',t,30); };
    document.getElementById('customBgInput').addEventListener('change', e => { const f=e.target.files[0]; if(f){const r=new FileReader();r.onload=ev=>{bgLayer.className='';bgLayer.style.cssText=`background-image:url(${ev.target.result});background-size:cover;background-position:center;`;};r.readAsDataURL(f);} });
    const sb=getCookie('vessy_bg'); if(sb&&sb!=='default') bgLayer.className='bg-'+sb;

    // ===================================================
    //  APPS
    // ===================================================
    window.launchApp = app => {
        appGrid.classList.add('hidden'); appModal.classList.remove('hidden'); appContent.innerHTML='';
        if(app==='paint') initPaint(); else if(app==='snake') initSnake(); else if(app==='calc') initCalc();
        else if(app==='minecraft') initMinecraft(); else if(app==='admin' && isAdmin) initAdmin();
        else if(app==='browser'){appTitle.innerText='Browser';appContent.innerHTML='<iframe src="https://www.wikipedia.org"></iframe>';}
    };

    function initCalc(){appTitle.innerText='Calculator';const b=['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];let h='<div class="calc-grid"><div class="calc-display" id="cd">0</div>';b.forEach(v=>{h+=`<button class="calc-btn${['÷','×','−','+','='].includes(v)?' accent':''}" onclick="cp('${v}')">${v}</button>`;});appContent.innerHTML=h+'</div>';let c='0',o=null,p=null,r=false;window.cp=v=>{const d=document.getElementById('cd');if(v==='C'){c='0';o=null;p=null;}else if(v==='⌫')c=c.length>1?c.slice(0,-1):'0';else if(v==='±')c=String(-parseFloat(c));else if(v==='%')c=String(parseFloat(c)/100);else if(['+','−','×','÷'].includes(v)){p=parseFloat(c);o=v;r=true;}else if(v==='='){if(p!==null&&o){const x=parseFloat(c);if(o==='+')c=String(p+x);else if(o==='−')c=String(p-x);else if(o==='×')c=String(p*x);else if(o==='÷')c=x?String(p/x):'Error';o=null;p=null;}}else{if(r){c='';r=false;}if(v==='.'&&c.includes('.'))return;c=c==='0'&&v!=='.'?v:c+v;}d.innerText=c;};}

    function initPaint(){appTitle.innerText='Paint';const cs=['#000','#fff','#ff0055','#00f2ff','#00ff00','#ffaa00','#9b59b6','#ff6600'];let h='<div class="paint-toolbar">';cs.forEach(c=>h+=`<div class="color-btn" style="background:${c}" onclick="spc('${c}')"></div>`);h+='<input type="range" min="1" max="30" value="3" id="bs" style="margin-left:auto;width:70px;"></div><canvas id="paintCanvas"></canvas>';appContent.innerHTML=h;const cv=document.getElementById('paintCanvas'),ctx=cv.getContext('2d');let pt=false,col='#000';cv.width=cv.parentElement.getBoundingClientRect().width;cv.height=cv.parentElement.getBoundingClientRect().height-44;window.spc=v=>col=v;cv.addEventListener('mousedown',e=>{pt=true;ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY);});cv.addEventListener('mousemove',e=>{if(!pt)return;ctx.lineWidth=document.getElementById('bs').value;ctx.lineCap='round';ctx.strokeStyle=col;ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();});cv.addEventListener('mouseup',()=>pt=false);cv.addEventListener('mouseleave',()=>pt=false);cv.addEventListener('touchstart',e=>{e.preventDefault();pt=true;const t=e.touches[0],r=cv.getBoundingClientRect();ctx.beginPath();ctx.moveTo(t.clientX-r.left,t.clientY-r.top);});cv.addEventListener('touchmove',e=>{e.preventDefault();if(!pt)return;const t=e.touches[0],r=cv.getBoundingClientRect();ctx.lineWidth=document.getElementById('bs').value;ctx.lineCap='round';ctx.strokeStyle=col;ctx.lineTo(t.clientX-r.left,t.clientY-r.top);ctx.stroke();});cv.addEventListener('touchend',()=>pt=false);}

    function initSnake(){appTitle.innerText='Snake';appContent.innerHTML='<canvas id="snakeCanvas"></canvas>';const c=document.getElementById('snakeCanvas'),ctx=c.getContext('2d');c.width=400;c.height=400;const sz=20,cl=20,rw=20;let sn=[{x:5,y:5}],dr={x:1,y:0},fd=sp(),sc=0,lp;function sp(){return{x:Math.floor(Math.random()*cl),y:Math.floor(Math.random()*rw)};}function dw(){ctx.fillStyle='#0a0a10';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.shadowColor='#ff0055';ctx.shadowBlur=10;ctx.fillRect(fd.x*sz+2,fd.y*sz+2,sz-4,sz-4);ctx.shadowBlur=0;sn.forEach((s,i)=>{ctx.fillStyle=i===0?'#00f2ff':'#00aa88';ctx.fillRect(s.x*sz+1,s.y*sz+1,sz-2,sz-2);});ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='13px monospace';ctx.fillText('Score: '+sc,10,18);}function up(){const h={x:sn[0].x+dr.x,y:sn[0].y+dr.y};if(h.x<0||h.x>=cl||h.y<0||h.y>=rw||sn.some(s=>s.x===h.x&&s.y===h.y)){go();return;}sn.unshift(h);if(h.x===fd.x&&h.y===fd.y){sc+=10;fd=sp();}else sn.pop();dw();}function go(){clearInterval(lp);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,400,400);ctx.fillStyle='#ff0055';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('GAME OVER',200,190);ctx.fillStyle='#888';ctx.font='13px monospace';ctx.fillText('Score: '+sc+' • Click restart',200,220);ctx.textAlign='left';c.addEventListener('click',rs,{once:true});}function rs(){sn=[{x:5,y:5}];dr={x:1,y:0};fd=sp();sc=0;lp=setInterval(up,120);}document.addEventListener('keydown',e=>{if(e.key==='ArrowUp'&&dr.y===0)dr={x:0,y:-1};else if(e.key==='ArrowDown'&&dr.y===0)dr={x:0,y:1};else if(e.key==='ArrowLeft'&&dr.x===0)dr={x:-1,y:0};else if(e.key==='ArrowRight'&&dr.x===0)dr={x:1,y:0};});lp=setInterval(up,120);dw();}

    function initMinecraft(){appTitle.innerText='Voxel';appContent.innerHTML=`<div style="padding:40px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;"><div style="width:70px;height:70px;background:rgba(255,170,0,.1);border:1px solid rgba(255,170,0,.2);border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;"><i class="fa-solid fa-cube" style="font-size:28px;color:#ffaa00;"></i></div><h2 style="margin-bottom:6px;font-size:18px;">VessyCraft</h2><p style="color:#555;margin-bottom:20px;font-size:12px;">3D Voxel</p><button onclick="openVoxel()" style="background:linear-gradient(135deg,#ffaa00,#ff8800);color:#000;border:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;"><i class="fa-solid fa-rocket"></i> Launch</button></div>`;window.openVoxel=()=>{const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>VessyCraft</title><style>body{margin:0;overflow:hidden;background:#000;color:#fff;font-family:monospace}#h{position:fixed;top:10px;left:10px;background:rgba(0,0,0,.7);padding:8px 12px;border-radius:8px;font-size:10px;z-index:10}#c{position:fixed;top:50%;left:50%;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}</style></head><body><div id="c"></div><div id="h"><b>VessyCraft</b><br>WASD Space Click Shift+Click 1/2/3</div><script type="module">import*as T from"https://unpkg.com/three@0.160.0/build/three.module.js";import{PointerLockControls as P}from"https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";const s=new T.Scene;s.background=new T.Color(8900331);s.fog=new T.Fog(8900331,20,80);const c=new T.PerspectiveCamera(75,innerWidth/innerHeight,.1,1e3),r=new T.WebGLRenderer({antialias:1});r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);s.add(new T.AmbientLight(16777215,.6));const d=new T.DirectionalLight(16777215,.8);d.position.set(50,50,50);s.add(d);const g=new T.BoxGeometry,m=[new T.MeshLambertMaterial({color:5592405}),new T.MeshLambertMaterial({color:8930099}),new T.MeshLambertMaterial({color:8947848})];const o=[];for(let x=-15;x<15;x++)for(let z=-15;z<15;z++){const v=new T.Mesh(g,m[0]);v.position.set(x,-1,z);s.add(v);o.push(v)}const ct=new P(c,document.body);document.body.onclick=()=>ct.lock();const rc=new T.Raycaster;let mi=0;document.onmousedown=e=>{if(!ct.isLocked)return;rc.setFromCamera(new T.Vector2,c);const h=rc.intersectObjects(o);if(h.length){if(e.shiftKey){const b=h[0].object;b.position.y!==-1&&(s.remove(b),o.splice(o.indexOf(b),1))}else{const v=new T.Mesh(g,m[mi%3]);v.position.copy(h[0].point).add(h[0].face.normal).round();s.add(v);o.push(v)}}};document.onkeydown=e=>{"123".includes(e.key)&&(mi=+e.key-1)};const vel=new T.Vector3;let F=0,B=0,L=0,R=0,J=0;document.addEventListener("keydown",e=>{e.code=="KeyW"&&(F=1);e.code=="KeyS"&&(B=1);e.code=="KeyA"&&(L=1);e.code=="KeyD"&&(R=1);e.code=="Space"&&J&&(vel.y=15,J=0)});document.addEventListener("keyup",e=>{e.code=="KeyW"&&(F=0);e.code=="KeyS"&&(B=0);e.code=="KeyA"&&(L=0);e.code=="KeyD"&&(R=0)});let pt=performance.now();!function a(){requestAnimationFrame(a);const t=performance.now(),dt=(t-pt)/1e3;pt=t;if(ct.isLocked){vel.x-=vel.x*10*dt;vel.z-=vel.z*10*dt;vel.y-=40*dt;const dir=new T.Vector3(R-L,0,F-B).normalize();(F||B)&&(vel.z-=dir.z*80*dt);(L||R)&&(vel.x-=dir.x*80*dt);ct.moveRight(-vel.x*dt);ct.moveForward(-vel.z*dt);c.position.y+=vel.y*dt;c.position.y<2&&(vel.y=0,c.position.y=2,J=1)}r.render(s,c)}();onresize=()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight)}<\/script></body></html>`);w.document.close();};}

    // ===================================================
    //  ADMIN PANEL (admin only)
    // ===================================================
    async function initAdmin() {
        if (!isAdmin) { appContent.innerHTML='<div style="padding:40px;text-align:center;color:var(--danger);">Access Denied.</div>'; return; }
        appTitle.innerText = '🔒 Admin Panel';
        appContent.innerHTML = '<div class="admin-container"><div style="text-align:center;padding:40px;color:#555;"><span class="generating-loader">Loading all user data...</span></div></div>';

        try {
            const r = await fetch('/api/admin-data', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username: currentUsername, token: sessionToken }) });
            const d = await r.json();

            if (d.error) { appContent.querySelector('.admin-container').innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger);">${d.error}</div>`; return; }

            const users = d.users || [];
            const allChats = d.chats || {};
            let totalMsgs = 0;
            Object.values(allChats).forEach(c => totalMsgs += c.length);

            let html = `
                <div class="admin-header">
                    <h2><i class="fa-solid fa-user-shield"></i> Admin Panel</h2>
                    <button class="admin-dl-btn" id="adminDownloadAll"><i class="fa-solid fa-download"></i> Download All Chats</button>
                </div>
                <div class="admin-stats">
                    <div class="admin-stat"><span class="stat-num">${users.length}</span><span class="stat-lbl">Users</span></div>
                    <div class="admin-stat"><span class="stat-num">${totalMsgs}</span><span class="stat-lbl">Messages</span></div>
                    <div class="admin-stat"><span class="stat-num">${Object.keys(allChats).length}</span><span class="stat-lbl">Chat Logs</span></div>
                </div>
                <div class="admin-user-list">
            `;

            users.forEach(u => {
                if (u.toLowerCase() === 'admin') return; // Skip admin's own
                const chats = allChats[u] || [];
                const msgCount = chats.length;

                html += `<div class="admin-user-item">
                    <div class="admin-user-header" onclick="this.nextElementSibling.classList.toggle('open')">
                        <div class="admin-user-name"><i class="fa-solid fa-circle"></i> ${u}</div>
                        <div class="admin-user-meta">${msgCount} msgs</div>
                    </div>
                    <div class="admin-user-chats">`;

                chats.forEach(m => {
                    const roleClass = m.role === 'user' ? 'user-role' : 'ai-role';
                    const roleName = m.role === 'user' ? u : 'Vessy AI';
                    const time = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
                    html += `<div class="admin-chat-entry">
                        <div class="admin-chat-role ${roleClass}">${roleName}</div>
                        <div class="admin-chat-content">${(m.content||'').substring(0,500).replace(/</g,'&lt;')}</div>
                        <div class="admin-chat-time">${time}</div>
                    </div>`;
                });

                html += `</div></div>`;
            });

            html += '</div>';
            appContent.querySelector('.admin-container').innerHTML = html;

            // Download all chats button
            document.getElementById('adminDownloadAll')?.addEventListener('click', () => {
                let txt = `========================================\n`;
                txt += `VESSY AI 31.1 — ALL USER CHAT LOGS\n`;
                txt += `Downloaded by: admin\n`;
                txt += `Date: ${new Date().toLocaleString()}\n`;
                txt += `Total Users: ${users.filter(u=>u.toLowerCase()!=='admin').length}\n`;
                txt += `Total Messages: ${totalMsgs}\n`;
                txt += `========================================\n\n`;

                users.forEach(u => {
                    if (u.toLowerCase() === 'admin') return;
                    const chats = allChats[u] || [];
                    if (chats.length === 0) return;

                    txt += `\n${'─'.repeat(40)}\n`;
                    txt += `USER: ${u}\n`;
                    txt += `Messages: ${chats.length}\n`;
                    txt += `${'─'.repeat(40)}\n\n`;

                    chats.forEach(m => {
                        const who = m.role === 'user' ? u : 'Vessy AI';
                        const time = m.timestamp ? `[${new Date(m.timestamp).toLocaleString()}]` : '';
                        txt += `${time} ${who}:\n${m.content}\n\n`;
                    });
                });

                txt += `\n${'═'.repeat(40)}\n`;
                txt += `© 2026 Vessy AI. All Rights Reserved.\n`;
                txt += `${'═'.repeat(40)}\n`;

                const blob = new Blob([txt], {type:'text/plain'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `vessy-all-chats-${new Date().toISOString().slice(0,10)}.txt`;
                a.click();
                URL.revokeObjectURL(a.href);
            });

        } catch (e) {
            appContent.querySelector('.admin-container').innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger);">Failed to load: ${e.message}</div>`;
        }
    }

    // ===================================================
    //  IMAGE GEN
    // ===================================================
    function genImg(prompt) {
        const id=Date.now(),div=document.createElement('div');div.className='message bot';
        div.innerHTML=`<div class="bot-avatar"><i class="fa-solid fa-palette"></i></div><div class="glass-card"><p class="generating-loader" id="is-${id}">🎨 <strong>Generating:</strong> "${prompt}"</p><div class="img-skeleton" id="isk-${id}"><span>Loading...</span></div></div>`;
        chatWindow.appendChild(div);chatWindow.scrollTop=chatWindow.scrollHeight;
        const seed=Math.floor(Math.random()*999999),urls=[
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&seed=${seed+1}`,
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=turbo&nologo=true&seed=${seed+2}`
        ];
        let done=false,att=0;
        function tryN(){if(done||att>=urls.length){if(!done){const s=document.getElementById(`is-${id}`),k=document.getElementById(`isk-${id}`);if(s)s.innerHTML='⚠️ <strong>Timed out.</strong>';if(k)k.remove();}return;}
        const img=new Image();img.className='generated-media';const to=setTimeout(()=>{if(!done){att++;const s=document.getElementById(`is-${id}`);if(s)s.innerHTML=`🎨 Retrying (${att+1}/3)...`;tryN();}},15000);
        img.onload=()=>{done=true;clearTimeout(to);const s=document.getElementById(`is-${id}`),k=document.getElementById(`isk-${id}`);if(s)s.innerHTML=`🎨 <strong>Generated:</strong> "${prompt}"`;if(k)k.remove();s?.parentElement?.appendChild(img);img.scrollIntoView({behavior:'smooth'});};
        img.onerror=()=>{clearTimeout(to);if(!done){att++;tryN();}};img.src=urls[att];}tryN();
    }

    // ===================================================
    //  MAIN CHAT
    // ===================================================
    async function handleSend() {
        const text=userInput.value.trim(); if(!text) return;
        if(/^(draw|generate image|make an image|create image|imagine)\b/i.test(text)){
            addMsg(text,'user');userInput.value='';
            const p=text.replace(/^(draw|generate image|make an image|create image|imagine)\s*(of|a|an|the)?\s*/i,'').trim()||text;
            genImg(p);saveChat(text,'[Image: '+p+']');return;
        }
        if(/^(video|make a video|animate)\b/i.test(text)){
            addMsg(text,'user');userInput.value='';
            const p=text.replace(/^(video|make a video|animate)\s*(of|a|an|the)?\s*/i,'').trim()||text;
            const seed=Math.floor(Math.random()*99999),url=`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=512&nologo=true&seed=${seed}`;
            const div=document.createElement('div');div.className='message bot';
            div.innerHTML=`<div class="bot-avatar"><i class="fa-solid fa-video"></i></div><div class="glass-card"><p class="generating-loader">🎥 <strong>Rendering:</strong> "${p}"...</p><img src="${url}" class="generated-media" onload="this.previousElementSibling.innerText='🎥 Complete.';this.scrollIntoView({behavior:'smooth'})" onerror="this.previousElementSibling.innerHTML='⚠️ Failed.'"></div>`;
            chatWindow.appendChild(div);chatWindow.scrollTop=chatWindow.scrollHeight;saveChat(text,'[Video: '+p+']');return;
        }
        addMsg(text,'user');userInput.value='';userInput.disabled=true;
        conversationHistory.push({role:'user',content:text});
        await triggerAI(text);
    }

    function addMsg(text,sender) {
        const div=document.createElement('div');div.className=`message ${sender}`;
        div.innerHTML=sender==='bot'?`<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card">${marked.parse(text)}</div>`:`<div class="glass-card">${marked.parse(text)}</div>`;
        chatWindow.appendChild(div);chatWindow.scrollTop=chatWindow.scrollHeight;
    }

    async function triggerAI(prompt) {
        const ld=document.createElement('div');ld.className='message bot';
        ld.innerHTML=`<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card"><span class="generating-loader">Thinking...</span></div>`;
        chatWindow.appendChild(ld);
        try {
            const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,username:currentUsername,history:conversationHistory.slice(-20),token:sessionToken})});
            const d=await r.json();chatWindow.removeChild(ld);
            if(d.error) addMsg('⚠️ '+d.error,'bot');
            else{addMsg(d.reply,'bot');conversationHistory.push({role:'assistant',content:d.reply});saveChat(prompt,d.reply);}
        }catch{chatWindow.removeChild(ld);addMsg('❌ Connection failed.','bot');}
        userInput.disabled=false;userInput.focus();
    }

    async function saveChat(um,am) {
        try{await fetch('/api/save-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUsername,userMessage:um,aiMessage:am,timestamp:new Date().toISOString(),token:sessionToken})});}catch{}
    }

    sendBtn.addEventListener('click',handleSend);
    userInput.addEventListener('keypress',e=>{if(e.key==='Enter')handleSend();});
});
