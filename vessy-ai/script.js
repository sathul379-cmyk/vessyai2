document.addEventListener('DOMContentLoaded', () => {
    const byId = id => document.getElementById(id);

    const els = {
        termsOverlay: byId('termsOverlay'),
        termsCheckbox: byId('termsCheckbox'),
        termsAcceptBtn: byId('termsAcceptBtn'),
        authOverlay: byId('authOverlay'),
        cookieBanner: byId('cookieBanner'),
        cookieAcceptAll: byId('cookieAcceptAll'),
        cookieEssentialOnly: byId('cookieEssentialOnly'),
        chatWindow: byId('chatWindow'),
        userInput: byId('userInput'),
        sendBtn: byId('sendBtn'),
        voiceBtn: byId('voiceBtn'),
        plusBtn: byId('plusBtn'),
        composerMenu: byId('composerMenu'),
        fileUploadBtn: byId('fileUploadBtn'),
        imageUploadBtn: byId('imageUploadBtn'),
        generateImageBtn: byId('generateImageBtn'),
        generateVideoBtn: byId('generateVideoBtn'),
        cameraOpenBtn: byId('cameraOpenBtn'),
        fileUploadInput: byId('fileUploadInput'),
        imageUploadInput: byId('imageUploadInput'),
        attachmentTray: byId('attachmentTray'),
        composerStatus: byId('composerStatus'),
        menuBtn: byId('menuBtn'),
        settingsBtn: byId('settingsBtn'),
        userBadge: byId('userBadge'),
        drawerBackdrop: byId('drawerBackdrop'),
        sideDrawer: byId('sideDrawer'),
        drawerCloseBtn: byId('drawerCloseBtn'),
        drawerTabs: Array.from(document.querySelectorAll('.drawer-tab')),
        historyList: byId('historyList'),
        drawerUsername: byId('drawerUsername'),
        drawerUserEmail: byId('drawerUserEmail'),
        drawerUserCreated: byId('drawerUserCreated'),
        voiceReplyToggle: byId('voiceReplyToggle'),
        voiceSelect: byId('voiceSelect'),
        personalizationToggle: byId('personalizationToggle'),
        personalizationStatus: byId('personalizationStatus'),
        deletePersonalizationBtn: byId('deletePersonalizationBtn'),
        logoutBtn: byId('logoutBtn'),
        deleteAccountBtn: byId('deleteAccountBtn'),
        bgOptions: Array.from(document.querySelectorAll('.bg-option')),
        userBadgeName: byId('userBadgeName'),
        loginBtn: byId('loginBtn'),
        signupBtn: byId('signupBtn'),
        loginUsername: byId('loginUsername'),
        loginPassword: byId('loginPassword'),
        loginError: byId('loginError'),
        signupUsername: byId('signupUsername'),
        signupPassword: byId('signupPassword'),
        signupError: byId('signupError'),
        cameraModal: byId('cameraModal'),
        cameraCloseBtn: byId('cameraCloseBtn'),
        capturePhotoBtn: byId('capturePhotoBtn'),
        switchCameraBtn: byId('switchCameraBtn'),
        cameraPreview: byId('cameraPreview'),
        cameraCanvas: byId('cameraCanvas'),
        bgLayer: byId('bgLayer'),
        appModal: byId('appModal'),
        appTitle: byId('appTitle'),
        appContent: byId('appContent'),
        clock: byId('clock')
    };

    const STORAGE_KEYS = {
        terms: 'vessy_terms_accepted',
        cookies: 'vessy_cookies_choice',
        session: 'vessy_session',
        restriction: 'vessy_restriction_notice',
        background: 'vessy_background',
        voiceReply: 'vessy_voice_reply_enabled',
        voiceName: 'vessy_voice_name'
    };

    const MAX_ATTACHMENTS = 5;
    const MAX_TEXT_ATTACHMENT_CHARS = 6000;
    const MAX_IMAGE_ANALYSIS_BYTES = 3.5 * 1024 * 1024;
    const WAKE_PATTERN = /^(hey|hi)\s+vessy[\s,.!?-]*/i;

    let currentUsername = null;
    let sessionToken = null;
    let accountData = null;
    let restrictionTriggered = false;
    let pendingAttachments = [];
    let conversationHistory = [];
    let voiceReplyEnabled = localStorage.getItem(STORAGE_KEYS.voiceReply) !== 'false';
    let selectedVoiceName = localStorage.getItem(STORAGE_KEYS.voiceName) || '';
    let browserVoices = [];
    let availableVoices = [];
    let recognition = null;
    let recognitionActive = false;
    let voiceCallMode = false;
    let callModeResponsePending = false;
    let isAssistantSpeaking = false;
    let currentAudio = null;
    let stopActivePlayback = null;
    let currentCameraStream = null;
    let cameraDevices = [];
    let currentCameraIndex = 0;

    initClock();
    initCookieBanner();
    initTerms();
    initBackground();
    initDrawer();
    initVoice();
    initComposer();
    initAuth();
    initCameraModal();
    initChromeActions();
    consumeStoredRestrictionNotice();
    initSession();

    function initClock() {
        const update = () => {
            if (els.clock) {
                els.clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        };
        update();
        setInterval(update, 1000);
    }

    function initCookieBanner() {
        if (!localStorage.getItem(STORAGE_KEYS.cookies)) {
            els.cookieBanner.classList.remove('hidden');
        }
        els.cookieAcceptAll?.addEventListener('click', () => {
            localStorage.setItem(STORAGE_KEYS.cookies, 'all');
            els.cookieBanner.classList.add('hidden');
        });
        els.cookieEssentialOnly?.addEventListener('click', () => {
            localStorage.setItem(STORAGE_KEYS.cookies, 'essential');
            els.cookieBanner.classList.add('hidden');
        });
    }

    function initTerms() {
        if (!els.termsCheckbox || !els.termsAcceptBtn) return;

        els.termsCheckbox.checked = false;
        els.termsAcceptBtn.disabled = true;
        els.termsCheckbox.addEventListener('change', function () {
            els.termsAcceptBtn.disabled = !this.checked;
            els.termsAcceptBtn.style.opacity = this.checked ? '1' : '0.3';
        });

        els.termsAcceptBtn.addEventListener('click', () => {
            if (!els.termsCheckbox.checked) return;
            localStorage.setItem(STORAGE_KEYS.terms, 'true');
            els.termsOverlay.classList.add('hidden');
            if (!checkSession()) els.authOverlay.classList.remove('hidden');
        });
    }

    function initBackground() {
        const storedBg = localStorage.getItem(STORAGE_KEYS.background) || 'default';
        setBackground(storedBg);
        els.bgOptions.forEach(option => {
            option.addEventListener('click', () => setBackground(option.dataset.bg));
        });
    }

    function setBackground(theme) {
        els.bgLayer.className = `bg-${theme}`;
        localStorage.setItem(STORAGE_KEYS.background, theme);
        els.bgOptions.forEach(option => option.classList.toggle('selected-bg', option.dataset.bg === theme));
    }

    function initDrawer() {
        const openDrawer = panelId => {
            els.sideDrawer.classList.remove('hidden');
            els.drawerBackdrop.classList.remove('hidden');
            setDrawerPanel(panelId);
        };
        const closeDrawer = () => {
            els.sideDrawer.classList.add('hidden');
            els.drawerBackdrop.classList.add('hidden');
        };

        els.menuBtn?.addEventListener('click', () => openDrawer('historyPanel'));
        els.settingsBtn?.addEventListener('click', () => openDrawer('settingsPanel'));
        els.userBadge?.addEventListener('click', () => openDrawer('settingsPanel'));
        els.drawerCloseBtn?.addEventListener('click', closeDrawer);
        els.drawerBackdrop?.addEventListener('click', closeDrawer);
        els.drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => setDrawerPanel(tab.dataset.panel));
        });

        window.toggleSettings = () => openDrawer('settingsPanel');
    }

    function setDrawerPanel(panelId) {
        els.drawerTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.panel === panelId));
        ['historyPanel', 'settingsPanel'].forEach(id => {
            byId(id)?.classList.toggle('hidden', id !== panelId);
        });
    }

    function initVoice() {
        populateVoices();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = populateVoices;
        }

        els.voiceReplyToggle.checked = voiceReplyEnabled;
        els.voiceReplyToggle.addEventListener('change', async () => {
            voiceReplyEnabled = els.voiceReplyToggle.checked;
            localStorage.setItem(STORAGE_KEYS.voiceReply, String(voiceReplyEnabled));
            await saveSettings({ voiceReplyEnabled: voiceReplyEnabled });
            setComposerStatus(voiceReplyEnabled ? 'Voice replies enabled.' : 'Voice replies disabled.', voiceReplyEnabled ? 'active' : '');
        });

        els.voiceSelect.addEventListener('change', async () => {
            selectedVoiceName = els.voiceSelect.value;
            localStorage.setItem(STORAGE_KEYS.voiceName, selectedVoiceName);
            await saveSettings({ preferredVoiceId: selectedVoiceName });
            await previewSelectedVoice();
        });

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            els.voiceBtn.disabled = true;
            setComposerStatus('Voice call is not supported in this browser.', 'warn');
            return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.addEventListener('start', () => {
            recognitionActive = true;
            els.voiceBtn.classList.add('recording');
            setComposerStatus(voiceCallMode ? 'Voice call live. Say "Hey Vessy".' : 'Listening...', 'active');
        });

        recognition.addEventListener('end', () => {
            recognitionActive = false;
            els.voiceBtn.classList.remove('recording');
            if (voiceCallMode && !callModeResponsePending && !isAssistantSpeaking && !els.userInput.disabled) {
                startRecognition();
            } else if (!pendingAttachments.length) {
                clearComposerStatus();
            }
        });

        recognition.addEventListener('error', event => {
            recognitionActive = false;
            els.voiceBtn.classList.remove('recording');
            setComposerStatus(`Voice input error: ${event.error}.`, 'warn');
        });

        recognition.addEventListener('result', event => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalTranscript += transcript;
                else interimTranscript += transcript;
            }

            if (interimTranscript.trim()) {
                setComposerStatus(`Voice call live: ${interimTranscript.trim()}`, 'active');
            }
            if (finalTranscript.trim()) {
                handleVoiceTranscript(finalTranscript.trim());
            }
        });

        els.voiceBtn.addEventListener('click', async () => {
            if (voiceCallMode) {
                stopVoiceCall();
                return;
            }
            voiceCallMode = true;
            voiceReplyEnabled = true;
            els.voiceReplyToggle.checked = true;
            localStorage.setItem(STORAGE_KEYS.voiceReply, 'true');
            await saveSettings({ voiceReplyEnabled: true });
            setComposerStatus('Voice call connected. Say "Hey Vessy" to start.', 'active');
            await speakReply('Hey, I am Vessy. Say Hey Vessy when you are ready.', true);
            startRecognition();
        });
    }

    function populateVoices() {
        if (!els.voiceSelect) return;

        browserVoices = getBrowserVoiceOptions();
        availableVoices = [...getPremiumVoiceOptions(), ...browserVoices];

        if (!availableVoices.length) {
            els.voiceReplyToggle.disabled = true;
            els.voiceSelect.disabled = true;
            els.voiceSelect.innerHTML = '<option value="">No voice available</option>';
            return;
        }

        els.voiceReplyToggle.disabled = false;
        els.voiceSelect.disabled = false;
        els.voiceSelect.innerHTML = availableVoices
            .map(voice => `<option value="${escapeAttr(voice.id)}">${escHtml(voice.label)}</option>`)
            .join('');

        const hasSelected = availableVoices.some(voice => voice.id === selectedVoiceName);
        if (!hasSelected) {
            selectedVoiceName = chooseDefaultVoiceId(availableVoices);
            localStorage.setItem(STORAGE_KEYS.voiceName, selectedVoiceName);
        }
        els.voiceSelect.value = selectedVoiceName;
    }

    function friendlyVoiceName(name) {
        const raw = String(name || '').trim();
        const lower = raw.toLowerCase();

        if (/\bcedar\b/.test(lower)) return 'Cedar';
        if (/\bmarin\b/.test(lower)) return 'Marin';
        if (/\bcoral\b/.test(lower)) return 'Coral';
        if (/\bash\b/.test(lower)) return 'Ash';
        if (/\bsage\b/.test(lower)) return 'Sage';
        if (/\bverse\b/.test(lower)) return 'Verse';
        if (/\balloy\b/.test(lower)) return 'Alloy';
        if (/\bnova\b/.test(lower)) return 'Nova';
        if (/\baria\b/.test(lower)) return 'Aria';
        if (/\bjenny\b/.test(lower)) return 'Jenny';
        if (/\bguy\b/.test(lower)) return 'Guy';
        if (/\blibby\b/.test(lower)) return 'Libby';
        if (/\bdavis\b/.test(lower)) return 'Davis';
        if (/\bsara\b/.test(lower)) return 'Sara';

        if (/google.*uk.*female/.test(lower)) return 'Vanessa';
        if (/google.*uk.*male/.test(lower)) return 'Carl';
        if (/google.*female/.test(lower)) return 'Vera';
        if (/google.*male/.test(lower)) return 'Kevin';

        const cleaned = raw
            .replace(/microsoft|google|english|united states|united kingdom|online|\(natural\)|desktop|voice/ig, '')
            .replace(/[-()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned || raw;
    }

    function startRecognition() {
        if (!recognition || recognitionActive || isAssistantSpeaking) return;
        try { recognition.start(); } catch {}
    }

    function stopRecognition() {
        if (recognition && recognitionActive) recognition.stop();
    }

    function stopVoiceCall() {
        voiceCallMode = false;
        callModeResponsePending = false;
        stopRecognition();
        stopPlayback();
        els.voiceBtn.classList.remove('recording');
        clearComposerStatus();
    }

    function handleVoiceTranscript(transcript) {
        const normalized = transcript.replace(/\s+/g, ' ').trim();
        if (!normalized) return;

        const strippedWake = normalized.replace(WAKE_PATTERN, '').trim();
        if (!strippedWake && WAKE_PATTERN.test(normalized)) {
            stopRecognition();
            callModeResponsePending = true;
            speakReply('Hey, I am here. How are you doing?', true).finally(() => {
                callModeResponsePending = false;
                resumeVoiceCallIfNeeded();
            });
            return;
        }

        const finalText = WAKE_PATTERN.test(normalized) ? strippedWake : normalized;
        if (!finalText) return;

        els.userInput.value = finalText;
        stopRecognition();
        callModeResponsePending = true;
        handleSend({ fromVoice: true });
    }

    function resumeVoiceCallIfNeeded() {
        if (voiceCallMode && !callModeResponsePending && !isAssistantSpeaking && !els.userInput.disabled) {
            startRecognition();
        }
    }

    async function speakReply(markdownText, forceSpokenTone = false, options = {}) {
        if (!options.preview && !voiceReplyEnabled) return false;

        const plainText = prepareSpokenText(markdownText);
        if (!plainText) return false;

        const selectedVoice = options.voiceOption || getSelectedVoiceOption();
        if (selectedVoice?.provider === 'openai') {
            const usedPremium = await playPremiumVoice(plainText, selectedVoice, {
                preview: Boolean(options.preview),
                forceSpokenTone
            });
            if (usedPremium) return true;
            if (options.preview) {
                setComposerStatus('Premium voice preview was unavailable, so a local voice was used instead.', 'warn');
            }
        }

        return playBrowserVoice(plainText, selectedVoice, forceSpokenTone);
    }

    function getPremiumVoiceOptions() {
        const premiumVoices = Array.isArray(accountData?.voiceCatalog?.voices) ? accountData.voiceCatalog.voices : [];
        return premiumVoices.map(voice => ({
            id: voice.id,
            label: voice.label,
            provider: 'openai'
        }));
    }

    function getBrowserVoiceOptions() {
        if (!('speechSynthesis' in window)) return [];
        const voices = window.speechSynthesis.getVoices();
        let englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));
        if (!englishVoices.length) englishVoices = voices;

        return englishVoices
            .slice()
            .sort((left, right) => scoreBrowserVoice(right) - scoreBrowserVoice(left))
            .map(voice => ({
                id: `browser:${voice.name}`,
                label: friendlyVoiceName(voice.name),
                provider: 'browser',
                browserName: voice.name
            }));
    }

    function scoreBrowserVoice(voice) {
        const name = String(voice?.name || '').toLowerCase();
        let score = 0;
        if (/natural/.test(name)) score += 40;
        if (/aria|jenny|guy|libby|davis|sara/.test(name)) score += 28;
        if (/google/.test(name)) score += 18;
        if (/online/.test(name)) score += 10;
        if (/desktop/.test(name)) score -= 8;
        if (/english/.test(name)) score += 4;
        return score;
    }

    function chooseDefaultVoiceId(voices) {
        return voices.find(voice => voice.id === 'openai:cedar')?.id
            || voices.find(voice => voice.id === 'openai:marin')?.id
            || voices[0]?.id
            || '';
    }

    function getSelectedVoiceOption() {
        return availableVoices.find(voice => voice.id === selectedVoiceName) || availableVoices[0] || null;
    }

    async function previewSelectedVoice() {
        const selectedVoice = getSelectedVoiceOption();
        if (!selectedVoice) return;

        setComposerStatus(`Previewing ${selectedVoice.label}...`, 'active');
        await speakReply(`Hey, I am ${selectedVoice.label}. Would you like to choose this voice for Vessy?`, true, {
            preview: true,
            voiceOption: selectedVoice
        });
        setComposerStatus(`${selectedVoice.label} selected for Vessy.`, 'active');
    }

    function prepareSpokenText(markdownText) {
        return String(markdownText || '')
            .replace(/```[\s\S]*?```/g, ' code block ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
            .replace(/[#>*_~-]/g, ' ')
            .replace(/\bVessy OS\b/g, 'Vessy')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function stopPlayback() {
        if (typeof stopActivePlayback === 'function') {
            const stop = stopActivePlayback;
            stopActivePlayback = null;
            stop(false);
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }
        isAssistantSpeaking = false;
    }

    async function playPremiumVoice(text, voiceOption, options = {}) {
        if (!voiceOption || voiceOption.provider !== 'openai' || !currentUsername || !sessionToken) {
            return false;
        }

        try {
            const response = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voiceId: voiceOption.id,
                    username: currentUsername,
                    token: sessionToken,
                    preview: Boolean(options.preview)
                })
            });
            if (!response.ok) return false;

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            return await new Promise(resolve => {
                let settled = false;
                const finish = success => {
                    if (settled) return;
                    settled = true;
                    if (stopActivePlayback === finish) stopActivePlayback = null;
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.src = '';
                        currentAudio = null;
                    }
                    URL.revokeObjectURL(audioUrl);
                    isAssistantSpeaking = false;
                    resolve(success);
                    resumeVoiceCallIfNeeded();
                };

                stopPlayback();
                currentAudio = new Audio(audioUrl);
                currentAudio.preload = 'auto';
                currentAudio.onplay = () => {
                    isAssistantSpeaking = true;
                    stopRecognition();
                };
                currentAudio.onended = () => finish(true);
                currentAudio.onerror = () => finish(false);
                stopActivePlayback = finish;
                currentAudio.play().catch(() => finish(false));
            });
        } catch {
            return false;
        }
    }

    function playBrowserVoice(text, voiceOption, forceSpokenTone) {
        if (!('speechSynthesis' in window)) return Promise.resolve(false);

        const browserName = voiceOption?.provider === 'browser'
            ? voiceOption.browserName
            : browserVoices[0]?.browserName;
        const selectedVoice = window.speechSynthesis
            .getVoices()
            .find(voice => voice.name === browserName);
        if (!selectedVoice) return Promise.resolve(false);

        return new Promise(resolve => {
            let settled = false;
            const finish = success => {
                if (settled) return;
                settled = true;
                if (stopActivePlayback === finish) stopActivePlayback = null;
                isAssistantSpeaking = false;
                resolve(success);
                resumeVoiceCallIfNeeded();
            };

            stopPlayback();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = selectedVoice;
            utterance.rate = forceSpokenTone ? 1.01 : 0.97;
            utterance.pitch = 1;
            utterance.onstart = () => {
                isAssistantSpeaking = true;
                stopRecognition();
            };
            utterance.onend = () => finish(true);
            utterance.onerror = () => finish(false);

            stopActivePlayback = finish;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        });
    }

    function initComposer() {
        els.plusBtn.addEventListener('click', () => {
            els.composerMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', event => {
            if (!els.composerMenu.contains(event.target) && !els.plusBtn.contains(event.target)) {
                els.composerMenu.classList.add('hidden');
            }
        });

        els.sendBtn.addEventListener('click', () => handleSend({ fromVoice: false }));
        els.userInput.addEventListener('keypress', event => {
            if (event.key === 'Enter') handleSend({ fromVoice: false });
        });

        els.fileUploadBtn.addEventListener('click', () => {
            els.fileUploadInput.click();
            els.composerMenu.classList.add('hidden');
        });
        els.imageUploadBtn.addEventListener('click', () => {
            els.imageUploadInput.click();
            els.composerMenu.classList.add('hidden');
        });
        els.generateImageBtn.addEventListener('click', async () => {
            els.composerMenu.classList.add('hidden');
            const prompt = els.userInput.value.trim();
            if (!prompt) {
                setComposerStatus('Type an image prompt first, then tap Create image.', 'warn');
                return;
            }
            addMsg(`<p>${escHtml(`Image ${prompt}`)}</p>`, 'user');
            els.userInput.value = '';
            clearComposerStatus();
            await generateImage(prompt);
        });
        els.generateVideoBtn.addEventListener('click', async () => {
            els.composerMenu.classList.add('hidden');
            const prompt = els.userInput.value.trim();
            if (!prompt) {
                setComposerStatus('Type a video prompt first, then tap Create video.', 'warn');
                return;
            }
            addMsg(`<p>${escHtml(`Video ${prompt}`)}</p>`, 'user');
            els.userInput.value = '';
            clearComposerStatus();
            await generateVideo(prompt);
        });

        els.fileUploadInput.addEventListener('change', async event => {
            await addSelectedFiles(Array.from(event.target.files || []), 'file');
            event.target.value = '';
        });
        els.imageUploadInput.addEventListener('change', async event => {
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
            pendingAttachments.push(await normalizeAttachment(file, mode));
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
                attachment.note = 'Image is too large for deep analysis.';
            }
            return attachment;
        }

        if (isTextReadable(file)) {
            const raw = await file.text();
            attachment.extractedText = raw.slice(0, MAX_TEXT_ATTACHMENT_CHARS);
            attachment.note = raw.length > MAX_TEXT_ATTACHMENT_CHARS ? 'Text preview truncated.' : 'Ready for analysis.';
        } else {
            attachment.note = 'Metadata only.';
        }

        return attachment;
    }

    function renderAttachmentTray() {
        els.attachmentTray.innerHTML = pendingAttachments.map(attachment => `
            <div class="attachment-chip">
                ${attachment.kind === 'image'
                    ? `<img class="attachment-thumb" src="${attachment.previewUrl}" alt="${escHtml(attachment.name)}">`
                    : `<div class="attachment-icon"><i class="fa-solid fa-file-lines"></i></div>`}
                <div class="attachment-meta">
                    <div class="attachment-name">${escHtml(attachment.name)}</div>
                    <div class="attachment-subtext">${escHtml(attachment.size)} - ${escHtml(attachment.note || 'Ready')}</div>
                </div>
                <button class="attachment-remove" type="button" data-id="${attachment.id}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        els.attachmentTray.classList.toggle('hidden', pendingAttachments.length === 0);
        els.attachmentTray.querySelectorAll('.attachment-remove').forEach(button => {
            button.addEventListener('click', () => {
                pendingAttachments = pendingAttachments.filter(item => item.id !== button.dataset.id);
                renderAttachmentTray();
                if (!pendingAttachments.length) clearComposerStatus();
            });
        });
    }

    async function handleSend({ fromVoice }) {
        const text = els.userInput.value.trim();
        if (!text && pendingAttachments.length === 0) return;

        const attachments = pendingAttachments.map(item => ({ ...item }));
        const payload = buildMessagePayload(text, attachments, fromVoice);
        addMsg(payload.userHtml, 'user', `hist-${conversationHistory.length}`);
        clearComposer();
        conversationHistory.push({ role: 'user', content: payload.historyText });
        await triggerAI(payload.prompt, payload.historyText, payload.attachments, fromVoice ? 'voice_call' : 'chat');
    }

    function buildMessagePayload(text, attachments, fromVoice) {
        const cleanText = text.trim();
        const attachmentSummaries = attachments.map(attachment => `[${attachment.kind === 'image' ? 'Image' : 'File'}] ${attachment.name} (${attachment.size})`);
        const promptSections = attachments.map(attachment => {
            if (attachment.kind === 'image') {
                return `Uploaded image: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nNote: ${attachment.note}`;
            }
            if (attachment.extractedText) {
                return `Uploaded file: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nContents:\n${attachment.extractedText}`;
            }
            return `Uploaded file: ${attachment.name}\nType: ${attachment.mimeType}\nSize: ${attachment.size}\nNote: ${attachment.note}`;
        });

        const prompt = [
            fromVoice ? `Voice request: ${cleanText || 'Please help with these attachments.'}` : cleanText || 'Please help with these attachments.',
            promptSections.length ? `Attachments:\n${promptSections.join('\n\n')}` : ''
        ].filter(Boolean).join('\n\n');

        const attachmentHtml = attachments.length ? `
            <div class="message-attachments">
                ${attachments.map(attachment => attachment.kind === 'image'
                    ? `<div class="message-attachment-chip"><img src="${attachment.previewUrl}" alt="${escHtml(attachment.name)}"><span>${escHtml(attachment.name)}</span></div>`
                    : `<div class="message-attachment-chip"><i class="fa-solid fa-file-lines"></i><span>${escHtml(attachment.name)}</span></div>`
                ).join('')}
            </div>` : '';

        return {
            prompt,
            historyText: [cleanText || 'Shared attachments.', ...attachmentSummaries].filter(Boolean).join('\n'),
            userHtml: `${cleanText ? `<p>${escHtml(cleanText)}</p>` : '<p>Shared attachments.</p>'}${attachmentHtml}`,
            attachments
        };
    }

    function clearComposer() {
        els.userInput.value = '';
        pendingAttachments = [];
        renderAttachmentTray();
        clearComposerStatus();
    }

    async function triggerAI(prompt, historyText, attachments, mode) {
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
            const messageEl = byId(`msg-${id}`);
            if (messageEl) {
                messageEl.innerHTML = marked.parse(data.reply || data.error || 'No reply.');
                conversationHistory.push({ role: 'assistant', content: data.reply || data.error || 'No reply.' });
                await speakReply(data.reply || '', mode === 'voice_call');
                saveChat(historyText || prompt, data.reply || data.error || '');
                renderHistoryList();
            }
        } catch {
            const messageEl = byId(`msg-${id}`);
            if (messageEl) messageEl.textContent = 'Connection failed.';
        } finally {
            callModeResponsePending = false;
            resumeVoiceCallIfNeeded();
        }
    }

    async function generateImage(prompt) {
        const id = Date.now();
        addMsg(`<p>Generating "${escHtml(prompt)}"...</p><div class="img-skeleton" id="skel-${id}">Loading...</div>`, 'bot');
        const primaryUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}`;
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&nologo=true`;
        const img = new Image();
        img.className = 'generated-media';
        img.alt = prompt;
        img.src = primaryUrl;
        img.onload = () => {
            const skeleton = byId(`skel-${id}`);
            if (skeleton) skeleton.replaceWith(img);
            saveChat(prompt, `[Image: ${prompt}]`);
        };
        img.onerror = () => {
            img.src = fallbackUrl;
            img.onerror = () => {
                const skeleton = byId(`skel-${id}`);
                if (skeleton) skeleton.textContent = 'Image generation failed.';
            };
        };
    }

    async function generateVideo(prompt) {
        const id = Date.now();
        addMsg(`<p>Rendering "${escHtml(prompt)}"...</p><div class="img-skeleton" id="skel-${id}">Rendering...</div>`, 'bot');
        const videoUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}`;
        const posterUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}`;
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
            const skeleton = byId(`skel-${id}`);
            if (skeleton) skeleton.replaceWith(video);
            saveChat(prompt, `[Video: ${prompt}]`);
        };
        video.onerror = () => {
            const skeleton = byId(`skel-${id}`);
            if (!skeleton) return;
            skeleton.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;padding:18px"><div>Video generation is unavailable right now.</div><img src="${posterUrl}" alt="${escHtml(prompt)}" class="generated-media"></div>`;
        };
    }

    function addMsg(html, role, id) {
        const wrapper = document.createElement('div');
        wrapper.className = `message ${role}`;
        const anchorId = id ? `id="msg-${id}"` : '';
        if (role === 'bot') {
            wrapper.innerHTML = `<div class="bot-avatar"><i class="fa-solid fa-robot"></i></div><div class="glass-card" ${anchorId}>${html}</div>`;
        } else {
            wrapper.innerHTML = `<div class="glass-card" ${anchorId}>${html}</div>`;
        }
        els.chatWindow.appendChild(wrapper);
        els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
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

    function initAuth() {
        els.loginBtn.addEventListener('click', async () => {
            const username = els.loginUsername.value;
            const password = els.loginPassword.value;
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
                    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ username: data.username, token: data.token }));
                    currentUsername = data.username;
                    sessionToken = data.token;
                    els.authOverlay.classList.add('hidden');
                    await afterLogin();
                } else {
                    els.loginError.textContent = data.error || 'Login failed.';
                }
            } catch {
                els.loginError.textContent = 'Connection Error';
            }
        });

        els.signupBtn.addEventListener('click', async () => {
            const username = els.signupUsername.value;
            const password = els.signupPassword.value;
            const email = byId('signupEmail').value;
            if (username.toLowerCase() === 'admin') {
                alert('Reserved username');
                return;
            }
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, email })
                });
                const data = await response.json();
                if (data.success) {
                    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ username: data.username, token: data.token }));
                    currentUsername = data.username;
                    sessionToken = data.token;
                    els.authOverlay.classList.add('hidden');
                    await afterLogin();
                } else {
                    els.signupError.textContent = data.error || 'Signup failed.';
                }
            } catch {
                els.signupError.textContent = 'Connection Error';
            }
        });

        window.switchAuth = view => {
            byId('loginView').classList.toggle('hidden', view !== 'login');
            byId('signupView').classList.toggle('hidden', view !== 'signup');
        };

        window.togglePw = (inputId, button) => {
            const input = byId(inputId);
            if (!input) return;
            const reveal = input.type === 'password';
            input.type = reveal ? 'text' : 'password';
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !reveal);
                icon.classList.toggle('fa-eye-slash', reveal);
            }
        };
    }

    async function initSession() {
        if (localStorage.getItem(STORAGE_KEYS.terms) === 'true') {
            els.termsOverlay.classList.add('hidden');
            if (!checkSession()) els.authOverlay.classList.remove('hidden');
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
    }

    function checkSession() {
        try {
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
            if (session && session.username && session.token) {
                currentUsername = session.username;
                sessionToken = session.token;
                afterLogin();
                return true;
            }
        } catch {}
        return false;
    }

    async function afterLogin() {
        els.userBadgeName.textContent = currentUsername;
        await loadAccountData();
        await loadChatHistory();
        checkRestrictionStatus(Boolean(readStoredRestrictionNotice()));
    }

    async function loadAccountData() {
        if (!currentUsername || !sessionToken) return;
        try {
            const response = await fetch('/api/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get',
                    username: currentUsername,
                    token: sessionToken
                })
            });
            const data = await response.json();
            if (data.error) return;
            accountData = data;
            els.drawerUsername.textContent = data.username || currentUsername;
            els.drawerUserEmail.textContent = data.email || 'No email';
            els.drawerUserCreated.textContent = data.createdAt ? `Created: ${new Date(data.createdAt).toLocaleString()}` : 'Created: --';
            if (typeof data.settings?.voiceReplyEnabled === 'boolean') {
                voiceReplyEnabled = data.settings.voiceReplyEnabled;
                localStorage.setItem(STORAGE_KEYS.voiceReply, String(voiceReplyEnabled));
            }
            if (data.settings?.preferredVoiceId) {
                selectedVoiceName = data.settings.preferredVoiceId;
                localStorage.setItem(STORAGE_KEYS.voiceName, selectedVoiceName);
            }
            els.voiceReplyToggle.checked = voiceReplyEnabled;
            populateVoices();
            const enabled = data.settings?.personalizationEnabled !== false;
            els.personalizationToggle.checked = enabled;
            updatePersonalizationStatus(enabled, data.memory || []);
        } catch {}
    }

    async function saveSettings(settings) {
        if (!currentUsername || !sessionToken) return;
        const response = await fetch('/api/account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save-settings',
                username: currentUsername,
                token: sessionToken,
                settings
            })
        });
        const data = await response.json().catch(() => null);
        if (data?.settings) {
            accountData = accountData || {};
            accountData.settings = { ...(accountData.settings || {}), ...data.settings };
        }
    }

    function updatePersonalizationStatus(enabled, memory) {
        els.personalizationStatus.classList.remove('active', 'inactive');
        els.personalizationStatus.classList.add(enabled ? 'active' : 'inactive');
        if (!enabled) {
            els.personalizationStatus.textContent = 'Learning is currently off.';
            return;
        }
        const count = Array.isArray(memory) ? memory.length : 0;
        els.personalizationStatus.textContent = count ? `Learning is on. ${count} remembered detail${count === 1 ? '' : 's'} saved.` : 'Learning is on, but nothing has been learned yet.';
    }

    async function loadChatHistory() {
        if (!currentUsername) return;
        try {
            const response = await fetch('/api/chat-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername })
            });
            const data = await response.json();
            const history = Array.isArray(data.history) ? data.history : [];
            conversationHistory = history
                .filter(item => item.role === 'user' || item.role === 'assistant')
                .map(item => ({ role: item.role, content: item.content, timestamp: item.timestamp || null }));
            renderLoadedHistory(history);
            renderHistoryList();
        } catch {}
    }

    function renderLoadedHistory(history) {
        els.chatWindow.innerHTML = '';
        if (!history.length) {
            addMsg('<p><strong>Vessy OS 31.1 Online.</strong><br>Type <code>Draw a cat</code> or <code>Video a sunset</code>.</p>', 'bot');
            return;
        }
        history.forEach((item, index) => {
            const id = item.role === 'user' ? `hist-${index}` : '';
            if (item.role === 'assistant') {
                addMsg(marked.parse(item.content || ''), 'bot');
            } else {
                addMsg(`<p>${escHtml(item.content || '')}</p>`, 'user', id);
            }
        });
    }

    function renderHistoryList() {
        const items = conversationHistory.filter(item => item.role === 'user').slice(-25).reverse();
        if (!items.length) {
            els.historyList.innerHTML = '<div class="history-item empty">No chat history yet.</div>';
            return;
        }
        els.historyList.innerHTML = items.map((item, index) => {
            const text = String(item.content || '').trim();
            const title = text.length > 72 ? `${text.slice(0, 72)}...` : text || 'Untitled chat';
            const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;
            const time = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent';
            return `<button class="history-item" data-target="${conversationHistory.lastIndexOf(item)}"><div class="history-title">${escHtml(title)}</div><div class="history-meta">${escHtml(time)}</div><div class="history-preview">${escHtml(preview)}</div></button>`;
        }).join('');
        els.historyList.querySelectorAll('.history-item').forEach(button => {
            button.addEventListener('click', () => {
                const targetIndex = Number(button.dataset.target);
                const targetEl = byId(`hist-${targetIndex}`);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    }

    function initChromeActions() {
        els.personalizationToggle.addEventListener('change', async () => {
            await saveSettings({ personalizationEnabled: els.personalizationToggle.checked });
            const memory = accountData?.memory || [];
            updatePersonalizationStatus(els.personalizationToggle.checked, memory);
        });

        els.deletePersonalizationBtn.addEventListener('click', async () => {
            if (!confirm('Delete all learned personalization data?')) return;
            await fetch('/api/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'clear-memory',
                    username: currentUsername,
                    token: sessionToken
                })
            });
            if (accountData) accountData.memory = [];
            updatePersonalizationStatus(els.personalizationToggle.checked, []);
            setComposerStatus('Learned data deleted.', 'active');
        });

        els.logoutBtn.addEventListener('click', logoutUser);
        els.deleteAccountBtn.addEventListener('click', async () => {
            if (!confirm('Delete your account permanently? This cannot be undone.')) return;
            const response = await fetch('/api/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete-account',
                    username: currentUsername,
                    token: sessionToken
                })
            });
            const data = await response.json();
            if (data.success) {
                logoutUser();
            } else {
                setComposerStatus(data.error || 'Could not delete account.', 'warn');
            }
        });

        window.logoutUser = logoutUser;
        window.setBg = setBackground;
        window.closeApp = () => els.appModal.classList.add('hidden');
        window.launchApp = app => {
            if (app === 'browser') {
                els.appModal.classList.remove('hidden');
                els.appTitle.textContent = 'Browser';
                els.appContent.innerHTML = '<iframe src="https://www.wikipedia.org"></iframe>';
            }
        };
    }

    function logoutUser() {
        localStorage.removeItem(STORAGE_KEYS.session);
        localStorage.removeItem(STORAGE_KEYS.restriction);
        location.reload();
    }

    function initCameraModal() {
        els.cameraOpenBtn.addEventListener('click', async () => {
            els.composerMenu.classList.add('hidden');
            await openCamera();
        });
        els.cameraCloseBtn.addEventListener('click', closeCameraModal);
        els.capturePhotoBtn.addEventListener('click', capturePhotoFromCamera);
        els.switchCameraBtn.addEventListener('click', async () => {
            if (cameraDevices.length < 2) return;
            currentCameraIndex = (currentCameraIndex + 1) % cameraDevices.length;
            await startCameraStream();
        });
    }

    async function openCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            setComposerStatus('Camera access is not supported here.', 'warn');
            return;
        }
        try {
            cameraDevices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
            currentCameraIndex = 0;
            els.switchCameraBtn.style.display = cameraDevices.length > 1 ? 'inline-flex' : 'none';
            els.cameraModal.classList.remove('hidden');
            await startCameraStream();
        } catch {
            setComposerStatus('Could not open the camera.', 'warn');
        }
    }

    async function startCameraStream() {
        closeCameraStream();
        const preferredDevice = cameraDevices[currentCameraIndex];
        const constraints = preferredDevice
            ? { video: { deviceId: { exact: preferredDevice.deviceId } } }
            : { video: { facingMode: 'user' } };
        currentCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        els.cameraPreview.srcObject = currentCameraStream;
    }

    function closeCameraStream() {
        if (currentCameraStream) {
            currentCameraStream.getTracks().forEach(track => track.stop());
            currentCameraStream = null;
        }
    }

    function closeCameraModal() {
        closeCameraStream();
        els.cameraModal.classList.add('hidden');
    }

    async function capturePhotoFromCamera() {
        const video = els.cameraPreview;
        const canvas = els.cameraCanvas;
        if (!video.videoWidth || !video.videoHeight) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const attachment = {
            id: `${Date.now()}-camera`,
            kind: 'image',
            name: `Camera ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.jpg`,
            size: formatFileSize(Math.round((dataUrl.length * 3) / 4)),
            mimeType: 'image/jpeg',
            previewUrl: dataUrl,
            analysisDataUrl: dataUrl,
            extractedText: '',
            note: 'Captured from camera.'
        };
        if (pendingAttachments.length >= MAX_ATTACHMENTS) {
            setComposerStatus(`You can attach up to ${MAX_ATTACHMENTS} items at a time.`, 'warn');
            return;
        }
        pendingAttachments.push(attachment);
        renderAttachmentTray();
        setComposerStatus('Camera photo attached.', 'active');
        closeCameraModal();
    }

    function consumeStoredRestrictionNotice() {
        const stored = readStoredRestrictionNotice();
        if (stored && localStorage.getItem(STORAGE_KEYS.session)) showRestrictionScreen(stored);
    }

    function readStoredRestrictionNotice() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.restriction) || 'null');
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
                localStorage.setItem(STORAGE_KEYS.restriction, JSON.stringify(data));
                if (data.kind === 'kicked') {
                    handleKickExit(data);
                    return;
                }
                if (!skipReload && !restrictionTriggered) {
                    restrictionTriggered = true;
                    location.reload();
                    return;
                }
                showRestrictionScreen(data);
            } else {
                localStorage.removeItem(STORAGE_KEYS.restriction);
                clearRestrictionScreen();
            }
        } catch {}
    }

    function handleKickExit(data) {
        localStorage.removeItem(STORAGE_KEYS.session);
        localStorage.setItem(STORAGE_KEYS.restriction, JSON.stringify(data));
        showRestrictionScreen(data, true);
        setTimeout(() => {
            try {
                window.open('', '_self');
                window.close();
            } catch {}
            setTimeout(() => location.replace('about:blank'), 1200);
        }, 1000);
    }

    function clearRestrictionScreen() {
        byId('banScreen')?.remove();
        els.userInput.disabled = false;
        els.sendBtn.disabled = false;
        els.voiceBtn.disabled = !recognition;
        els.plusBtn.disabled = false;
        els.fileUploadBtn.disabled = false;
        els.imageUploadBtn.disabled = false;
        els.userInput.placeholder = 'Ask Vessy OS...';
    }

    function showRestrictionScreen(data, isKick = false) {
        byId('banScreen')?.remove();
        stopVoiceCall();
        els.userInput.disabled = true;
        els.sendBtn.disabled = true;
        els.voiceBtn.disabled = true;
        els.plusBtn.disabled = true;
        els.fileUploadBtn.disabled = true;
        els.imageUploadBtn.disabled = true;
        const accent = data.kind === 'kicked' ? '#ffaa00' : '#ff0055';
        const border = data.kind === 'kicked' ? 'rgba(255,170,0,.2)' : 'rgba(255,0,85,.2)';
        const boxBg = data.kind === 'kicked' ? 'rgba(255,170,0,.05)' : 'rgba(255,0,85,.04)';
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
                    <h1>${escHtml(getRestrictionTitle(data))}</h1>
                    <p class="overlay-subtitle">${escHtml(data.type === 'ip' ? 'Your IP address has been restricted' : 'Your account has been restricted')}</p>
                </div>
                <div class="overlay-body" style="text-align:center">
                    <div style="background:${boxBg};border:1px solid ${border};border-radius:12px;padding:16px;margin-bottom:16px">
                        <div style="font-size:16px;color:${accent};font-weight:700;line-height:1.5">You have been ${escHtml(data.kind || 'banned')}.</div>
                        <div style="font-size:12px;color:#999;margin-top:10px">Because: <span style="color:#ddd;font-weight:600">${escHtml(data.reason || 'Classified')}</span></div>
                        <div style="font-size:12px;color:#999;margin-top:8px">For: <span style="color:${accent};font-weight:700">${escHtml(data.timeLeft || 'Unknown time')}</span></div>
                        ${isKick ? '<div style="font-size:10px;color:#666;margin-top:10px">Closing Vessy AI...</div>' : ''}
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
        els.composerStatus.textContent = message;
        els.composerStatus.className = 'composer-status';
        if (tone) els.composerStatus.classList.add(tone);
    }

    function clearComposerStatus() {
        els.composerStatus.textContent = '';
        els.composerStatus.className = 'composer-status hidden';
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

    function escapeAttr(value) {
        return String(value).replace(/"/g, '&quot;');
    }
});
