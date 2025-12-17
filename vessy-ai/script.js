const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const bgLayer = document.getElementById('bgLayer');
const gameOverlay = document.getElementById('gameOverlay');
const gameFrame = document.getElementById('gameFrame');
const previewModal = document.getElementById('previewModal');
const previewFrame = document.getElementById('previewFrame');

// --- 1. SETTINGS ---
document.getElementById('settingsBtn').addEventListener('click', () => settingsModal.classList.toggle('hidden'));
function toggleSettings() { settingsModal.classList.toggle('hidden'); }

function setBg(type) {
    bgLayer.style.backgroundImage = ''; 
    bgLayer.className = 'bg-' + type;
}

document.getElementById('customBgInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            bgLayer.className = ''; 
            bgLayer.style.backgroundImage = `url(${event.target.result})`;
        };
        reader.readAsDataURL(file);
    }
});

// --- 2. SECRET GAME ---
function openGame() {
    gameFrame.src = "https://classic.minecraft.net/";
    gameOverlay.classList.add('active');
}
function closeGame() {
    gameOverlay.classList.remove('active');
    gameFrame.src = "";
}

// --- 3. ULTIMATE PREVIEW LOGIC ---
window.openPreview = function(encodedCode, lang) {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    const code = decodeURIComponent(encodedCode);
    
    doc.open();
    
    let finalContent = "";

    // --- PYTHON (PyScript) ---
    if (lang === 'python' || lang === 'py') {
        finalContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" />
                <script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script>
                <style>
                    body { background: #0d1117; color: #c9d1d9; font-family: 'Courier New', monospace; padding: 20px; }
                    h3 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
                    .loading { color: #8b949e; font-style: italic; }
                </style>
            </head>
            <body>
                <h3>🐍 Python Terminal</h3>
                <div class="loading">Initializing Python Environment...</div>
                <script type="py" terminal>${code}</script>
            </body>
            </html>`;
    } 
    // --- JAVASCRIPT (Console Capture) ---
    else if (lang === 'javascript' || lang === 'js') {
        finalContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { background: #1e1e1e; color: #d4d4d4; font-family: Consolas, monospace; padding: 20px; }
                    h3 { color: #f7df1e; border-bottom: 1px solid #333; padding-bottom: 10px; }
                    .log { padding: 5px 0; border-bottom: 1px solid #333; }
                    .error { color: #f48771; }
                    #app { background: #252526; padding: 10px; margin-bottom: 20px; border-radius: 5px; border: 1px solid #333; }
                </style>
            </head>
            <body>
                <h3>⚡ JavaScript Console</h3>
                <!-- A div for the code to manipulate if it wants -->
                <div id="app">DOM Playground (id="app")</div>
                <div id="console"></div>
                <script>
                    const consoleDiv = document.getElementById('console');
                    
                    // Capture console.log
                    console.log = function(...args) {
                        const line = document.createElement('div');
                        line.className = 'log';
                        line.textContent = '> ' + args.join(' ');
                        consoleDiv.appendChild(line);
                    };
                    
                    // Capture errors
                    window.onerror = function(msg, url, line) {
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'log error';
                        lineDiv.textContent = '❌ Error: ' + msg;
                        consoleDiv.appendChild(lineDiv);
                        return true;
                    };

                    try {
                        ${code}
                    } catch(e) {
                        console.error(e);
                    }
                </script>
            </body>
            </html>`;
    } 
    // --- CSS (Test Suite) ---
    else if (lang === 'css') {
        finalContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #fff; color: #333; display: flex; flex-direction: column; gap: 20px; align-items: center; }
                    /* USER CSS */
                    ${code}
                </style>
            </head>
            <body>
                <h2>CSS Preview Suite</h2>
                <button class="btn">Button Class</button>
                <button>Plain Button</button>
                <div class="card">
                    <h3>Card Element</h3>
                    <p>This is some text inside a card div.</p>
                </div>
                <input type="text" placeholder="Input field...">
                <div class="box">Box Element</div>
            </body>
            </html>`;
    } 
    // --- JAVA (Virtual Viewer) ---
    else if (lang === 'java') {
        finalContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { background: #282c34; color: #abb2bf; font-family: 'Courier New', monospace; padding: 20px; }
                    h3 { color: #e06c75; }
                    pre { background: #21252b; padding: 15px; border-radius: 5px; overflow: auto; }
                    .note { color: #98c379; margin-top: 20px; font-style: italic; }
                </style>
            </head>
            <body>
                <h3>☕ Java Viewer</h3>
                <p>Browsers cannot run raw Java code natively. Here is your compiled source:</p>
                <pre>${code.replace(/</g, '&lt;')}</pre>
                <div class="note">To run this, install JDK on your computer and run: javac Main.java</div>
            </body>
            </html>`;
    }
    // --- HTML (Standard) ---
    else {
        finalContent = code;
    }

    doc.write(finalContent);
    doc.close();
};

window.closePreview = () => previewModal.classList.add('hidden');

// --- 4. CHAT LOGIC ---
marked.setOptions({ highlight: (code) => code });

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    const card = document.createElement('div');
    card.className = 'glass-card';
    
    if (sender === 'bot') {
        let htmlContent = marked.parse(text);
        
        // Detect Code Blocks
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase();
            const code = match[2];
            
            // Supported Languages
            if (['html', 'python', 'py', 'javascript', 'js', 'css', 'java'].includes(lang)) {
                const safeCode = encodeURIComponent(code);
                htmlContent += `
                    <button class="run-btn" onclick="openPreview('${safeCode}', '${lang}')">
                        ▶ Run ${lang.toUpperCase()}
                    </button>
                `;
            }
        }
        card.innerHTML = htmlContent;
    } else {
        card.textContent = text;
    }
    div.appendChild(card);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    if (text === 's1c1d3') {
        userInput.value = '';
        addMessage("ACCESS GRANTED.", 'bot');
        setTimeout(openGame, 1500);
        return; 
    }

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-card">...</div>';
    chatWindow.appendChild(loadingDiv);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
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
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
