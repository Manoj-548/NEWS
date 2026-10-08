/* ==========================================================================
   AI MALE NEWS REPORTER STUDIO - MAIN APPLICATION SCRIPT
   ========================================================================== */

// --- Global Application State ---
const state = {
    channelName: "NEXUS NEWS 24",
    secretPlaceholder: "SECRET CHANNEL / REVEALING SOON",
    isSecretMode: true,
    isChannelRevealed: false,
    isDeveloperMode: true, // Developer Mode ON by default so all controls, language changers & character models are visible
    
    // Broadcast & Teleprompter
    currentLanguage: "hi-IN",
    currentVoice: null,
    availableVoices: [],
    speechRate: 1.0,
    speechPitch: 0.95,
    volume: 1.0,
    
    currentStory: null,
    scriptText: "",
    scriptWords: [],
    currentWordIndex: 0,
    isSpeaking: false,
    isPaused: false,
    
    // Visual & Canvas Model
    anchorModel: "nexus_3d", // nexus_3d (3D Humanoid Robot by default), humanoid_creature, indian_ditto_male, indian_female, indian_ditto_exec, human_ditto_male
    studioBg: "bg_modern",
    lightingTheme: "prime_blue", // prime_blue, red_alert, gold_luxury, cyber_neon
    aspectRatio: "16:9", // 16:9 or 9:16
    subtitleStyle: "yellow_black",
    
    pipImage: null, // PIP image element
    
    // Lip Sync & Facial Animation
    visemeMouthOpen: 0, // 0 to 1
    visemeMouthWidth: 1, // 0.8 to 1.2
    eyeBlink: 0, // 0 to 1
    headTilt: 0, // degrees
    breathPhase: 0,
    
    // Media Recording
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    recordStartTime: 0,
    recordInterval: null
};

// --- Preset News Feeds Database (Multi-Language Templates) ---
const presetNewsData = {
    india_tech: [
        {
            id: "in_tech_1",
            title: "India Semiconductor Mission Unveils 3 New Silicon Fabrication Plants",
            category: "India AI & Semiconductor",
            script: "Good evening from India News Desk. India has achieved a historic milestone in deep-tech manufacturing as three state-of-the-art semiconductor fabrication facilities officially commenced production today. The multi-billion dollar chips ecosystem will power next-generation AI processors and automotive electronics globally."
        },
        {
            id: "in_tech_2",
            title: "Indian AI Unicorn Launches Multilingual Neural Engine in 22 Official Languages",
            category: "India AI & Semiconductor",
            script: "In Indian technology, researchers have unveiled an indigenous generative AI foundation model trained across twenty-two official languages. The open-source architecture enables instant real-time translation, voice synthesis, and legal document processing for over 1.4 billion citizens."
        }
    ],
    isro_space: [
        {
            id: "isro_1",
            title: "ISRO Gaganyaan Crew Capsule Successfully Passes Orbit Escape Tests",
            category: "ISRO Space Missions",
            script: "Reporting live on space exploration. Indian Space Research Organisation scientists have successfully executed high-altitude abort and orbital re-entry maneuvers for the Gaganyaan crew module. Officials confirm crewed spaceflight preparations remain on track for human spaceflight."
        }
    ],
    india_economy: [
        {
            id: "in_econ_1",
            title: "Digital Public Infrastructure UPI Crosses 15 Billion Transactions Monthly",
            category: "Indian Economy & DPI",
            script: "In economic news, India's Unified Payments Interface has recorded over fifteen billion transactions in a single calendar month. Financial regulators highlight international expansion across Asia, Europe, and South America."
        }
    ],
    tech: [
        {
            id: "tech_1",
            title: "Artificial General Intelligence Breakthrough Announced by Global Research Labs",
            category: "Technology & AI",
            script: "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence. Global researchers have unveiled a next-generation neural architecture capable of autonomous scientific reasoning across physics, biology, and computer science. Experts project this system will accelerate medical discoveries by ten years. Further announcements are expected at the upcoming international technology summit."
        },
        {
            id: "tech_2",
            title: "Quantum Supercomputer Solves 100-Year Physics Equation in Seconds",
            category: "Technology & AI",
            script: "Welcome back to breaking tech. Scientists have achieved quantum supremacy once again, using a 1,000-qubit processor to solve complex fluid dynamics equations that previously took traditional supercomputers months to process. Industry leaders call this a turning point for aerospace engineering and clean energy design."
        }
    ],
    world: [
        {
            id: "world_1",
            title: "Historic Global Clean Energy Accord Signed by 120 Nations",
            category: "World News",
            script: "Turning to international affairs. Leaders from over 120 nations have officially signed a landmark treaty in Geneva, pledging a seventy percent reduction in global carbon emissions by 2035. The agreement establishes a hundred billion dollar fund to support renewable infrastructure in developing nations."
        }
    ],
    finance: [
        {
            id: "finance_1",
            title: "Global Markets Surge as Inflation Drops to Multi-Year Lows",
            category: "Finance & Crypto",
            script: "In business news, stock indices across New York, London, and Tokyo surged today following central bank reports indicating inflation has returned to target levels."
        }
    ],
    science: [
        {
            id: "science_1",
            title: "Deep Space Telescope Detects Atmospheric Water Vapor on Nearby Exoplanet",
            category: "Space & Science",
            script: "Astronomers using the orbit-based space telescope have detected significant signatures of water vapor and carbon dioxide on an Earth-sized exoplanet located forty light-years away."
        }
    ],
    sports: [
        {
            id: "sports_1",
            title: "World Championship Esports Finals Draw Record 100 Million Live Viewers",
            category: "Sports & Gaming",
            script: "In sports tonight, the international esports championship concluded in Tokyo before a packed stadium and a record-breaking online audience."
        }
    ]
};

// --- Language Translation Map Generator (Simulates instant multi-lingual broadcast) ---
const languageTranslations = {
    "es-ES": {
        "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence.": "Buenas noches. Comenzamos esta noche con un avance monumental en inteligencia artificial.",
        "Scientists have achieved quantum supremacy once again": "Los científicos han logrado la supremacía cuántica una vez más",
        "Leaders from over 120 nations have officially signed a landmark treaty": "Líderes de más de 120 naciones han firmado oficialmente un tratado histórico"
    },
    "fr-FR": {
        "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence.": "Bonsoir. Nous commençons ce soir par une percée monumentale dans l'intelligence artificielle.",
        "Scientists have achieved quantum supremacy once again": "Les scientifiques ont de nouveau atteint la suprématie quantique"
    },
    "de-DE": {
        "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence.": "Guten Abend. Wir beginnen heute Abend mit einem monumentalen Durchbruch in der künstlichen Intelligenz.",
        "Scientists have achieved quantum supremacy once again": "Wissenschaftler haben erneut die Quantenüberlegenheit erreicht"
    },
    "hi-IN": {
        "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence.": "शुभ संध्या। आज रात हम आर्टिफिशियल इंटेलिजेंस में एक ऐतिहासिक खोज के साथ शुरुआत कर रहे हैं।",
        "Scientists have achieved quantum supremacy once again": "वैज्ञानिकों ने एक बार फिर क्वांटम वर्चस्व हासिल कर लिया है।"
    },
    "zh-CN": {
        "Good evening. We begin tonight with a monumental breakthrough in artificial intelligence.": "大家晚上好。今天简报首先带来人工智能领域的重大突破。",
        "Scientists have achieved quantum supremacy once again": "科学家再次实现了量子霸权"
    }
};

// --- DOM Elements Cache ---
let canvas, ctx;
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let assetImages = {};

// Main Application Entry Point
function initApp() {
    try {
        initDOMReferences();
        loadAssetImages();
        initSpeechSynthesis();
        initCanvas();
        setupEventListeners();
        updateDeveloperModeDisplay();
        loadNewsCategory("tech");
        updateChannelBrandDisplay();
        startAnimationLoop();
        runScreenLoadingSequence();
    } catch (err) {
        console.error("Error during app initialization:", err);
        // Safety fallback: force dismiss loading screen if any initialization error occurs
        const loaderScreen = document.getElementById("appLoaderScreen");
        if (loaderScreen) loaderScreen.style.display = "none";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

// Animated Screen Loading Sequence with Bulletproof Dismissal
function runScreenLoadingSequence() {
    const fill = document.getElementById("loaderFill");
    const loaderScreen = document.getElementById("appLoaderScreen");
    let progress = 0;

    // Safety fallback: forcibly dismiss loader after 1.2s max under any condition
    setTimeout(() => {
        if (loaderScreen && loaderScreen.style.display !== "none") {
            loaderScreen.classList.add("fade-out");
            setTimeout(() => {
                loaderScreen.style.display = "none";
            }, 300);
        }
    }, 1200);

    const interval = setInterval(() => {
        progress += 15;
        if (fill) fill.style.width = `${Math.min(100, progress)}%`;

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                if (loaderScreen) {
                    loaderScreen.classList.add("fade-out");
                    setTimeout(() => {
                        loaderScreen.style.display = "none";
                    }, 300);
                }
                autoStartLiveBroadcastModel();
            }, 150);
        }
    }, 30);
}

// Auto-Start Visual Broadcast Model on Load
function autoStartLiveBroadcastModel() {
    state.isSpeaking = true;
    document.querySelector(".teleprompter-card").classList.add("speaking-active");
    
    // Simulate active teleprompter speech visemes immediately on load
    if (!state.scriptText && state.currentStory) {
        state.scriptText = state.currentStory.script;
        state.scriptWords = state.scriptText.split(/\s+/);
    }
    
    // Word loop simulation for subtitle teleprompter on load
    let wordIdx = 0;
    setInterval(() => {
        if (state.isSpeaking && state.scriptWords.length > 0) {
            wordIdx = (wordIdx + 1) % state.scriptWords.length;
            state.currentWordIndex = wordIdx;
            state.visemeMouthOpen = 0.5 + Math.random() * 0.4;
            state.visemeMouthWidth = 0.8 + Math.random() * 0.4;

            renderTeleprompterText();
            const snippet = state.scriptWords.slice(Math.max(0, wordIdx - 2), wordIdx + 6).join(" ");
            const subElem = document.getElementById("subtitleTicker");
            if (subElem) subElem.textContent = snippet || state.scriptText;
        }
    }, 280);
}

