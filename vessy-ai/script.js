document.addEventListener('DOMContentLoaded', () => {
    const termsOverlay = document.getElementById('termsOverlay');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const termsAcceptBtn = document.getElementById('termsAcceptBtn');
    const authOverlay = document.getElementById('authOverlay');
    const chatWindow = document.getElementById('chatWindow');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceReplyBtn = document.getElementById('voiceReplyBtn');
    const fileUploadBtn = document.getElementById('fileUploadBtn');
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const fileUploadInput = document.getElementById('fileUploadInput');
    const imageUploadInput = document.getElementById('imageUploadInput');
    const attachmentTray = document.getElementById('attachmentTray');
    const composerStatus = document.getElementById('composerStatus');
    const clockEl = document.getElementById('clock');
    const restrictionStorageKey = 'vessy_restriction_notice';
    const voiceReplyStorageKey = 'vessy_voice_reply_enabled';
    const MAX_ATTACHMENTS = 5;
    const MAX_TEXT_ATTACHMENT_CHARS = 6000;
    const MAX_IMAGE_ANALYSIS_BYTES = 3.5 * 1024 * 1024;
    const WAKE_PATTERN = /^(hey|hi)\s+vessy[\s,.!?-]*/i;

    let currentUsername = null;
    let sessionToken = null;
    let restrictionTriggered = false;
    let conversationHistory = [];
    let pendingAttachments = [];
    let recognition = null;
    let recognitionActive = false;
    let voiceCallMode = false;
    let isAssistantSpeaking = false;
    let voiceReplyEnabled = localStorage.getItem(voiceReplyStorageKey) !== 'false';
    let voiceInputSupported = false;
    let voiceReplySupported = 'speechSynthesis' in window;
    let callModeResponsePending = false;

    initClock();
    initTerms();
    initSession();
    initVoiceFeatures();
    initUploadFeatures();
    updateVoiceReplyButton();

    sendBtn.addEventListener('click', () => handleSend({ fromVoice: false }));
    userInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') handleSend({ fromVoice: false });
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.banned || data.restricted) {
                showRestrictionScreen(data);
                return;
            }

            if (data.success) {
                localStorage.setItem('vessy_session', JSON.stringify({ username: data.username, token: data.token }));
                currentUsername = data.username;
                sessionToken = data.token;
                authOverlay.classList.add('hidden');
                onUserReady();
            } else if (data.error) {
                document.getElementById('loginError').textContent = data.error;
            }
        } catch {
            document.getElementById('loginError').textContent = 'Connection Error';
        }
    });

    document.getElementById('signupBtn').addEventListener('click', async () => {
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;

        if (username.toLowerCase() === 'admin') {
            alert('Reserved username');
            return;
        }

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('vessy_session', JSON.stringify({ username: data.username, token: data.token }));
                currentUsername = data.username;
                sessionToken = data.token;
                authOverlay.classList.add('hidden');
                onUserReady();
            } else {
                alert(data.error);
            }
        } catch {
            alert('Connection Error');
        }
    });

    function initClock() {
        updateClock();
        setInterval(updateClock, 1000);
    }

    function updateClock() {
        if (!clockEl) return;
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function initTerms() {
        if (!termsCheckbox || !termsAcceptBtn) return;

        termsCheckbox.checked = false;
        termsAcceptBtn.disabled = true;

        termsCheckbox.addEventListener('change', function () {
            termsAcceptBtn.disabled = !this.checked;
            termsAcceptBtn.style.opacity = this.checked ? '1' : '0.3';
        });

        termsAcceptBtn.addEventListener('click', () => {
            if (!termsCheckbox.checked) return;
            localStorage.setItem('vessy_terms_accepted', 'true');
            termsOverlay.classList.add('hidden');
            if (!checkSession()) authOverlay.classList.remove('hidden');
        });
    }

    function initSession() {
        if (localStorage.getItem('vessy_terms_accepted') === 'true') {
            termsOverlay.classList.add('hidden');
            if (!checkSession()) authOverlay.classList.remove('hidden');
        }

        setInterval(() => {
            if (currentUsername) checkRestrictionStatus(false);
        }, 5000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && currentUsername) checkRestrictionStatus(false);
        });

        window.addEventListener('focus', () => {
            if (currentUsername) checkRestrictionStatus(false);
        });

        consumeStoredRestrictionNotice();
    }

    function checkSession() {
        try {
            const session = JSON.parse(localStorage.getItem('vessy_session'));
            if (session && session.username) {
                currentUsername = session.username;
                sessionToken = session.token;
                onUserReady();
                return true;
            }
        } catch {}
        return false;
    }

    function onUserReady() {
        document.getElementById('userBadgeName').textContent = currentUsername;
        document.getElementById('settingsUsername').textContent = currentUsername;
        checkRestrictionStatus(Boolean(readStoredRestrictionNotice()));
    }

    async function handleSend({ fromVoice }) {
        const text = userInput.value.trim();
        if (!text && pendingAttachments.length === 0) return;

        if (text && pendingAttachments.length === 0 && /^(draw|generate image|image)/i.test(text)) {
            addMsg(`<p>${escHtml(text)}</p>`, 'user');
            userInput.value = '';
            clearComposerStatus();
            await generateImage(text.replace(/^(draw|generate image|image)\s*/i, ''));
            return;
        }

        if (text && pendingAttachments.length === 0 && /^(video|animate)/i.test(text)) {
            addMsg(`<p>${escHtml(text)}</p>`, 'user');
            userInput.value = '';
            clearComposerStatus();
            await generateVideo(text.replace(/^(video|animate)\s*/i, ''));
            return;
        }

        const attachments = pendingAttachments.map(attachment => ({ ...attachment }));
        const payload = buildMessagePayload(text, attachments, fromVoice);
        addMsg(payload.userHtml, 'user');
        clearComposer();
        conversationHistory.push({ role: 'user', content: payload.historyText });
        await triggerAI(payload.prompt, payload.historyText, payload.attachments, fromVoice ? 'voice_call' : 'chat');
    }

    async function triggerAI(prompt, historyText, attachments = [], mode = 'chat') {
        const id = Date.now();
        addMsg('...', 'bot', id);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    username: currentUsername,
                    history: conversationHistory.slice(-10),
                    attachments,
                    mode
                })
            });
            const data = await response.json();
            const messageEl = document.getElementById(`msg-${id}`);
            if (messageEl) {
                messageEl.innerHTML = marked.parse(data.reply || data.error);
                conversationHistory.push({ role: 'assistant', content: data.reply || data.error });
                await maybeSpeakReply(data.reply, mode);
                saveChat(historyText || prompt, data.reply || data.error || '');
            }
        } catch {
            const messageEl = document.getElementById(`msg-${id}`);
            if (messageEl) messageEl.textContent = 'Connection failed.';
        } finally {
            callModeResponsePending = false;
            resumeVoiceCallIfNeeded();
        }
    }

    async function generateImage(prompt) {
        const id = Date.now();
        addMsg(`<p>Generating "${escHtml(prompt)}"...</p><div class="img-skeleton" id="skel-${id}">Loading...</div>`, 'bot');
        const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=1024&height=768&nologo=true`;
        const img = new Image();
        img.className = 'generated-media';
        img.alt = prompt;
        img.src = imageUrl;

        img.onload = () => {
            const skeleton = document.getElementById(`skel-${id}`);
            if (skeleton) skeleton.replaceWith(img);
            saveChat(prompt, `[Image: ${prompt}]`);
        };

        img.onerror = () => {
            const skeleton = document.getElementById(`skel-${id}`);
            if (skeleton) skeleton.innerHTML = 'Image generation failed. Please try again.';
        };
    }

    async function generateVideo(prompt) {
        const id = Date.now();
        addMsg(`<p>Rendering "${escHtml(prompt)}"...</p><div class="img-skeleton" id="skel-${id}">Rendering...</div>`, 'bot');
        const videoUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}`;
        const posterUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true`;
        const video = document.createElement('video');
        video.className = 'generated-media';
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.poster = posterUrl;
        video.src = videoUrl;

        video.onloadeddata = () => {
            const skeleton = document.getElementById(`skel-${id}`);
            if (skeleton) skeleton.replaceWith(video);
            saveChat(prompt, `[Video: ${prompt}]`);
        };

        video.onerror = () => {
            const skeleton = document.getElementById(`skel-${id}`);
            if (!skeleton) return;
            skeleton.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;padding:18px">
                    <div>Video generation failed.</div>
                    <img src="${posterUrl}" alt="${escHtml(prompt)}" class="generated-media">
                </div>`;
        };
    }

    function addMsg(html, role, id) {
        const wrapper = document.createElement('div');
        wrapper.className = `message ${role}`;
        if (role === 'bot') {
            wrapper.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="glass-card" ${id ? `id="msg-${id}"` : ''}>${html}</div>`;
        } else {
            wrapper.innerHTML = `<div class="glass-card" ${id ? `id="msg-${id}"` : ''}>${html}</div>`;
        }
        chatWindow.appendChild(wrapper);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function saveChat(userMessage, aiMessage) {
        try {
            await fetch('/api/save-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUsername,
                    userMessage,
                    aiMessage,
                    timestamp: new Date()
                })
            });
        } catch {}
    }

    function initVoiceFeatures() {
        if (!voiceReplySupported) voiceReplyBtn.disabled = true;

        voiceReplyBtn.addEventListener('click', () => {
            if (!voiceReplySupported) return;
            voiceReplyEnabled = !voiceReplyEnabled;
            localStorage.setItem(voiceReplyStorageKey, String(voiceReplyEnabled));
            updateVoiceReplyButton();
            setComposerStatus(voiceReplyEnabled ? 'Voice replies enabled.' : 'Voice replies disabled.', voiceReplyEnabled ? 'active' : '');
        });

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            voiceBtn.disabled = true;
            setComposerStatus('Voice call is not supported in this browser.', 'warn');
            return;
        }

        voiceInputSupported = true;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.addEventListener('start', () => {
            recognitionActive = true;
            voiceBtn.classList.add('recording');
            setComposerStatus(voiceCallMode ? 'Voice call live. Say "Hey Vessy" or speak normally.' : 'Listening...', 'active');
        });

        recognition.addEventListener('end', () => {
            recognitionActive = false;
            voiceBtn.classList.remove('recording');
            if (voiceCallMode && !callModeResponsePending && !isAssistantSpeaking) {
                startRecognition();
            } else if (!pendingAttachments.length) {
                clearComposerStatus();
            }
        });

        recognition.addEventListener('error', event => {
            recognitionActive = false;
            voiceBtn.classList.remove('recording');
            setComposerStatus(`Voice input error: ${event.error}.`, 'warn');
        });

        recognition.addEventListener('result', event => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript.trim()) {
                setComposerStatus(voiceCallMode ? `Voice call live: ${interimTranscript.trim()}` : interimTranscript.trim(), 'active');
            }

            if (finalTranscript.trim()) {
                handleVoiceTranscript(finalTranscript.trim());
            }
        });

        voiceBtn.addEventListener('click', async () => {
            if (!recognition) return;
            if (voiceCallMode) {
                stopVoiceCall();
                return;
            }

            voiceCallMode = true;
            voiceReplyEnabled = true;
            localStorage.setItem(voiceReplyStorageKey, 'true');
            updateVoiceReplyButton();
            setComposerStatus('Voice call connected. Say "Hey Vessy" to wake me.', 'active');
            await speakReply('Voice call connected. Say Hey Vessy when you are ready.');
            startRecognition();
        });
    }

    function startRecognition() {
        if (!recognition || recognitionActive || isAssistantSpeaking) return;
        try {
            recognition.start();
        } catch {}
    }

    function stopRecognition() {
        if (recognition && recognitionActive) recognition.stop();
    }

    function stopVoiceCall() {
        voiceCallMode = false;
        callModeResponsePending = false;
        stopRecognition();
        if (voiceReplySupported) window.speechSynthesis.cancel();
        voiceBtn.classList.remove('recording');
        clearComposerStatus();
    }

    function handleVoiceTranscript(transcript) {
        const normalized = transcript.replace(/\s+/g, ' ').trim();
        if (!normalized) return;

        const strippedWake = normalized.replace(WAKE_PATTERN, '').trim();
        if (!strippedWake && WAKE_PATTERN.test(normalized)) {
            stopRecognition();
            callModeResponsePending = true;
            speakReply('Hello, how are you doing?').then(() => {
                callModeResponsePending = false;
                resumeVoiceCallIfNeeded();
            });
            return;
        }

        const finalText = WAKE_PATTERN.test(normalized) ? strippedWake : normalized;
        if (!finalText) return;

        userInput.value = finalText;
        stopRecognition();
        callModeResponsePending = true;
        handleSend({ fromVoice: true });
    }

    async function maybeSpeakReply(reply, mode) {
        if (!reply || !voiceReplyEnabled || !voiceReplySupported) return;
        await speakReply(reply, mode === 'voice_call');
    }

    function speakReply(markdownText, forceConversationTone = false) {
        return new Promise(resolve => {
            if (!voiceReplySupported) {
                resolve();
                return;
            }

            const plainText = String(markdownText)
                .replace(/```[\s\S]*?```/g, ' code block ')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                .replace(/[#>*_~-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!plainText) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(plainText);
            utterance.rate = forceConversationTone ? 1.02 : 1;
            utterance.pitch = 1;
            utterance.onstart = () => {
                isAssistantSpeaking = true;
                stopRecognition();
            };
            utterance.onend = () => {
                isAssistantSpeaking = false;
                resolve();
                resumeVoiceCallIfNeeded();
            };
            utterance.onerror = () => {
                isAssistantSpeaking = false;
                resolve();
                resumeVoiceCallIfNeeded();
            };

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        });
    }

    function resumeVoiceCallIfNeeded() {
        if (voiceCallMode && !callModeResponsePending && !isAssistantSpeaking && !userInput.disabled) {
            startRecognition();
        }
    }

    function updateVoiceReplyButton() {
        voiceReplyBtn.classList.toggle('active', voiceReplySupported && voiceReplyEnabled);
    }

    function initUploadFeatures() {
        fileUploadBtn.addEventListener('click', () => fileUploadInput.click());
        imageUploadBtn.addEventListener('click', () => imageUploadInput.click());

        fileUploadInput.addEventListener('change', async event => {
            await addSelectedFiles(Array.from(event.target.files || []), 'file');
            event.target.value = '';
        });

        imageUploadInput.addEventListener('change', async event => {
            await addSelectedFiles(Array.from(event.target.files || []), 'image');
            event.target.value = '';
        });
    }

    async function addSelectedFiles(files, mode) {
        if (!files.length) return;

        const openSlots = MAX_ATTACHMENTS - pendingAttachments.length;
        if (openSlots <= 0) {
            setComposerStatus(`You can attach up to ${MAX_ATTACHMENTS} items at a time.`, 'warn');
            return;
        }

        const selectedFiles = files.slice(0, openSlots);
        for (const file of selectedFiles) {
            const attachment = await normalizeAttachment(file, mode);
            pendingAttachments.push(attachment);
        }

        renderAttachmentTray();
        setComposerStatus(`${pendingAttachments.length} attachment${pendingAttachments.length === 1 ? '' : 's'} ready to send.`, 'active');
    }

    async function normalizeAttachment(file, mode) {
        const isImage = mode === 'image';
        const attachment = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            kind: isImage ? 'image' : 'file',
            name: file.name,
            size: formatFileSize(file.size),
            mimeType: file.type || 'unknown',
            previewUrl: '',
            analysisDataUrl: '',
            extractedText: '',
            note: ''
        };

        if (isImage) {
            const dataUrl = await readFileAsDataUrl(file);
            attachment.previewUrl = dataUrl;
            if (file.size <= MAX_IMAGE_ANALYSIS_BYTES) {
                attachment.analysisDataUrl = dataUrl;
                attachment.note = 'Ready for image analysis.';
            } else {
                attachment.note = 'Image too large for deep analysis, sending preview metadata only.';
            }
            return attachment;
        }

        if (isTextReadable(file)) {
            const raw = await file.text();
            attachment.extractedText = raw.slice(0, MAX_TEXT_ATTACHMENT_CHARS);
            attachment.note = raw.length > MAX_TEXT_ATTACHMENT_CHARS ? 'Text preview truncated before analysis.' : 'Ready for file analysis.';
        } else {
            attachment.note = 'Attached as metadata only.';
        }

        return attachment;
    }

    function renderAttachmentTray() {
        attachmentTray.innerHTML = pendingAttachments.map(attachment => `
            <div class="attachment-chip">
                ${attachment.kind === 'image'
                    ? `<img class="attachment-thumb" src="${attachment.previewUrl}" alt="${escHtml(attachment.name)}">`
                    : `<div class="attachment-icon"><i class="fa-solid fa-file-lines"></i></div>`}
                <div class="attachment-meta">
                    <div class="attachment-name">${escHtml(attachment.name)}</div>
                    <div class="attachment-subtext">${escHtml(attachment.size)} - ${escHtml(attachment.note || 'Ready')}</div>
                </div>
                <button class="attachment-remove" type="button" data-attachment-id="${attachment.id}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        attachmentTray.classList.toggle('hidden', pendingAttachments.length === 0);
        imageUploadBtn.classList.toggle('image-active', pendingAttachments.some(item => item.kind === 'image'));

        attachmentTray.querySelectorAll('.attachment-remove').forEach(button => {
            button.addEventListener('click', () => removeAttachment(button.dataset.attachmentId));
        });
    }

    function removeAttachment(attachmentId) {
        pendingAttachments = pendingAttachments.filter(item => item.id !== attachmentId);
        renderAttachmentTray();

        if (pendingAttachments.length) {
            setComposerStatus(`${pendingAttachments.length} attachment${pendingAttachments.length === 1 ? '' : 's'} ready to send.`, 'active');
        } else if (!recognitionActive) {
            clearComposerStatus();
        }
    }

    function buildMessagePayload(text, attachments, fromVoice) {
        const cleanText = text.trim();
        const summaryLines = attachments.map(attachment => {
            const label = attachment.kind === 'image' ? 'Image' : 'File';
            return `[${label}] ${attachment.name} (${attachment.size})`;
        });

        const promptSections = attachments.map(attachment => {
            if (attachment.kind === 'image') {
                return `Uploaded image: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nNote: ${attachment.note}`;
            }
            if (attachment.extractedText) {
                return `Uploaded file: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nContents:\n${attachment.extractedText}`;
            }
            return `Uploaded file: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nNote: ${attachment.note}`;
        });

        const historyText = [cleanText || 'Shared attachments.', ...summaryLines].filter(Boolean).join('\n');
        const prompt = [
            fromVoice ? `Voice request: ${cleanText || 'Please help with these attachments.'}` : cleanText || 'Please help with these attachments.',
            attachments.length ? `Attachments:\n${promptSections.join('\n\n')}` : ''
        ].filter(Boolean).join('\n\n');

        const attachmentHtml = attachments.length ? `
            <div class="message-attachments">
                ${attachments.map(attachment => attachment.kind === 'image'
                    ? `<div class="message-attachment-chip"><img src="${attachment.previewUrl}" alt="${escHtml(attachment.name)}"><span>${escHtml(attachment.name)}</span></div>`
                    : `<div class="message-attachment-chip"><i class="fa-solid fa-file-lines"></i><span>${escHtml(attachment.name)}</span></div>`).join('')}
            </div>` : '';

        return {
            prompt,
            historyText,
            userHtml: `${cleanText ? `<p>${escHtml(cleanText)}</p>` : '<p>Shared attachments.</p>'}${attachmentHtml}`,
            attachments
        };
    }

    function clearComposer() {
        userInput.value = '';
        pendingAttachments = [];
        renderAttachmentTray();
        if (!recognitionActive) clearComposerStatus();
    }

    function initSessionControls() {}

    function consumeStoredRestrictionNotice() {
        const stored = readStoredRestrictionNotice();
        if (stored && localStorage.getItem('vessy_session')) showRestrictionScreen(stored);
    }

    function readStoredRestrictionNotice() {
        try {
            return JSON.parse(localStorage.getItem(restrictionStorageKey) || 'null');
        } catch {
            return null;
        }
    }

    async function checkRestrictionStatus(skipReload) {
        if (!currentUsername) return;

        try {
            const response = await fetch('/api/ban-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-status', username: currentUsername })
            });
            const data = await response.json();

            if (data.restricted) {
                localStorage.setItem(restrictionStorageKey, JSON.stringify(data));
                if (!skipReload && !restrictionTriggered) {
                    restrictionTriggered = true;
                    location.reload();
                    return;
                }
                showRestrictionScreen(data);
            } else {
                localStorage.removeItem(restrictionStorageKey);
                clearRestrictionScreen();
            }
        } catch {}
    }

    function clearRestrictionScreen() {
        const existing = document.getElementById('banScreen');
        if (existing) existing.remove();
        userInput.disabled = false;
        sendBtn.disabled = false;
        voiceBtn.disabled = !voiceInputSupported;
        voiceReplyBtn.disabled = !voiceReplySupported;
        fileUploadBtn.disabled = false;
        imageUploadBtn.disabled = false;
        userInput.placeholder = 'Ask Vessy OS...';
    }

    function showRestrictionScreen(data) {
        const existing = document.getElementById('banScreen');
        if (existing) existing.remove();

        const title = getRestrictionTitle(data);
        const reason = escHtml(data.reason || 'Classified');
        const timeLeft = escHtml(data.timeLeft || 'Unknown time');
        const typeLabel = data.type === 'ip' ? 'Your IP address has been restricted' : 'Your account has been restricted';
        const accent = data.kind === 'kicked' ? '#ffaa00' : '#ff0055';
        const border = data.kind === 'kicked' ? 'rgba(255,170,0,.2)' : 'rgba(255,0,85,.2)';
        const boxBg = data.kind === 'kicked' ? 'rgba(255,170,0,.05)' : 'rgba(255,0,85,.04)';
        const boxBorder = data.kind === 'kicked' ? 'rgba(255,170,0,.16)' : 'rgba(255,0,85,.1)';

        userInput.disabled = true;
        sendBtn.disabled = true;
        voiceBtn.disabled = true;
        voiceReplyBtn.disabled = true;
        fileUploadBtn.disabled = true;
        imageUploadBtn.disabled = true;
        userInput.placeholder = title;
        stopVoiceCall();

        const overlay = document.createElement('div');
        overlay.id = 'banScreen';
        overlay.className = 'overlay-screen';
        overlay.innerHTML = `
            <div class="overlay-backdrop"></div>
            <div class="overlay-modal" style="max-width:440px;text-align:center;border-color:${border}">
                <div class="overlay-glow"></div>
                <div class="overlay-header">
                    <div class="overlay-icon" style="background:${boxBg};border-color:${border};color:${accent}">
                        <i class="fa-solid ${data.kind === 'kicked' ? 'fa-arrow-right-from-bracket' : 'fa-ban'}"></i>
                    </div>
                    <h1>${title}</h1>
                    <p class="overlay-subtitle">${typeLabel}</p>
                </div>
                <div class="overlay-body" style="text-align:center">
                    <div style="background:${boxBg};border:1px solid ${boxBorder};border-radius:12px;padding:16px;margin-bottom:16px">
                        <div style="font-size:16px;color:${accent};font-weight:700;line-height:1.5">You have been ${escHtml(data.kind || 'banned')}.</div>
                        <div style="font-size:12px;color:#999;margin-top:10px">Because: <span style="color:#ddd;font-weight:600">${reason}</span></div>
                        <div style="font-size:12px;color:#999;margin-top:8px">For: <span style="color:${accent};font-weight:700">${timeLeft}</span></div>
                        <div style="font-size:9px;color:#444;margin-top:10px">${typeLabel}</div>
                    </div>
                </div>
                <div class="overlay-footer">
                    <button class="ghost-btn" onclick="location.reload()">Reload</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    function getRestrictionTitle(data) {
        if (data.kind === 'kicked') return 'You have been kicked';
        if (data.kind === 'temp banned') return 'You have been temp banned';
        return 'You have been banned';
    }

    function setComposerStatus(message, tone) {
        composerStatus.textContent = message;
        composerStatus.className = 'composer-status';
        if (tone) composerStatus.classList.add(tone);
    }

    function clearComposerStatus() {
        composerStatus.textContent = '';
        composerStatus.className = 'composer-status hidden';
    }

    function formatFileSize(size) {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    function isTextReadable(file) {
        const name = file.name.toLowerCase();
        const type = (file.type || '').toLowerCase();
        return type.startsWith('text/')
            || type.includes('json')
            || type.includes('xml')
            || type.includes('javascript')
            || type.includes('csv')
            || /\.(txt|md|json|csv|js|ts|html|css|xml|rtf)$/i.test(name);
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function escHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.switchAuth = view => {
        document.getElementById('loginView').classList.toggle('hidden', view !== 'login');
        document.getElementById('signupView').classList.toggle('hidden', view !== 'signup');
    };

    window.togglePw = (inputId, button) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', !reveal);
            icon.classList.toggle('fa-eye-slash', reveal);
        }
    };

    window.logoutUser = () => {
        localStorage.removeItem('vessy_session');
        localStorage.removeItem(restrictionStorageKey);
        location.reload();
    };

    window.launchApp = app => {
        if (app === 'browser') {
            document.getElementById('appModal').classList.remove('hidden');
            document.getElementById('appContent').innerHTML = '<iframe src="https://www.wikipedia.org"></iframe>';
            document.getElementById('appTitle').innerText = 'Browser';
        }
    };

    window.closeApp = () => document.getElementById('appModal').classList.add('hidden');
    document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('appGrid').classList.toggle('hidden'));
    document.getElementById('settingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.toggle('hidden'));
    window.toggleSettings = () => document.getElementById('settingsModal').classList.add('hidden');
    window.setBg = theme => document.getElementById('bgLayer').className = `bg-${theme}`;
});
