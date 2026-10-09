// ============================================================================
// MINIMAL AI NEWS BROADCAST ENGINE - PRODUCTION BUILD
// ============================================================================

window.BROADCAST_STATE = {
  isPlaying: false,
  currentLanguage: 'hi-IN',
  currentModel: 'nexus_3d',
  currentNews: 'Breaking news story about AI and technology development.',
};

const CHARACTERS = {
  nexus_3d: { name: 'NEXUS-3D', color: '#00d2ff', style: 'cyber' },
  humanoid_creature: { name: 'NEXUS-9', color: '#ff69b4', style: 'organic' },
  indian_ditto_male: { name: 'Arjun', color: '#8b6914', style: 'professional' },
  indian_female: { name: 'Priya', color: '#a0522d', style: 'professional' },
  indian_ditto_exec: { name: 'Vikram', color: '#1a1a2e', style: 'executive' },
  human_ditto_male: { name: 'Alexander', color: '#d4a574', style: 'global' },
};

const SAMPLE_NEWS = {
  india_tech: 'India launches new AI semiconductor initiative. The government announced a comprehensive plan to boost semiconductor manufacturing and AI research across the country.',
  isro_space: 'ISRO Gaganyaan mission progresses. The Indian Space Research Organisation successfully tests the crew abort system for the Gaganyaan human spaceflight program.',
  india_economy: 'Indian markets surge on positive GDP reports. The Sensex and Nifty indices closed significantly higher as investors react to better-than-expected economic data.',
  tech: 'Artificial intelligence reaches new milestone. Major tech companies demonstrate breakthrough capabilities in large language models and computer vision systems.',
  world: 'Global markets show resilience. International stock exchanges report steady gains despite ongoing geopolitical tensions.',
  finance: 'Cryptocurrency market rebounds strongly. Bitcoin and Ethereum lead recovery as institutional investors increase positions.',
  science: 'NASA discovers new exoplanet candidate. Astronomers identify a potentially habitable world in a distant star system.',
  sports: 'Cricket world championships begin. Teams from across the globe gather for the international tournament.',
};

// ============================================================================
// CANVAS RENDERING ENGINE
// ============================================================================

function renderCharacter(ctx, characterType, animationFrame) {
  const char = CHARACTERS[characterType];
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const centerX = w / 2;
  const centerY = h / 2.2;

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, w, h);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(0.5, '#16213e');
  bgGradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Head position with breathing animation
  const breatheOffset = Math.sin(animationFrame * 0.03) * 8;
  const headY = centerY - 120 + breatheOffset;

  // Draw head
  ctx.fillStyle = char.color;
  ctx.beginPath();
  ctx.arc(centerX, headY, 85, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = headY - 20;
  const eyeOffset = Math.sin(animationFrame * 0.05) * 5;

  // Left eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(centerX - 35, eyeY, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(centerX + 35, eyeY, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (blinking)
  const blinkPhase = (animationFrame % 100) / 100;
  const blinkAmount = blinkPhase < 0.95 ? 1 : Math.max(0, 1 - (blinkPhase - 0.95) * 20);

  ctx.fillStyle = '#000000';
  ctx.globalAlpha = blinkAmount;
  ctx.beginPath();
  ctx.arc(centerX - 35, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 35, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Mouth (animated speaking)
  const mouthOpen = Math.abs(Math.sin(animationFrame * 0.1)) * 12;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(centerX, headY + 50, 20, 5 + mouthOpen, 0, 0, Math.PI);
  ctx.stroke();

  // Body
  ctx.fillStyle = char.color;
  ctx.fillRect(centerX - 60, headY + 90, 120, 140);

  // Chest accent (for robots)
  if (char.style === 'cyber') {
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(centerX, headY + 140, 20, 0, Math.PI * 2);
    ctx.fill();

    // Equalizer bars (for audio visualization)
    for (let i = 0; i < 6; i++) {
      const barHeight = 30 + Math.sin(animationFrame * 0.08 + i) * 25;
      ctx.fillStyle = `hsl(${180 + i * 20}, 100%, 50%)`;
      ctx.fillRect(centerX - 60 + i * 20, headY + 180 - barHeight, 15, barHeight);
    }
  }

  // Name label
  ctx.fillStyle = char.color;
  ctx.font = 'bold 24px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText(char.name.toUpperCase(), centerX, h - 40);
}

// ============================================================================
// SPEECH SYNTHESIS ENGINE
// ============================================================================

function speakNews(text, language) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech Synthesis not available');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language || 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    BROADCAST_STATE.isPlaying = true;
    document.getElementById('startSpeechBtn').disabled = true;
    document.getElementById('pauseSpeechBtn').disabled = false;
    document.getElementById('stopSpeechBtn').disabled = false;
  };

  utterance.onend = () => {
    BROADCAST_STATE.isPlaying = false;
    document.getElementById('startSpeechBtn').disabled = false;
    document.getElementById('pauseSpeechBtn').disabled = true;
    document.getElementById('stopSpeechBtn').disabled = true;
  };

  window.speechSynthesis.speak(utterance);
}

// ============================================================================
// CANVAS ANIMATION LOOP
// ============================================================================

let animationFrame = 0;

