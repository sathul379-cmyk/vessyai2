const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modal = document.getElementById('previewModal');
const iframe = document.getElementById('previewFrame');

// 1. Configure Markdown Parser
marked.setOptions({
    highlight: function(code, lang) {
        return code;
    }
});

// 2. Function to Render Messages
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    const card = document.createElement('div');
    card.className = 'glass-card';
    
    if (sender === 'bot') {
        // Parse Markdown
        let htmlContent = marked.parse(text);
        
        // CHECK FOR HTML CODE TO PREVIEW
        // We look for <pre><code>...</code></pre> blocks containing "html"
        if (text.includes("```html") || text.includes("<!DOCTYPE html>")) {
            // Extract the code for the preview button
            const codeMatch = text.match(/```html([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
            if (codeMatch) {
                const code = codeMatch[1];
                // Add the RUN button
                htmlContent += `
                    <button class="run-btn" onclick="openPreview(decodeURIComponent('${encodeURIComponent(code)}'))">
                        ▶ Run App
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

// 3. Preview Functions
window.openPreview = function(code) {
    modal.classList.remove('hidden');
    // Inject code into iframe
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(code);
    doc.close();
};

window.closePreview = function() {
    modal.classList.add('hidden');
};

// 4. Send Logic
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;
    
    // Loading State
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = '<div class="glass-card" style="color:#00f2ff">Processing...</div>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });
        
        const data = await response.json();
        chatWindow.removeChild(loadingDiv);
        
        if (data.error) {
            addMessage("⚠️ Error: " + data.error, 'bot');
        } else {
            addMessage(data.reply, 'bot');
        }
    } catch (e) {
        chatWindow.removeChild(loadingDiv);
        console.error(e);
        addMessage("⚠️ Connection Failed. Check Console for details.", 'bot');
    }

    userInput.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
