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

// --- 3. UNIVERSAL PREVIEW LOGIC (FIXED) ---
window.openPreview = function(encodedCode, lang) {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    const code = decodeURIComponent(encodedCode); // Decode safely
    
    doc.open();
    
    let finalContent = "";

    if (lang === 'python' || lang === 'py') {
        // Python Mode (PyScript)
        finalContent = `
            <html>
            <head>
                <link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" />
                <script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script>
                <style>body{background:#111;color:#fff;font-family:monospace;padding:20px;}</style>
            </head>
            <body>
                <h3>Python Output:</h3>
                <script type="py">${code}</script>
            </body>
            </html>`;
            
    } else if (lang === 'javascript' || lang === 'js') {
        // JS Mode (Console Output)
        finalContent = `
            <html>
            <body style="background:#111;color:#0f0;font-family:monospace;padding:20px;">
                <h3>JS Console:</h3>
                <div id="console"></div>
                <script>
                    console.log = function(m){ document.getElementById('console').innerHTML += m + '<br>'; };
                    try { ${code} } catch(e) { console.log("Error: " + e.message); }
                </script>
            </body>
            </html>`;
            
    } else if (lang === 'css') {
        // CSS Mode (The Fix: Adds HTML elements to style)
        finalContent = `
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #f4f4f9; color: #333; }
                    /* DEFAULT STYLES FOR DEMO */
                    .demo-container { display: flex; flex-direction: column; gap: 15px; max-width: 400px; margin: 0 auto; }
                    
                    /* USER CSS APPLIED HERE */
                    ${code}
                </style>
            </head>
            <body>
                <div class="demo-container">
                    <h2>CSS Preview</h2>
                    <p>This is a paragraph to test your typography settings.</p>
                    
                    <!-- Common Elements for CSS Testing -->
                    <button class="btn">.btn Class</button>
                    <button>Standard Button</button>
                    
                    <div class="card">
                        <h3>.card Class</h3>
                        <p>Content inside a card.</p>
                    </div>
                    
                    <div class="box">.box Class</div>
                    
                    <input type="text" placeholder="Input field">
                </div>
            </body>
            </html>`;
            
    } else {
        // HTML Mode (Standard)
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
        
        // Regex to find code blocks
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase();
            const code = match[2];
            
            // Supported languages
            if (['html', 'python', 'py', 'javascript', 'js', 'css'].includes(lang)) {
                // Encode safely to prevent breaking the HTML string
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

    // Secret Code
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