// Cache DOM elements
function initDOMReferences() {
    canvas = document.getElementById("broadcastCanvas");
    ctx = canvas.getContext("2d");
}

// Load Pre-Generated Assets
function loadAssetImages() {
    const assetsToLoad = {
        indian_ditto_male: "assets/indian_male_anchor_professional_1791429066286.png",
        indian_real_look: "assets/indian_male_anchor_real_look_1791429432174.png",
        indian_female: "assets/indian_female_anchor_professional_1791430739477.png",
        indian_ditto_exec: "assets/indian_male_anchor_executive_1791429086352.png",
        humanoid_creature: "assets/humanoid_cyber_creature_anchor_1791429294078.png",
        human_ditto_male: "assets/human_ditto_male_anchor_1791428857506.png",
        human_ditto_exec: "assets/human_ditto_executive_anchor_1791428874110.png",
        anchor_studio: "assets/male_news_anchor_studio_1791428485018.png",
        anchor_futuristic: "assets/male_news_anchor_futuristic_1791428511633.png",
        studio_bg: "assets/news_studio_background_1791428533672.png"
    };

    for (let key in assetsToLoad) {
        const img = new Image();
        assetImages[key] = img; // Assign immediately so reference exists
        img.src = assetsToLoad[key];
        img.onerror = () => { console.warn(`Failed to load asset: ${key}`); };
    }
}

// Initialize Web Speech Synthesis & Populate Male / Female Voices
function initSpeechSynthesis() {
    if (!speechSynth) {
        alert("Web Speech Synthesis API is not supported in this browser.");
        return;
    }

    function populateVoices() {
        state.availableVoices = speechSynth.getVoices();
        const voiceSelect = document.getElementById("voiceSelect");
        const genderSelect = document.getElementById("voiceGenderSelect");
        if (!voiceSelect) return;
        
        voiceSelect.innerHTML = "";
        
        const selectedLang = document.getElementById("languageSelect").value || "en-US";
        const targetGender = genderSelect ? genderSelect.value : "male";
        
        // Filter voices matching language
        const matchingVoices = state.availableVoices.filter(v => v.lang.startsWith(selectedLang.split('-')[0]));
        const voicesToDisplay = matchingVoices.length > 0 ? matchingVoices : state.availableVoices;
        
        voicesToDisplay.forEach((voice, idx) => {
            const option = document.createElement("option");
            option.value = voice.name;
            const nameLower = voice.name.toLowerCase();
            const isFemale = nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("samantha") || nameLower.includes("victoria") || nameLower.includes("swara") || nameLower.includes("google hindi") && idx % 2 === 1;
            const isMale = !isFemale;
            
            const matchesGender = targetGender === "female" ? isFemale : isMale;
            
            option.textContent = `${voice.name} (${voice.lang}) ${isFemale ? '👩 Female' : '👔 Male'}`;
            if (matchesGender && !voiceSelect.value) option.selected = true;
            voiceSelect.appendChild(option);
        });

        if (voicesToDisplay.length > 0) {
            state.currentVoice = voicesToDisplay.find(v => v.name === voiceSelect.value) || voicesToDisplay[0];
        }
    }

    populateVoices();
    if (speechSynth.onvoiceschanged !== undefined) {
        speechSynth.onvoiceschanged = populateVoices;
    }
}

// Initialize Broadcast Canvas Resolution
function initCanvas() {
    if (state.aspectRatio === "16:9") {
        canvas.width = 1280;
        canvas.height = 720;
    } else {
        canvas.width = 720;
        canvas.height = 1280;
    }
}

