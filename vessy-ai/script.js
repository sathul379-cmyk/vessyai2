// ... inside handleSend function ...

    try {
        // CHANGE THIS LINE:
        // Old: fetch('/.netlify/functions/chat', ...
        // New:
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });
        
        // ... rest of the code stays the same ...
