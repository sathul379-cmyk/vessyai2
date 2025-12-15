// ... inside handleSend function, inside the try block ...

        const data = await response.json();

        // Reset Island
        island.style.width = '';
        statusText.textContent = 'Vessy Intelligence';

        const botDiv = document.createElement('div');
        botDiv.className = 'message bot-message';
        const bubble = document.createElement('div');
        bubble.className = 'glass-bubble';
        
        botDiv.appendChild(bubble);
        chatWindow.appendChild(botDiv);

        if (data.error) {
            bubble.style.color = '#ff4444';
            bubble.textContent = "Error: " + data.error;
        } else {
            // Show the response
            typeWriter(bubble, data.reply);
            
            // OPTIONAL: Show which model was used (Tiny text at bottom)
            if (data.debug_model) {
                const modelTag = document.createElement('div');
                modelTag.style.fontSize = '10px';
                modelTag.style.opacity = '0.5';
                modelTag.style.marginTop = '5px';
                modelTag.textContent = `Powered by: ${data.debug_model}`;
                bubble.appendChild(modelTag);
            }
        }

// ... rest of code ...