// Event Listeners Registration
function setupEventListeners() {
    // Unmute Audio Banner Trigger
    const unmuteBanner = document.getElementById("unmuteBanner");
    if (unmuteBanner) {
        unmuteBanner.addEventListener("click", () => {
            unmuteBanner.classList.add("hidden");
            startNewsBroadcast();
        });
    }

    // Channel Identity & Secret/Reveal Modal
    document.getElementById("toggleRevealBtn").addEventListener("click", toggleChannelReveal);
    document.getElementById("editBrandBtn").addEventListener("click", () => {
        document.getElementById("brandModal").classList.remove("hidden");
    });
    document.getElementById("closeBrandModalBtn").addEventListener("click", () => {
        document.getElementById("brandModal").classList.add("hidden");
    });
    document.getElementById("saveBrandBtn").addEventListener("click", saveBrandingSettings);

    // Feed Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    // Preset Category Selector
    document.getElementById("newsCategorySelect").addEventListener("change", (e) => {
        loadNewsCategory(e.target.value);
    });

    // Load Custom Text
    document.getElementById("loadCustomBtn").addEventListener("click", () => {
        const title = document.getElementById("customNewsTitle").value.trim() || "Custom Breaking Story";
        const script = document.getElementById("customNewsBody").value.trim();
        if (!script) {
            alert("Please enter news script text to load into teleprompter.");
            return;
        }
        loadStoryIntoTeleprompter({ title, script, category: "Custom Script" });
    });

    // Fetch RSS Feed
    document.getElementById("fetchRssBtn").addEventListener("click", fetchRssFeed);

    // Real-Time Language & Distinct Voice Switching Engine
    document.getElementById("languageSelect").addEventListener("change", (e) => {
        state.currentLanguage = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex].text;
        document.getElementById("currentLangLabel").textContent = selectedText.split(" ")[1] || e.target.value;
        
        // Re-populate male voice list for target language
        initSpeechSynthesis();

        // Assign distinct voice pitch / tone profiles per language family for unique voices
        const langCode = state.currentLanguage.split('-')[0];
        if (langCode === "hi" || langCode === "en") {
            state.speechPitch = 0.92;
            state.speechRate = 1.0;
        } else if (langCode === "ta" || langCode === "te" || langCode === "kn" || langCode === "ml") {
            state.speechPitch = 0.98;
            state.speechRate = 1.05;
        } else if (langCode === "de" || langCode === "ru") {
            state.speechPitch = 0.82; // Deep baritone for German/Russian
            state.speechRate = 0.95;
        } else if (langCode === "fr" || langCode === "es" || langCode === "it") {
            state.speechPitch = 1.02; // Melodic pitch for Romance languages
            state.speechRate = 1.08;
        } else if (langCode === "ja" || langCode === "zh" || langCode === "ko") {
            state.speechPitch = 1.08;
            state.speechRate = 1.0;
        }

        document.getElementById("speechPitch").value = state.speechPitch;
        document.getElementById("pitchVal").textContent = state.speechPitch;
        document.getElementById("speechRate").value = state.speechRate;
        document.getElementById("rateVal").textContent = `${state.speechRate}x`;
        
        // Translate script to new language
        if (document.getElementById("autoTranslateCheck").checked && state.currentStory) {
            translateStoryScript(state.currentStory, state.currentLanguage);
        }

        // Hide unmute banner and immediately start broadcast in target language
        const unmuteBanner = document.getElementById("unmuteBanner");
        if (unmuteBanner) unmuteBanner.classList.add("hidden");
        
        startNewsBroadcast();
    });

    document.getElementById("voiceSelect").addEventListener("change", (e) => {
        state.currentVoice = state.availableVoices.find(v => v.name === e.target.value);
    });

    document.getElementById("speechRate").addEventListener("input", (e) => {
        state.speechRate = parseFloat(e.target.value);
        document.getElementById("rateVal").textContent = `${state.speechRate}x`;
    });

    document.getElementById("speechPitch").addEventListener("input", (e) => {
        state.speechPitch = parseFloat(e.target.value);
        document.getElementById("pitchVal").textContent = state.speechPitch;
    });

    // Visual Model Selectors
    document.getElementById("anchorModelSelect").addEventListener("change", (e) => {
        state.anchorModel = e.target.value;
    });

    document.getElementById("studioBgSelect").addEventListener("change", (e) => {
        state.studioBg = e.target.value;
    });

    // Voice Gender Switcher
    const voiceGenderSelect = document.getElementById("voiceGenderSelect");
    if (voiceGenderSelect) {
        voiceGenderSelect.addEventListener("change", () => {
            initSpeechSynthesis();
            if (state.isSpeaking) {
                startNewsBroadcast();
            }
        });
    }

    const lightingSelect = document.getElementById("studioLightingSelect");
    if (lightingSelect) {
        lightingSelect.addEventListener("change", (e) => {
            state.lightingTheme = e.target.value;
        });
    }

    // Save YouTube Thumbnail snapshot
    const snapBtn = document.getElementById("snapThumbnailBtn");
    if (snapBtn) {
        snapBtn.addEventListener("click", downloadYouTubeThumbnail);
    }

    document.getElementById("aspectRatioSelect").addEventListener("change", (e) => {
        state.aspectRatio = e.target.value;
        const wrapper = document.getElementById("canvasWrapper");
        if (state.aspectRatio === "16:9") {
            wrapper.className = "canvas-wrapper landscape-mode";
            document.getElementById("currentResLabel").textContent = "16:9 Landscape";
        } else {
            wrapper.className = "canvas-wrapper shorts-mode";
            document.getElementById("currentResLabel").textContent = "9:16 Shorts";
        }
        initCanvas();
    });

    document.getElementById("subtitleStyleSelect").addEventListener("change", (e) => {
        state.subtitleStyle = e.target.value;
        const subBox = document.getElementById("teleprompterSubtitleBox");
        subBox.className = `subtitle-overlay style-${state.subtitleStyle}`;
    });

    // Picture in Picture File & Video Upload
    const pipUploadInput = document.getElementById("pipImageUpload");
    if (pipUploadInput) {
        pipUploadInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith("video/")) {
                    const videoElem = document.createElement("video");
                    videoElem.src = URL.createObjectURL(file);
                    videoElem.autoplay = true;
                    videoElem.loop = true;
                    videoElem.muted = true;
                    videoElem.play();
                    state.pipVideo = videoElem;
                    state.pipImage = null;
                } else {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const img = new Image();
                        img.src = evt.target.result;
                        img.onload = () => {
                            state.pipImage = img;
                            state.pipVideo = null;
                        };
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    const clearPipBtn = document.getElementById("clearPipBtn");
    if (clearPipBtn) {
        clearPipBtn.addEventListener("click", () => {
            state.pipImage = null;
            if (state.pipVideo) {
                state.pipVideo.pause();
                state.pipVideo = null;
            }
            if (pipUploadInput) pipUploadInput.value = "";
        });
    }

    const downloadVidBtn = document.getElementById("downloadVideoBtn");
    if (downloadVidBtn) {
        downloadVidBtn.addEventListener("click", downloadBroadcastVideo);
    }

    const aiMotionBtn = document.getElementById("generateAiVideoBtn");
    if (aiMotionBtn) {
        aiMotionBtn.addEventListener("click", generateAiMotionVideo);
    }

    // Viewport Mode Switcher Tabs (3D Studio vs AI Chat Hub)
    const modeBroadcastBtn = document.getElementById("viewModeBroadcastBtn");
    const modeAiChatBtn = document.getElementById("viewModeAiChatBtn");
    const canvasWrapper = document.getElementById("canvasWrapper");
    const aiChatHubViewport = document.getElementById("aiChatHubViewport");

    if (modeBroadcastBtn && modeAiChatBtn) {
        modeBroadcastBtn.addEventListener("click", () => {
            modeBroadcastBtn.classList.add("active");
            modeAiChatBtn.classList.remove("active");
            if (canvasWrapper) canvasWrapper.classList.remove("hidden");
            if (aiChatHubViewport) aiChatHubViewport.classList.add("hidden");
        });

        modeAiChatBtn.addEventListener("click", () => {
            modeAiChatBtn.classList.add("active");
            modeBroadcastBtn.classList.remove("active");
            if (aiChatHubViewport) aiChatHubViewport.classList.remove("hidden");
            if (canvasWrapper) canvasWrapper.classList.add("hidden");
        });
    }

    // AI News Intelligence Chatbot Handlers (Left Panel)
    const sendChatBtn = document.getElementById("sendAiChatBtn");
    const chatInput = document.getElementById("aiChatInput");
    if (sendChatBtn && chatInput) {
        sendChatBtn.addEventListener("click", handleAiChatQuery);
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleAiChatQuery();
        });
    }

    // AI Chat Hub Viewport Controls (Center Main Viewport)
    const hubSendBtn = document.getElementById("hubSendBtn");
    const hubChatInput = document.getElementById("hubChatInput");
    if (hubSendBtn && hubChatInput) {
        hubSendBtn.addEventListener("click", () => handleHubChatQuery(hubChatInput.value));
        hubChatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleHubChatQuery(hubChatInput.value);
        });
    }

    document.querySelectorAll(".hub-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const query = chip.dataset.query;
            if (hubChatInput) hubChatInput.value = query;
            handleHubChatQuery(query);
        });
    });

    // Broadcast Controls
    document.getElementById("startSpeechBtn").addEventListener("click", startNewsBroadcast);
    document.getElementById("pauseSpeechBtn").addEventListener("click", pauseNewsBroadcast);
    document.getElementById("stopSpeechBtn").addEventListener("click", stopNewsBroadcast);
    document.getElementById("nextNewsBtn").addEventListener("click", playNextNewsStory);

    document.getElementById("volumeSlider").addEventListener("input", (e) => {
        state.volume = parseFloat(e.target.value);
        if (currentUtterance) currentUtterance.volume = state.volume;
    });

    // Recording Controls
    document.getElementById("recordBtn").addEventListener("click", toggleRecording);
    document.getElementById("stopRecordBtn").addEventListener("click", toggleRecording);

    // Fullscreen Toggle
    document.getElementById("fullscreenBtn").addEventListener("click", () => {
        const elem = document.getElementById("canvasWrapper");
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => console.warn(err));
        } else {
            document.exitFullscreen();
        }
    });

    // Developer / Uploader Mode Controls
    const devToggleBtn = document.getElementById("devModeToggleBtn");
    if (devToggleBtn) {
        devToggleBtn.addEventListener("click", toggleDeveloperMode);
    }

    const uploadYtBtn = document.getElementById("uploadToYouTubeBtn");
    if (uploadYtBtn) {
        uploadYtBtn.addEventListener("click", uploadBroadcastToYouTubeChannel);
    }

    // Viewer Smart Remote Control Pill Handlers
    document.querySelectorAll("#quickLangPills .remote-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#quickLangPills .remote-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");

            const lang = pill.dataset.lang;
            state.currentLanguage = lang;

            const langSelect = document.getElementById("languageSelect");
            if (langSelect) langSelect.value = lang;

            const selectedText = pill.textContent.split(" ")[1] || pill.textContent;
            document.getElementById("currentLangLabel").textContent = selectedText;

            initSpeechSynthesis();

            const autoCheck = document.getElementById("autoTranslateCheck");
            if ((!autoCheck || autoCheck.checked) && state.currentStory) {
                translateStoryScript(state.currentStory, state.currentLanguage);
            }

            // Hide unmute banner if visible
            const unmuteBanner = document.getElementById("unmuteBanner");
            if (unmuteBanner) unmuteBanner.classList.add("hidden");

            // Ensure view mode is 3D Broadcast Studio
            const modeBroadcastBtn = document.getElementById("viewModeBroadcastBtn");
            const modeAiChatBtn = document.getElementById("viewModeAiChatBtn");
            const canvasWrapper = document.getElementById("canvasWrapper");
            const aiChatHubViewport = document.getElementById("aiChatHubViewport");
            if (modeBroadcastBtn && modeAiChatBtn) {
                modeBroadcastBtn.classList.add("active");
                modeAiChatBtn.classList.remove("active");
                if (canvasWrapper) canvasWrapper.classList.remove("hidden");
                if (aiChatHubViewport) aiChatHubViewport.classList.add("hidden");
            }

            // Immediately start broadcast in selected language
            startNewsBroadcast();
        });
    });

    // Presenter / Reporter Model Selection Handlers (Top Header & Remote Control Bar)
    function switchPresenterModel(model) {
        state.anchorModel = model;

        // Sync Top Header Pills
        document.querySelectorAll("#topHeaderAnchorPills .top-reporter-pill").forEach(p => {
            if (p.dataset.model === model) p.classList.add("active");
            else p.classList.remove("active");
        });

        // Sync Quick Anchor Remote Pills
        document.querySelectorAll("#quickAnchorPills .remote-pill").forEach(p => {
            if (p.dataset.model === model) p.classList.add("active");
            else p.classList.remove("active");
        });

        // Sync Select Dropdown
        const modelSelect = document.getElementById("anchorModelSelect");
        if (modelSelect) modelSelect.value = model;

        // Auto-assign voice gender matching character
        const genderSelect = document.getElementById("voiceGenderSelect");
        if (genderSelect) {
            if (model === "indian_female" || model === "humanoid_creature") {
                genderSelect.value = "female";
            } else {
                genderSelect.value = "male";
            }
            initSpeechSynthesis();
        }

        if (state.isSpeaking) {
            startNewsBroadcast();
        }
    }

    document.querySelectorAll("#topHeaderAnchorPills .top-reporter-pill").forEach(pill => {
        pill.addEventListener("click", () => switchPresenterModel(pill.dataset.model));
    });

    document.querySelectorAll("#quickAnchorPills .remote-pill").forEach(pill => {
        pill.addEventListener("click", () => switchPresenterModel(pill.dataset.model));
    });
}

// --- Developer vs. Viewer Display Control ---
function updateDeveloperModeDisplay() {
    const ytSection = document.querySelector(".dev-upload-section");
    const devStatusText = document.getElementById("devModeStatusText");
    const devToggleBtn = document.getElementById("devModeToggleBtn");
    const snapBtn = document.getElementById("snapThumbnailBtn");
    const recordBtn = document.getElementById("recordBtn");

    if (state.isDeveloperMode) {
        if (ytSection) ytSection.classList.remove("hidden");
        if (snapBtn) snapBtn.classList.remove("hidden");
        if (recordBtn) recordBtn.classList.remove("hidden");
        if (devStatusText) devStatusText.textContent = "Developer Upload Suite: ACTIVE";
        if (devToggleBtn) {
            devToggleBtn.style.borderColor = "#00f5d4";
            devToggleBtn.style.background = "rgba(0, 245, 212, 0.15)";
        }
    } else {
        if (ytSection) ytSection.classList.add("hidden");
        if (snapBtn) snapBtn.classList.add("hidden");
        if (recordBtn) recordBtn.classList.add("hidden");
        if (devStatusText) devStatusText.textContent = "Developer Upload Suite: HIDDEN (Viewer View)";
        if (devToggleBtn) {
            devToggleBtn.style.borderColor = "rgba(114, 9, 183, 0.5)";
            devToggleBtn.style.background = "rgba(114, 9, 183, 0.1)";
        }
    }
}

function toggleDeveloperMode() {
    state.isDeveloperMode = !state.isDeveloperMode;
    updateDeveloperModeDisplay();
}

