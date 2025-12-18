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
    window.closeApp = () => {
        appModal.classList.add('hidden');
        appContent.innerHTML = ''; // Kill app to stop sounds/loops
    };

    window.setBg = (type) => {
        bgLayer.className = 'bg-' + type;
        bgLayer.style.backgroundImage = '';
    };
    document.getElementById('customBgInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (ev) => { bgLayer.style.backgroundImage = `url(${ev.target.result})`; };
            reader.readAsDataURL(file);
        }
    });

    // --- 3. APP LAUNCHER (THE WORKING APPS) ---
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

    // --- APP: CALCULATOR ---
    function initCalc() {
        appTitle.innerText = "Calculator";
        appContent.innerHTML = `
            <div class="calc-grid">
                <div id="calcDisplay" class="calc-display">0</div>
                <button class="calc-btn" onclick="calcInput('7')">7</button><button class="calc-btn" onclick="calcInput('8')">8</button><button class="calc-btn" onclick="calcInput('9')">9</button><button class="calc-btn accent" onclick="calcInput('/')">/</button>
                <button class="calc-btn" onclick="calcInput('4')">4</button><button class="calc-btn" onclick="calcInput('5')">5</button><button class="calc-btn" onclick="calcInput('6')">6</button><button class="calc-btn accent" onclick="calcInput('*')">*</button>
                <button class="calc-btn" onclick="calcInput('1')">1</button><button class="calc-btn" onclick="calcInput('2')">2</button><button class="calc-btn" onclick="calcInput('3')">3</button><button class="calc-btn accent" onclick="calcInput('-')">-</button>
                <button class="calc-btn" onclick="calcInput('0')">0</button><button class="calc-btn" onclick="calcInput('.')">.</button><button class="calc-btn" onclick="calcInput('C')">C</button><button class="calc-btn accent" onclick="calcInput('+')">+</button>
                <button class="calc-btn accent" style="grid-column: span 4" onclick="calcResult()">=</button>
            </div>`;
        
        let expr = "";
        window.calcInput = (v) => {
            if(v === 'C') expr = "";
            else expr += v;
            document.getElementById('calcDisplay').innerText = expr || "0";
        };
        window.calcResult = () => {
            try { expr = eval(expr).toString(); } catch { expr = "Error"; }
            document.getElementById('calcDisplay').innerText = expr;
        };
    }

    // --- APP: PAINT ---
    function initPaint() {
        appTitle.innerText = "Paint";
        appContent.innerHTML = `
            <div class="paint-toolbar">
                <div class="color-btn" style="background:black" onclick="setColor('black')"></div>
                <div class="color-btn" style="background:red" onclick="setColor('red')"></div>
                <div class="color-btn" style="background:blue" onclick="setColor('blue')"></div>
                <div class="color-btn" style="background:green" onclick="setColor('green')"></div>
                <div class="color-btn" style="background:white; border:1px solid #aaa" onclick="setColor('white')"></div> <!-- Eraser -->
            </div>
            <canvas id="paintCanvas"></canvas>`;
        
        const canvas = document.getElementById('paintCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = appContent.clientWidth;
        canvas.height = appContent.clientHeight - 40;
        
        let painting = false;
        let color = 'black';
        window.setColor = (c) => color = c;
        
        canvas.addEventListener('mousedown', () => painting = true);
        canvas.addEventListener('mouseup', () => painting = false);
        canvas.addEventListener('mousemove', (e) => {
            if(!painting) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        });
        canvas.addEventListener('mousedown', (e) => {
            ctx.beginPath(); // Reset path on new click
        });
    }

    // --- APP: SNAKE ---
    function initSnake() {
        appTitle.innerText = "Snake";
        appContent.innerHTML = '<canvas id="snakeCanvas"></canvas>';
        const canvas = document.getElementById('snakeCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 400;
        
        let snake = [{x: 10, y: 10}];
        let food = {x: 15, y: 15};
        let dx = 0; let dy = 0;
        let score = 0;
        
        function draw() {
            if(!document.getElementById('snakeCanvas')) return; // Stop if closed
            ctx.fillStyle = 'black'; ctx.fillRect(0,0,400,400);
            ctx.fillStyle = 'lime';
            snake.forEach(part => ctx.fillRect(part.x*20, part.y*20, 18, 18));
            ctx.fillStyle = 'red'; ctx.fillRect(food.x*20, food.y*20, 18, 18);
            
            const head = {x: snake[0].x + dx, y: snake[0].y + dy};
            snake.unshift(head);
            if(head.x === food.x && head.y === food.y) {
                food = {x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20)};
            } else {
                snake.pop();
            }
            
            if(head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
                snake = [{x: 10, y: 10}]; dx=0; dy=0; // Reset
            }
        }
        
        setInterval(draw, 100);
        document.addEventListener('keydown', (e) => {
            if(e.key === 'ArrowUp' && dy === 0) { dx=0; dy=-1; }
            if(e.key === 'ArrowDown' && dy === 0) { dx=0; dy=1; }
            if(e.key === 'ArrowLeft' && dx === 0) { dx=-1; dy=0; }
            if(e.key === 'ArrowRight' && dx === 0) { dx=1; dy=0; }
        });
    }

    // --- APP: MINECRAFT (VOXEL) ---
    function initMinecraft() {
        appTitle.innerText = "Voxel Engine";
        // Injecting the iframe directly so it works without API
        appContent.innerHTML = `
            <iframe srcdoc="
            <!DOCTYPE html><html><head><style>body{margin:0;overflow:hidden}#info{position:absolute;top:10px;left:10px;color:white;font-family:sans-serif;background:rgba(0,0,0,0.5);padding:5px}</style></head><body><div id='info'>Click to Capture Mouse<br>WASD to Move<br>Click to Add, Shift+Click to Remove</div><script type='module'>
            import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
            import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
            const scene=new THREE.Scene();scene.background=new THREE.Color(0x87CEEB);
            const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
            const renderer=new THREE.WebGLRenderer();renderer.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(renderer.domElement);
            const controls=new PointerLockControls(camera,document.body);document.body.addEventListener('click',()=>controls.lock());
            const geometry=new THREE.BoxGeometry(1,1,1);const material=new THREE.MeshBasicMaterial({color:0x00ff00,wireframe:false});
            const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:0x228b22}));floor.rotation.x=-Math.PI/2;floor.position.y=-1;scene.add(floor);
            const objects=[];
            document.addEventListener('mousedown',(e)=>{if(!controls.isLocked)return;
                const cube=new THREE.Mesh(geometry,new THREE.MeshNormalMaterial());
                const vector=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
                cube.position.copy(vector).addScalar(2);
                scene.add(cube);objects.push(cube);
            });
            function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}animate();
            </script></body></html>
            "></iframe>
        `;
    }

    // --- 4. CHAT & IMAGE GEN (FIXED) ---
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // INTERCEPT IMAGE GENERATION (Fixes 'I cant draw' error)
        if (text.toLowerCase().startsWith('draw') || text.toLowerCase().includes('image')) {
            addMessage(text, 'user');
            userInput.value = '';
            const prompt = text.replace(/draw|generate|image/gi, '').trim();
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
            
            const div = document.createElement('div');
            div.className = 'message bot';
            div.innerHTML = `<div class="glass-card"><p>Generating: ${prompt}</p><img src="${url}" class="generated-image" onload="this.scrollIntoView()"></div>`;
            chatWindow.appendChild(div);
            return;
        }

        addMessage(text, 'user');
        userInput.value = '';
        
        // Call API for text
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });
            const data = await response.json();
            if (data.error) addMessage("Error: " + data.error, 'bot');
            else addMessage(data.reply, 'bot');
        } catch (e) {
            addMessage("Connection Failed.", 'bot');
        }
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.innerHTML = `<div class="glass-card">${marked.parse(text)}</div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    document.getElementById('sendBtn').addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
});
