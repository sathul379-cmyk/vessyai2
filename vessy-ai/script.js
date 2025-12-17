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
document.getElementById('customBgInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => { bgLayer.style.backgroundImage = `url(${event.target.result})`; };
        reader.readAsDataURL(file);
    }
});
function setBg(type) { bgLayer.style.backgroundImage = ''; bgLayer.className = 'bg-' + type; }

// --- 2. SECRET GAME ---
function openGame() { gameFrame.src = "https://classic.minecraft.net/"; gameOverlay.classList.add('active'); }
function closeGame() { gameOverlay.classList.remove('active'); gameFrame.src = ""; }

// --- 3. UNIVERSAL PREVIEW LOGIC (NEW) ---
window.openPreview = function(code, lang) {
    previewModal.classList.remove('hidden');
    const doc = previewFrame.contentWindow.document;
    doc.open();
    
    let finalContent = "";

    if (lang === 'python' || lang === 'py') {
        // Inject PyScript to run Python in browser
        finalContent = `
            <html>
            <head>
                <link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css" />
                <script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script>
                <style>body { background: #111; color: #fff; font-family: monospace; padding: 20px; }</style>
            </head>
            <body>
                <h3>Python Output:</h3>
                <script type="py">
${code}
                </script>
            </body>
            </html>
        `;
    } else if (lang === 'javascript' || lang === 'js') {
        // Wrap JS in a console logger
        finalContent = `
            <html>
            <body style="background:#111; color:#0f0; font-family:monospace; padding:20px;">
                <h3>JS Console Output:</h3>
                <div id="console"></div>
                <script>
                    // Redirect console.log to screen
                    console.log = function(msg) { document.getElementById('console').innerHTML += msg + '<br>'; };
                    try {
                        ${code}
                    } catch(e) {
                        console.log("Error: " + e.message);
                    }
                </script>
            </body>
            </html>
        `;
    } else if (lang === 'css') {
        // Show CSS effect on a dummy element
        finalContent = `
            <html>
            <head><style>${code}</style></head>
            <body style="background:#fff; padding:20px;">
                <h1>CSS Preview</h1>
                <div class="test-box">This is a test element.</div>
                <button>Test Button</button>
            </body>
            </html>
        `;
    } else {
        // Default HTML
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
        
        // DETECT ANY CODE BLOCK
        // Looks for ```language ... ```
        const codeRegex = /```(\w+)([\s\S]*?)```/g;
        let match;
        let hasButton = false;

        // We use a loop to find the LAST code block to preview
        while ((match = codeRegex.exec(text)) !== null) {
            const lang = match[1].toLowerCase();
            const code = match[2];
            
            // Only add button for supported languages
            if (['html', 'python', 'py', 'javascript', 'js', 'css'].includes(lang)) {
                // Encode code safely
                const safeCode = encodeURIComponent(code);
                htmlContent += `
                    <button class="run-btn" onclick="openPreview(decodeURIComponent('${safeCode}'), '${lang}')">
                        ▶ Run ${lang.toUpperCase()}
                    </button>
                `;
                hasButton = true;
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
        const response = await fetch('/api', { // Using index.js
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