function animateCanvas() {
  const canvas = document.getElementById('broadcastCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderCharacter(ctx, BROADCAST_STATE.currentModel, animationFrame);
  animationFrame++;

  requestAnimationFrame(animateCanvas);
}

// ============================================================================
// UI EVENT HANDLERS
// ============================================================================

function setupEventHandlers() {
  // Start Broadcast Button
  document.getElementById('startSpeechBtn').addEventListener('click', () => {
    speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage);
  });

  // Pause Button
  document.getElementById('pauseSpeechBtn').addEventListener('click', () => {
    window.speechSynthesis.pause();
    BROADCAST_STATE.isPlaying = false;
  });

  // Stop Button
  document.getElementById('stopSpeechBtn').addEventListener('click', () => {
    window.speechSynthesis.cancel();
    BROADCAST_STATE.isPlaying = false;
    document.getElementById('startSpeechBtn').disabled = false;
    document.getElementById('pauseSpeechBtn').disabled = true;
    document.getElementById('stopSpeechBtn').disabled = true;
  });

  // Next News Button
  document.getElementById('nextNewsBtn').addEventListener('click', () => {
    const categories = Object.keys(SAMPLE_NEWS);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    BROADCAST_STATE.currentNews = SAMPLE_NEWS[randomCategory];
    document.getElementById('subtitleTicker').textContent = BROADCAST_STATE.currentNews;

    if (BROADCAST_STATE.isPlaying) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage), 100);
    }
  });

  // Language Pills
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', function () {
      BROADCAST_STATE.currentLanguage = this.dataset.lang;
      document.querySelectorAll('[data-lang]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      document.getElementById('currentLangLabel').textContent = this.textContent.split(' ').pop();
      
      if (BROADCAST_STATE.isPlaying) {
        window.speechSynthesis.cancel();
        setTimeout(() => speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage), 100);
      }
    });
  });

  // Reporter/Presenter Pills
  document.querySelectorAll('[data-model]').forEach((btn) => {
    btn.addEventListener('click', function () {
      BROADCAST_STATE.currentModel = this.dataset.model;
      document.querySelectorAll('[data-model]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Volume Slider
  document.getElementById('volumeSlider').addEventListener('input', function () {
    const voices = window.speechSynthesis.getVoices();
    // Volume affects speech synthesis utterance creation
  });

  // Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('mainControlPanel');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // AI Chat Send
  const aiChatBtn = document.getElementById('sendAiChatBtn');
  const aiChatInput = document.getElementById('aiChatInput');
  if (aiChatBtn && aiChatInput) {
    aiChatBtn.addEventListener('click', () => {
      const query = aiChatInput.value.trim();
      if (query) {
        BROADCAST_STATE.currentNews = query;
        document.getElementById('subtitleTicker').textContent = query;
        aiChatInput.value = '';
        
        if (BROADCAST_STATE.isPlaying) {
          window.speechSynthesis.cancel();
          setTimeout(() => speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage), 100);
        }
      }
    });

    aiChatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') aiChatBtn.click();
    });
  }

  // News Category Select
  const newsCategorySelect = document.getElementById('newsCategorySelect');
  if (newsCategorySelect) {
    newsCategorySelect.addEventListener('change', function () {
      if (SAMPLE_NEWS[this.value]) {
        BROADCAST_STATE.currentNews = SAMPLE_NEWS[this.value];
        document.getElementById('subtitleTicker').textContent = BROADCAST_STATE.currentNews;
      }
    });
  }

  // Custom News Load
  const loadCustomBtn = document.getElementById('loadCustomBtn');
  if (loadCustomBtn) {
    loadCustomBtn.addEventListener('click', () => {
      const title = document.getElementById('customNewsTitle').value || 'Custom News';
      const body = document.getElementById('customNewsBody').value || 'No content provided.';
      BROADCAST_STATE.currentNews = `${title}. ${body}`;
      document.getElementById('subtitleTicker').textContent = BROADCAST_STATE.currentNews;
    });
  }

  // Unmute Banner
  const unmuteBanner = document.getElementById('unmuteBanner');
  if (unmuteBanner) {
    unmuteBanner.addEventListener('click', () => {
      unmuteBanner.classList.add('hidden');
      speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage);
    });
  }
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing AI News Studio...');

  // Hide loader
  const loader = document.getElementById('appLoaderScreen');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 500);
  }

  // Setup event handlers
  setupEventHandlers();

  // Start animation loop
  animateCanvas();

  // Auto-start default broadcast
  setTimeout(() => {
    BROADCAST_STATE.currentLanguage = 'hi-IN';
    BROADCAST_STATE.currentModel = 'nexus_3d';
    document.getElementById('subtitleTicker').textContent = BROADCAST_STATE.currentNews;
    
    // Optionally auto-start speech
    // speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage);
  }, 800);

  console.log('✅ AI News Studio READY - Click Start Broadcast or a language button to begin');
});

// Global API for external control
window.switchBroadcastLanguage = (lang) => {
  BROADCAST_STATE.currentLanguage = lang;
  console.log(`Language switched to: ${lang}`);
};

window.switchPresenterModel = (model) => {
  BROADCAST_STATE.currentModel = model;
  console.log(`Presenter switched to: ${model}`);
};

window.startNewsBroadcast = (newsText) => {
  BROADCAST_STATE.currentNews = newsText || BROADCAST_STATE.currentNews;
  speakNews(BROADCAST_STATE.currentNews, BROADCAST_STATE.currentLanguage);
};