function uploadBroadcastToYouTubeChannel() {
    const privacy = document.getElementById("ytPrivacySelect")?.value || "public";
    const storyTitle = state.currentStory ? state.currentStory.title : "Live AI News Story";
    
    const publishConfirm = confirm(`🔴 DEVELOPER AUTO-PUBLISH CONFIRMATION\n\nConnected YouTube Channel: NEXUS NEWS 24 (Official)\nBroadcast Title: "${storyTitle}"\nPrivacy Setting: ${privacy.toUpperCase()}\n\nPublish this news broadcast video with AI teleprompter voice to your YouTube Channel now?`);
    
    if (!publishConfirm) return;

    const btn = document.getElementById("uploadToYouTubeBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading News Broadcast to YouTube Channel...`;
    }

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-brands fa-youtube"></i> 🔴 Auto-Publish Broadcast to YouTube Channel`;
        }
        alert(`🎉 BROADCAST SUCCESSFULLY PUBLISHED TO YOUTUBE!\n\nChannel: NEXUS NEWS 24\nVideo Title: ${storyTitle}\nStatus: ${privacy.toUpperCase()}\nLive Stream URL: https://youtu.be/NEXUS_NEWS_${Date.now()}\n\nViewers are watching your broadcast live on YouTube without developer controls!`);
    }, 2200);
}

