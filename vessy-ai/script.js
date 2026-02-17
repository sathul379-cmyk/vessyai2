document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const bgLayer = document.getElementById('bgLayer');
    const appGrid = document.getElementById('appGrid');
    const appModal = document.getElementById('appModal');
    const appContent = document.getElementById('appContent');
    const appTitle = document.getElementById('appTitle');

    // ===================================================
    //  TERMS & CONDITIONS
    // ===================================================
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const termsDeclineBtn = document.getElementById('termsDeclineBtn');

    // Check if user already accepted
    const termsAccepted = localStorage.getItem('vessy_terms_accepted');
    if (termsAccepted === 'true') {
        termsOverlay.classList.add('hidden');
    }

    // Enable/disable accept button based on checkbox
    termsCheckbox.addEventListener('change', () => {
        termsAcceptBtn.disabled = !termsCheckbox.checked;
    });

    // Accept terms
    termsAcceptBtn.addEventListener('click', () => {
        if (!termsCheckbox.checked) return;
        localStorage.setItem('vessy_terms_accepted', 'true');
        localStorage.setItem('vessy_terms_date', new Date().toISOString());
        termsOverlay.classList.add('accepted');
        setTimeout(() => {
            termsOverlay.classList.add('hidden');
            termsOverlay.classList.remove('accepted');
        }, 500);
    });

    // Decline terms
    termsDeclineBtn.addEventListener('click', () => {
        const msg = document.createElement('div');
        msg.style.cssText = 'text-align:center; padding:10px; color:#ff0055; font-size:12px; margin-top:8px; animation: msgSlide 0.3s ease;';
        msg.textContent = 'You must accept the terms to use Vessy OS.';
        // Remove existing warning if any
        const existing = termsOverlay.querySelector('.decline-warning');
        if (existing) existing.remove();
        msg.className = 'decline-warning';
        document.querySelector('.terms-footer').appendChild(msg);
        setTimeout(() => msg.remove(), 4000);
    });

    // Show terms again from settings
    window.showTermsAgain = function () {
        document.getElementById('settingsModal').classList.add('hidden');
        termsOverlay.classList.remove('hidden');
        termsCheckbox.checked = localStorage.getItem('vessy_terms_accepted') === 'true';
        termsAcceptBtn.disabled = !termsCheckbox.checked;
    };


    // ===================================================
    //  CLOCK
    // ===================================================
    function updateClock() {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    updateClock();
    setInterval(updateClock, 1000);


    // ===================================================
    //  UI CONTROLS
    // ===================================================
    document.getElementById('menuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        appGrid.classList.toggle('hidden');
    });
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.toggle('hidden');
    });
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.closeApp = () => {
        appModal.classList.add('hidden');
        appContent.innerHTML = '';
    };

    // Close app grid on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.app-grid') && !e.target.closest('#menuBtn')) {
            appGrid.classList.add('hidden');
        }
    });

    // Backgrounds
    window.setBg = (type) => {
        bgLayer.className = 'bg-' + type;
        bgLayer.style.backgroundImage = '';
    };
    document.getElementById('customBgInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                bgLayer.className = '';
                bgLayer.style.backgroundImage = `url(${ev.target.result})`;
                bgLayer.style.backgroundSize = 'cover';
                bgLayer.style.backgroundPosition = 'center';
            };
            reader.readAsDataURL(file);
        }
    });


    // ===================================================
    //  APP LAUNCHER
    // ===================================================
    window.launchApp = function (app) {
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


    // ===================================================
    //  CALCULATOR
    // ===================================================
    function initCalc() {
        appTitle.innerText = "Calculator";
        const buttons = [
            'C', '±', '%', '÷',
            '7', '8', '9', '×',
            '4', '5', '6', '−',
            '1', '2', '3', '+',
            '0', '.', '⌫', '='
        ];
        let html = '<div class="calc-grid"><div class="calc-display" id="calcDisp">0</div>';
        buttons.forEach(b => {
            const cls = ['÷', '×', '−', '+', '='].includes(b) ? 'calc-btn accent' : 'calc-btn';
            html += `<button class="${cls}" onclick="calcPress('${b}')">${b}</button>`;
        });
        html += '</div>';
        appContent.innerHTML = html;

        let current = '0', operator = null, prev = null, reset = false;

        window.calcPress = function (val) {
            const disp = document.getElementById('calcDisp');
            if (val === 'C') { current = '0'; operator = null; prev = null; }
            else if (val === '⌫') { current = current.length > 1 ? current.slice(0, -1) : '0'; }
            else if (val === '±') { current = String(-parseFloat(current)); }
            else if (val === '%') { current = String(parseFloat(current) / 100); }
            else if (['+', '−', '×', '÷'].includes(val)) {
                prev = parseFloat(current);
                operator = val;
                reset = true;
            }
            else if (val === '=') {
                if (prev !== null && operator) {
                    const c = parseFloat(current);
                    if (operator === '+') current = String(prev + c);
                    else if (operator === '−') current = String(prev - c);
                    else if (operator === '×') current = String(prev * c);
                    else if (operator === '÷') current = c !== 0 ? String(prev / c) : 'Error';
                    operator = null; prev = null;
                }
            } else {
                if (reset) { current = ''; reset = false; }
                if (val === '.' && current.includes('.')) return;
                current = current === '0' && val !== '.' ? val : current + val;
            }
            disp.innerText = current;
        };
    }


    // ===================================================
    //  PAINT
    // ===================================================
    function initPaint() {
        appTitle.innerText = "Paint";
        const colors = ['#000', '#fff', '#ff0055', '#00f2ff', '#00ff00', '#ffaa00', '#9b59b6', '#ff6600'];
        let html = '<div class="paint-toolbar">';
        colors.forEach(c => {
            html += `<div class="color-btn" style="background:${c}" onclick="setPaintColor('${c}')"></div>`;
        });
        html += '<input type="range" min="1" max="30" value="3" id="brushSize" style="margin-left:auto; width:80px;">';
        html += '</div><canvas id="paintCanvas"></canvas>';
        appContent.innerHTML = html;

        const c = document.getElementById('paintCanvas');
        const ctx = c.getContext('2d');
        let painting = false, color = '#000';

        function resize() {
            const rect = c.parentElement.getBoundingClientRect();
            c.width = rect.width;
            c.height = rect.height - 46;
        }
        resize();

        window.setPaintColor = function (col) { color = col; };

        c.addEventListener('mousedown', (e) => {
            painting = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        });
        c.addEventListener('mousemove', (e) => {
            if (!painting) return;
            ctx.lineWidth = document.getElementById('brushSize').value;
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        });
        c.addEventListener('mouseup', () => painting = false);
        c.addEventListener('mouseleave', () => painting = false);

        // Touch support
        c.addEventListener('touchstart', (e) => {
            e.preventDefault(); painting = true;
            const touch = e.touches[0]; const rect = c.getBoundingClientRect();
            ctx.beginPath();
            ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
        });
        c.addEventListener('touchmove', (e) => {
            e.preventDefault(); if (!painting) return;
            const touch = e.touches[0]; const rect = c.getBoundingClientRect();
            ctx.lineWidth = document.getElementById('brushSize').value;
            ctx.lineCap = 'round'; ctx.strokeStyle = color;
            ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
            ctx.stroke();
        });
        c.addEventListener('touchend', () => painting = false);
    }


    // ===================================================
    //  SNAKE
    // ===================================================
    function initSnake() {
        appTitle.innerText = "Snake";
        appContent.innerHTML = '<canvas id="snakeCanvas"></canvas>';
        const c = document.getElementById('snakeCanvas');
        const ctx = c.getContext('2d');
        c.width = 400; c.height = 400;

        const size = 20;
        const cols = c.width / size;
        const rows = c.height / size;
        let snake = [{ x: 5, y: 5 }];
        let dir = { x: 1, y: 0 };
        let food = spawnFood();
        let score = 0;
        let gameLoop;

        function spawnFood() {
            return {
                x: Math.floor(Math.random() * cols),
                y: Math.floor(Math.random() * rows)
            };
        }

        function draw() {
            ctx.fillStyle = '#0a0a10';
            ctx.fillRect(0, 0, c.width, c.height);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    ctx.strokeRect(x * size, y * size, size, size);
                }
            }

            // Food
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.fillRect(food.x * size + 2, food.y * size + 2, size - 4, size - 4);
            ctx.shadowBlur = 0;

            // Snake
            snake.forEach((seg, i) => {
                ctx.fillStyle = i === 0 ? '#00f2ff' : '#00aa88';
                ctx.fillRect(seg.x * size + 1, seg.y * size + 1, size - 2, size - 2);
            });

            // Score
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '13px monospace';
            ctx.fillText('Score: ' + score, 10, 18);
        }

        function update() {
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) { gameOver(); return; }
            if (snake.some(s => s.x === head.x && s.y === head.y)) { gameOver(); return; }
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                food = spawnFood();
            } else {
                snake.pop();
            }
            draw();
        }

        function gameOver() {
            clearInterval(gameLoop);
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = '#ff0055';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', c.width / 2, c.height / 2 - 10);
            ctx.fillStyle = '#888';
            ctx.font = '13px monospace';
            ctx.fillText('Score: ' + score + '  •  Click to restart', c.width / 2, c.height / 2 + 20);
            ctx.textAlign = 'left';
            c.addEventListener('click', restart, { once: true });
        }

        function restart() {
            snake = [{ x: 5, y: 5 }];
            dir = { x: 1, y: 0 };
            food = spawnFood();
            score = 0;
            gameLoop = setInterval(update, 120);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
            else if (e.key === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
            else if (e.key === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
            else if (e.key === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
        });

        gameLoop = setInterval(update, 120);
        draw();
    }


    // ===================================================
    //  MINECRAFT / VOXEL
    // ===================================================
    function initMinecraft() {
        appTitle.innerText = "Voxel World";
        appContent.innerHTML = `
            <div style="padding:40px; color:white; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                <div style="width:80px; height:80px; background:rgba(255,170,0,0.1); border:1px solid rgba(255,170,0,0.2); border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:20px;">
                    <i class="fa-solid fa-cube" style="font-size:32px; color:#ffaa00;"></i>
                </div>
                <h2 style="margin-bottom:8px; font-size:20px;">VessyCraft</h2>
                <p style="color:#666; margin-bottom:24px; font-size:13px;">3D Voxel Engine — Requires pointer lock</p>
                <button onclick="launchVoxelWindow()" style="background:linear-gradient(135deg, #ffaa00, #ff8800); color:#000; border:none; padding:14px 32px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; transition:0.2s;">
                    <i class="fa-solid fa-rocket"></i> Launch in New Window
                </button>
            </div>
        `;
        window.launchVoxelWindow = function () {
            const w = window.open('', '_blank');
            w.document.write(`<!DOCTYPE html><html><head><title>VessyCraft</title><style>body{margin:0;overflow:hidden;background:#000;color:#fff;font-family:monospace}#hud{position:fixed;top:10px;left:10px;background:rgba(0,0,0,.7);padding:10px 14px;border-radius:8px;font-size:11px;line-height:1.6;z-index:10}#cross{position:fixed;top:50%;left:50%;width:16px;height:16px;border:2px solid rgba(255,255,255,.5);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}</style></head><body><div id="cross"></div><div id="hud"><b>VessyCraft</b><br>Click=Start | WASD=Move | Space=Jump<br>Click=Place | Shift+Click=Break<br>1/2/3=Block Type</div><script type="module">import*as T from"https://unpkg.com/three@0.160.0/build/three.module.js";import{PointerLockControls as P}from"https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";const s=new T.Scene;s.background=new T.Color(8900331);s.fog=new T.Fog(8900331,20,80);const c=new T.PerspectiveCamera(75,innerWidth/innerHeight,.1,1e3),r=new T.WebGLRenderer({antialias:1});r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);s.add(new T.AmbientLight(16777215,.6));const d=new T.DirectionalLight(16777215,.8);d.position.set(50,50,50);s.add(d);const g=new T.BoxGeometry,m=[new T.MeshLambertMaterial({color:5592405}),new T.MeshLambertMaterial({color:8930099}),new T.MeshLambertMaterial({color:8947848})];const o=[];for(let x=-15;x<15;x++)for(let z=-15;z<15;z++){const v=new T.Mesh(g,m[0]);v.position.set(x,-1,z);s.add(v);o.push(v)}const ct=new P(c,document.body);document.body.onclick=()=>ct.lock();const rc=new T.Raycaster;let mi=0;document.onmousedown=e=>{if(!ct.isLocked)return;rc.setFromCamera(new T.Vector2,c);const h=rc.intersectObjects(o);if(h.length){if(e.shiftKey){const b=h[0].object;b.position.y!==-1&&(s.remove(b),o.splice(o.indexOf(b),1))}else{const v=new T.Mesh(g,m[mi%3]);v.position.copy(h[0].point).add(h[0].face.normal).round();s.add(v);o.push(v)}}};document.onkeydown=e=>{"123".includes(e.key)&&(mi=+e.key-1)};const vel=new T.Vector3;let F=0,B=0,L=0,R=0,J=0;document.addEventListener("keydown",e=>{e.code=="KeyW"&&(F=1);e.code=="KeyS"&&(B=1);e.code=="KeyA"&&(L=1);e.code=="KeyD"&&(R=1);e.code=="Space"&&J&&(vel.y=15,J=0)});document.addEventListener("keyup",e=>{e.code=="KeyW"&&(F=0);e.code=="KeyS"&&(B=0);e.code=="KeyA"&&(L=0);e.code=="KeyD"&&(R=0)});let pt=performance.now();!function a(){requestAnimationFrame(a);const t=performance.now(),dt=(t-pt)/1e3;pt=t;if(ct.isLocked){vel.x-=vel.x*10*dt;vel.z-=vel.z*10*dt;vel.y-=40*dt;const dir=new T.Vector3(R-L,0,F-B).normalize();(F||B)&&(vel.z-=dir.z*80*dt);(L||R)&&(vel.x-=dir.x*80*dt);ct.moveRight(-vel.x*dt);ct.moveForward(-vel.z*dt);c.position.y+=vel.y*dt;c.position.y<2&&(vel.y=0,c.position.y=2,J=1)}r.render(s,c)}();onresize=()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight)}<\/script></body></html>`);
            w.document.close();
        };
    }


    // ===================================================
    //  CHAT - IMAGE / VIDEO / AI
    // ===================================================
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // 🎨 IMAGE GENERATION
        if (text.toLowerCase().startsWith('draw') ||
            text.toLowerCase().startsWith('generate image') ||
            text.toLowerCase().startsWith('make an image')) {

            addMessage(text, 'user');
            userInput.value = '';

            const prompt = text.replace(/draw|generate|image|make an image|of/gi, '').trim();
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`;

            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-palette"></i></div>
                <div class="glass-card">
                    <p class="generating-loader">🎨 <strong>Flux Engine:</strong> Generating "${prompt}"...</p>
                    <img src="${url}" class="generated-media" onload="this.previousElementSibling.innerHTML='🎨 <strong>Generated:</strong> ${prompt.replace(/'/g, "\\'")}'; this.scrollIntoView({behavior:'smooth'})">
                </div>
            `;
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return;
        }

        // 🎥 VIDEO GENERATION
        if (text.toLowerCase().startsWith('video') ||
            text.toLowerCase().startsWith('make a video') ||
            text.toLowerCase().startsWith('animate')) {

            addMessage(text, 'user');
            userInput.value = '';

            const prompt = text.replace(/video|make a video|animate|of/gi, '').trim();
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&nologo=true&seed=${seed}&video=true`;

            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-video"></i></div>
                <div class="glass-card">
                    <p class="generating-loader">🎥 <strong>Rendering:</strong> "${prompt}"... (May take a moment)</p>
                    <img src="${url}" class="generated-media" onload="this.previousElementSibling.innerText='🎥 Render Complete.'; this.scrollIntoView({behavior:'smooth'})">
                </div>
            `;
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;
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

        if (sender === 'bot') {
            div.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="glass-card">${marked.parse(text)}</div>
            `;
        } else {
            div.innerHTML = `<div class="glass-card">${marked.parse(text)}</div>`;
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function triggerAI(promptText) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.innerHTML = `
            <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="glass-card"><span class="generating-loader">Thinking...</span></div>
        `;
        chatWindow.appendChild(loadingDiv);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            const data = await response.json();
            chatWindow.removeChild(loadingDiv);
            if (data.error) addMessage("⚠️ Error: " + data.error, 'bot');
            else addMessage(data.reply, 'bot');
        } catch (e) {
            chatWindow.removeChild(loadingDiv);
            addMessage("❌ Connection failed. Please try again.", 'bot');
        }
        userInput.disabled = false;
        userInput.focus();
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
