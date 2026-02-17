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
    let personalizationEnabled = true;
    let userProfile = { tone: '', interests: [], style: '' };

    // Cookies
    const setCk = (n,v,d) => { const dt=new Date();dt.setTime(dt.getTime()+(d*864e5));document.cookie=`${n}=${encodeURIComponent(v)};expires=${dt.toUTCString()};path=/;SameSite=Lax`; };
    const getCk = n => { const m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?decodeURIComponent(m[2]):null; };
    const delCk = n => { document.cookie=`${n}=;expires=Thu,01 Jan 1970 00:00:00 UTC;path=/;`; };

    // Cookie banner
    const cookieBanner = document.getElementById('cookieBanner');
    if (!getCk('vessy_ck')&&!localStorage.getItem('vessy_ck')) setTimeout(()=>cookieBanner.classList.remove('hidden'),800);
    document.getElementById('cookieAcceptAll').addEventListener('click',()=>{setCk('vessy_ck','all',365);localStorage.setItem('vessy_ck','all');cookieBanner.classList.add('hidden');});
    document.getElementById('cookieEssentialOnly').addEventListener('click',()=>{setCk('vessy_ck','ess',365);localStorage.setItem('vessy_ck','ess');cookieBanner.classList.add('hidden');});

    // Terms
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const authOverlay = document.getElementById('authOverlay');

    function checkSession() {
        let s=null;try{s=JSON.parse(localStorage.getItem('vessy_session'));}catch{}
        if(!s){const u=getCk('vessy_u'),t=getCk('vessy_t');if(u&&t)s={username:u,token:t,email:getCk('vessy_e')||''};}
        if(s&&s.username&&s.token){currentUsername=s.username;currentEmail=s.email||'';sessionToken=s.token;termsOverlay.classList.add('hidden');authOverlay.classList.add('hidden');onReady();return true;}
        return false;
    }

    if(localStorage.getItem('vessy_terms')==='1'){if(!checkSession()){termsOverlay.classList.add('hidden');authOverlay.classList.remove('hidden');}}

    termsCheckbox.addEventListener('change',()=>{termsAcceptBtn.disabled=!termsCheckbox.checked;});
    termsAcceptBtn.addEventListener('click',()=>{if(!termsCheckbox.checked)return;localStorage.setItem('vessy_terms','1');closeOv(termsOverlay,()=>{if(!checkSession())authOverlay.classList.remove('hidden');});});
    document.getElementById('termsDeclineBtn').addEventListener('click',()=>showOvToast(termsOverlay,'You must accept the terms.'));
    window.showTermsAgain=()=>{document.getElementById('settingsModal').classList.add('hidden');termsOverlay.classList.remove('hidden');termsOverlay.classList.remove('closing');termsCheckbox.checked=true;termsAcceptBtn.disabled=false;};

    function closeOv(ov,cb){ov.classList.add('closing');setTimeout(()=>{ov.classList.add('hidden');ov.classList.remove('closing');if(cb)cb();},450);}
    function showOvToast(ov,msg){const x=ov.querySelector('.ov-toast');if(x)x.remove();const e=document.createElement('div');e.className='ov-toast';e.style.cssText='text-align:center;padding:8px;color:#ff0055;font-size:11px;margin-top:6px;';e.textContent=msg;(ov.querySelector('.overlay-footer')||ov.querySelector('.auth-body')).appendChild(e);setTimeout(()=>e.remove(),4000);}

    // Auth
    window.switchAuth=v=>{document.getElementById('loginView').classList.toggle('hidden',v!=='login');document.getElementById('signupView').classList.toggle('hidden',v!=='signup');document.getElementById('loginError').textContent='';document.getElementById('signupError').textContent='';};
    window.togglePw=(id,btn)=>{const i=document.getElementById(id),ic=btn.querySelector('i');if(i.type==='password'){i.type='text';ic.className='fa-solid fa-eye-slash';}else{i.type='password';ic.className='fa-solid fa-eye';}};

    document.getElementById('signupPassword').addEventListener('input',function(){const pw=this.value,f=document.getElementById('strengthFill'),t=document.getElementById('strengthText');let s=0;if(pw.length>=6)s++;if(pw.length>=10)s++;if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))s++;if(/\d/.test(pw))s++;if(/[^a-zA-Z0-9]/.test(pw))s++;f.className='strength-fill';if(!pw.length){t.textContent='';return;}if(s<=1){f.classList.add('weak');t.textContent='Weak';}else if(s===2){f.classList.add('fair');t.textContent='Fair';}else if(s===3){f.classList.add('good');t.textContent='Good';}else{f.classList.add('strong');t.textContent='Strong';}});

    let unT=null;
    document.getElementById('signupUsername').addEventListener('input',function(){const v=this.value.trim(),st=document.getElementById('signupUsernameStatus');clearTimeout(unT);if(v.length<3){st.textContent=v.length?'Min 3 chars':'';st.className='field-status'+(v.length?' error':'');return;}if(!/^[a-zA-Z0-9_]+$/.test(v)){st.textContent='Letters, numbers, _ only';st.className='field-status error';return;}st.textContent='Checking...';st.className='field-status checking';unT=setTimeout(async()=>{try{const r=await fetch('/api/check-username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:v})});const d=await r.json();st.textContent=d.available?'✓ Available':'✕ Taken';st.className='field-status '+(d.available?'success':'error');}catch{st.textContent='⚡ Will verify on submit';st.className='field-status checking';}},500);});

    const loginBtn=document.getElementById('loginBtn');
    loginBtn.addEventListener('click',doLogin);
    document.getElementById('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
    document.getElementById('loginUsername').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('loginPassword').focus();});

    async function doLogin(){
        const u=document.getElementById('loginUsername').value.trim(),p=document.getElementById('loginPassword').value,err=document.getElementById('loginError'),rem=document.getElementById('rememberMe').checked;
        err.textContent='';if(!u||!p){err.textContent='Fill in all fields.';return;}
        loginBtn.classList.add('loading');loginBtn.disabled=true;
        try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();
        if(d.success){currentUsername=d.username;currentEmail=d.email||'';sessionToken=d.token;const sess={username:d.username,email:d.email||'',token:d.token};if(rem)localStorage.setItem('vessy_session',JSON.stringify(sess));setCk('vessy_u',d.username,30);setCk('vessy_t',d.token,30);setCk('vessy_e',d.email||'',30);closeOv(authOverlay,onReady);}
        else err.textContent=d.error||'Invalid credentials.';}catch{err.textContent='Connection failed.';}
        loginBtn.classList.remove('loading');loginBtn.disabled=false;
    }

    const signupBtn=document.getElementById('signupBtn');
    signupBtn.addEventListener('click',doSignup);
    document.getElementById('signupConfirm').addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();});

    async function doSignup(){
        const u=document.getElementById('signupUsername').value.trim(),em=document.getElementById('signupEmail').value.trim(),p=document.getElementById('signupPassword').value,c=document.getElementById('signupConfirm').value,err=document.getElementById('signupError');
        err.textContent='';if(!u||!p){err.textContent='Username and password required.';return;}if(u.length<3||u.length>24){err.textContent='Username: 3-24 chars.';return;}if(!/^[a-zA-Z0-9_]+$/.test(u)){err.textContent='Letters, numbers, _ only.';return;}if(p.length<6){err.textContent='Password: min 6 chars.';return;}if(p!==c){err.textContent='Passwords don\'t match.';return;}
        signupBtn.classList.add('loading');signupBtn.disabled=true;
        try{const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,email:em,password:p})});const d=await r.json();
        if(d.success){currentUsername=d.username;currentEmail=em;sessionToken=d.token;localStorage.setItem('vessy_session',JSON.stringify({username:d.username,email:em,token:d.token}));setCk('vessy_u',d.username,30);setCk('vessy_t',d.token,30);closeOv(authOverlay,onReady);}
        else err.textContent=d.error||'Signup failed.';}catch{err.textContent='Connection failed.';}
        signupBtn.classList.remove('loading');signupBtn.disabled=false;
    }

    window.logoutUser=()=>{localStorage.removeItem('vessy_session');['vessy_u','vessy_t','vessy_e'].forEach(delCk);currentUsername=null;sessionToken=null;conversationHistory=[];userProfile={tone:'',interests:[],style:''};chatWindow.innerHTML='';document.getElementById('settingsModal').classList.add('hidden');authOverlay.classList.remove('hidden');authOverlay.classList.remove('closing');switchAuth('login');};

    // ===================================================
    //  PERSONALIZATION SYSTEM
    // ===================================================
    function loadPersonalization() {
        const saved = localStorage.getItem(`vessy_profile_${currentUsername}`);
        if (saved) {
            try { userProfile = JSON.parse(saved); } catch { userProfile = { tone: '', interests: [], style: '' }; }
        } else {
            userProfile = { tone: '', interests: [], style: '' };
        }
        personalizationEnabled = localStorage.getItem(`vessy_personalization_${currentUsername}`) !== 'false';
        updatePersonalizationUI();
    }

    function savePersonalization() {
        if (personalizationEnabled) {
            localStorage.setItem(`vessy_profile_${currentUsername}`, JSON.stringify(userProfile));
        }
    }

    function analyzeUserMessage(text) {
        if (!personalizationEnabled) return;

        // Tone analysis
        const exclamations = (text.match(/!/g) || []).length;
        const questions = (text.match(/\?/g) || []).length;
        const caps = (text.match(/[A-Z]/g) || []).length;
        const emojis = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
        const words = text.toLowerCase().split(/\s+/);

        const happyWords = ['love','great','awesome','amazing','fantastic','wonderful','excited','happy','fun','cool','nice','thanks','thank','please','haha','lol','yay','wow'];
        const formalWords = ['therefore','however','furthermore','regarding','consequently','nevertheless','accordingly','hence'];
        const casualWords = ['hey','yo','sup','gonna','wanna','gotta','kinda','nah','yeah','yep','nope','bruh','dude','lmao','omg'];
        const curiousWords = ['how','why','what','explain','tell','teach','learn','understand','curious','wonder'];

        let tones = [];
        const happyCount = words.filter(w => happyWords.includes(w)).length;
        const formalCount = words.filter(w => formalWords.includes(w)).length;
        const casualCount = words.filter(w => casualWords.includes(w)).length;
        const curiousCount = words.filter(w => curiousWords.includes(w)).length;

        if (happyCount > 0 || exclamations > 1 || emojis > 0) tones.push('enthusiastic');
        if (formalCount > 0) tones.push('formal');
        if (casualCount > 0) tones.push('casual');
        if (curiousCount > 0 || questions > 0) tones.push('curious');
        if (words.length < 5) tones.push('concise');
        if (words.length > 30) tones.push('detailed');

        if (tones.length > 0) {
            // Blend with existing tone
            const existing = userProfile.tone ? userProfile.tone.split(', ') : [];
            const merged = [...new Set([...existing, ...tones])].slice(-4);
            userProfile.tone = merged.join(', ');
        }

        // Style analysis
        const avgWordLen = words.reduce((a, w) => a + w.length, 0) / words.length;
        if (avgWordLen > 6) userProfile.style = 'articulate';
        else if (avgWordLen < 4) userProfile.style = 'brief';
        else userProfile.style = 'balanced';

        // Interest extraction
        const topicPatterns = {
            'technology': /\b(code|programming|software|app|website|ai|computer|tech|python|javascript|html|css|api|server|database)\b/i,
            'science': /\b(science|physics|chemistry|biology|math|equation|theory|experiment|research)\b/i,
            'gaming': /\b(game|gaming|play|minecraft|fortnite|steam|console|xbox|playstation|nintendo)\b/i,
            'creative': /\b(art|draw|paint|design|music|write|story|creative|poetry|novel)\b/i,
            'business': /\b(business|startup|money|invest|marketing|sales|entrepreneur|profit|revenue)\b/i,
            'education': /\b(learn|study|school|university|course|exam|homework|education|teach)\b/i,
            'health': /\b(health|fitness|exercise|diet|sleep|meditation|mental|wellness|gym)\b/i,
            'entertainment': /\b(movie|film|show|series|netflix|music|song|anime|manga)\b/i
        };

        for (const [topic, pattern] of Object.entries(topicPatterns)) {
            if (pattern.test(text) && !userProfile.interests.includes(topic)) {
                userProfile.interests.push(topic);
                if (userProfile.interests.length > 6) userProfile.interests.shift();
            }
        }

        savePersonalization();
    }

    function getPersonalizationPrompt() {
        if (!personalizationEnabled || (!userProfile.tone && userProfile.interests.length === 0)) return '';

        let prompt = '\n\n--- USER PERSONALIZATION DATA ---\n';
        if (userProfile.tone) prompt += `User's detected tone/mood: ${userProfile.tone}\n`;
        if (userProfile.style) prompt += `User's communication style: ${userProfile.style}\n`;
        if (userProfile.interests.length > 0) prompt += `User's interests: ${userProfile.interests.join(', ')}\n`;
        prompt += 'Adapt your tone, vocabulary, and response style to match this user. Mirror their energy level. If they are casual, be casual. If enthusiastic, be enthusiastic back. If formal, be professional.\n';
        prompt += '--- END PERSONALIZATION ---';
        return prompt;
    }

    function updatePersonalizationUI() {
        const toggle = document.getElementById('personalizationToggle');
        const status = document.getElementById('personalizationStatus');
        if (toggle) toggle.checked = personalizationEnabled;
        if (status) {
            if (personalizationEnabled) {
                let info = 'Active';
                if (userProfile.tone) info += ` — Tone: ${userProfile.tone}`;
                if (userProfile.interests.length > 0) info += ` | Topics: ${userProfile.interests.join(', ')}`;
                status.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${info}`;
                status.className = 'personalization-status active';
            } else {
                status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Disabled — Not learning';
                status.className = 'personalization-status inactive';
            }
        }
    }

    // Settings toggle handler
    document.getElementById('personalizationToggle').addEventListener('change', function() {
        personalizationEnabled = this.checked;
        localStorage.setItem(`vessy_personalization_${currentUsername}`, personalizationEnabled);
        updatePersonalizationUI();
    });

    document.getElementById('deletePersonalizationBtn').addEventListener('click', () => {
        if (!confirm('Delete all personalization data? Vessy OS will stop adapting to your style and all learned preferences will be erased.')) return;
        userProfile = { tone: '', interests: [], style: '' };
        personalizationEnabled = false;
        localStorage.removeItem(`vessy_profile_${currentUsername}`);
        localStorage.setItem(`vessy_personalization_${currentUsername}`, 'false');
        document.getElementById('personalizationToggle').checked = false;
        updatePersonalizationUI();
    });

    // ===================================================
    //  USER READY
    // ===================================================
    function onReady() {
        document.getElementById('userBadgeName').textContent = currentUsername;
        document.getElementById('settingsUsername').textContent = currentUsername;
        document.getElementById('settingsEmail').textContent = currentEmail || 'No email';
        userInput.placeholder = `Message as @${currentUsername}...`;
        loadPersonalization();
        loadHistory();
    }

    async function loadHistory() {
        try {
            const r = await fetch('/api/chat-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:currentUsername,token:sessionToken})});
            const d = await r.json();
            if (d.history && d.history.length) {
                conversationHistory = d.history;
                d.history.slice(-8).forEach(m => {
                    if(m.role==='user') addMsg(m.content,'user');
                    else if(m.role==='assistant') addMsg(m.content,'bot');
                });
            }
        } catch {}
    }

    // Clock & UI
    const tick=()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};tick();setInterval(tick,1000);
    document.getElementById('menuBtn').addEventListener('click',e=>{e.stopPropagation();appGrid.classList.toggle('hidden');});
    document.getElementById('settingsBtn').addEventListener('click',()=>{document.getElementById('settingsModal').classList.toggle('hidden');updatePersonalizationUI();});
    window.toggleSettings=()=>document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp=()=>{appModal.classList.add('hidden');appContent.innerHTML='';};
    document.addEventListener('click',e=>{if(!e.target.closest('.app-grid')&&!e.target.closest('#menuBtn'))appGrid.classList.add('hidden');});
    window.setBg=t=>{bgLayer.className='bg-'+t;bgLayer.style.backgroundImage='';setCk('vessy_bg',t,30);};
    document.getElementById('customBgInput').addEventListener('change',e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{bgLayer.className='';bgLayer.style.cssText=`background-image:url(${ev.target.result});background-size:cover;background-position:center;`;};r.readAsDataURL(f);}});
    const sb=getCk('vessy_bg');if(sb&&sb!=='default')bgLayer.className='bg-'+sb;

    // App launcher
    window.launchApp=app=>{appGrid.classList.add('hidden');appModal.classList.remove('hidden');appContent.innerHTML='';
        if(app==='browser'){appTitle.innerText='Browser';appContent.innerHTML='<iframe src="https://www.wikipedia.org"></iframe>';}
    };

       // ===================================================
    //  FIXED IMAGE GENERATION
    // ===================================================
    function genImg(prompt) {
        const id = Date.now();
        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `
            <div class="bot-avatar"><i class="fa-solid fa-palette"></i></div>
            <div class="glass-card" id="card-${id}">
                <p class="generating-loader" id="is-${id}">🎨 <strong>Generating:</strong> "${prompt}"</p>
                <div class="img-skeleton" id="isk-${id}"><span>Loading image...</span></div>
            </div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Use a single reliable URL with cache-busting
        const seed = Math.floor(Math.random() * 999999);
        const encodedPrompt = encodeURIComponent(prompt);

        // Try loading with a proper img element
        const img = new Image();
        img.className = 'generated-media';
        img.alt = prompt;

        let loaded = false;
        let attempt = 0;

        const urls = [
            `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&nologo=true`,
            `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=512&seed=${seed + 1}&nologo=true`,
            `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed + 2}&nologo=true`
        ];

        function tryLoad() {
            if (loaded || attempt >= urls.length) {
                if (!loaded) {
                    const status = document.getElementById(`is-${id}`);
                    const skel = document.getElementById(`isk-${id}`);
                    if (status) status.innerHTML = '⚠️ Image generation failed. Try again with a different prompt.';
                    if (skel) skel.remove();
                }
                return;
            }

            const currentImg = new Image();
            currentImg.className = 'generated-media';
            currentImg.alt = prompt;

            // 20 second timeout
            const timeout = setTimeout(() => {
                if (!loaded) {
                    attempt++;
                    const status = document.getElementById(`is-${id}`);
                    if (status && attempt < urls.length) {
                        status.innerHTML = `🎨 <strong>Retrying...</strong> (attempt ${attempt + 1}/${urls.length})`;
                    }
                    tryLoad();
                }
            }, 20000);

            currentImg.onload = function() {
                if (loaded) return;
                loaded = true;
                clearTimeout(timeout);

                const status = document.getElementById(`is-${id}`);
                const skel = document.getElementById(`isk-${id}`);
                const card = document.getElementById(`card-${id}`);

                if (status) status.innerHTML = `🎨 <strong>Generated:</strong> "${prompt}"`;
                if (skel) skel.remove();
                if (card) card.appendChild(currentImg);

                setTimeout(() => {
                    currentImg.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            };

            currentImg.onerror = function() {
                clearTimeout(timeout);
                if (!loaded) {
                    attempt++;
                    const status = document.getElementById(`is-${id}`);
                    if (status && attempt < urls.length) {
                        status.innerHTML = `🎨 <strong>Retrying...</strong> (attempt ${attempt + 1}/${urls.length})`;
                    }
                    tryLoad();
                }
            };

            currentImg.src = urls[attempt];
        }

        tryLoad();
    }
            // VIDEO / IMAGE from prompt
        if (/^(video|make a video|animate)\b/i.test(text)) {
            addMsg(text, 'user');
            userInput.value = '';
            const p = text.replace(/^(video|make a video|animate)\s*(of|a|an|the)?\s*/i, '').trim() || text;
            const seed = Math.floor(Math.random() * 99999);
            const encodedP = encodeURIComponent(p);
            const url = `https://image.pollinations.ai/prompt/${encodedP}?width=512&height=512&seed=${seed}&nologo=true`;

            const id = Date.now();
            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-video"></i></div>
                <div class="glass-card" id="vcard-${id}">
                    <p class="generating-loader" id="vs-${id}">🎥 <strong>Rendering:</strong> "${p}"...</p>
                    <div class="img-skeleton" id="vsk-${id}"><span>Rendering video frame...</span></div>
                </div>`;
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            const vimg = new Image();
            vimg.className = 'generated-media';
            vimg.alt = p;

            const vTimeout = setTimeout(() => {
                const vs = document.getElementById(`vs-${id}`);
                const vsk = document.getElementById(`vsk-${id}`);
                if (vs && !vimg.complete) {
                    vs.innerHTML = '⚠️ Rendering timed out. Try a simpler prompt.';
                    if (vsk) vsk.remove();
                }
            }, 25000);

            vimg.onload = function() {
                clearTimeout(vTimeout);
                const vs = document.getElementById(`vs-${id}`);
                const vsk = document.getElementById(`vsk-${id}`);
                const vc = document.getElementById(`vcard-${id}`);
                if (vs) vs.innerHTML = `🎥 <strong>Rendered:</strong> "${p}"`;
                if (vsk) vsk.remove();
                if (vc) vc.appendChild(vimg);
                setTimeout(() => vimg.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
            };

            vimg.onerror = function() {
                clearTimeout(vTimeout);
                const vs = document.getElementById(`vs-${id}`);
                const vsk = document.getElementById(`vsk-${id}`);
                if (vs) vs.innerHTML = '⚠️ Rendering failed. Try a different prompt.';
                if (vsk) vsk.remove();
            };

            vimg.src = url;
            saveChat(text, '[Video: ' + p + ']');
            return;
        }