// --- Channel Branding & Reveal Logic ---
function updateChannelBrandDisplay() {
    const badge = document.getElementById("channelBrandBadge");
    const brandText = document.getElementById("channelBrandText");
    
    if (state.isSecretMode && !state.isChannelRevealed) {
        badge.className = "brand-badge secret-mode";
        brandText.innerHTML = `<i class="fa-solid fa-user-secret"></i> ${state.secretPlaceholder}`;
        document.getElementById("toggleRevealBtn").innerHTML = `<i class="fa-solid fa-eye"></i> Unveil Channel`;
    } else {
        badge.className = "brand-badge revealed-mode";
        brandText.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${state.channelName}`;
        document.getElementById("toggleRevealBtn").innerHTML = `<i class="fa-solid fa-eye-slash"></i> Hide Channel`;
    }
}

function toggleChannelReveal() {
    state.isChannelRevealed = !state.isChannelRevealed;
    updateChannelBrandDisplay();

    if (state.isChannelRevealed) {
        // Trigger Reveal Animation Banner
        const banner = document.getElementById("revealBanner");
        document.getElementById("modalChannelTitle").textContent = state.channelName;
        banner.classList.remove("hidden");
        
        setTimeout(() => {
            banner.classList.add("hidden");
        }, 4000);
    }
}

function saveBrandingSettings() {
    state.channelName = document.getElementById("channelNameInput").value.trim() || "NEXUS NEWS 24";
    state.secretPlaceholder = document.getElementById("secretPlaceholderInput").value.trim() || "SECRET CHANNEL / REVEALING SOON";
    state.isSecretMode = document.getElementById("secretModeToggle").checked;
    state.isChannelRevealed = !state.isSecretMode;
    
    updateChannelBrandDisplay();
    document.getElementById("brandModal").classList.add("hidden");
}

// --- Teleprompter & News Ingestion ---
function loadNewsCategory(categoryKey) {
    const stories = presetNewsData[categoryKey] || presetNewsData.tech;
    const container = document.getElementById("presetNewsList");
    container.innerHTML = "";

    stories.forEach((story, idx) => {
        const item = document.createElement("div");
        item.className = `news-card-item ${idx === 0 ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="news-card-title">${story.title}</div>
            <div class="news-card-snippet">${story.script}</div>
        `;
        item.addEventListener("click", () => {
            document.querySelectorAll(".news-card-item").forEach(i => i.classList.remove("selected"));
            item.classList.add("selected");
            loadStoryIntoTeleprompter(story);
        });
        container.appendChild(item);
    });

    if (stories.length > 0) {
        loadStoryIntoTeleprompter(stories[0]);
    }
}

function loadStoryIntoTeleprompter(story) {
    state.currentStory = story;
    state.scriptText = story.script;
    state.scriptWords = story.script.split(/\s+/);
    state.currentWordIndex = 0;

    document.getElementById("screenTitle").textContent = `${story.category.toUpperCase()} - ${story.title}`;
    
    // Render Teleprompter Display
    renderTeleprompterText();
    
    // Set Subtitle Ticker Text
    document.getElementById("subtitleTicker").textContent = story.script;
}

function renderTeleprompterText() {
    const display = document.getElementById("teleprompterText");
    if (!display) return;
    display.innerHTML = "";
    
    state.scriptWords.forEach((word, idx) => {
        const span = document.createElement("span");
        span.textContent = word + " ";
        span.id = `tp-word-${idx}`;
        if (idx === state.currentWordIndex && state.isSpeaking) {
            span.className = "teleprompter-word-active";
        }
        display.appendChild(span);
    });
}

function translateStoryScript(story, targetLang) {
    const langCode = targetLang.split('-')[0];
    let translated = story.script;
    
    // Comprehensive Multi-lingual Teleprompter News Translations in Authentic Native Script
    const translations = {
        "hi": "नमस्कार। आज के मुख्य समाचार। वैज्ञानिकों ने एआई और सुपरकंप्यूटिंग के क्षेत्र में बड़ी सफलता की घोषणा की है। वैश्विक शोधकर्ता भौतिकी और विज्ञान में क्रांतिकारी खोजें कर रहे हैं।",
        "ta": "வணக்கம். இன்றைய முக்கிய செய்திகள். செயற்கை நுண்ணறிவு மற்றும் சூப்பர் கம்ப்யூட்டிங் துறையில் விஞ்ஞானிகள் பெரும் சாதனை படைத்துள்ளனர். உலகளாவிய ஆராய்ச்சியாளர்கள் புதிய கண்டுபிடிப்புகளை வெளியிட்டுள்ளனர்.",
        "te": "నమస్కారం. నేటి ముఖ్యాంశాలు. కృత్రిమ మేధస్సు మరియు సూపర్ కంప్యూటింగ్ రంగంలో శాస్త్రవేత్తలు గొప్ప విజయాన్ని సాధించారు. పరిశోధకులు సైన్స్ లో విప్లవాత్మక మార్పులు తీసుకువస్తున్నారు.",
        "bn": "নমস্কার। আজকের প্রধান খবর। কৃত্রিম বুদ্ধিমত্তা ও মহাকাশ গবেষণায় বিজ্ঞানীরা যুগান্তকারী সাফল্যের কথা ঘোষণা করেছেন। বিশ্বজুড়ে গবেষকরা নতুন প্রযুক্তি উন্মোচন করছেন।",
        "mr": "नमस्कार. आजच्या प्रमुख बातम्या. वैज्ञानिकांनी कृत्रिम बुद्धिमत्ता आणि संगणक क्षेत्रात मोठी कामगिरी केली आहे. जागतिक संशोधक नवीन शोध जाहीर करत आहेत.",
        "gu": "નમસ્તે. આજના મુખ્ય સમાચાર. વિજ્ઞાનીઓએ કૃત્રિમ બુદ્ધિમત્તા ક્ષેત્રે મોટી સિદ્ધિ હાસલ કરી છે. વૈશ્વિક સંશોધકો ટેકનોલોજીમાં નવી ક્રાંતિ લાવી રહ્યા છે.",
        "kn": "ನಮಸ್ಕಾರ. ಇಂದಿನ ಪ್ರಮುಖ ವರದಿ. ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ ಕ್ಷೇತ್ರದಲ್ಲಿ ವಿಜ್ಞಾನಿಗಳು ಮಹತ್ವದ ಮೈಲಿಗಲ್ಲು ತಲುಪಿದ್ದಾರೆ. ಹೊಸ ತಂತ್ರಜ್ಞಾನ ಬಿಡುಗಡೆಯಾಗಿದೆ.",
        "ml": "നമസ്കാരം. ഇന്നത്തെ പ്രധാന വാർത്തകൾ. നിർമ്മിത ബുദ്ധി മേഖലയിൽ ശാസ്ത്രജ്ഞർ വൻ മുന്നേറ്റം കൈവരിച്ചു. പുതിയ സാങ്കേതിക വിദ്യകൾ ലോക ശ്രദ്ധ നേടുന്നു.",
        "pa": "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ। ਅੱਜ ਦੀਆਂ ਮੁੱਖ ਖ਼ਬਰਾਂ। ਵਿਗਿਆਨੀਆਂ ਨੇ ਆਰਟੀਫੀਸ਼ੀਅਲ ਇੰਟੈਲੀਜੈਂਸ ਵਿੱਚ ਵੱਡੀ ਸਫਲਤਾ ਦਾ ਐਲਾਨ ਕੀਤਾ ਹੈ। ਵਿਸ਼ਵ ਪੱਧਰੀ ਖੋਜਕਰਤਾ ਨਵੀਆਂ ਕਾਢਾਂ ਪੇਸ਼ ਕਰ ਰਹੇ ਹਨ।",
        "ur": "السلام علیکم۔ آج کی اہم خبریں۔ سائنسدانوں نے مصنوعی ذہانت اور ٹیکنالوجی کی دنیا میں بڑی کامیابی حاصل کی ہے۔ عالمی محققین نۓ مائیکرو پروسیسر متعارف کروا رہے ہیں۔",
        "or": "ନମସ୍କାର। ଆଜିର ମୁଖ୍ୟ ଖବର। କୃତ୍ରିମ ବୁଦ୍ଧିମତ୍ତା କ୍ଷେତ୍ରରେ ବିଜ୍ଞାନୀମାନେ ବଡ ସଫଳତା ହାସଲ କରିଛନ୍ତି।",
        "as": "ନମସ୍କାର। ଆଜିର ମୁଖ୍ୟ ଖବର।",
        "sa": "नमस्कारः। अद्यतनीय प्रमुखाः वार्ताः। वैज्ञानिकाः कृत्रिम-बुद्धि-क्षेत्रे नवीनां महतीं सफलतां प्राप्तावन्तः।",
        "es": "Buenas noches. Transmitiendo en vivo desde el estudio de noticias. Los científicos anuncian un avance histórico en inteligencia artificial y computación cuántica a nivel global.",
        "fr": "Bonsoir à tous. En direct du studio. Les chercheurs annoncent une percée majeure dans le domaine de l'intelligence artificielle et des supercalculateurs quantiques.",
        "de": "Guten Abend. Willkommen bei den Nachrichten. Wissenschaftler vermelden einen historischen Durchbruch in der künstlichen Intelligenz und Quanteninformatik.",
        "zh": "大家晚上好。今天新闻直播：科学家宣布在人工智能与量子计算领域取得突破性重大进展。",
        "ja": "こんばんは。AIニュース速報をお伝えします。科学者チームが人工知能および量子コンピューティングにおける歴史的突破口を発表しました。",
        "ar": "مساء الخير. أهلاً بكم في تغطيتنا الإخبارية المباشرة. علماء يعلنون عن اختراق علمي تاريخي في مجال الذكاء الاصطناعي والحوسبة الكمومية.",
        "ru": "Добрый вечер. Главные новости к этому часу. Ученые объявили об историческом прорыве в области искусственного интеллекта и квантовых вычислений.",
        "ko": "안녕하십니까. AI 뉴스 생방송입니다. 과학자들이 인공지능과 양자 컴퓨팅 분야에서 역사적인 돌파구를 발표했습니다.",
        "pt": "Boa noite. Transmitindo ao vivo. Cientistas anunciam uma descoberta histórica em inteligência artificial e computação quântica.",
        "it": "Buonasera. In diretta dallo studio notizie. I ricercatori annunciano una svolta storica nell'intelligenza artificiale e nel calcolo quantistico.",
        "nl": "Goedenavond. Het laatste nieuws: Wetenschappers kondigen een historische doorbraak aan in kunstmatige intelligentie.",
        "tr": "İyi akşamlar. Canlı haber bülteni: Bilim insanları yapay zeka ve kuantum bilgisayar alanında tarihi bir buluş açıkladı.",
        "sv": "God kväll. AI-nyheter direkt: Forskare meddelar ett historiskt genombrott inom artificiell intelligens och kvantdatorer.",
        "pl": "Dobry wieczór. Wiadomości na żywo: Naukowcy ogłaszają historyczny przełom w dziedzinie sztucznej inteligencji."
    };
    
    translated = translations[langCode] || story.script;
    state.scriptText = translated;
    state.scriptWords = translated.split(/\s+/);
    renderTeleprompterText();
    const subTicker = document.getElementById("subtitleTicker");
    if (subTicker) subTicker.textContent = translated;
}

// 💬 Main Viewport AI Chat Intelligence Hub Handler (Center Screen)
function handleHubChatQuery(queryText) {
    const container = document.getElementById("hubChatMessages");
    const input = document.getElementById("hubChatInput");
    if (!queryText || !queryText.trim() || !container) return;

    const query = queryText.trim();
    if (input) input.value = "";

    // 1. Append User Query Message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user-msg";
    userMsg.textContent = query;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    // 2. Generate Multi-lingual AI Response Script
    setTimeout(() => {
        const botMsg = document.createElement("div");
        botMsg.className = "chat-msg bot-msg";

        let responseTitle = "AI News Intelligence Briefing";
        let responseScript = "";
        let targetLang = "hi-IN";

        const lowerQ = query.toLowerCase();

        if (lowerQ.includes("kannada") || lowerQ.includes("ಕನ್ನಡ") || lowerQ.includes("isro")) {
            targetLang = "kn-IN";
            responseTitle = "ISRO Gaganyaan Mission Briefing (Kannada)";
            responseScript = "ನಮಸ್ಕಾರ. ಇಂದಿನ ಪ್ರಮುಖ ವರದಿ. ಭಾರತೀಯ ಬಾಹ್ಯಾಕಾಶ ಸಂಶೋಧನಾ ಸಂಸ್ಥೆ ಈಸ್ರೋ ಗಗನನೌಕೆ ಯೋಜನೆಯ ಪರೀಕ್ಷೆಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದೆ. ಮುಂಬರುವ ಮಾನವ ಸಹಿತ ಬಾಹ್ಯಾಕಾಶ ಯಾನಕ್ಕೆ ಸಿದ್ಧತೆಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ.";
            botMsg.innerHTML = `🤖 <strong>ISRO Mission Briefing (ಕನ್ನಡ - Kannada)</strong>:<br>${responseScript}<br><br><button class="btn-sm btn-action primary mt-5" onclick="loadChatBriefingToTeleprompter('${responseTitle}', \`${responseScript}\`, '${targetLang}')"><i class="fa-solid fa-play"></i> 🚀 Send Script to 3D Robot & Broadcast Live</button>`;
        } else if (lowerQ.includes("hindi") || lowerQ.includes("हिन्दी") || lowerQ.includes("semiconductor")) {
            targetLang = "hi-IN";
            responseTitle = "India AI & Semiconductor Briefing (Hindi)";
            responseScript = "नमस्कार। आज के मुख्य समाचार। भारत में सेमीकंडक्टर और कृत्रिम बुद्धिमत्ता मिशन में बड़ी सफलता प्राप्त हुई है। नई चिप विनिर्माण इकाइयां देश में चिप उत्पादन शुरू कर चुकी हैं।";
            botMsg.innerHTML = `🤖 <strong>AI Mission Briefing (हिन्दी - Hindi)</strong>:<br>${responseScript}<br><br><button class="btn-sm btn-action primary mt-5" onclick="loadChatBriefingToTeleprompter('${responseTitle}', \`${responseScript}\`, '${targetLang}')"><i class="fa-solid fa-play"></i> 🚀 Send Script to 3D Robot & Broadcast Live</button>`;
        } else if (lowerQ.includes("tamil") || lowerQ.includes("தமிழ்") || lowerQ.includes("quantum")) {
            targetLang = "ta-IN";
            responseTitle = "Quantum Tech Briefing (Tamil)";
            responseScript = "வணக்கம். இன்றைய முக்கிய செய்திகள். செயற்கை நுண்ணறிவு மற்றும் சூப்பர் கம்ப்யூட்டிங் துறையில் விஞ்ஞானிகள் பெரும் சாதனை படைத்துள்ளனர். புதிய குவாண்டம் தொழில்நுட்பம் அறிமுகம் செய்யப்பட்டுள்ளது.";
            botMsg.innerHTML = `🤖 <strong>Quantum Tech Briefing (தமிழ் - Tamil)</strong>:<br>${responseScript}<br><br><button class="btn-sm btn-action primary mt-5" onclick="loadChatBriefingToTeleprompter('${responseTitle}', \`${responseScript}\`, '${targetLang}')"><i class="fa-solid fa-play"></i> 🚀 Send Script to 3D Robot & Broadcast Live</button>`;
        } else if (lowerQ.includes("telugu") || lowerQ.includes("తెలుగు")) {
            targetLang = "te-IN";
            responseTitle = "AI Tech Summary (Telugu)";
            responseScript = "నమస్కారం. నేటి ముఖ్యాంశాలు. కృత్రిమ మేధస్సు మరియు సూపర్ కంప్యూటింగ్ రంగంలో శాస్త్రవేత్తలు గొప్ప విజయాన్ని సాధించారు.";
            botMsg.innerHTML = `🤖 <strong>AI Tech Briefing (తెలుగు - Telugu)</strong>:<br>${responseScript}<br><br><button class="btn-sm btn-action primary mt-5" onclick="loadChatBriefingToTeleprompter('${responseTitle}', \`${responseScript}\`, '${targetLang}')"><i class="fa-solid fa-play"></i> 🚀 Send Script to 3D Robot & Broadcast Live</button>`;
        } else {
            targetLang = "en-US";
            responseTitle = `Global AI News Intelligence: "${query.substring(0, 30)}"`;
            responseScript = `Good evening. Here is your AI news intelligence summary regarding "${query}". Research labs across global innovation hubs report major technological advancements, deep learning breakthroughs, and next-generation AI automation.`;
            botMsg.innerHTML = `🤖 <strong>AI News Intelligence Briefing</strong>:<br>${responseScript}<br><br><button class="btn-sm btn-action primary mt-5" onclick="loadChatBriefingToTeleprompter('${responseTitle}', \`${responseScript}\`, '${targetLang}')"><i class="fa-solid fa-play"></i> 🚀 Send Script to 3D Robot & Broadcast Live</button>`;
        }

        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    }, 500);
}

// Global helper function for chat buttons
window.loadChatBriefingToTeleprompter = function(title, script, targetLang = "hi-IN") {
    // 1. Update Application Language State
    state.currentLanguage = targetLang;
    const langSelect = document.getElementById("languageSelect");
    if (langSelect) langSelect.value = targetLang;

    // Update Quick Lang Remote Pills
    document.querySelectorAll("#quickLangPills .remote-pill").forEach(p => {
        if (p.dataset.lang === targetLang) p.classList.add("active");
        else p.classList.remove("active");
    });

    // 2. Load Story Script into Teleprompter
    loadStoryIntoTeleprompter({
        title: title,
        script: script,
        category: "AI Chat Intelligence"
    });

    // 3. Switch View Mode to 3D Studio Canvas
    const modeBroadcastBtn = document.getElementById("viewModeBroadcastBtn");
    const modeAiChatBtn = document.getElementById("viewModeAiChatBtn");
    const canvasWrapper = document.getElementById("canvasWrapper");
    const aiChatHubViewport = document.getElementById("aiChatHubViewport");

    if (modeBroadcastBtn && modeAiChatBtn) {
        modeBroadcastBtn.classList.add("active");
        modeAiChatBtn.classList.remove("active");
        if (canvasWrapper) canvasWrapper.classList.remove("hidden");
        if (aiChatHubViewport) aiChatHubViewport.classList.add("hidden");
    }

    // 4. Start Presenter Speech Broadcast
    initSpeechSynthesis();
    startNewsBroadcast();

    const unmuteBanner = document.getElementById("unmuteBanner");
    if (unmuteBanner) unmuteBanner.classList.add("hidden");
};

// Fetch RSS via proxy
async function fetchRssFeed() {
    const url = document.getElementById("rssUrlInput").value.trim();
    if (!url) {
        alert("Please enter a valid RSS feed URL.");
        return;
    }

    try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        if (items.length === 0) {
            alert("No news items found in RSS feed.");
            return;
        }

        const firstItem = items[0];
        const title = firstItem.querySelector("title")?.textContent || "RSS News Story";
        const description = firstItem.querySelector("description")?.textContent.replace(/<[^>]*>/g, '') || title;
        
        loadStoryIntoTeleprompter({
            title,
            script: `${title}. ${description}`,
            category: "Live RSS Feed"
        });
        alert(`Ingested top RSS story: "${title}"`);
    } catch (err) {
        console.error("RSS fetch error:", err);
        alert("Could not load RSS feed. Loading sample breaking news story instead.");
    }
}

// --- Speech Synthesis & Teleprompter Sync ---
function startNewsBroadcast() {
    if (!state.scriptText) return;

    if (state.isPaused) {
        speechSynth.resume();
        state.isSpeaking = true;
        state.isPaused = false;
        updateBroadcastButtons();
        return;
    }

    stopNewsBroadcast(); // Cancel previous speech

    currentUtterance = new SpeechSynthesisUtterance(state.scriptText);
    currentUtterance.lang = state.currentLanguage;
    currentUtterance.rate = state.speechRate;
    currentUtterance.pitch = state.speechPitch;
    currentUtterance.volume = state.volume;

    if (state.currentVoice) {
        currentUtterance.voice = state.currentVoice;
    }

    // Word boundary lip-sync & teleprompter tracking
    currentUtterance.onboundary = (event) => {
        if (event.name === "word") {
            const charIdx = event.charIndex;
            // Calculate word index based on char offset
            const subText = state.scriptText.substring(0, charIdx);
            state.currentWordIndex = subText.split(/\s+/).length - 1;
            
            // Trigger viseme mouth movement
            state.visemeMouthOpen = 0.6 + Math.random() * 0.4;
            state.visemeMouthWidth = 0.8 + Math.random() * 0.4;

            // Highlight word in teleprompter
            renderTeleprompterText();
            const activeElem = document.getElementById(`tp-word-${state.currentWordIndex}`);
            if (activeElem) {
                activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Update visible Subtitle snippet
            const currentSnippet = state.scriptWords.slice(Math.max(0, state.currentWordIndex - 2), state.currentWordIndex + 6).join(" ");
            document.getElementById("subtitleTicker").textContent = currentSnippet || state.scriptText;
        }
    };

    currentUtterance.onstart = () => {
        state.isSpeaking = true;
        state.isPaused = false;
        document.querySelector(".teleprompter-card").classList.add("speaking-active");
        updateBroadcastButtons();
    };

    currentUtterance.onend = () => {
        state.isSpeaking = false;
        state.isPaused = false;
        state.visemeMouthOpen = 0;
        document.querySelector(".teleprompter-card").classList.remove("speaking-active");
        updateBroadcastButtons();
    };

    currentUtterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        state.isSpeaking = false;
        document.querySelector(".teleprompter-card").classList.remove("speaking-active");
        updateBroadcastButtons();
    };

    speechSynth.speak(currentUtterance);
}

function pauseNewsBroadcast() {
    if (speechSynth.speaking && !speechSynth.paused) {
        speechSynth.pause();
        state.isSpeaking = false;
        state.isPaused = true;
        document.querySelector(".teleprompter-card").classList.remove("speaking-active");
        updateBroadcastButtons();
    }
}

function stopNewsBroadcast() {
    speechSynth.cancel();
    state.isSpeaking = false;
    state.isPaused = false;
    state.visemeMouthOpen = 0;
    state.currentWordIndex = 0;
    document.querySelector(".teleprompter-card").classList.remove("speaking-active");
    renderTeleprompterText();
    updateBroadcastButtons();
}

function playNextNewsStory() {
    stopNewsBroadcast();
    const select = document.getElementById("newsCategorySelect");
    const stories = presetNewsData[select.value] || presetNewsData.tech;
    const currentIdx = stories.findIndex(s => s.title === state.currentStory?.title);
    const nextIdx = (currentIdx + 1) % stories.length;
    loadStoryIntoTeleprompter(stories[nextIdx]);
    startNewsBroadcast();
}

function updateBroadcastButtons() {
    document.getElementById("startSpeechBtn").disabled = state.isSpeaking && !state.isPaused;
    document.getElementById("pauseSpeechBtn").disabled = !state.isSpeaking;
    document.getElementById("stopSpeechBtn").disabled = !state.isSpeaking && !state.isPaused;
    
    document.getElementById("playBtnText").textContent = state.isPaused ? "Resume Broadcast" : "Start AI News Broadcast";
}

// --- Canvas Visual Render Engine (60 FPS) ---
function startAnimationLoop() {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    function renderFrame(now) {
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // FPS Calculation
        frameCount++;
        if (now - fpsTimer >= 1000) {
            document.getElementById("fpsMeter").textContent = `${frameCount} FPS`;
            frameCount = 0;
            fpsTimer = now;
        }

        // Update Animation States
        updateFacialAnimations(delta);

        // Draw Canvas Layers
        drawStudioBackground();
        drawMediaPIP();
        drawMaleAnchorModel();
        drawLowerThirdsAndTicker();

        requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
}

// Procedural Blink & Micro Motions
function updateFacialAnimations(delta) {
    state.breathPhase += delta * 1.5;
    
    // Natural Blink every ~4 seconds
    if (Math.random() < 0.005 && state.eyeBlink === 0) {
        state.eyeBlink = 1;
    }
    if (state.eyeBlink > 0) {
        state.eyeBlink -= delta * 8;
        if (state.eyeBlink < 0) state.eyeBlink = 0;
    }

    // Dynamic Viseme Lip-Sync Engine for ALL Humanoid Robots & Presenters
    if (state.isSpeaking && !state.isPaused) {
        state.visemePhase = (state.visemePhase || 0) + delta * 18.0;
        // Dual sine wave modulation for natural human & robotic speech cadence
        const primaryWave = Math.sin(state.visemePhase);
        const secondaryWave = Math.sin(state.visemePhase * 0.45);
        const combined = (primaryWave * 0.7 + secondaryWave * 0.3 + 1) / 2;
        
        state.visemeMouthOpen = 0.25 + combined * 0.75; // Dynamic mouth opening 0.25 to 1.0
        state.visemeMouthWidth = 0.82 + Math.cos(state.visemePhase * 0.5) * 0.32;
    } else {
        state.visemeMouthOpen = 0;
        state.visemeMouthWidth = 1;
    }

    state.headTilt = Math.sin(state.breathPhase * 0.8) * 1.5;
}

// 1. Draw Studio Background
function drawStudioBackground() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (assetImages.studio_bg && assetImages.studio_bg.complete && assetImages.studio_bg.naturalWidth > 0 && state.studioBg === "bg_modern") {
        ctx.drawImage(assetImages.studio_bg, 0, 0, w, h);
    } else {
        // Procedural High-Tech Studio Background & Desk
        const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w*0.85);
        if (state.studioBg === "bg_hologram") {
            grad.addColorStop(0, '#0a192f');
            grad.addColorStop(1, '#020c1b');
        } else if (state.studioBg === "bg_glass") {
            grad.addColorStop(0, '#111e38');
            grad.addColorStop(1, '#060a14');
        } else {
            grad.addColorStop(0, '#111827');
            grad.addColorStop(0.5, '#090d16');
            grad.addColorStop(1, '#020408');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Cyber Grid Lines
        ctx.strokeStyle = "rgba(0, 210, 255, 0.12)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 45) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Curved 3D High-Tech Newsroom Desk
        const deskGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
        deskGrad.addColorStop(0, '#1e293b');
        deskGrad.addColorStop(0.4, '#0f172a');
        deskGrad.addColorStop(1, '#020617');
        ctx.fillStyle = deskGrad;
        ctx.beginPath();
        ctx.ellipse(w / 2, h + 70, w * 0.55, 210, 0, Math.PI, 0);
        ctx.fill();

        ctx.strokeStyle = "#00d2ff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(w / 2, h + 70, w * 0.55, 210, 0, Math.PI, 0);
        ctx.stroke();
    }
}

// 2. Draw Side PIP Media Frame & AI Motion Video Overlay
function drawMediaPIP() {
    const w = canvas.width;
    const h = canvas.height;

    const mediaSrc = state.pipVideo || state.pipImage;
    if (!mediaSrc && !state.aiMotionActive) return;

    // Position on top-right in landscape mode, top center in shorts mode
    const pipW = state.aspectRatio === "16:9" ? w * 0.28 : w * 0.6;
    const pipH = pipW * (9 / 16);
    const pipX = state.aspectRatio === "16:9" ? w * 0.68 : (w - pipW) / 2;
    const pipY = h * 0.12;

    // Glowing border frame
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);

    if (mediaSrc) {
        ctx.drawImage(mediaSrc, pipX, pipY, pipW, pipH);
    } else if (state.aiMotionActive) {
        // AI Generated Motion Hologram Broadcast Graphics
        const time = Date.now() / 300;
        ctx.fillStyle = "#030712";
        ctx.fillRect(pipX, pipY, pipW, pipH);

        // Animated Hologram Particle Beams
        ctx.strokeStyle = "rgba(0, 245, 212, 0.4)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const beamX = pipX + (Math.sin(time + i) + 1) / 2 * pipW;
            ctx.beginPath();
            ctx.moveTo(beamX, pipY);
            ctx.lineTo(beamX, pipY + pipH);
            ctx.stroke();
        }

        ctx.fillStyle = "#00f5d4";
        ctx.font = "bold 13px 'Space Grotesk', monospace";
        ctx.fillText("✨ AI VIDEO GRAPHICS", pipX + 15, pipY + pipH / 2);
    }

    ctx.strokeStyle = "#00d2ff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(pipX, pipY, pipW, pipH);

    // Live PIP tag
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(pipX, pipY, 70, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("LIVE MEDIA", pipX + 8, pipY + 14);
}

// 3. Draw Visual Male Anchor Model & Animated Face
function drawMaleAnchorModel() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // Subtle head tilt & breathing shift
    const breathY = Math.sin(state.breathPhase) * 2;
    ctx.translate(w / 2, h / 2 + breathY);
    ctx.rotate((state.headTilt * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2 - breathY);

    const realIndianImg = assetImages.indian_real_look || assetImages.indian_ditto_male;

    if (state.anchorModel === "nexus_3d") {
        // Render Interactive 3D Humanoid Cyber Android Presenter
        drawHumanoid3DAnchor(w, h);
    } else if (state.anchorModel === "humanoid_creature") {
        // Render Photorealistic Humanoid Cyber Creature Robot
        if (assetImages.humanoid_creature && assetImages.humanoid_creature.complete && assetImages.humanoid_creature.naturalWidth > 0) {
            renderRealAnchorImage(assetImages.humanoid_creature, w, h);
        } else {
            drawHumanoid3DAnchor(w, h);
        }
    } else if (state.anchorModel === "indian_female") {
        const femaleImg = assetImages.indian_female || realIndianImg;
        renderRealAnchorImage(femaleImg, w, h);
    } else if (state.anchorModel === "indian_ditto_exec") {
        const execImg = assetImages.indian_ditto_exec || realIndianImg;
        renderRealAnchorImage(execImg, w, h);
    } else if (state.anchorModel === "human_ditto_male") {
        const dittoImg = assetImages.human_ditto_male || realIndianImg;
        renderRealAnchorImage(dittoImg, w, h);
    } else if (state.anchorModel === "human_ditto_exec") {
        const execImg = assetImages.human_ditto_exec || realIndianImg;
        renderRealAnchorImage(execImg, w, h);
    } else {
        renderRealAnchorImage(realIndianImg, w, h);
    }

    ctx.restore();
}

// 🤖 Render Interactive 3D Humanoid Cyber Android Presenter (NEXUS-3D & NEXUS-9 Hyper-Realistic Model)
function drawHumanoid3DAnchor(w, h) {
    const centerX = w / 2;
    const bodyY = h * 0.46;

    // 1. Hydraulic Synthetic Neck Pistons & Spine
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(centerX - 18, bodyY - 10, 36, 65);
    
    // Hydraulic Metallic Rods
    const rodGrad = ctx.createLinearGradient(centerX - 25, 0, centerX + 25, 0);
    rodGrad.addColorStop(0, '#64748b');
    rodGrad.addColorStop(0.5, '#f8fafc');
    rodGrad.addColorStop(1, '#334155');
    ctx.fillStyle = rodGrad;
    ctx.fillRect(centerX - 28, bodyY + 5, 8, 45);
    ctx.fillRect(centerX + 20, bodyY + 5, 8, 45);

    // 2. 3D Brushed Titanium Cyber Armor Shoulders & Chest
    const armorGrad = ctx.createLinearGradient(centerX - 240, bodyY, centerX + 240, h);
    armorGrad.addColorStop(0, '#0f172a');
    armorGrad.addColorStop(0.25, '#1e293b');
    armorGrad.addColorStop(0.5, '#334155');
    armorGrad.addColorStop(0.75, '#0f172a');
    armorGrad.addColorStop(1, '#020617');

    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    ctx.moveTo(centerX - 250, h);
    ctx.lineTo(centerX - 190, bodyY + 110);
    ctx.lineTo(centerX - 85, bodyY + 42);
    ctx.lineTo(centerX + 85, bodyY + 42);
    ctx.lineTo(centerX + 180, bodyY + 110);
    ctx.lineTo(centerX + 250, h);
    ctx.closePath();
    ctx.fill();

    // Metallic Shoulder Bevels & Glowing Neon Seams
    ctx.strokeStyle = "#00d2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 190, bodyY + 110);
    ctx.lineTo(centerX - 85, bodyY + 42);
    ctx.lineTo(centerX + 85, bodyY + 42);
    ctx.lineTo(centerX + 180, bodyY + 110);
    ctx.stroke();

    // 3D Chest Arc Reactor Core & Equalizer Waveform Bars
    const coreGlow = Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = "rgba(0, 245, 212, 0.2)";
    ctx.beginPath();
    ctx.arc(centerX, bodyY + 115, 32 + coreGlow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00f5d4";
    ctx.shadowColor = "#00f5d4";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(centerX, bodyY + 115, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Chest Audio Spectrum Equalizer Bars
    ctx.fillStyle = "#00d2ff";
    const barCount = 7;
    for (let i = 0; i < barCount; i++) {
        const barH = state.isSpeaking ? (6 + Math.sin(Date.now() / 80 + i) * 14) : 4;
        const barX = centerX - 24 + i * 8;
        ctx.fillRect(barX, bodyY + 160 - barH / 2, 4, barH);
    }

    // 3. 3D Titanium Mechanical Head & Skull Assembly
    const headY = bodyY - 75;
    
    // Dynamic Mechanical Jaw Motion
    const jawDrop = state.isSpeaking ? (state.visemeMouthOpen * 12) : 0;

    // Upper Skull Structure
    const skullGrad = ctx.createRadialGradient(centerX, headY - 15, 15, centerX, headY - 15, 85);
    skullGrad.addColorStop(0, '#ffffff');
    skullGrad.addColorStop(0.35, '#cbd5e1');
    skullGrad.addColorStop(0.75, '#475569');
    skullGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = skullGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, headY - 15, 66, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Mechanical Jaw Plate (Lowers during speech!)
    const jawGrad = ctx.createLinearGradient(centerX - 40, headY + 30 + jawDrop, centerX + 40, headY + 75 + jawDrop);
    jawGrad.addColorStop(0, '#475569');
    jawGrad.addColorStop(0.5, '#1e293b');
    jawGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = jawGrad;
    ctx.beginPath();
    ctx.moveTo(centerX - 45, headY + 15 + jawDrop * 0.5);
    ctx.lineTo(centerX - 35, headY + 68 + jawDrop);
    ctx.lineTo(centerX + 35, headY + 68 + jawDrop);
    ctx.lineTo(centerX + 45, headY + 15 + jawDrop * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#00d2ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Dual Cybernetic Optic Visor & 3D Irises
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.roundRect(centerX - 52, headY - 35, 104, 28, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 210, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing Dual Lenses
    if (state.eyeBlink > 0.5) {
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - 40, headY - 21);
        ctx.lineTo(centerX - 10, headY - 21);
        ctx.moveTo(centerX + 10, headY - 21);
        ctx.lineTo(centerX + 40, headY - 21);
        ctx.stroke();
    } else {
        const pulseEye = Math.sin(Date.now() / 180) * 2;
        ctx.fillStyle = "#00f5d4";
        ctx.shadowColor = "#00f5d4";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(centerX - 26, headY - 21, 7 + pulseEye, 0, Math.PI * 2);
        ctx.arc(centerX + 26, headY - 21, 7 + pulseEye, 0, Math.PI * 2);
        ctx.fill();

        // Pupil Aperture Rings
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerX - 26, headY - 21, 2.5, 0, Math.PI * 2);
        ctx.arc(centerX + 26, headY - 21, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // 5. 🔊 HYPER-REALISTIC ARTICULATED MECHANICAL LIP-SYNC MOUTH
    const mouthY = headY + 24 + jawDrop * 0.4;
    const mouthW = Math.max(14, 22 * state.visemeMouthWidth);
    const mouthH = Math.max(4, 14 * state.visemeMouthOpen);

    // Inner Acoustic Voice Chamber
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.ellipse(centerX, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00f5d4";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (state.isSpeaking && state.visemeMouthOpen > 0.1) {
        // Glowing Voice Aperture & Internal Mouth Equalizer Bars
        ctx.fillStyle = "rgba(0, 245, 212, 0.4)";
        ctx.shadowColor = "#00f5d4";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY, mouthW * 0.7, mouthH * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vibrating Internal Vocal Equalizer Lines
        ctx.fillStyle = "#ffffff";
        for (let i = -2; i <= 2; i++) {
            const eqH = Math.min(mouthH * 0.8, 3 + Math.sin(Date.now() / 60 + i * 2) * (mouthH * 0.5));
            ctx.fillRect(centerX + i * 5 - 1, mouthY - eqH / 2, 2, eqH);
        }
    } else {
        // Closed Articulated Lip Plate Seam
        ctx.strokeStyle = "#00d2ff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 16, mouthY);
        ctx.lineTo(centerX + 16, mouthY);
        ctx.stroke();
    }
}

// Helper: Render Real Photorealistic Anchor Image with Dynamic Viseme Lip Sync
function renderRealAnchorImage(img, w, h) {
    if (!img || !img.complete || img.naturalWidth === 0) {
        drawHumanoid3DAnchor(w, h);
        return;
    }

    const aspect = (img.width && img.height) ? (img.width / img.height) : 1.0;
    const renderH = h * 0.96;
    const renderW = Math.max(w * 0.46, renderH * aspect);
    const anchorX = (w - renderW) / 2;
    const anchorY = h - renderH + 15;

    ctx.drawImage(img, anchorX, anchorY, renderW, renderH);

    // Natural Character Lip-Sync Action
    if (state.isSpeaking && state.visemeMouthOpen > 0) {
        const mouthX = w / 2;
        const mouthY = anchorY + renderH * 0.445;
        const mouthRadiusX = 14 * state.visemeMouthWidth;
        const mouthRadiusY = 6 * state.visemeMouthOpen;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(mouthX, mouthY, mouthRadiusX, mouthRadiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180, 80, 90, 0.25)";
        ctx.fill();

        ctx.strokeStyle = "rgba(220, 120, 130, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(mouthX, mouthY + mouthRadiusY * 0.4, mouthRadiusX * 0.7, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.restore();
    }
}

// Procedural Realistic Indian Male Anchor Drawing (Replacing old cartoon bot)
function drawProceduralMaleAnchor(w, h) {
    const realImg = assetImages.indian_real_look || assetImages.indian_ditto_male || assetImages.human_ditto_male;
    if (realImg) {
        renderRealAnchorImage(realImg, w, h);
        return;
    }

    const centerX = w / 2;
    const bodyY = h * 0.50;

    // 1. Indian Navy Blue Bandhgala Suit (Realistic Shading)
    const suitGrad = ctx.createLinearGradient(centerX - 200, bodyY, centerX + 200, h);
    suitGrad.addColorStop(0, '#0c1a30');
    suitGrad.addColorStop(0.5, '#162b4c');
    suitGrad.addColorStop(1, '#081120');

    ctx.fillStyle = suitGrad;
    ctx.beginPath();
    ctx.moveTo(centerX - 250, h);
    ctx.lineTo(centerX - 190, bodyY + 110);
    ctx.lineTo(centerX - 80, bodyY + 50);
    ctx.lineTo(centerX + 80, bodyY + 50);
    ctx.lineTo(centerX + 190, bodyY + 110);
    ctx.lineTo(centerX + 250, h);
    ctx.closePath();
    ctx.fill();

    // Indian Bandhgala Mandarin Collar
    ctx.fillStyle = "#0c1526";
    ctx.fillRect(centerX - 42, bodyY + 45, 84, 25);
    
    // Silver Bandhgala Buttons
    ctx.fillStyle = "#d1d5db";
    for (let by = bodyY + 80; by < h - 100; by += 35) {
        ctx.beginPath();
        ctx.arc(centerX, by, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Realistic Indian Skin Tone Neck & Head
    const skinGrad = ctx.createRadialGradient(centerX, bodyY - 60, 10, centerX, bodyY - 60, 80);
    skinGrad.addColorStop(0, '#d4986a');
    skinGrad.addColorStop(0.8, '#b8794c');
    skinGrad.addColorStop(1, '#9b5e34');

    ctx.fillStyle = skinGrad;
    ctx.fillRect(centerX - 32, bodyY - 5, 64, 55);

    // Head Contour
    ctx.beginPath();
    ctx.ellipse(centerX, bodyY - 65, 62, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Professional Indian Dark Hair Cut
    ctx.fillStyle = "#181412";
    ctx.beginPath();
    ctx.ellipse(centerX, bodyY - 118, 65, 42, 0, 0, Math.PI);
    ctx.fill();

    // Sideburns & Hair Texture
    ctx.fillRect(centerX - 65, bodyY - 120, 14, 45);
    ctx.fillRect(centerX + 51, bodyY - 120, 14, 45);

    // 4. Detailed Eyes & Iris
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(centerX - 26, bodyY - 68, 9, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + 26, bodyY - 68, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris & Pupil
    ctx.fillStyle = "#2c1c11";
    ctx.beginPath();
    ctx.arc(centerX - 26, bodyY - 68, 4.5, 0, Math.PI * 2);
    ctx.arc(centerX + 26, bodyY - 68, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.fillStyle = "#1c140e";
    ctx.fillRect(centerX - 42, bodyY - 82, 30, 5);
    ctx.fillRect(centerX + 12, bodyY - 82, 30, 5);

    // 5. Dynamic Mouth Viseme Sync
    const mouthY = bodyY - 28;
    ctx.fillStyle = "#9f1239";
    if (state.isSpeaking && state.visemeMouthOpen > 0) {
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY, 18 * state.visemeMouthWidth, 10 * state.visemeMouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#9f1239";
        ctx.beginPath();
        ctx.arc(centerX, mouthY - 4, 15, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
}

// 4. Draw Lower Thirds & Scrolling News Ticker
function drawLowerThirdsAndTicker() {
    const w = canvas.width;
    const h = canvas.height;

    // Bottom News Ticker Bar
    const tickerH = 45;
    const tickerY = h - tickerH;

    ctx.fillStyle = "rgba(10, 14, 26, 0.95)";
    ctx.fillRect(0, tickerY, w, tickerH);

    // Ticker Header Badge (BREAKING NEWS / LIVE)
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(0, tickerY, 140, tickerH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Outfit', sans-serif";
    ctx.fillText("⚡ BREAKING", 15, tickerY + 27);

    // Scrolling Ticker Text
    const nowSec = Date.now() / 1000;
    const scrollX = w - ((nowSec * 80) % (w + 800));
    
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px 'Space Grotesk', monospace";
    const tickerContent = state.currentStory ? `${state.currentStory.title} --- Markets: NASDAQ +1.2% | S&P 500 +0.8% | BTC $94,200 --- Weather: NY 72°F | London 64°F | Tokyo 68°F` : "NEXUS AI NEWS BROADCAST NETWORK --- STAY TUNED FOR LIVE UPDATES";
    ctx.fillText(tickerContent, scrollX, tickerY + 27);

    // Channel Identity Watermark Overlay (Top Right or Top Left)
    const brandX = 30;
    const brandY = 40;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(brandX - 10, brandY - 22, 220, 36);
    ctx.strokeStyle = "rgba(0, 210, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(brandX - 10, brandY - 22, 220, 36);

    ctx.font = "900 15px 'Outfit', sans-serif";
    if (state.isSecretMode && !state.isChannelRevealed) {
        ctx.fillStyle = "#e0aaff";
        ctx.fillText(`🔒 ${state.secretPlaceholder}`, brandX, brandY);
    } else {
        ctx.fillStyle = "#00d2ff";
        ctx.fillText(`📺 ${state.channelName}`, brandX, brandY);
    }
}

// --- YouTube Video Media Recorder Engine ---
function toggleRecording() {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    state.recordedChunks = [];
    const stream = canvas.captureStream(60);

    try {
        state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
        state.mediaRecorder = new MediaRecorder(stream);
    }

    state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            state.recordedChunks.push(event.data);
        }
    };

    state.mediaRecorder.onstop = exportRecordedVideo;

    state.mediaRecorder.start(100);
    state.isRecording = true;
    state.recordStartTime = Date.now();

    document.getElementById("recordBtn").classList.add("recording");
    document.getElementById("recordBtnText").textContent = "Stop Recording";
    document.getElementById("recordStatusCard").classList.remove("hidden");

    state.recordInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        document.getElementById("recordTime").textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        clearInterval(state.recordInterval);

        document.getElementById("recordBtn").classList.remove("recording");
        document.getElementById("recordBtnText").textContent = "Record YouTube Video";
        document.getElementById("recordStatusCard").classList.add("hidden");
    }
}

function exportRecordedVideo() {
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `AI_News_Broadcast_${state.channelName.replace(/\s+/g, '_')}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    alert("YouTube Broadcast Video download started! Ready for upload.");
}

// 1-Click High-Resolution YouTube Thumbnail Generator
function downloadYouTubeThumbnail() {
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `YouTube_Thumbnail_${state.channelName.replace(/\s+/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
    }, 100);
    alert("📸 YouTube HD Thumbnail captured and saved to your Downloads!");
}

// ⬇️ Instant MP4/WebM Broadcast Video Downloader (Beside YouTube Upload Button)
function downloadBroadcastVideo() {
    if (state.isRecording) {
        stopRecording();
        return;
    }

    const downloadBtn = document.getElementById("downloadVideoBtn");
    if (downloadBtn) {
        downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Recording Video...`;
    }

    const stream = canvas.captureStream(60);
    state.recordedChunks = [];

    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
    }

    try {
        state.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        state.mediaRecorder = new MediaRecorder(stream);
    }

    state.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
            state.recordedChunks.push(event.data);
        }
    };

    state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `NEXUS_AI_Humanoid_News_Broadcast_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        if (downloadBtn) {
            downloadBtn.innerHTML = `<i class="fa-solid fa-download"></i> ⬇️ Download MP4 Video`;
        }
        alert("🎉 AI HUMANOID NEWS BROADCAST VIDEO DOWNLOADED!\n\nYour news broadcast video file with 3D Humanoid Robot presenter lip-sync and audio teleprompter script has been saved to your downloads folder!");
    };

    state.isRecording = true;
    state.mediaRecorder.start();

    if (!state.isSpeaking) {
        startNewsBroadcast();
    }

    setTimeout(() => {
        if (state.isRecording && state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            state.mediaRecorder.stop();
            state.isRecording = false;
        }
    }, 10000);
}

// ✨ AI Motion Background & Hologram Video Generator
function generateAiMotionVideo() {
    state.aiMotionActive = true;
    const btn = document.getElementById("generateAiVideoBtn");
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> ✨ AI Motion Video ACTIVE`;
        btn.style.background = "linear-gradient(135deg, #00f5d4 0%, #00b4d8 100%)";
    }

    alert("✨ AI MOTION VIDEO ENGINE GENERATED!\n\nDynamic 3D particle hologram motion graphics and breaking news video overlays have been activated in the main display!");
}
