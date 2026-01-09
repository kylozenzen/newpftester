const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const FEEDBACK_EMAIL = 'hirebencampbell@gmail.com';
    const FOLLOW_URL = 'https://www.instagram.com/bensoup/';
    const DONATE_URL = 'https://account.venmo.com/u/bensoup';
    const APP_VERSION = '1.0.0';

    // ========== PWA SETUP ==========
    // Confirm manifest + icon links (guarded for templates that omit them).
    const manifestLink = document.getElementById('manifest-placeholder');
    if (manifestLink) manifestLink.setAttribute('href', 'manifest.json');
    const iconLink = document.getElementById('app-icon');
    const appleTouchLink = document.getElementById('apple-touch-icon');
    const APP_ICON_SVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="120" fill="#0b1020"/>
        <rect x="96" y="224" width="320" height="64" rx="32" fill="none" stroke="rgba(139, 92, 246, 0.55)" stroke-width="14"/>
        <rect x="80" y="206" width="40" height="100" rx="16" fill="#f5f3ff" opacity="0.9"/>
        <rect x="392" y="206" width="40" height="100" rx="16" fill="#f5f3ff" opacity="0.9"/>
        <line x1="156" y1="256" x2="356" y2="256" stroke="#f5f3ff" stroke-width="10" stroke-linecap="round"/>
        <text x="256" y="338" text-anchor="middle" font-size="96" font-weight="700" fill="#f5f3ff" font-family="Inter, system-ui, sans-serif">PS</text>
      </svg>
    `.trim();
    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(APP_ICON_SVG)}`;
    if (iconLink) iconLink.setAttribute('href', svgDataUri);
    const ensureAppleTouchIcon = () => {
      if (!appleTouchLink) return;
      const size = 180;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        appleTouchLink.setAttribute('href', canvas.toDataURL('image/png'));
      };
      const encoded = btoa(unescape(encodeURIComponent(APP_ICON_SVG)));
      img.src = `data:image/svg+xml;base64,${encoded}`;
    };
    ensureAppleTouchIcon();

    // Register service worker
    // Register service worker only on supported origins (not file://)
    const isSecureContextOk = location.protocol === 'https:' || location.hostname === 'localhost';
    if (isSecureContextOk && 'serviceWorker' in navigator) {
      const SW_CODE = `
        const CACHE = 'ps-v2';
        self.addEventListener('install', e => {
          e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['./', 'https://cdn.tailwindcss.com'])));
        });
        self.addEventListener('fetch', e => {
          e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
        });
      `;
      const swBlob = new Blob([SW_CODE], { type: 'application/javascript' });
      const swURL = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swURL).catch(() => {});
    }

    // PWA Install Prompt Component
    const InstallPrompt = () => {
      const [show, setShow] = useState(false);
      const [prompt, setPrompt] = useState(null);
      const [showIosTip, setShowIosTip] = useState(false);

      useEffect(() => {
        const ua = navigator.userAgent || '';
        const isAndroid = /android/i.test(ua);
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|edgios|chrome/i.test(ua);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        const handler = (e) => {
          if (!isAndroid) return;
          e.preventDefault();
          setPrompt(e);
          setShow(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        if (isIOS && isSafari && !isStandalone) {
          setShowIosTip(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
      }, []);

      const install = async () => {
        if (!prompt) return;
        prompt.prompt();
        await prompt.userChoice;
        setShow(false);
      };

      if (!show && !showIosTip) return null;

      return ReactDOM.createPortal(
        <>
          {show && (
            <div className="install-prompt">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📱</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Install on Android</div>
                  <div className="text-xs opacity-80">Add to home screen</div>
                </div>
                <button onClick={install} className="bg-white/20 px-4 py-2 rounded-lg font-bold text-sm">
                  Install
                </button>
                <button onClick={() => setShow(false)} className="text-white/60 text-xl px-2">×</button>
              </div>
            </div>
          )}
          {showIosTip && (
            <div className="ios-install-tip">
              <div className="text-xs font-semibold text-gray-600">Tip: Add Planet Strength to your Home Screen from Share.</div>
              <button onClick={() => setShowIosTip(false)} className="text-gray-400 text-lg px-2">×</button>
            </div>
          )}
        </>,
        document.getElementById('install-prompt')
      );
    };


    // ========== ERROR BOUNDARY ==========
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        console.error('Planet Strength Error:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center space-y-4">
                <div className="text-4xl">😅</div>
                <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
                <p className="text-sm text-gray-600">
                  Don't worry, your workout data is safe. Try reloading the app.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl active:scale-95 transition-transform"
                >
                  Reload App
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl active:scale-95 transition-transform"
                >
                  Try Again
                </button>
              </div>
            </div>
          );
        }

        return this.props.children;
      }
    }

    // ========== ICONS ==========
    const Icon = ({ name, className }) => {
      const icons = {
        Dumbbell: <path d="m6.5 6.5 11 11m4.5 3.5-1-1m-17-17 1 1m14 19 4-4m-20-16 4-4m-3 8 7-7m11 11 7-7" />,
        TrendingUp: <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />,
        User: <g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></g>,
        Home: <path d="M3 9.5 12 3l9 6.5V21a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V9.5Z" />,
        X: <path d="M18 6 6 18M6 6l12 12" />,
        ChevronLeft: <path d="m15 18-6-6 6-6" />,
        ChevronRight: <path d="m9 18 6-6-6-6" />,
        ChevronDown: <path d="m6 9 6 6 6-6" />,
        Clock: <g><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></g>,
        Check: <polyline points="20 6 9 17 4 12" />,
        Trash: <g><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></g>,
        Activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
        Sparkles: <g><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></g>,
        Target: <g><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g>,
        Info: <g><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></g>,
        Trophy: <g><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></g>,
        Lightbulb: <g><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></g>,
        Flame: <path d="M8.5 14.5c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-1.5-1-2.6-2-3.6-.8-.8-1.2-1.5-1.5-2.9-.6 1.1-1.4 1.8-2.2 2.5-1 .9-1.3 2-1.3 4Z" />,
        BookOpen: <g><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></g>,
        BarChart: <g><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></g>,
        Moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
        List: <g><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></g>,
        Settings: <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>,
        Search: <g><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></g>,
        Star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
        Droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
        RefreshCw: <g><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 8.7 6"/><path d="M21 3v6h-6"/></g>,
      };
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={className}>
          {icons[name]}
        </svg>
      );
    };

    // ========== STORAGE FIX FOR IOS ==========
    // In-memory fallback if localStorage does not work
    const memoryStorage = {};
    
    const storage = {
      get: (key, fallback) => { 
        try { 
          const v = localStorage.getItem(key); 
          return v ? JSON.parse(v) : (memoryStorage[key] || fallback); 
        } catch { 
          return memoryStorage[key] || fallback; 
        } 
      },
      set: (key, val) => { 
        try { 
          localStorage.setItem(key, JSON.stringify(val)); 
          memoryStorage[key] = val;
        } catch {
          memoryStorage[key] = val;
        } 
      }
    };

    const getDailyQuote = (pool, key) => {
      if (!pool.length) return null;
      const dayKey = toDayKey(new Date());
      const storageKey = `ps_quote_${key}_${dayKey}`;
      const storedIndex = storage.get(storageKey, null);
      if (storedIndex !== null && pool[storedIndex]) return pool[storedIndex];
      const idx = Math.floor(Math.random() * pool.length);
      storage.set(storageKey, idx);
      return pool[idx];
    };

    const getRandomQuote = (pool) => {
      if (!pool.length) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const resolveMuscleGroup = (eq) => {
      const target = (eq?.target || '').toLowerCase();
      if (target.includes('chest') || target.includes('pec')) return 'Chest';
      if (target.includes('back') || target.includes('lat')) return 'Back';
      if (target.includes('leg') || target.includes('quad') || target.includes('hamstring') || target.includes('glute') || target.includes('calf') || target.includes('thigh')) return 'Legs';
      if (target.includes('shoulder') || target.includes('delt')) return 'Shoulders';
      if (target.includes('bicep') || target.includes('tricep') || target.includes('arm') || target.includes('forearm')) return 'Arms';
      if (target.includes('core') || target.includes('ab')) return 'Core';
      return 'Other';
    };

    const getLastWorkoutDate = (history = {}, cardioHistory = {}) => {
      const dates = [];
      Object.values(history || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (s?.date) dates.push(new Date(s.date));
        });
      });
      Object.values(cardioHistory || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (s?.date) dates.push(new Date(s.date));
        });
      });
      if (dates.length === 0) return null;
      return new Date(Math.max(...dates.map(d => d.getTime())));
    };

    // ========== CONSTANTS ==========
    const AVATARS = ["🦁","🦍","🦖","💪","🏃","🧘","🤖","👽","🦊","⚡"];

    const homeQuotes = [
      { text: "Get busy living, or get busy dying.", movie: "The Shawshank Redemption" },
      { text: "Do. Or do not. There is no try.", movie: "Star Wars: The Empire Strikes Back" },
      { text: "Why do we fall? So we can learn to pick ourselves up.", movie: "Batman Begins" },
      { text: "Just keep swimming.", movie: "Finding Nemo" },
      { text: "Carpe diem. Seize the day, boys.", movie: "Dead Poets Society" }
    ];

    const postWorkoutQuotes = [
      { text: "It’s what you do right now that makes a difference.", movie: "Black Hawk Down" },
      { text: "It’s not who I am underneath, but what I do that defines me.", movie: "Batman Begins" },
      { text: "You are what you choose to be.", movie: "The Iron Giant" },
      { text: "Every man dies. Not every man really lives.", movie: "Braveheart" },
      { text: "A hero can be anyone.", movie: "The Dark Knight Rises" }
    ];

    const restDayQuotes = [
      { text: "There’s a time for daring and there’s a time for caution.", movie: "Dead Poets Society" },
      { text: "Tomorrow is another day.", movie: "Gone with the Wind" },
      { text: "This is the beginning of a beautiful friendship.", movie: "Casablanca" },
      { text: "Hakuna Matata.", movie: "The Lion King" },
      { text: "Keep breathing.", movie: "Gravity" }
    ];

    const GYM_TYPES = {
      planet: { 
        label: "Planet Fitness",
        emoji: "🟣",
        machines: true,
        dumbbells: { available: true, max: 75, increments: [5] },
        barbells: { available: true, standardBar: 45 },
        machineStackCap: 260
      },
      commercial: {
        label: "Commercial Gym",
        emoji: "🏋️",
        desc: "LA Fitness, Golds, 24 Hour, etc",
        machines: true,
        dumbbells: { available: true, max: 120, increments: [2.5, 5] },
        barbells: { available: true, standardBar: 45 },
        machineStackCap: 300
      },
      iron: {
        label: "Powerlifting Gym",
        emoji: "⚡",
        desc: "Serious iron, heavy weights",
        machines: false,
        dumbbells: { available: true, max: 150, increments: [2.5, 5, 10] },
        barbells: { available: true, standardBar: 45 },
        machineStackCap: null
      },
      home: {
        label: "Home Gym",
        emoji: "🏠",
        machines: false,
        dumbbells: { available: true, max: 100, increments: [5] },
        barbells: { available: true, standardBar: 45 },
        machineStackCap: null
      }
    };

    const EXPERIENCE_LEVELS = [
      { label: 'Beginner', desc: '0–3 months', detail: 'New to lifting or restarting' },
      { label: 'Novice', desc: '3–9 months', detail: 'Learning form + consistency' },
      { label: 'Intermediate', desc: '1–2 years', detail: 'Progressing steadily' },
      { label: 'Advanced', desc: '3+ years', detail: 'Dialed in + consistent' }
    ];

    const ACTIVITY_LEVELS = [
      { label: 'Sedentary', emoji: '🪑', desc: 'Desk job, minimal movement', multiplier: 0.85 },
      { label: 'Lightly Active', emoji: '🚶', desc: 'Some walking', multiplier: 0.95 },
      { label: 'Moderately Active', emoji: '🏃', desc: 'Regular movement', multiplier: 1.0 },
      { label: 'Very Active', emoji: '💪', desc: 'Physical + training', multiplier: 1.1 },
      { label: 'Athlete', emoji: '🏆', desc: 'High volume training', multiplier: 1.2 }
    ];

    const GOALS = [
      { id: 'strength', label: 'Strength Gain', emoji: '💪', desc: 'Push weight up, focus on PRs', bias: { reps: 'lower', cardio: 'lower' } },
      { id: 'recomp', label: 'Body Recomp', emoji: '🔄', desc: 'Build strength while leaning out', bias: { reps: 'middle', cardio: 'middle' } },
      { id: 'fatloss', label: 'Fat Loss', emoji: '🔥', desc: 'Consistency + reps + recovery', bias: { reps: 'higher', cardio: 'higher' } },
      { id: 'health', label: 'General Health', emoji: '❤️', desc: 'Keep it simple and sustainable', bias: { reps: 'middle', cardio: 'middle' } },
    ];

    const DIFFICULTY_LEVELS = [
      { value: 'easy', label: 'Easy', emoji: '✅', desc: 'Could do 3+ more reps' },
      { value: 'good', label: 'Good', emoji: '💪', desc: '1–2 reps in tank' },
      { value: 'hard', label: 'Hard', emoji: '😤', desc: 'Barely finished' },
      { value: 'failed', label: 'Failed', emoji: '❌', desc: "Could not complete" }
    ];

    // ========== BEGINNER STARTER EXERCISES ==========
    const BEGINNER_EXERCISES = [
      { id: 'chest_press', name: 'Chest Press', emoji: '⚙️', desc: 'Great for building chest strength', why: 'Machine guides your movement' },
      { id: 'lat_pulldown', name: 'Lat Pulldown', emoji: '⚙️', desc: 'Builds a strong back', why: 'Easier than pull-ups' },
      { id: 'leg_press', name: 'Leg Press', emoji: '⚙️', desc: 'Powerful legs, safe form', why: 'No balance required' },
      { id: 'seated_row', name: 'Seated Row', emoji: '⚙️', desc: 'Posture and back strength', why: 'Simple pulling motion' },
      { id: 'shoulder_press', name: 'Shoulder Press', emoji: '⚙️', desc: 'Strong shoulders', why: 'Machine stabilizes weight' },
      { id: 'leg_curl', name: 'Leg Curl', emoji: '⚙️', desc: 'Hamstring strength', why: 'Isolates one muscle group' },
      { id: 'ab_crunch', name: 'Ab Crunch Machine', emoji: '⚙️', desc: 'Core strength', why: 'Controlled movement' },
      { id: 'pec_fly', name: 'Pec Fly', emoji: '⚙️', desc: 'Chest definition', why: 'Isolated chest work' },
    ];

    // ========== CARDIO TYPES ==========
const CARDIO_TYPES = {
  swimming: {
    name: 'Swimming',
    emoji: '🏊',
    color: 'cyan',
        regularActivities: [
          { id: 'laps', label: 'Swimming Laps', emoji: '🏊' },
          { id: 'water_walk', label: 'Water Walking', emoji: '🚶' },
          { id: 'water_aerobics', label: 'Water Aerobics', emoji: '💃' },
          { id: 'treading', label: 'Treading Water', emoji: '🌊' },
          { id: 'casual', label: 'Casual Swim', emoji: '😎' },
        ],
        proMetrics: ['distance', 'pace', 'strokes']
      },
      running: {
        name: 'Running',
        emoji: '🏃',
        color: 'orange',
        regularActivities: [
          { id: 'treadmill', label: 'Treadmill', emoji: '🏃' },
          { id: 'outdoor', label: 'Outdoor Run', emoji: '🌳' },
          { id: 'walk', label: 'Walking', emoji: '🚶' },
          { id: 'hiit', label: 'HIIT/Intervals', emoji: '⚡' },
          { id: 'cooldown', label: 'Cool Down Walk', emoji: '🧘' },
        ],
        proMetrics: ['distance', 'pace', 'elevation']
      }
    };

const motivationalQuotes = [
  { quote: "Get busy living, or get busy dying.", author: "The Shawshank Redemption" },
  { quote: "It’s not about how hard you hit. It’s about how hard you can get hit and keep moving forward.", author: "Rocky Balboa" },
  { quote: "Do, or do not. There is no try.", author: "Star Wars: The Empire Strikes Back" },
  { quote: "Why do we fall? So we can learn to pick ourselves up.", author: "Batman Begins" },
  { quote: "Great men are not born great, they grow great.", author: "The Godfather" },
  { quote: "You’re capable of more than you know.", author: "A League of Their Own" },
  { quote: "The future is not set. There is no fate but what we make for ourselves.", author: "Terminator 2: Judgment Day" },
  { quote: "Sometimes it is the people no one expects anything from who do things no one can imagine.", author: "The Imitation Game" },
  { quote: "It’s what you do right now that makes a difference.", author: "Black Hawk Down" },
  { quote: "Carpe diem. Seize the day, boys. Make your lives extraordinary.", author: "Dead Poets Society" },
  { quote: "We are who we choose to be. Now choose.", author: "Spider-Man" },
  { quote: "Our lives are defined by opportunities, even the ones we miss.", author: "The Curious Case of Benjamin Button" },
  { quote: "Hope is a good thing. Maybe the best of things.", author: "The Shawshank Redemption" },
  { quote: "You have power over your mind—not outside events. Realize this, and you will find strength.", author: "Gladiator" },
  { quote: "It ain’t about how fast I get there. It ain’t about what I see along the way. It’s the climb.", author: "Hannah Montana: The Movie" },
  { quote: "Every man dies. Not every man really lives.", author: "Braveheart" },
  { quote: "You are what you choose to be.", author: "Iron Giant" },
  { quote: "It matters not what someone is born, but what they grow to be.", author: "Harry Potter and the Goblet of Fire" },
  { quote: "Even the smallest person can change the course of the future.", author: "The Lord of the Rings: The Fellowship of the Ring" },
  { quote: "You mustn’t be afraid to dream a little bigger, darling.", author: "Inception" },
  { quote: "The moment you doubt whether you can fly, you cease forever to be able to do it.", author: "Peter Pan" },
  { quote: "It’s only after we’ve lost everything that we’re free to do anything.", author: "Fight Club" },
  { quote: "Sometimes you gotta run before you can walk.", author: "Iron Man" },
  { quote: "No one knows what they’re capable of until they try.", author: "Gattaca" },
  { quote: "What we do in life echoes in eternity.", author: "Gladiator" },
  { quote: "Your destiny is within you. You just have to be brave enough to see it.", author: "Brave" },
  { quote: "We are not meant to save the world. We are meant to live in it.", author: "Interstellar" },
  { quote: "Life moves pretty fast. If you don’t stop and look around once in a while, you could miss it.", author: "Ferris Bueller’s Day Off" },
  { quote: "Today, we celebrate our independence!", author: "Independence Day" },
  { quote: "You have to believe in yourself.", author: "Rocky II" }
];


    const EQUIPMENT_DB = {
      // ========== CARDIO ==========
      "cardio_running": {
        type: 'cardio',
        name: "Running",
        target: "Cardio",
        tags: ["Cardio", "Full Body"],
        cardioGroup: "running",
        emoji: "🏃",
        comingSoon: true
      },
      "cardio_swimming": {
        type: 'cardio',
        name: "Swimming",
        target: "Cardio",
        tags: ["Cardio", "Full Body"],
        cardioGroup: "swimming",
        emoji: "🏊",
        comingSoon: true
      },
      // ========== MACHINES ==========
      "chest_press": { 
        type: 'machine',
        name: "Chest Press", 
        target: "Chest", 
        muscles: "Chest, Triceps, Front Delts", 
        tags: ["Push","Upper","Full Body"], 
        stackCap: 260, 
        multipliers: { Male: [0.3,0.55,0.85,1.15], Female: [0.2,0.35,0.55,0.75] }, 
        cues: ["Handles mid-chest.", "Elbows ~45°.", "Shoulder blades back."], 
        progression: "Add weight when you can do 12+ controlled reps." 
      },
      "pec_fly": { 
        type: 'machine',
        name: "Pec Fly", 
        target: "Chest", 
        muscles: "Chest, Front Delts", 
        tags: ["Push","Upper"], 
        stackCap: 200, 
        multipliers: { Male: [0.2,0.35,0.55,0.8], Female: [0.12,0.25,0.4,0.6] }, 
        cues: ["Soft bend in elbows.", "Move from shoulders."], 
        progression: "Increase when 12+ reps feel easy with full ROM." 
      },
      "shoulder_press": { 
        type: 'machine',
        name: "Shoulder Press", 
        target: "Shoulders", 
        muscles: "Delts, Triceps", 
        tags: ["Push","Upper","Full Body"], 
        stackCap: 200, 
        multipliers: { Male: [0.2,0.4,0.65,0.95], Female: [0.12,0.25,0.4,0.6] }, 
        cues: ["Start at ear level.", "Press straight up.", "Brace core."], 
        progression: "Increase when 10–12 reps feel solid." 
      },
      "cable_tricep": { 
        type: 'machine',
        name: "Cable Tricep Push", 
        target: "Triceps", 
        muscles: "Triceps", 
        tags: ["Push","Upper"], 
        stackCap: 70, 
        ratio: 0.5, 
        multipliers: { Male: [0.25,0.4,0.6,0.85], Female: [0.18,0.3,0.45,0.65] }, 
        cues: ["Elbows pinned.", "Full extension."], 
        progression: "Increase when 12+ reps feel clean." 
      },
      "lat_pulldown": { 
        type: 'machine',
        name: "Lat Pulldown", 
        target: "Back", 
        muscles: "Lats, Biceps", 
        tags: ["Pull","Upper","Full Body"], 
        stackCap: 250, 
        multipliers: { Male: [0.35,0.6,0.9,1.2], Female: [0.25,0.4,0.65,0.9] }, 
        cues: ["Pull to clavicle.", "No swinging.", "Back does the work."], 
        progression: "Add weight when 12+ reps are controlled." 
      },
      "seated_row": { 
        type: 'machine',
        name: "Seated Row", 
        target: "Back", 
        muscles: "Back, Biceps", 
        tags: ["Pull","Upper"], 
        stackCap: 250, 
        multipliers: { Male: [0.4,0.65,1.0,1.35], Female: [0.28,0.45,0.7,0.95] }, 
        cues: ["Chest to pad.", "Pull to lower ribs."], 
        progression: "Progress when all sets are clean." 
      },
      "cable_bicep": { 
        type: 'machine',
        name: "Cable Bicep Curl", 
        target: "Biceps", 
        muscles: "Biceps, Forearms", 
        tags: ["Pull","Upper"], 
        stackCap: 60, 
        ratio: 0.5, 
        multipliers: { Male: [0.15,0.25,0.4,0.55], Female: [0.1,0.2,0.3,0.4] }, 
        cues: ["Elbows fixed.", "Slow negative."], 
        progression: "Increase when 12+ strict reps are easy." 
      },
      "leg_press": { 
        type: 'machine',
        name: "Leg Press", 
        target: "Legs", 
        muscles: "Quads, Glutes, Hamstrings", 
        tags: ["Push","Legs","Full Body"], 
        stackCap: 700, 
        multipliers: { Male: [1.0,1.6,2.3,3.0], Female: [0.7,1.1,1.6,2.2] }, 
        cues: ["No knee lockout.", "Controlled depth."], 
        progression: "Add weight when 15+ reps are strong and safe." 
      },
      "leg_extension": { 
        type: 'machine',
        name: "Leg Extension", 
        target: "Quads", 
        muscles: "Quadriceps", 
        tags: ["Push","Legs"], 
        stackCap: 200, 
        multipliers: { Male: [0.35,0.6,0.9,1.2], Female: [0.25,0.45,0.7,0.95] }, 
        cues: ["Align knee with pivot.", "Control descent."], 
        progression: "Increase when 12–15 reps are easy." 
      },
      "leg_curl": { 
        type: 'machine',
        name: "Leg Curl", 
        target: "Hamstrings", 
        muscles: "Hamstrings", 
        tags: ["Pull","Legs"], 
        stackCap: 200, 
        multipliers: { Male: [0.35,0.55,0.8,1.05], Female: [0.25,0.4,0.6,0.8] }, 
        cues: ["Hips down.", "Smooth reps."], 
        progression: "Increase when reps are controlled." 
      },
      "back_extension": { 
        type: 'machine',
        name: "Back Extension", 
        target: "Lower Back", 
        muscles: "Lower Back, Glutes", 
        tags: ["Pull","Legs","Core"], 
        stackCap: 200, 
        multipliers: { Male: [0.35,0.55,0.8,1.05], Female: [0.25,0.4,0.6,0.8] }, 
        cues: ["Pivot at hips.", "No hyperextension.", "Controlled movement."], 
        progression: "Increase when 15+ reps feel strong." 
      },
      "ab_crunch": { 
        type: 'machine',
        name: "Ab Crunch", 
        target: "Core", 
        muscles: "Abs", 
        tags: ["Core","Full Body"], 
        stackCap: 200, 
        multipliers: { Male: [0.3,0.5,0.75,1.0], Female: [0.2,0.35,0.55,0.75] }, 
        cues: ["Ribs to pelvis.", "Exhale."], 
        progression: "Increase when 20+ reps are clean." 
      },
      "hip_abduction": {
        type: 'machine',
        name: "Hip Abduction",
        target: "Glutes",
        muscles: "Glutes, Hip Abductors",
        tags: ["Push","Legs"],
        stackCap: 200,
        multipliers: { Male: [0.3,0.5,0.75,1.0], Female: [0.25,0.45,0.7,0.95] },
        cues: ["Press knees out.", "Control the return.", "Don't lean forward."],
        progression: "Add weight when 15+ reps feel controlled."
      },
      "hip_adduction": {
        type: 'machine',
        name: "Hip Adduction",
        target: "Inner Thighs",
        muscles: "Adductors, Inner Thighs",
        tags: ["Push","Legs"],
        stackCap: 200,
        multipliers: { Male: [0.3,0.5,0.75,1.0], Female: [0.25,0.45,0.7,0.95] },
        cues: ["Squeeze knees together.", "Controlled movement.", "Don't use momentum."],
        progression: "Add weight when 15+ reps feel strong."
      },
      "calf_raise": {
        type: 'machine',
        name: "Calf Raise",
        target: "Calves",
        muscles: "Calves",
        tags: ["Push","Legs"],
        stackCap: 300,
        multipliers: { Male: [0.5,0.8,1.2,1.6], Female: [0.35,0.6,0.9,1.2] },
        cues: ["Full stretch at bottom.", "Rise onto toes.", "Squeeze at top."],
        progression: "Add weight when 15-20 reps feel easy."
      },
      "smith_machine": {
        type: 'machine',
        name: "Smith Machine Squat",
        target: "Legs",
        muscles: "Quads, Glutes",
        tags: ["Push","Legs","Full Body"],
        stackCap: 500,
        multipliers: { Male: [0.6,1.0,1.5,2.0], Female: [0.4,0.7,1.1,1.5] },
        cues: ["Feet forward.", "Bar on traps.", "Controlled descent."],
        progression: "Add weight when 10+ reps are solid."
      },
      "cable_wood_chop": {
        type: 'machine',
        name: "Cable Wood Chop",
        target: "Core",
        muscles: "Obliques, Core, Shoulders",
        tags: ["Core","Full Body"],
        stackCap: 150,
        ratio: 0.5,
        multipliers: { Male: [0.2,0.35,0.55,0.75], Female: [0.15,0.25,0.4,0.55] },
        cues: ["Rotate from core.", "Arms extended.", "Control both directions."],
        progression: "Increase when 12-15 reps per side feel controlled."
      },
      "preacher_curl": {
        type: 'machine',
        name: "Preacher Curl",
        target: "Biceps",
        muscles: "Biceps, Forearms",
        tags: ["Pull","Upper"],
        stackCap: 120,
        multipliers: { Male: [0.2,0.35,0.5,0.7], Female: [0.12,0.22,0.35,0.5] },
        cues: ["Arms flat on pad.", "Full extension at bottom.", "Strict form."],
        progression: "Add weight when 10-12 strict reps are easy."
      },

      // ========== DUMBBELLS ==========
      "db_bench_press": {
        type: 'dumbbell',
        name: "Dumbbell Bench Press",
        target: "Chest",
        muscles: "Chest, Triceps, Front Delts",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.15, 0.25, 0.4, 0.55], Female: [0.1, 0.18, 0.28, 0.38] },
        cues: ["Dumbbells at chest level.", "Press up and slightly in.", "Control the descent."],
        progression: "Increase weight when you can do 12 reps with good form."
      },
      "db_row": {
        type: 'dumbbell',
        name: "Dumbbell Row",
        target: "Back",
        muscles: "Back, Biceps",
        tags: ["Pull","Upper"],
        multipliers: { Male: [0.2, 0.35, 0.5, 0.7], Female: [0.12, 0.22, 0.35, 0.48] },
        cues: ["Row to hip.", "Elbow stays close.", "Squeeze at top."],
        progression: "Add weight when 10-12 reps feel controlled."
      },
      "db_shoulder_press": {
        type: 'dumbbell',
        name: "Dumbbell Shoulder Press",
        target: "Shoulders",
        muscles: "Delts, Triceps",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.12, 0.22, 0.35, 0.5], Female: [0.08, 0.15, 0.25, 0.35] },
        cues: ["Start at shoulders.", "Press straight up.", "Control the descent."],
        progression: "Increase when 10-12 reps are solid."
      },
      "db_goblet_squat": {
        type: 'dumbbell',
        name: "Goblet Squat",
        target: "Legs",
        muscles: "Quads, Glutes",
        tags: ["Push","Legs"],
        multipliers: { Male: [0.25, 0.4, 0.6, 0.8], Female: [0.18, 0.3, 0.45, 0.6] },
        cues: ["Hold at chest.", "Squat deep.", "Drive through heels."],
        progression: "Add weight when 15+ reps feel strong."
      },
      "db_lunge": {
        type: 'dumbbell',
        name: "Dumbbell Lunges",
        target: "Legs",
        muscles: "Quads, Glutes, Hamstrings",
        tags: ["Push","Legs"],
        multipliers: { Male: [0.15, 0.25, 0.4, 0.55], Female: [0.1, 0.18, 0.28, 0.4] },
        cues: ["Step forward.", "Knee at 90°.", "Push back to start."],
        progression: "Increase when all reps are controlled."
      },
      "db_curl": {
        type: 'dumbbell',
        name: "Dumbbell Curl",
        target: "Biceps",
        muscles: "Biceps, Forearms",
        tags: ["Pull","Upper"],
        multipliers: { Male: [0.1, 0.18, 0.28, 0.4], Female: [0.06, 0.12, 0.2, 0.28] },
        cues: ["Elbows fixed.", "Curl to shoulder.", "Slow negative."],
        progression: "Add weight when 12+ strict reps are easy."
      },
      "db_incline_bench": {
        type: 'dumbbell',
        name: "Incline Dumbbell Bench",
        target: "Chest",
        muscles: "Upper Chest, Front Delts",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.12, 0.22, 0.35, 0.5], Female: [0.08, 0.15, 0.25, 0.35] },
        cues: ["Bench at 30-45°.", "Press up and in.", "Control the descent."],
        progression: "Add weight when 10-12 reps feel solid."
      },
      "db_lateral_raise": {
        type: 'dumbbell',
        name: "Lateral Raise",
        target: "Shoulders",
        muscles: "Side Delts",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.06, 0.12, 0.2, 0.3], Female: [0.04, 0.08, 0.14, 0.22] },
        cues: ["Slight bend in elbows.", "Lift to shoulder height.", "Control down."],
        progression: "Increase when 12-15 reps are controlled."
      },
      "db_front_raise": {
        type: 'dumbbell',
        name: "Front Raise",
        target: "Shoulders",
        muscles: "Front Delts",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.06, 0.12, 0.2, 0.3], Female: [0.04, 0.08, 0.14, 0.22] },
        cues: ["Arms straight.", "Raise to eye level.", "Controlled movement."],
        progression: "Add weight when 12-15 reps feel easy."
      },
      "db_shrug": {
        type: 'dumbbell',
        name: "Dumbbell Shrug",
        target: "Traps",
        muscles: "Traps, Upper Back",
        tags: ["Pull","Upper"],
        multipliers: { Male: [0.2, 0.35, 0.5, 0.7], Female: [0.12, 0.22, 0.35, 0.5] },
        cues: ["Shrug straight up.", "Hold at top.", "Control down."],
        progression: "Increase when 12+ reps are strong."
      },
      "db_rdl": {
        type: 'dumbbell',
        name: "Dumbbell Romanian DL",
        target: "Hamstrings",
        muscles: "Hamstrings, Glutes, Lower Back",
        tags: ["Pull","Legs"],
        multipliers: { Male: [0.2, 0.35, 0.5, 0.7], Female: [0.15, 0.25, 0.4, 0.55] },
        cues: ["Hinge at hips.", "Slight knee bend.", "Feel hamstring stretch."],
        progression: "Add weight when 10-12 reps feel controlled."
      },
      "db_hammer_curl": {
        type: 'dumbbell',
        name: "Hammer Curl",
        target: "Biceps",
        muscles: "Biceps, Forearms, Brachialis",
        tags: ["Pull","Upper"],
        multipliers: { Male: [0.1, 0.18, 0.28, 0.4], Female: [0.06, 0.12, 0.2, 0.28] },
        cues: ["Palms facing in.", "Curl up.", "Keep elbows still."],
        progression: "Increase when 12+ reps are strict."
      },
      "db_tricep_kickback": {
        type: 'dumbbell',
        name: "Tricep Kickback",
        target: "Triceps",
        muscles: "Triceps",
        tags: ["Push","Upper"],
        multipliers: { Male: [0.06, 0.12, 0.2, 0.3], Female: [0.04, 0.08, 0.14, 0.22] },
        cues: ["Elbow fixed at side.", "Extend arm back.", "Squeeze at top."],
        progression: "Add weight when 12-15 reps feel controlled."
      },

      // ========== BARBELLS ==========
      "bb_squat": {
        type: 'barbell',
        name: "Barbell Squat",
        target: "Legs",
        muscles: "Quads, Glutes, Hamstrings",
        tags: ["Push","Legs"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.8, 1.2, 1.7, 2.2], Female: [0.5, 0.9, 1.3, 1.7] },
        cues: ["Bar on traps.", "Depth to parallel.", "Drive through heels."],
        progression: "Add weight when you hit 8+ reps with good depth."
      },
      "bb_bench": {
        type: 'barbell',
        name: "Barbell Bench Press",
        target: "Chest",
        muscles: "Chest, Triceps, Front Delts",
        tags: ["Push","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.5, 0.8, 1.1, 1.4], Female: [0.25, 0.45, 0.65, 0.85] },
        cues: ["Bar to mid-chest.", "Elbows 45°.", "Feet planted."],
        progression: "Increase when you can do 8-10 solid reps."
      },
      "bb_deadlift": {
        type: 'barbell',
        name: "Barbell Deadlift",
        target: "Back",
        muscles: "Back, Glutes, Hamstrings",
        tags: ["Pull","Legs"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [1.0, 1.5, 2.0, 2.5], Female: [0.6, 1.0, 1.4, 1.8] },
        cues: ["Bar over mid-foot.", "Chest up.", "Drive through floor."],
        progression: "Add weight when 6-8 reps are strong."
      },
      "bb_row": {
        type: 'barbell',
        name: "Barbell Row",
        target: "Back",
        muscles: "Back, Biceps",
        tags: ["Pull","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.4, 0.65, 0.9, 1.2], Female: [0.25, 0.45, 0.65, 0.85] },
        cues: ["Hinge at hips.", "Row to belly.", "No swinging."],
        progression: "Increase when 10+ reps are controlled."
      },
      "bb_overhead_press": {
        type: 'barbell',
        name: "Overhead Press",
        target: "Shoulders",
        muscles: "Delts, Triceps",
        tags: ["Push","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.3, 0.5, 0.7, 0.95], Female: [0.18, 0.3, 0.45, 0.6] },
        cues: ["Bar at clavicle.", "Press straight up.", "Lockout overhead."],
        progression: "Add weight when 8-10 reps are solid."
      },
      "bb_rdl": {
        type: 'barbell',
        name: "Romanian Deadlift",
        target: "Hamstrings",
        muscles: "Hamstrings, Glutes, Lower Back",
        tags: ["Pull","Legs"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.6, 1.0, 1.4, 1.8], Female: [0.4, 0.7, 1.0, 1.3] },
        cues: ["Hinge at hips.", "Bar close to legs.", "Feel hamstring stretch."],
        progression: "Add weight when 8-10 reps feel strong."
      },
      "bb_front_squat": {
        type: 'barbell',
        name: "Front Squat",
        target: "Quads",
        muscles: "Quads, Core, Upper Back",
        tags: ["Push","Legs"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.6, 1.0, 1.4, 1.8], Female: [0.4, 0.7, 1.0, 1.3] },
        cues: ["Bar on front delts.", "Elbows high.", "Chest up."],
        progression: "Increase when 8+ reps are solid."
      },
      "bb_sumo_deadlift": {
        type: 'barbell',
        name: "Sumo Deadlift",
        target: "Legs",
        muscles: "Glutes, Quads, Hamstrings",
        tags: ["Pull","Legs"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.9, 1.4, 1.9, 2.4], Female: [0.55, 0.95, 1.35, 1.75] },
        cues: ["Wide stance.", "Bar over mid-foot.", "Drive through floor."],
        progression: "Add weight when 6-8 reps are strong."
      },
      "bb_close_grip_bench": {
        type: 'barbell',
        name: "Close-Grip Bench",
        target: "Triceps",
        muscles: "Triceps, Chest",
        tags: ["Push","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.4, 0.7, 1.0, 1.3], Female: [0.22, 0.4, 0.6, 0.8] },
        cues: ["Hands shoulder-width.", "Elbows in.", "Touch lower chest."],
        progression: "Increase when 8-10 reps are controlled."
      },
      "bb_incline_bench": {
        type: 'barbell',
        name: "Incline Barbell Bench",
        target: "Upper Chest",
        muscles: "Upper Chest, Front Delts, Triceps",
        tags: ["Push","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.4, 0.7, 1.0, 1.3], Female: [0.22, 0.4, 0.6, 0.8] },
        cues: ["Bench at 30-45°.", "Bar to upper chest.", "Press straight up."],
        progression: "Add weight when 8-10 reps feel solid."
      },
      "bb_curl": {
        type: 'barbell',
        name: "Barbell Curl",
        target: "Biceps",
        muscles: "Biceps, Forearms",
        tags: ["Pull","Upper"],
        needsBarWeight: true,
        plateOptions: [25, 10, 5, 2.5],
        multipliers: { Male: [0.2, 0.35, 0.5, 0.7], Female: [0.12, 0.22, 0.35, 0.5] },
        cues: ["Elbows at sides.", "Curl to shoulders.", "Control down."],
        progression: "Increase when 10-12 strict reps are easy."
      },
      "bb_shrug": {
        type: 'barbell',
        name: "Barbell Shrug",
        target: "Traps",
        muscles: "Traps, Upper Back",
        tags: ["Pull","Upper"],
        needsBarWeight: true,
        plateOptions: [45, 35, 25, 10, 5, 2.5],
        multipliers: { Male: [0.4, 0.7, 1.0, 1.4], Female: [0.25, 0.45, 0.7, 0.95] },
        cues: ["Shrug straight up.", "Hold at top.", "Don't roll shoulders."],
        progression: "Add weight when 12+ reps are strong."
      },
    };

    const WORKOUT_PLANS = {
      Push: {
        machines: ["chest_press","shoulder_press","pec_fly","cable_tricep"],
        dumbbells: ["db_bench_press","db_shoulder_press"],
        barbells: ["bb_bench","bb_overhead_press"]
      },
      Pull: {
        machines: ["lat_pulldown","seated_row","cable_bicep","ab_crunch"],
        dumbbells: ["db_row","db_curl"],
        barbells: ["bb_deadlift","bb_row"]
      },
      Legs: {
        machines: ["leg_press","leg_extension","leg_curl","ab_crunch"],
        dumbbells: ["db_goblet_squat","db_lunge"],
        barbells: ["bb_squat"]
      }
    };

    // ========== BIG BASICS - Core exercises shown by default ==========
    const BIG_BASICS = [
      // Machines (6 core)
      "chest_press", "lat_pulldown", "seated_row", "shoulder_press", "leg_press", "leg_curl",
      // Dumbbells (4 core)
      "db_bench_press", "db_row", "db_shoulder_press", "db_curl",
      // Barbells (5 core)
      "bb_squat", "bb_bench", "bb_deadlift", "bb_row", "bb_overhead_press"
    ];

    // ========== UTILITIES ==========
    const clampTo5 = (n) => Math.max(10, Math.round(n / 5) * 5);

    // Custom hook for debouncing values
    const useDebounce = (value, delay = 200) => {
      const [debouncedValue, setDebouncedValue] = useState(value);
      
      useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
      }, [value, delay]);
      
      return debouncedValue;
    };

    const toDayKey = (date = new Date()) => {
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2,'0');
      const d = String(date.getDate()).padStart(2,'0');
      return `${y}-${m}-${d}`;
    };

    const STORAGE_VERSION = 3;
    const STORAGE_KEY = 'ps_v3_meta';
    const ONBOARDING_KEY = 'ps_onboarding_complete';
    const ACTIVE_SESSION_KEY = 'ps_active_session';
    const DRAFT_SESSION_KEY = 'ps_draft_session';
    const TODAY_WORKOUT_KEY = 'ps_today_workout';
    const TODAY_SESSION_KEY = 'ps_today_session';
    const REST_DAY_KEY = 'restDayDates';
    const LAST_OPEN_KEY = 'ps_last_open';

    const uniqueDayKeysFromHistory = (history, cardioHistory = {}, restDays = [], dayEntries = null) => {
      if (dayEntries && Object.keys(dayEntries).length > 0) {
        return Object.keys(dayEntries).sort();
      }

      const keys = new Set();
      // Add workout days
      Object.values(history || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (s?.date) keys.add(toDayKey(new Date(s.date)));
        });
      });
      // Add cardio days
      Object.values(cardioHistory || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (s?.date) keys.add(toDayKey(new Date(s.date)));
        });
      });
      // Add rest days
      (restDays || []).forEach(d => keys.add(d));
      return Array.from(keys).sort();
    };

    const computeStreak = (history, cardioHistory = {}, restDays = [], dayEntries = null) => {
      const days = uniqueDayKeysFromHistory(history, cardioHistory, restDays, dayEntries);
      if (days.length === 0) return { current: 0, best: 0, lastDayKey: null, hasToday: false };

      let best = 1, run = 1;
      for (let i=1;i<days.length;i++){
        const prev = new Date(days[i-1]);
        const cur = new Date(days[i]);
        const diff = (cur - prev) / 86400000;
        if (diff === 1) { run++; best = Math.max(best, run); }
        else run = 1;
      }

      const todayKey = toDayKey(new Date());
      let current = 1;
      let i = days.length - 1;
      let anchor = days[i];

      while (i > 0) {
        const a = new Date(days[i-1]);
        const b = new Date(days[i]);
        const diff = (b - a) / 86400000;
        if (diff === 1) current++;
        else break;
        i--;
      }

      return { current, best, lastDayKey: anchor, hasToday: anchor === todayKey };
    };

    const buildDayEntriesFromHistory = (history = {}, cardioHistory = {}, restDays = []) => {
      const entries = {};
      Object.values(history || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (!s?.date) return;
          const key = toDayKey(new Date(s.date));
          entries[key] = entries[key] || { type: 'workout', date: key, exercises: [] };
        });
      });
      Object.values(cardioHistory || {}).forEach(arr => {
        (arr || []).forEach(s => {
          if (!s?.date) return;
          const key = toDayKey(new Date(s.date));
          entries[key] = entries[key] || { type: 'workout', date: key, exercises: [] };
        });
      });
      (restDays || []).forEach(d => {
        entries[d] = entries[d] || { type: 'rest', date: d, exercises: [] };
      });
      return entries;
    };

    const deriveRecentExercises = (history = {}, limit = 12) => {
      const flat = [];
      Object.entries(history || {}).forEach(([id, sessions]) => {
        (sessions || []).forEach(s => {
          if (s?.date) flat.push({ id, date: s.date });
        });
      });
      flat.sort((a, b) => new Date(b.date) - new Date(a.date));
      const seen = new Set();
      const result = [];
      for (const item of flat) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        result.push(item.id);
        if (result.length >= limit) break;
      }
      return result;
    };

    const deriveUsageCountsFromHistory = (history = {}) => {
      const counts = {};
      Object.entries(history || {}).forEach(([id, sessions]) => {
        (sessions || []).forEach(s => {
          const increment = Math.max(1, (s?.sets || []).length);
          counts[id] = (counts[id] || 0) + increment;
        });
      });
      return counts;
    };

    const normalizeSearch = (value = '') => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const SEARCH_ALIASES = {
      rdl: 'romanian deadlift',
      ohp: 'overhead press',
      bp: 'bench press',
      'lat pulldown': 'lat pulldown lat pull-down lat pull down',
      dl: 'deadlift',
      squat: 'squat back squat',
      row: 'row bent-over row',
    };

    const fuzzyMatchExercises = (query, pool) => {
      const normalized = normalizeSearch(query);
      if (!normalized) return pool.slice(0, 20);

      const scores = pool.map((id) => {
        const eq = EQUIPMENT_DB[id];
        const haystack = [
          eq?.name || '',
          eq?.target || '',
          (eq?.tags || []).join(' '),
          Object.entries(SEARCH_ALIASES)
            .filter(([alias]) => normalized.includes(alias))
            .map(([, str]) => str)
            .join(' ')
        ].join(' ').toLowerCase();

        const baseScore = haystack.startsWith(normalized) ? 2 : (haystack.includes(normalized) ? 1 : 0);
        return { id, score: baseScore };
      }).filter(item => item.score > 0);

      return scores.sort((a, b) => b.score - a.score).map(s => s.id).slice(0, 20);
    };

    const calculatePlateLoading = (targetWeight, barWeight = 45) => {
      const plateOptions = [45, 35, 25, 10, 5, 2.5];
      const perSide = (targetWeight - barWeight) / 2;
      
      if (perSide <= 0) return { plates: [], perSide: 0, total: barWeight, display: 'Empty bar' };
      
      const plates = [];
      let remaining = perSide;
      
      for (const plate of plateOptions) {
        while (remaining >= plate) {
          plates.push(plate);
          remaining -= plate;
        }
      }
      
      const totalPerSide = plates.reduce((sum, p) => sum + p, 0);
      const total = barWeight + (totalPerSide * 2);
      
      return {
        plates,
        perSide: totalPerSide,
        total,
        display: plates.length > 0 ? plates.join(' + ') + ' per side' : 'Empty bar'
      };
    };

    const getProgressionAdvice = (sessions, currentBest) => {
      if (!sessions || sessions.length < 2) return null;
      const recentSessions = sessions.slice(-3);
      let easyCount = 0, goodCount = 0, hardCount = 0, atBest = 0;

      recentSessions.forEach(session => {
        (session.sets || []).forEach(set => {
          if (set.weight === currentBest) {
            atBest++;
            if (set.difficulty === 'easy') easyCount++;
            if (set.difficulty === 'good') goodCount++;
            if (set.difficulty === 'hard') hardCount++;
          }
        });
      });

      if (atBest >= 3 && (easyCount >= 2 || (easyCount + goodCount >= 3))) return { type: 'ready', message: 'Ready to bump weight next time' };
      if (atBest >= 2 && (goodCount + hardCount >= 2)) return { type: 'building', message: 'Keep building - you are close' };
      return null;
    };

    const Card = ({ children, className = '', onClick, style }) => (
      <div onClick={onClick} style={style} className={`bg-white p-4 rounded-xl border border-gray-200 ${className}`}>{children}</div>
    );

    const InlineMessage = ({ message }) => {
      if (!message) return null;
      return (
        <div className="px-4 pt-3">
          <div className="inline-message">{message}</div>
        </div>
      );
    };

    const Toast = ({ message }) => {
      if (!message) return null;
      return (
        <div className="toast" role="status" aria-live="polite">
          {message}
        </div>
      );
    };

    const TabBar = ({ currentTab, setTab }) => (
      <div className="fixed bottom-0 left-0 right-0 tabbar z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { id: 'home', label: 'Home', icon: 'Home' },
            { id: 'workout', label: 'Workout', icon: 'Dumbbell' },
            { id: 'profile', label: 'Profile', icon: 'User' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              className={`flex flex-col items-center gap-1 w-full h-full justify-center transition-colors ${
                currentTab === t.id 
                  ? 'tab-active' 
                  : 'text-gray-400'
              }`}
            >
              <Icon name={t.icon} className="w-6 h-6" />
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );

    const ToggleRow = ({ icon, title, subtitle, enabled, onToggle }) => (
      <button
        onClick={() => onToggle(!enabled)}
        className="w-full flex items-center justify-between py-2"
      >
        <div className="flex items-center gap-3 text-left">
          <Icon name={icon} className="w-5 h-5 text-purple-600" />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{title}</div>
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
        </div>
        <div className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform m-0.5 ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
      </button>
    );

    // ========== ONBOARDING ==========
// Intro + onboarding flow
const OnboardingProgress = ({ step, total }) => (
  <div className="onboarding-progress">
    {[...Array(total)].map((_, idx) => (
      <div key={idx} className={`dot ${idx <= step ? 'active' : ''}`} />
    ))}
    <span className="text-xs font-semibold text-gray-500">{step + 1} / {total}</span>
  </div>
);

const OnboardingCardShell = ({ children, step, total, onSkip }) => (
  <div className="onboarding-card animate-slide-up">
    <div className="flex items-start justify-between">
      <OnboardingProgress step={step} total={total} />
      {onSkip && <button className="ghost-button text-sm" onClick={onSkip}>Skip</button>}
    </div>
    {children}
  </div>
);

const OnboardingIntro = ({ title, subhead, body, step, total, onNext, onSkip, emoji }) => (
  <OnboardingCardShell step={step} total={total} onSkip={onSkip}>
    <div className="flex flex-col items-center text-center gap-3 flex-1">
      <div className="onboarding-hero">{emoji}</div>
      <h1 className="onboarding-title">{title}</h1>
      {subhead && <p className="onboarding-subhead">{subhead}</p>}
      <p className="onboarding-body">{body}</p>
    </div>
    <div className="onboarding-actions">
      <button className="ghost-button" onClick={onSkip}>Skip</button>
      <button className="accent-button" onClick={onNext}>Next</button>
    </div>
  </OnboardingCardShell>
);

const OnboardingForm = ({ profile, setProfile, onComplete, onBack, step, total }) => {
  const canStart = profile.username && profile.avatar && profile.workoutLocation;
  const locationOptions = [
    { id: 'gym', label: 'Gym', detail: 'Commercial gym or studio', gymType: 'commercial' },
    { id: 'home', label: 'Home', detail: 'Garage, apartment, or backyard', gymType: 'home' },
    { id: 'other', label: 'Other', detail: 'Travel or mixed', gymType: 'commercial' },
  ];

  return (
    <OnboardingCardShell step={step} total={total}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-500 uppercase">Quick setup</div>
        {onBack && <button className="ghost-button text-sm" onClick={onBack}>Back</button>}
      </div>
      <div className="space-y-4 flex-1 flex flex-col">
        <div className="form-tile">
          <label className="field-label">Name</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="input-surface"
              placeholder="Your name"
            />
          </div>

        <div className="form-tile">
          <label className="field-label">Emoji avatar</label>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setProfile({ ...profile, avatar: a })}
                  className={`p-3 rounded-xl text-2xl border ${profile.avatar === a ? 'border-purple-400 bg-purple-50' : 'bg-gray-50 border-gray-200'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

        <div className="form-tile">
          <label className="field-label">Where are you working out?</label>
          <div className="space-y-2">
            {locationOptions.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setProfile({ ...profile, workoutLocation: loc.id, gymType: loc.gymType })}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    profile.workoutLocation === loc.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl">{loc.id === 'gym' ? '🏋️' : loc.id === 'home' ? '🏠' : '🧳'}</div>
                  <div className="flex-1">
                  <div className={`font-bold ${profile.workoutLocation === loc.id ? 'text-purple-700' : 'text-gray-900'}`}>{loc.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{loc.detail}</div>
                  </div>
                  {profile.workoutLocation === loc.id && <Icon name="Check" className="w-5 h-5 text-purple-600" />}
                </button>
              ))}
            </div>
          </div>
      </div>
      <div className="onboarding-actions">
        <button
          onClick={() => { if (canStart) onComplete(); }}
          disabled={!canStart}
          className="accent-button"
        >
          Start Tracking
        </button>
      </div>
    </OnboardingCardShell>
  );
};

const OnboardingFlow = ({ profile, setProfile, onFinish }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { type: 'intro', title: 'Planet Strength', subhead: 'A workout tracker that stays out of your way', body: 'Log strength and cardio fast.\nSee your progress over time.\nNo programs. No guilt. No noise.', emoji: '🪐' },
    { type: 'intro', title: 'Progress is you vs. you', subhead: null, body: 'Add a rep. Add a little weight.\nOr just show up again.\nInsights are optional. Tracking always works.', emoji: '💫' },
    { type: 'form' }
  ];

  const total = steps.length;

  return (
    <div className="onboarding-shell">
      {steps[step].type === 'intro' ? (
        <OnboardingIntro
          title={steps[step].title}
          subhead={steps[step].subhead}
          body={steps[step].body}
          emoji={steps[step].emoji}
          step={step}
          total={total}
          onSkip={() => setStep(total - 1)}
          onNext={() => setStep(Math.min(step + 1, total - 1))}
        />
      ) : (
        <OnboardingForm
          profile={profile}
          setProfile={setProfile}
          onComplete={onFinish}
          onBack={() => setStep((prev) => Math.max(prev - 1, 0))}
          step={step}
          total={total}
        />
      )}
    </div>
  );
};

// ========== CALCULATIONS ==========
    const getBestForEquipment = (sessions = []) => {
      let best = 0;
      sessions.forEach(s => {
        (s.sets || []).forEach(set => { if (set.weight > best) best = set.weight; });
      });
      return best || null;
    };

    const getStrongWeightForEquipment = (_profile, equipId, sessions = []) => {
      const best = getBestForEquipment(sessions);
      if (best) return best;
      const eq = EQUIPMENT_DB[equipId];
      const starter = eq?.tags?.includes('Legs') ? 45 : 15;
      return clampTo5(starter);
    };

    const getNextTarget = (_profile, equipId, best) => {
      const eq = EQUIPMENT_DB[equipId];
      const increment = eq?.tags?.includes('Legs') ? 10 : 5;
      return clampTo5((best || getStrongWeightForEquipment({}, equipId, [])) + increment);
    };

    const computeStrengthScore = (_profile, history) => {
      const ids = Object.keys(EQUIPMENT_DB).filter(id => EQUIPMENT_DB[id]?.type !== 'cardio');
      const logged = ids.filter(id => (history[id] || []).length > 0);

      if (logged.length === 0) {
        return { score: 0, avgPct: 0, coveragePct: 0, loggedCount: 0, total: ids.length };
      }

      const ratios = logged.map(id => {
        const sessions = history[id] || [];
        if (sessions.length === 0) return 0;
        const first = sessions[0];
        const best = getBestForEquipment(sessions);
        const firstBest = getBestForEquipment([first]);
        if (!firstBest || !best) return 0.3;
        const improvement = Math.max(0, best - firstBest);
        const pct = Math.min(1, (improvement / (firstBest || 1)) * 0.5 + 0.5);
        return pct;
      });

      const avg = ratios.reduce((a,b)=>a+b,0) / ratios.length;
      const coverage = logged.length / ids.length;
      const score01 = (avg * 0.7) + (coverage * 0.3);
      const score = Math.round(score01 * 100);

      return { score, avgPct: Math.round(avg*100), coveragePct: Math.round(coverage*100), loggedCount: logged.length, total: ids.length };
    };

    const computeAchievements = ({ history, cardioHistory = {}, strengthScoreObj, streakObj }) => {
      const days = uniqueDayKeysFromHistory(history, cardioHistory);
      const strengthSessions = Object.values(history || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      const cardioSessions = Object.values(cardioHistory || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      const sessionsTotal = strengthSessions + cardioSessions;
      const equipmentLogged = Object.keys(EQUIPMENT_DB).filter(id => (history[id] || []).length > 0).length;

      const unlocks = [
        { id: 'first', title: 'First Log', desc: 'Logged your first session', unlocked: sessionsTotal >= 1, emoji: '✅' },
        { id: '3days', title: '3-Day Streak', desc: '3 consecutive training days', unlocked: streakObj.best >= 3, emoji: '🔥' },
        { id: '7days', title: '7-Day Streak', desc: '7 consecutive training days', unlocked: streakObj.best >= 7, emoji: '🏆' },
        { id: 'score50', title: 'Strength Tier 50', desc: 'Strength Score hit 50', unlocked: strengthScoreObj.score >= 50, emoji: '💪' },
        { id: 'score75', title: 'Strength Tier 75', desc: 'Strength Score hit 75', unlocked: strengthScoreObj.score >= 75, emoji: '⚡' },
        { id: 'equipment5', title: 'Explorer', desc: 'Logged 5+ exercises', unlocked: equipmentLogged >= 5, emoji: '🧭' },
        { id: 'days10', title: 'Show Up Club', desc: 'Trained on 10 different days', unlocked: days.length >= 10, emoji: '📅' },
      ];

      return unlocks;
    };

    const getTodaysWorkoutType = (history, appState) => {
      const order = ["Push","Pull","Legs"];
      const lastType = appState?.lastWorkoutType || null;
      const lastDayKey = appState?.lastWorkoutDayKey || null;
      const todayKey = toDayKey(new Date());

      if (lastDayKey === todayKey && lastType) return lastType;
      if (!lastType) return "Push";
      
      const idx = order.indexOf(lastType);
      return order[(idx + 1) % order.length] || "Push";
    };

    // ========== HOME SCREEN ==========
    
const GeneratorOptions = ({ options, onUpdate, compact = false }) => {
  const goalOptions = [
    { id: 'strength', label: 'Strength' },
    { id: 'hypertrophy', label: 'Hypertrophy' },
    { id: 'quick', label: 'Quick' }
  ];
  const durationOptions = [30, 45, 60];
  const toggleOption = (key, value) => {
    onUpdate(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : ''}`}>
      <div className="text-[11px] font-bold text-gray-500 uppercase">Optional tweaks</div>
      <div className="flex flex-wrap gap-2">
        {goalOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => toggleOption('goal', opt.id)}
            className={`filter-chip ${options.goal === opt.id ? 'active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {durationOptions.map(value => (
          <button
            key={value}
            onClick={() => toggleOption('duration', value)}
            className={`filter-chip ${options.duration === value ? 'active' : ''}`}
          >
            {value} min
          </button>
        ))}
      </div>
    </div>
  );
};

const Home = ({
  profile,
  lastWorkoutLabel,
  suggestedFocus,
  onStartWorkout,
  onGenerate,
  homeQuote,
  isRestDay,
  onLogRestDay,
  onUndoRestDay
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 home-screen">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em]">PLANET STRENGTH</div>
            <h1 className="text-xl font-black text-gray-900">Welcome back, {profile.username || 'Athlete'}</h1>
            <div className="text-xs text-gray-500 font-semibold mt-1">A session on your terms.</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-xl border border-purple-200">
            {profile.avatar}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 pb-6 home-content">
        <div className="home-stack">
          <div className="home-card-row">
            <div className="home-mini-card">
              <div className="text-xs uppercase text-gray-400 font-bold">Last workout</div>
              <div className="text-lg font-black text-gray-900">{lastWorkoutLabel || 'No logs yet'}</div>
            </div>
            <div className="home-mini-card">
              <div className="text-xs uppercase text-gray-400 font-bold">Suggested focus</div>
              <div className="text-lg font-black text-gray-900">{suggestedFocus}</div>
            </div>
          </div>
          <div className="home-section-card">
            <div className="home-section-title">Start Today</div>
            <div className="home-section-subtitle">Draft a calm session in seconds.</div>
            <button
              onClick={onStartWorkout}
              className="home-primary-button"
            >
              Start Today
            </button>
          </div>
          <div className="home-section-card">
            <div className="home-section-title home-section-title--row">
              <span>Quick Generate</span>
              <span className="home-section-chevron" aria-hidden="true">›</span>
            </div>
            <div className="home-quick-generate no-scrollbar">
              {['Push', 'Pull', 'Legs', 'Full Body', 'Surprise Me'].map(label => (
                <button
                  key={label}
                  onClick={() => onGenerate(label)}
                  className="quick-chip"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {homeQuote && (
            <div className="home-section-card home-quote">
              <div className="home-section-title">Inspiration</div>
              <div className="quote-block">
                <p className="quote-text">“{homeQuote.text}”</p>
                <p className="quote-meta">— {homeQuote.movie}</p>
              </div>
            </div>
          )}
          <button
            onClick={isRestDay ? onUndoRestDay : onLogRestDay}
            className="home-rest-action"
          >
            {isRestDay ? 'Undo Rest Day' : 'Log Rest Day'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Workout = ({ profile, onSelectExercise, settings, setSettings, pinnedExercises, setPinnedExercises, recentExercises, activeSession, onFinishSession, onStartWorkoutFromBuilder, onAddExerciseFromSearch, onPushMessage, onRemoveSessionExercise, onSwapSessionExercise, onStartEmptySession, isRestDay, onCancelSession }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [libraryVisible, setLibraryVisible] = useState(settings.showAllExercises);
  const [swapState, setSwapState] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  const sessionCardRef = useRef(null);
  const lastSessionStatusRef = useRef(activeSession?.status || null);

  const gymType = GYM_TYPES[profile.gymType];

  const availableEquipment = useMemo(() => {
    const ids = Object.keys(EQUIPMENT_DB);
    return ids.filter(id => {
      const eq = EQUIPMENT_DB[id];
      if (eq.type === 'cardio') return true;
      if (eq.type === 'machine') return gymType?.machines;
      if (eq.type === 'dumbbell') return gymType?.dumbbells?.available;
      if (eq.type === 'barbell') return gymType?.barbells?.available;
      return false;
    });
  }, [gymType]);

  const filteredPinned = pinnedExercises.filter(id => availableEquipment.includes(id));
  const filteredRecents = recentExercises.filter(id => availableEquipment.includes(id)).slice(0, 12);
  const todayKey = toDayKey(new Date());
  const sessionEntries = useMemo(() => {
    if (!activeSession || activeSession.date !== todayKey) return [];
    return activeSession.items || [];
  }, [activeSession, todayKey]);
  const sessionLogsByExercise = activeSession?.date === todayKey ? (activeSession?.logsByExercise || {}) : {};
  const sessionHasLogged = sessionEntries.some(entry => (sessionLogsByExercise[entry.exerciseId || entry.id] || []).length > 0);
  const isSessionMode = activeSession?.status === 'active';
  const hasSession = !!activeSession;
  const sessionExerciseCount = sessionEntries.length;
  const sessionSetCount = sessionEntries.reduce((sum, entry) => sum + ((sessionLogsByExercise[entry.exerciseId || entry.id] || []).length), 0);
  const hasTodayWorkout = hasSession && activeSession?.date === todayKey;
  const isDraft = hasTodayWorkout && !isSessionMode;

  const filterOptions = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Pinned'];

  const resolveGroup = (eq) => {
    if (eq?.type === 'cardio') return 'Cardio';
    const target = (eq?.target || '').toLowerCase();
    if (target.includes('chest') || target.includes('pec')) return 'Chest';
    if (target.includes('back') || target.includes('lat')) return 'Back';
    if (target.includes('leg') || target.includes('quad') || target.includes('hamstring') || target.includes('glute') || target.includes('calf') || target.includes('thigh')) return 'Legs';
    if (target.includes('shoulder') || target.includes('delt')) return 'Shoulders';
    if (target.includes('bicep') || target.includes('tricep') || target.includes('arm') || target.includes('forearm')) return 'Arms';
    if (target.includes('core') || target.includes('ab')) return 'Core';
    return 'Other';
  };

  const formatOptionLabel = (value, type) => {
    if (!value) return '';
    if (type === 'equipment') {
      if (value === 'free') return 'Free weights';
      if (value === 'machines') return 'Machines';
      if (value === 'mixed') return 'Mixed';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const filteredPool = useMemo(() => {
    if (activeFilter === 'All') return availableEquipment;
    if (activeFilter === 'Pinned') return filteredPinned;
    if (activeFilter === 'Cardio') return availableEquipment.filter(id => EQUIPMENT_DB[id]?.type === 'cardio');
    return availableEquipment.filter(id => resolveGroup(EQUIPMENT_DB[id]) === activeFilter);
  }, [activeFilter, availableEquipment, filteredPinned]);

  // Use debounced query for search results (better performance)
  const searchResults = useMemo(() => {
    const pool = filteredPool;
    if (!debouncedSearchQuery.trim()) return [];
    return fuzzyMatchExercises(debouncedSearchQuery, pool);
  }, [debouncedSearchQuery, filteredPool]);

  const togglePin = (id) => {
    if (EQUIPMENT_DB[id]?.comingSoon) return;
    const exists = pinnedExercises.includes(id);
    const updated = exists ? pinnedExercises.filter(x => x !== id) : [...pinnedExercises, id];
    setPinnedExercises(updated);
    setSettings(prev => ({ ...(prev || {}), pinnedExercises: updated }));
  };

  useEffect(() => {
    setLibraryVisible(settings.showAllExercises);
  }, [settings.showAllExercises]);


  useEffect(() => {
    if (!debouncedSearchQuery.trim() || !searchResultsRef.current) return;
    requestAnimationFrame(() => {
      searchResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [debouncedSearchQuery, searchResults.length]);

  useEffect(() => {
    const prevStatus = lastSessionStatusRef.current;
    if (activeSession?.status === 'active' && prevStatus !== 'active') {
      requestAnimationFrame(() => {
        sessionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    lastSessionStatusRef.current = activeSession?.status || null;
  }, [activeSession?.status]);


  const getExerciseIcon = (eq) => {
    if (!eq) return '🏋️‍♂️';
    if (eq.emoji) return eq.emoji;
    if (eq.type === 'cardio') return eq.cardioGroup === 'swimming' ? '🏊' : '🏃';
    if (eq.type === 'machine') return '⚙️';
    if (eq.type === 'dumbbell') return '🏋️';
    return '🏋️‍♂️';
  };

  const renderExerciseRow = (id, actionLabel = 'Add', onAction) => {
    const eq = EQUIPMENT_DB[id];
    if (!eq) return null;
    const isComingSoon = !!eq.comingSoon;
    const allowAdd = hasTodayWorkout && !isRestDay && !isComingSoon;
    return (
      <div
        key={id}
        className="w-full p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-lg">
            {getExerciseIcon(eq)}
          </div>
          <div>
            <div className="font-bold workout-heading text-sm leading-tight">{eq.name}</div>
            <div className="text-xs workout-muted">{eq.type === 'cardio' ? 'Cardio' : eq.target}</div>
            {isComingSoon && (
              <div className="text-[11px] text-gray-400 font-semibold">Coming Soon</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); togglePin(id); }}
            disabled={isComingSoon}
            className={`px-2 py-1 rounded-full text-xs font-bold ${pinnedExercises.includes(id) ? 'workout-chip' : 'bg-gray-100 text-gray-500'} ${
              isComingSoon ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {pinnedExercises.includes(id) ? 'Pinned' : 'Pin'}
          </button>
          {allowAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); (onAction ? onAction(id) : onAddExerciseFromSearch?.(id)); }}
              className="text-purple-600 font-semibold text-sm"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderExerciseTile = (id) => {
    const eq = EQUIPMENT_DB[id];
    if (!eq) return null;
    const pinned = pinnedExercises.includes(id);
    const typeIcon = getExerciseIcon(eq);
    const isComingSoon = !!eq.comingSoon;
    const allowAdd = hasTodayWorkout && !isRestDay && !isComingSoon;
    return (
      <div key={id} className="tile text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg">{typeIcon}</div>
          <span className="text-[11px] workout-muted">{eq.type === 'cardio' ? 'Cardio' : eq.target}</span>
        </div>
        <div className="font-bold workout-heading text-sm leading-tight">{eq.name}</div>
        {isComingSoon && (
          <div className="text-[11px] text-gray-400 font-semibold mt-1">Coming Soon</div>
        )}
        <div className="tile-actions">
          <button
            onClick={() => togglePin(id)}
            disabled={isComingSoon}
            className={`tile-action ${pinned ? 'workout-chip' : ''} ${isComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {pinned ? 'Pinned' : 'Pin'}
          </button>
          {allowAdd && (
            <button
              onClick={() => onAddExerciseFromSearch?.(id)}
              className="tile-action primary"
            >
              Add
            </button>
          )}
        </div>
      </div>
    );
  };

  const swapOptions = useMemo(() => {
    if (!swapState) return [];
    const sourceList = sessionEntries.map(entry => entry.exerciseId || entry.id);
    const currentId = sourceList[swapState.index];
    if (!currentId) return [];
    const current = EQUIPMENT_DB[currentId];
    const pool = availableEquipment.filter(id => id !== currentId && (!current || (EQUIPMENT_DB[id]?.target === current.target || EQUIPMENT_DB[id]?.tags?.some(t => current.tags?.includes(t)))));
    return pool.slice(0, 20);
  }, [swapState, availableEquipment, sessionEntries]);

  const handleSearchAdd = (id) => {
    if (!id) return;
    if (!hasTodayWorkout) return;
    const alreadyAdded = sessionEntries.some(entry => (entry.exerciseId || entry.id) === id);
    if (alreadyAdded) {
      onPushMessage?.('Already added');
      setSearchQuery('');
      requestAnimationFrame(() => {
        sessionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    onAddExerciseFromSearch?.(id);
    setSearchQuery('');
    requestAnimationFrame(() => {
      sessionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 workout-shell">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black workout-title">Workout</h1>
            <div className="text-xs workout-muted font-bold">Draft → Start → Active → Finish</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 px-4 space-y-4 workout-scroll">
        <Card className="space-y-3 workout-card mt-5 start-today-card">
          <div>
            <div className="text-xs font-bold workout-muted uppercase">Start Today</div>
            <div className="text-base font-black workout-heading">Build today’s session</div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => onStartEmptySession?.()}
              disabled={isRestDay || hasTodayWorkout}
              className={`w-full py-3 rounded-xl font-bold active:scale-[0.98] ${
                (isRestDay || hasTodayWorkout) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-purple-600 text-white'
              }`}
            >
              {hasTodayWorkout ? 'Drafted for today' : 'Start Today'}
            </button>
            <button
              onClick={() => {
                setLibraryVisible(prev => !prev);
                setActiveFilter('All');
              }}
              disabled={isRestDay}
              className={`w-full py-3 rounded-xl border font-bold active:scale-[0.98] ${
                isRestDay ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              {libraryVisible ? 'Close' : 'Browse full library'}
            </button>
          </div>
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              ref={searchInputRef}
              disabled={isRestDay}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:text-gray-400"
            />
          </div>
          {!hasTodayWorkout && !isRestDay && (
            <div className="text-[11px] workout-muted">Create a draft to add exercises and start logging.</div>
          )}
        </Card>

        {searchQuery && (
          <div ref={searchResultsRef}>
            <Card className="space-y-2 workout-card">
              <div className="text-xs font-bold workout-muted uppercase">Search Results</div>
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(id => renderExerciseRow(id, 'Add', handleSearchAdd))}
                </div>
              ) : (
                <div className="text-xs workout-muted">No matches yet. Try a different keyword.</div>
              )}
            </Card>
          </div>
        )}

        {!isRestDay && hasTodayWorkout && (
          <Card className="space-y-3 workout-card" ref={sessionCardRef}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold workout-muted uppercase">{isSessionMode ? 'Workout active' : 'Draft workout'}</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-black workout-heading">Today’s Workout</div>
                  {activeSession?.createdFrom === 'generated' && (
                    <span className="session-badge">Generated</span>
                  )}
                </div>
                <div className="text-[11px] workout-muted">{isSessionMode ? 'Log as you go' : 'Edit and start when ready'}</div>
              </div>
              <button
                onClick={() => {
                  onCancelSession?.(isSessionMode, sessionHasLogged);
                  setLibraryVisible(false);
                  setSearchQuery('');
                  setActiveFilter('All');
                  setSwapState(null);
                }}
                className="session-cancel-button"
              >
                {isSessionMode ? 'Cancel workout' : 'Cancel draft'}
              </button>
            </div>
            {sessionEntries.length === 0 ? (
              <div className="text-xs workout-muted">Workout ready. Add exercises to get started.</div>
            ) : (
              <div className="space-y-2">
                {sessionEntries.map((entry, idx) => {
                  const entryId = entry.exerciseId || entry.id;
                  const entrySetCount = (sessionLogsByExercise[entryId] || []).length;
                  return (
                  <div
                    key={entryId}
                    onClick={() => onSelectExercise(entryId, 'session')}
                    className="session-entry-row"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelectExercise(entryId, 'session'); }}
                  >
                    <div>
                      <div className="text-sm font-bold workout-heading">{entry.name || entry.label}</div>
                      <div className="text-[11px] workout-muted">{entry.kind === 'cardio' ? 'Cardio' : (entry.muscleGroup || 'Strength')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-purple-600">{entrySetCount} {entry.kind === 'cardio' ? 'entries' : 'sets'}</div>
                      {entry.kind !== 'cardio' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSwapState({ mode: 'session', index: idx }); }}
                          className="session-action-button"
                        >
                          Swap
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveSessionExercise?.(entryId); }}
                        className="session-remove-button"
                        aria-label={`Remove ${entry.name || entry.label}`}
                      >
                        <Icon name="Trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white text-gray-900 active:scale-[0.98]"
              >
                + Add exercise
              </button>
              {isDraft && (
                <button
                  onClick={() => onStartWorkoutFromBuilder?.()}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold active:scale-[0.98]"
                >
                  Start Workout
                </button>
              )}
            </div>
          </Card>
        )}

        {!isRestDay && !isSessionMode && (isDraft || libraryVisible || searchQuery) && (
        <Card className="space-y-2 workout-card">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold workout-muted uppercase">Pinned Exercises</div>
            <div className="text-xs workout-muted">Tap to add</div>
          </div>
          {filteredPinned.length === 0 ? (
            <div className="text-xs workout-muted">Pin your go-tos for quick access.</div>
          ) : (
            <div className="exercise-grid">
              {filteredPinned.map(renderExerciseTile)}
            </div>
          )}
        </Card>
        )}

        {!isRestDay && filteredRecents.length > 0 && (
          <Card className="space-y-2 workout-card">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold workout-muted uppercase">Recent</div>
              <div className="text-xs workout-muted">Last used</div>
            </div>
            <div className="space-y-2">
              {filteredRecents.map(id => renderExerciseRow(id, 'Add'))}
            </div>
          </Card>
        )}

        {libraryVisible && !isRestDay && (
          <Card className="space-y-2 workout-card">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold workout-muted uppercase">Full Library</div>
              <button onClick={() => setLibraryVisible(false)} className="text-xs text-purple-700 font-bold">Close</button>
            </div>
            <div className="filter-chip-row no-scrollbar">
              {filterOptions.map(option => (
                <button
                  key={option}
                  onClick={() => setActiveFilter(option)}
                  className={`filter-chip ${activeFilter === option ? 'active' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="exercise-grid">
              {filteredPool.map(id => renderExerciseTile(id))}
            </div>
          </Card>
        )}

      </div>

      {isSessionMode && (
        <div className="finish-footer">
          <div className="finish-bar">
            <div className="finish-summary text-sm font-semibold text-gray-600">
              {sessionExerciseCount} exercises • {sessionSetCount} sets
            </div>
            <button
              onClick={onFinishSession}
              className="finish-button py-3 px-5 rounded-2xl bg-purple-600 text-white font-bold shadow-lg active:scale-[0.98]"
            >
              Finish Workout
            </button>
          </div>
        </div>
      )}

      {swapState !== null && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-end justify-center" onClick={() => setSwapState(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-4 animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Swap Exercise</h3>
              <button onClick={() => setSwapState(null)} className="p-2 rounded-full bg-gray-100 text-gray-600">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {swapOptions.map(id => (
                <button
                  key={id}
                  onClick={() => {
                    if (swapState?.mode === 'session') {
                      onSwapSessionExercise?.(swapState.index, id);
                    }
                    setSwapState(null);
                  }}
                  className="w-full p-3 rounded-xl border border-gray-200 text-left bg-gray-50 active:scale-[0.98]"
                >
                  <div className="font-bold text-gray-900 text-sm">{EQUIPMENT_DB[id]?.name}</div>
                  <div className="text-xs text-gray-500">{EQUIPMENT_DB[id]?.target}</div>
                </button>
              ))}
              {swapOptions.length === 0 && (
                <div className="text-sm text-gray-500">No similar exercises available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const PlateCalculator = ({ targetWeight, barWeight, onClose }) => {
      const [displayWeight, setDisplayWeight] = useState(targetWeight || barWeight || '');
      
      const plates = [45, 35, 25, 10, 5, 2.5];
      
      const calculatePlates = (weight) => {
        const w = Number(weight) || 0;
        const weightPerSide = (w - barWeight) / 2;
        if (weightPerSide <= 0) return [];
        
        const result = [];
        let remaining = weightPerSide;
        
        for (const plate of plates) {
          while (remaining >= plate) {
            result.push(plate);
            remaining -= plate;
          }
        }
        
        return result;
      };
      
      const platesToLoad = calculatePlates(displayWeight);
      const actualWeight = barWeight + (platesToLoad.reduce((sum, p) => sum + p, 0) * 2);
      
      return (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[100] animate-slide-up" onClick={onClose}>
          <div className="bg-white dark-mode-modal rounded-t-3xl w-full max-w-lg p-6 pb-8" style={{ maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Plate Calculator</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <Icon name="X" className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 block mb-2">Target Weight</label>
              <input
                type="number"
                value={displayWeight}
                onChange={(e) => setDisplayWeight(e.target.value)}
                placeholder="Enter weight"
                className="w-full text-2xl font-bold text-center p-4 border-2 border-purple-200 rounded-xl focus:border-purple-600 outline-none bg-white text-gray-900 dark-mode-input"
              />
              <div className="text-center text-xs text-gray-500 mt-2">Bar weight: {barWeight} lbs</div>
            </div>
            
            {platesToLoad.length > 0 ? (
              <>
                <div className="bg-purple-50 rounded-xl p-4 mb-4">
                  <div className="text-center mb-3">
                    <div className="text-sm font-semibold text-purple-700">Actual Weight</div>
                    <div className="text-3xl font-black text-purple-600">{actualWeight} lbs</div>
                  </div>
                  
                  <div className="flex justify-center items-center gap-2 my-6">
                    <div className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">Each Side</div>
                    <div className="flex flex-col gap-1">
                      {platesToLoad.map((plate, i) => (
                        <div
                          key={i}
                          className="bg-purple-600 text-white rounded px-3 py-2 text-center font-bold text-sm"
                          style={{ width: `${60 + plate}px` }}
                        >
                          {plate}
                        </div>
                      ))}
                    </div>
                    <div className="w-16 h-3 bg-gray-800 rounded"></div>
                  </div>
                  
                  <div className="text-center text-xs text-gray-600">
                    Put these plates on <span className="font-bold">each side</span> of the bar
                  </div>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {plates.map(p => {
                    const count = platesToLoad.filter(plate => plate === p).length;
                    return (
                      <div key={p} className={`text-center p-2 rounded-lg border-2 ${
                        count > 0 ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="text-xs font-bold text-gray-900">{p}</div>
                        {count > 0 && <div className="text-xs text-purple-600">×{count}</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏋️</div>
                <div className="text-sm">Just the bar ({barWeight} lbs)</div>
              </div>
            )}
          </div>
        </div>
      );
    };

    // ========== EQUIPMENT DETAIL ==========
    const EquipmentDetail = ({ id, profile, history, settings, onSave, onClose, onUpdateSessionLogs, sessionLogs }) => {
      const eq = EQUIPMENT_DB[id];
      const sessions = history || [];
      const insightsEnabled = settings?.insightsEnabled !== false;
      const [activeTab, setActiveTab] = useState('workout');
      const [showLogger, setShowLogger] = useState(true);
      const [showPlateCalc, setShowPlateCalc] = useState(false);
      const [anchorWeight, setAnchorWeight] = useState('');
      const [anchorReps, setAnchorReps] = useState('');
      const [anchorAdjusted, setAnchorAdjusted] = useState(false);
      const [showAdjust, setShowAdjust] = useState(false);
      const [loggedSets, setLoggedSets] = useState([]);
      const [setInputs, setSetInputs] = useState({ weight: '', reps: '' });
      const [editingIndex, setEditingIndex] = useState(null);
      const [editValues, setEditValues] = useState({ weight: '', reps: '' });
      const [baselineInputs, setBaselineInputs] = useState({ weight: '', reps: '' });
      const [baselineConfirmed, setBaselineConfirmed] = useState(sessions.length > 0);
      const [note, setNote] = useState('');
      const [isAddingSet, setIsAddingSet] = useState(false);
      const savedRef = useRef(false);
      const latestDraftRef = useRef({ loggedSets: [], anchorWeight: '', anchorReps: '', anchorAdjusted: false, note: '' });
      const lastSetSubmitRef = useRef({ key: '', at: 0 });
      const weightInputRef = useRef(null);
      const repsInputRef = useRef(null);
      const onSaveRef = useRef(onSave);

      const best = useMemo(() => getBestForEquipment(sessions), [sessions]);
      const nextTarget = useMemo(() => getNextTarget(profile, id, best), [profile, id, best]);
      const sessionNumber = sessions.length + 1;

      const deriveSessionAnchor = (session) => {
        if (!session) return { weight: null, reps: null };
        const weights = (session.sets || []).map(s => s.weight || 0).filter(Boolean);
        const reps = (session.sets || []).map(s => s.reps || 0).filter(Boolean);
        return {
          weight: session.anchorWeight || (weights.length ? Math.max(...weights) : null),
          reps: session.anchorReps || (reps.length ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : null)
        };
      };

      const baselineFromHistory = useMemo(() => {
        if (!sessions || sessions.length === 0) return null;
        const first = sessions[0];
        const anchor = deriveSessionAnchor(first);
        if (first?.baselineWeight && first?.baselineReps) {
          return { weight: first.baselineWeight, reps: first.baselineReps };
        }
        if (anchor.weight && anchor.reps) return { weight: anchor.weight, reps: anchor.reps };
        return null;
      }, [sessions]);

      const recentAnchor = useMemo(() => {
        const recent = (sessions || []).slice(-3);
        if (recent.length === 0) return { weight: null, reps: null };
        const weights = recent.map(s => deriveSessionAnchor(s).weight).filter(Boolean);
        const reps = recent.map(s => deriveSessionAnchor(s).reps).filter(Boolean);
        return {
          weight: weights.length ? Math.max(...weights) : null,
          reps: reps.length ? Math.round(reps.sort((a,b) => a-b)[Math.floor(reps.length/2)]) : null
        };
      }, [sessions]);

      const lastSession = sessions[sessions.length - 1];
      const lastSessionSummary = useMemo(() => {
        if (!insightsEnabled || !lastSession || !lastSession.sets?.length) return null;
        const lastSet = lastSession.sets[lastSession.sets.length - 1];
        if (!lastSet?.weight || !lastSet?.reps) return null;
        return `${lastSet.weight} lb × ${lastSet.reps} reps`;
      }, [insightsEnabled, lastSession]);
      const defaultAnchor = useMemo(() => {
        const anchor = deriveSessionAnchor(lastSession);
        if (anchor.weight && anchor.reps) return anchor;
        if (baselineFromHistory) return baselineFromHistory;
        return { weight: null, reps: null };
      }, [lastSession, baselineFromHistory]);

      useEffect(() => {
        const weight = defaultAnchor.weight ? String(defaultAnchor.weight) : '';
        const reps = defaultAnchor.reps ? String(defaultAnchor.reps) : '';
        setAnchorWeight(weight);
        setAnchorReps(reps);
        setAnchorAdjusted(false);
        setShowAdjust(false);
        setNote('');
        setSetInputs({ weight: '', reps: '' });
        setBaselineInputs({
          weight: baselineFromHistory?.weight ? String(baselineFromHistory.weight) : '',
          reps: baselineFromHistory?.reps ? String(baselineFromHistory.reps) : ''
        });
        setBaselineConfirmed(sessions.length > 0);
        savedRef.current = false;
      }, [id, defaultAnchor, baselineFromHistory, sessions.length]);

      useEffect(() => {
        setLoggedSets(sessionLogs || []);
      }, [sessionLogs]);

      useEffect(() => {
        setSetInputs(prev => ({
          weight: prev.weight || (anchorWeight || ''),
          reps: prev.reps || (anchorReps || '')
        }));
      }, [anchorWeight, anchorReps]);

      const syncSessionSets = (nextSets) => {
        if (onUpdateSessionLogs) {
          onUpdateSessionLogs(id, nextSets);
        }
      };

      const handleQuickAddSet = () => {
        const w = Number(setInputs.weight);
        const r = Number(setInputs.reps);
        if (!w || !r || w <= 0 || r <= 0) return;
        if (isAddingSet) return;
        const now = Date.now();
        const key = `${w}-${r}`;
        if (lastSetSubmitRef.current.key === key && now - lastSetSubmitRef.current.at < 900) return;
        lastSetSubmitRef.current = { key, at: now };
        setIsAddingSet(true);
        setLoggedSets(prev => {
          const next = [...prev, { weight: w, reps: r }];
          syncSessionSets(next);
          return next;
        });
        setSetInputs({ weight: anchorWeight || '', reps: anchorReps || '' });
        requestAnimationFrame(() => {
          (weightInputRef.current || repsInputRef.current)?.focus();
        });
        setTimeout(() => setIsAddingSet(false), 300);
        setEditingIndex(null);
      };

      const startEditSet = (idx) => {
        const target = loggedSets[idx];
        if (!target) return;
        setEditingIndex(idx);
        setEditValues({ weight: String(target.weight || ''), reps: String(target.reps || '') });
      };

      const saveEditedSet = () => {
        const w = Number(editValues.weight);
        const r = Number(editValues.reps);
        if (!w || !r || w <= 0 || r <= 0 || editingIndex === null) return;
        setLoggedSets(prev => {
          const next = prev.map((set, idx) => idx === editingIndex ? { weight: w, reps: r } : set);
          syncSessionSets(next);
          return next;
        });
        setEditingIndex(null);
      };

      const deleteSet = (idx) => {
        setLoggedSets(prev => {
          const next = prev.filter((_, i) => i !== idx);
          syncSessionSets(next);
          return next;
        });
        setEditingIndex(null);
      };

      const buildSessionPayload = (draft) => {
        const source = draft || { loggedSets, anchorWeight, anchorReps, anchorAdjusted, note };
        const sets = source.loggedSets || [];
        if (sets.length === 0) return null;
        const basePayload = {
          date: new Date().toISOString(),
          type: 'strength',
          sets,
          anchorWeight: Number(source.anchorWeight),
          anchorReps: Number(source.anchorReps),
          adjustedToday: source.anchorAdjusted || false,
          note: source.note || undefined
        };
        if (sessions.length === 0) {
          return {
            ...basePayload,
            baselineWeight: Number(source.anchorWeight),
            baselineReps: Number(source.anchorReps)
          };
        }
        return basePayload;
      };

      const handleSaveSession = () => {
        const payload = buildSessionPayload();
        if (payload) {
          onSave(id, payload);
          savedRef.current = true;
          return true;
        }
        return false;
      };

      useEffect(() => {
        latestDraftRef.current = { loggedSets, anchorWeight, anchorReps, anchorAdjusted, note };
      }, [loggedSets, anchorWeight, anchorReps, anchorAdjusted, note]);

      // Keep onSaveRef in sync with latest onSave prop
      useEffect(() => {
        onSaveRef.current = onSave;
      }, [onSave]);

      // Cleanup effect - only runs on unmount, uses refs to avoid stale closures
      useEffect(() => {
        return () => {
          if (!savedRef.current) {
            const payload = buildSessionPayload(latestDraftRef.current);
            if (payload && onSaveRef.current) {
              // Pass keepOpen: true to prevent closing modal during auto-save cleanup
              // The modal will be closed by onClose() separately if user initiated close
              onSaveRef.current(id, payload, { quiet: true, keepOpen: true });
              savedRef.current = true;
            }
          }
        };
      }, [id]);

      const handleClose = () => {
        handleSaveSession();
        onClose();
      };

      const isBaselineMode = sessions.length === 0 && !baselineConfirmed;

      const weightBump = (w) => {
        if (!w) return 5;
        if (w < 50) return 2.5;
        if (w < 120) return 5;
        return 10;
      };

      const overloadSuggestion = useMemo(() => {
        if (sessions.length < 2) return null;
        const numericAnchorWeight = Number(anchorWeight) || Number(baselineInputs.weight);
        const numericAnchorReps = Number(anchorReps) || Number(baselineInputs.reps);
        const baseWeight = recentAnchor.weight || numericAnchorWeight;
        const baseReps = recentAnchor.reps || numericAnchorReps;
        if (!baseWeight || !baseReps) return null;
        const bump = weightBump(baseWeight);
        return {
          nextWeight: clampTo5(baseWeight + bump),
          reps: baseReps,
          rationale: `${sessions.length >= 2 ? '2 consistent sessions' : 'Recent consistency'} → try +${bump} lb`
        };
      }, [sessions.length, anchorWeight, anchorReps, baselineInputs, recentAnchor]);

      const handleConfirmBaseline = () => {
        const w = Number(baselineInputs.weight);
        const r = Number(baselineInputs.reps);
        if (!w || !r || w <= 0 || r <= 0) return;
        setAnchorWeight(String(w));
        setAnchorReps(String(r));
        setBaselineConfirmed(true);
        setAnchorAdjusted(false);
      };

      const getPlateLoadingForSet = (weight) => {
        if (eq.type !== 'barbell' || !weight) return null;
        return calculatePlateLoading(Number(weight), profile.barWeight || 45);
      };

      return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col animate-slide-up" style={{maxHeight: '90vh'}}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                  <Icon name="ChevronLeft" className="w-6 h-6"/>
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{eq.name}</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {eq.type === 'machine' ? '⚙️' : eq.type === 'dumbbell' ? '🏋️' : '🏋️‍♂️'} {eq.muscles}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="X" className="w-5 h-5"/>
              </button>
            </div>

            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setActiveTab('workout')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === 'workout' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400'
                }`}
              >
                Log
              </button>
              {insightsEnabled && (<button
                onClick={() => setActiveTab('cues')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  activeTab === 'cues' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400'
                }`}
              >
                Cues & Info
              </button>)}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: '500px', maxHeight: '500px' }}>
              <div className="p-5 space-y-5 h-full">
                {activeTab === 'workout' ? (
                  <>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowLogger(!showLogger)}
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Trophy" className="w-5 h-5 text-purple-600"/>
                          <h3 className="text-xs font-black uppercase text-gray-900">Log Today</h3>
                        </div>
                        <Icon name="ChevronDown" className={`w-5 h-5 text-gray-600 transition-transform ${showLogger ? 'rotate-180' : ''}`}/>
                      </button>

                      {showLogger && (
                        <div className="px-4 pb-4 space-y-3 animate-expand">
                          {isBaselineMode && (
                            <div className="p-3 rounded-2xl baseline-card space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">🧭</div>
                                <div className="flex-1">
                                  <div className="text-[10px] font-black uppercase baseline-accent">Set your starting point</div>
                                  <p className="text-sm baseline-primary font-semibold leading-relaxed">
                                    Set a weight and reps to begin. You can change these anytime.
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={baselineInputs.weight}
                                  onChange={(e) => setBaselineInputs(prev => ({ ...prev, weight: e.target.value }))}
                                  placeholder="lbs"
                                  className="w-full p-3 rounded-xl baseline-input font-black text-center focus:border-purple-500 outline-none"
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={baselineInputs.reps}
                                  onChange={(e) => setBaselineInputs(prev => ({ ...prev, reps: e.target.value }))}
                                  placeholder="reps"
                                  className="w-full p-3 rounded-xl baseline-input font-black text-center focus:border-purple-500 outline-none"
                                />
                              </div>
                              <button
                                onClick={handleConfirmBaseline}
                                disabled={!baselineInputs.weight || !baselineInputs.reps}
                                className={`w-full py-3 rounded-xl font-black transition-all active:scale-95 baseline-button ${
                                  baselineInputs.weight && baselineInputs.reps ? 'baseline-button--active' : 'baseline-button--disabled'
                                }`}
                              >
                                Set baseline & start logging
                              </button>
                            </div>
                          )}

                          {!isBaselineMode && (
                            <>
                              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[10px] font-black uppercase text-purple-700">Anchored weight</div>
                                    <div className="text-base font-black text-purple-900">
                                      {anchorWeight && anchorReps ? `${anchorWeight} lb × ${anchorReps} reps` : 'Set your anchor'}
                                    </div>
                                    {anchorAdjusted && <div className="text-[11px] text-purple-700 font-semibold">Adjusted today</div>}
                                  </div>
                                  <button
                                    onClick={() => setShowAdjust(v => !v)}
                                    className="px-3 py-2 rounded-lg bg-white border border-purple-200 text-purple-700 font-bold active:scale-95 text-xs"
                                  >
                                    {showAdjust ? 'Done' : 'Adjust'}
                                  </button>
                                </div>

                                {showAdjust && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={anchorWeight}
                                      onChange={(e) => { setAnchorWeight(e.target.value); setAnchorAdjusted(true); }}
                                      placeholder="lbs"
                                      className="w-full p-3 rounded-xl border-2 border-purple-200 bg-white font-black text-center text-gray-900 focus:border-purple-500 outline-none"
                                    />
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={anchorReps}
                                      onChange={(e) => { setAnchorReps(e.target.value); setAnchorAdjusted(true); }}
                                      placeholder="reps"
                                      className="w-full p-3 rounded-xl border-2 border-purple-200 bg-white font-black text-center text-gray-900 focus:border-purple-500 outline-none"
                                    />
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-sm font-semibold text-purple-900">
                                  <span>Sets completed: {loggedSets.length}</span>
                                  {anchorWeight && anchorReps && (
                                    <span className="text-[11px] text-purple-700 font-bold">Using: {anchorWeight} lb × {anchorReps} reps</span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={setInputs.weight}
                                    onChange={(e) => setSetInputs(prev => ({ ...prev, weight: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        repsInputRef.current?.focus();
                                      }
                                    }}
                                    placeholder="Weight"
                                    ref={weightInputRef}
                                    className="w-full p-3 rounded-xl border-2 border-purple-200 bg-white font-black text-center text-gray-900 focus:border-purple-500 outline-none"
                                  />
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={setInputs.reps}
                                    onChange={(e) => setSetInputs(prev => ({ ...prev, reps: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickAddSet();
                                      }
                                    }}
                                    placeholder="Reps"
                                    ref={repsInputRef}
                                    className="w-full p-3 rounded-xl border-2 border-purple-200 bg-white font-black text-center text-gray-900 focus:border-purple-500 outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleQuickAddSet();
                                  }}
                                  disabled={!setInputs.weight || !setInputs.reps || isBaselineMode || isAddingSet}
                                  className={`w-full py-3 rounded-xl font-black text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    (!setInputs.weight || !setInputs.reps || isBaselineMode || isAddingSet) ? 'bg-purple-200 cursor-not-allowed' : 'bg-purple-600 shadow-lg'
                                  }`}
                                >
                                  <span className="text-lg">＋</span>
                                  {isAddingSet ? 'Adding...' : 'Add Set'}
                                </button>

                                <div className="text-[10px] text-purple-700/80 font-semibold">
                                  Add sets fast. You can edit or delete any set below.
                                </div>
                              </div>
                              {eq.type === 'barbell' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPlateCalc(true);
                                  }}
                                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-white text-purple-700 border border-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                  🏋️ Plate Calculator
                                </button>
                              )}

                              <div className="p-3 rounded-2xl bg-white border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-[10px] font-black uppercase text-gray-500">Logged sets</div>
                                  {loggedSets.length > 0 && (
                                    <div className="text-[11px] text-purple-700 font-semibold">{loggedSets.length} sets</div>
                                  )}
                                </div>
                                {loggedSets.length === 0 ? (
                                  <div className="text-sm text-gray-500">No sets logged yet.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {loggedSets.map((s, idx) => (
                                      <div
                                        key={idx}
                                        className={`p-3 rounded-xl border ${editingIndex === idx ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-gray-50'} flex items-center justify-between gap-3`}
                                      >
                                        {editingIndex === idx ? (
                                          <div className="flex-1 grid grid-cols-2 gap-2">
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              value={editValues.weight}
                                              onChange={(e) => setEditValues(prev => ({ ...prev, weight: e.target.value }))}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  saveEditedSet();
                                                }
                                              }}
                                              className="w-full p-2 rounded-lg border-2 border-purple-200 bg-white font-bold text-center text-gray-900 focus:border-purple-500 outline-none"
                                            />
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              value={editValues.reps}
                                              onChange={(e) => setEditValues(prev => ({ ...prev, reps: e.target.value }))}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  saveEditedSet();
                                                }
                                              }}
                                              className="w-full p-2 rounded-lg border-2 border-purple-200 bg-white font-bold text-center text-gray-900 focus:border-purple-500 outline-none"
                                            />
                                            <button
                                              onClick={saveEditedSet}
                                              className="col-span-2 py-2 rounded-lg bg-purple-600 text-white font-bold active:scale-95"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex-1 cursor-pointer" onClick={() => startEditSet(idx)}>
                                            <div className="text-xs font-black text-gray-900">Set {idx + 1}</div>
                                            <div className="text-sm font-semibold text-gray-800">{s.weight} lb × {s.reps} reps</div>
                                          </div>
                                        )}
                                        {editingIndex === idx ? (
                                          <button
                                            onClick={() => setEditingIndex(null)}
                                            className="text-gray-500 text-sm font-semibold px-2 py-1"
                                          >
                                            Cancel
                                          </button>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => startEditSet(idx)}
                                              className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 active:scale-95"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => deleteSet(idx)}
                                              className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600 active:scale-95"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-2xl bg-white border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[10px] font-black uppercase text-gray-500">Finish</div>
                                    <div className="text-[11px] text-gray-500">Auto-saves when you close.</div>
                                  </div>
                                  <button
                                    onClick={handleClose}
                                    className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold active:scale-95"
                                  >
                                    Workout logged
                                  </button>
                                </div>
                                <label className="text-[11px] text-gray-500 font-semibold">Add note (optional)</label>
                                <textarea
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  placeholder="How did this feel?"
                                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:border-purple-400 outline-none"
                                  rows={2}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="cues-card">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name="Target" className="w-5 h-5 cues-accent"/>
                          <h3 className="text-xs font-black uppercase cues-title">Progressive Overload</h3>
                        </div>
                        {overloadSuggestion ? (
                          <div className="space-y-1">
                            <div className="text-sm font-black cues-title">Suggested next: {overloadSuggestion.nextWeight} lb × {overloadSuggestion.reps}</div>
                            <div className="text-xs cues-muted">Why: {overloadSuggestion.rationale}</div>
                            <div className="text-[11px] cues-muted font-semibold">Suggestions stay optional—log what really happened.</div>
                          </div>
                        ) : (
                          <div className="text-sm cues-muted">Complete 2 sessions to unlock a suggestion.</div>
                        )}
                      </div>

                      <div className="cues-card">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="Check" className="w-5 h-5 cues-accent"/>
                          <h3 className="text-xs font-black uppercase cues-title">Form Cues</h3>
                        </div>
                        <ul className="space-y-2">
                          {eq.cues.map((cue, i) => (
                            <li key={i} className="flex gap-2 text-sm cues-title">
                              <span className="cues-accent font-bold">•</span>
                              <span>{cue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="cues-card">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="Info" className="w-5 h-5 cues-accent"/>
                          <h3 className="text-xs font-black uppercase cues-title">Progression notes</h3>
                        </div>
                        <p className="text-sm cues-muted leading-relaxed">{eq.progression}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {showPlateCalc && (
            <PlateCalculator
              targetWeight={nextTarget}
              barWeight={profile.barWeight || 45}
              onClose={() => setShowPlateCalc(false)}
            />
          )}
        </div>
      );
    };

    // ========== PROGRESS TAB ==========
    const Progress = ({ profile, history, strengthScoreObj, cardioHistory }) => {
      const [selectedEquipment, setSelectedEquipment] = useState(null);
      const [analyticsTab, setAnalyticsTab] = useState('overview');
      const [exerciseHistoryQuery, setExerciseHistoryQuery] = useState('');
      const [exerciseHistoryExpanded, setExerciseHistoryExpanded] = useState(null);

      const allEquipment = Object.keys(EQUIPMENT_DB).filter(id => EQUIPMENT_DB[id]?.type !== 'cardio');
      const combinedSessions = useMemo(() => {
        const sessions = [];
        const seen = new Set();
        Object.entries(history || {}).forEach(([equipId, arr]) => {
          (arr || []).forEach(s => {
            const cardioType = s.type === 'cardio' ? (s.cardioType || equipId.replace('cardio_', '')) : null;
            const cardioLabel = s.type === 'cardio' ? (s.cardioLabel || EQUIPMENT_DB[equipId]?.name || 'Cardio') : null;
            const id = s.type === 'cardio'
              ? `${s.date}-${cardioType}-cardio`
              : `${s.date}-${equipId}-strength`;
            if (seen.has(id)) return;
            seen.add(id);
            sessions.push({ ...s, equipId, cardioType: cardioType || s.cardioType, cardioLabel, type: s.type || 'strength' });
          });
        });
        Object.entries(cardioHistory || {}).forEach(([cardioType, arr]) => {
          (arr || []).forEach(s => {
            const id = `${s.date}-${s.cardioType || cardioType}-cardio`;
            if (seen.has(id)) return;
            seen.add(id);
            sessions.push({ ...s, cardioType: s.cardioType || cardioType, type: 'cardio' });
          });
        });
        return sessions;
      }, [history, cardioHistory]);

      const equipmentWithHistory = allEquipment.filter(id => (history[id] || []).length > 0).length;

      const MiniChart = ({ equipId }) => {
        const sessions = history[equipId] || [];
        if (sessions.length < 2) return <p className="text-sm text-gray-400 text-center py-8">Log at least 2 sessions to chart progress</p>;

        const dataPoints = sessions.map(s => {
          let maxWeight = 0;
          (s.sets || []).forEach(set => { if (set.weight > maxWeight) maxWeight = set.weight; });
          return { date: new Date(s.date), weight: maxWeight };
        }).filter(d => d.weight > 0).slice(-10);

        if (dataPoints.length < 2) return <p className="text-sm text-gray-400 text-center py-8">Need more data points</p>;

        const weights = dataPoints.map(d => d.weight);
        const minW = Math.min(...weights) - 10;
        const maxW = Math.max(...weights) + 10;
        const range = (maxW - minW) || 1;

        const width = 280, height = 120, padding = 20;
        const points = dataPoints.map((d, i) => {
          const x = padding + (i / (dataPoints.length - 1)) * (width - padding * 2);
          const y = height - padding - ((d.weight - minW) / range) * (height - padding * 2);
          return { x, y };
        });
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
          <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-hover)" />
                </linearGradient>
              </defs>
              <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="var(--accent)" strokeWidth="2" />
              ))}
            </svg>
            <div className="flex justify-between items-center mt-2 text-[11px] text-gray-500 font-semibold">
              <span>Recent trend</span>
              <span>Last {dataPoints.length} sessions</span>
            </div>
          </div>
        );
      };

      return (
        <div className="flex flex-col h-full bg-gray-50 analytics-shell">
          <div className="bg-white border-b border-gray-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="p-4">
              <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
              <div className="text-xs text-gray-500 font-bold">Your strength journey</div>
            </div>
            
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={() => {
                  setSelectedEquipment(null);
                  setAnalyticsTab('overview');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'overview' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setSelectedEquipment(null);
                  setAnalyticsTab('history');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'history' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
                }`}
              >
                History
              </button>
              <button
                onClick={() => {
                  setSelectedEquipment(null);
                  setAnalyticsTab('exercise');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'exercise' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Exercise History
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
            {analyticsTab === 'history' ? (
              <>
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Workout History</h3>
                    <Icon name="Clock" className="w-4 h-4 text-gray-400" />
                  </div>
                  {(() => {
                    const sortedSessions = [...combinedSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    if (sortedSessions.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-8">No workouts logged yet</p>;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {sortedSessions.map((session, idx) => {
                          const isCardio = session.type === 'cardio';
                          const eq = EQUIPMENT_DB[session.equipId];
                          const sets = isCardio ? 0 : (session.sets || []).length;
                          const cardioLabel = isCardio ? (session.cardioLabel || eq?.name || 'Cardio') : null;
                          const durationLabel = isCardio ? (session.duration ? `${session.duration} min` : `${(session.entries || []).length} entries`) : null;

                          return (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="text-xl">{isCardio ? (eq?.emoji || '🏃') : eq?.type === 'machine' ? '⚙️' : eq?.type === 'dumbbell' ? '🏋️' : '🏋️‍♂️'}</div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">{cardioLabel || eq?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </div>
                                  </div>
                                </div>
                                {isCardio ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-purple-600">{durationLabel}</div>
                                  </div>
                                ) : (
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-purple-600">{sets} sets</div>
                                    <div className="text-xs text-gray-500">Strength logged</div>
                                  </div>
                                )}
                              </div>
                              
                              {isCardio ? (
                                <div className="text-xs text-gray-600">
                                  {(session.entries || []).slice(0, 2).map((entry, i) => (
                                    <div key={i} className="text-gray-500">
                                      {entry.minutes} min{entry.distance ? ` • ${entry.distance} ${entry.distanceUnit}` : ''}
                                    </div>
                                  ))}
                                  {(session.entries || []).length > 2 && (
                                    <div className="text-[11px] text-gray-400">+{session.entries.length - 2} more entries</div>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-1 mt-2">
                                  {(session.sets || []).map((set, i) => (
                                    <div key={i} className="text-center p-1 bg-white rounded border border-gray-100">
                                      <div className="text-xs font-bold text-gray-900">{set.weight}</div>
                                      <div className="text-[10px] text-gray-500">×{set.reps}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card>
              </>
            ) : analyticsTab === 'exercise' ? (
              <>
                <Card className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Exercise History</div>
                      <div className="text-sm text-gray-500">Tap to expand past sets.</div>
                    </div>
                    <Icon name="Search" className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    value={exerciseHistoryQuery}
                    onChange={(e) => setExerciseHistoryQuery(e.target.value)}
                    placeholder="Search exercises"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold"
                  />
                  {(() => {
                    const withHistory = allEquipment.filter(id => (history[id] || []).length > 0);
                    const filtered = withHistory.filter(id => (EQUIPMENT_DB[id]?.name || '').toLowerCase().includes(exerciseHistoryQuery.toLowerCase()));
                    if (filtered.length === 0) {
                      return <div className="text-sm text-gray-500 text-center py-4">No exercises match yet.</div>;
                    }
                    return (
                      <div className="exercise-history-grid">
                        {filtered.map(id => {
                          const eq = EQUIPMENT_DB[id];
                          const sessions = (history[id] || []).slice(-6).reverse();
                          const isExpanded = exerciseHistoryExpanded === id;
                          return (
                            <div key={id} className={`exercise-history-card ${isExpanded ? 'expanded' : ''}`}>
                              <button
                                onClick={() => setExerciseHistoryExpanded(isExpanded ? null : id)}
                                className="exercise-history-toggle"
                              >
                                <div>
                                  <div className="text-xs font-bold text-gray-900">{eq.name}</div>
                                  <div className="text-[10px] text-gray-500">{sessions.length} sessions</div>
                                </div>
                                <Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} className="w-4 h-4 text-gray-400" />
                              </button>
                              {isExpanded && (
                                <div className="exercise-history-detail">
                                  {sessions.length === 0 ? (
                                    <div className="text-xs text-gray-500">No sessions logged yet.</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {sessions.map((session, idx) => {
                                        const summary = (session.sets || []).map(set => `${set.reps}×${set.weight}`).join(', ');
                                        return (
                                          <div key={idx} className="p-2 rounded-lg border border-gray-200 bg-white">
                                            <div className="text-[11px] font-bold text-gray-900">
                                              {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-gray-500">{(session.sets || []).length} sets</div>
                                            <div className="text-[11px] text-gray-700">{summary || 'No sets logged.'}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-gray-400 mt-2">Videos coming later.</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card>
              </>
            ) : !selectedEquipment ? (
              <>
                {/* Streak Card */}
                {(() => {
                  const streakObj = computeStreak(history, cardioHistory);
                  return (
                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-400 font-bold uppercase">Current Streak</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Icon name="Flame" className="w-6 h-6 text-orange-500" />
                            <span className="text-3xl font-black text-gray-900">{streakObj.current}</span>
                            <span className="text-sm text-gray-500">days</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 font-semibold">Best</div>
                          <div className="text-2xl font-black text-purple-600">{streakObj.best}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

                {/* Workout Summary Cards - Compact Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Score</div>
                    <div className="text-2xl font-black text-purple-600">{strengthScoreObj.score}</div>
                    <div className="text-[9px] text-gray-500">/ 100</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Tracked</div>
                    <div className="text-2xl font-black text-gray-900">{equipmentWithHistory}</div>
                    <div className="text-[9px] text-gray-500">/ {allEquipment.length}</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-gray-400 font-bold uppercase mb-1">Avg</div>
                    <div className="text-2xl font-black text-gray-900">{strengthScoreObj.avgPct}%</div>
                    <div className="text-[9px] text-gray-500">strength</div>
                  </Card>
                </div>

                {/* Recent Workout History */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Recent Workouts</h3>
                    <Icon name="Clock" className="w-4 h-4 text-gray-400" />
                  </div>
                  {(() => {
                    const recentSessions = [...combinedSessions]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 10);
                    
                    if (recentSessions.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-4">No workouts logged yet</p>;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {recentSessions.map((session, idx) => {
                          const isCardio = session.type === 'cardio';
                          const eq = EQUIPMENT_DB[session.equipId];
                          const setCount = isCardio ? null : (session.sets || []).length;
                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="text-lg">{isCardio ? (eq?.emoji || '🏃') : eq?.type === 'machine' ? '⚙️' : eq?.type === 'dumbbell' ? '🏋️' : '🏋️‍♂️'}</div>
                                <div>
                                  <div className="text-xs font-bold text-gray-900">{isCardio ? (session.cardioLabel || eq?.name || 'Cardio') : (eq?.name || 'Unknown')}</div>
                                  <div className="text-[10px] text-gray-500">
                                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                              {isCardio ? (
                                <div className="text-right">
                                  <div className="text-xs font-bold text-purple-600">{session.duration ? `${session.duration} min` : `${(session.entries || []).length} entries`}</div>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <div className="text-xs font-bold text-purple-600">{setCount} sets</div>
                                  <div className="text-[10px] text-gray-500">Strength logged</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card>

                {/* Exercise Progress List */}
                <Card>
                  <h3 className="font-bold text-gray-900 mb-3">Exercise Progress</h3>
                  <div className="space-y-2">
                    {allEquipment.filter(id => (history[id] || []).length > 0).slice(0, 5).map(id => {
                      const eq = EQUIPMENT_DB[id];
                      const sessions = history[id] || [];
                      const sessionCount = sessions.length;
                      const bar = Math.min(100, Math.max(10, sessionCount * 12));
                      return (
                        <div key={id} onClick={() => { setSelectedEquipment(id); setAnalyticsTab('overview'); }} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-purple-200 transition-all">
                          <div className="flex items-center gap-2">
                            <div className="text-lg">{eq.type === 'cardio' ? (eq.emoji || '🏃') : eq.type === 'machine' ? '⚙️' : eq.type === 'dumbbell' ? '🏋️' : '🏋️‍♂️'}</div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">{eq.name}</div>
                              <div className="text-[10px] text-gray-500">{sessionCount} sessions logged</div>
                            </div>
                          </div>
                          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${bar}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {equipmentWithHistory === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Start logging to track progress</p>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <button onClick={() => { setSelectedEquipment(null); setAnalyticsTab('overview'); }} className="flex items-center gap-2 mb-4 text-purple-600 font-semibold text-sm">
                  <Icon name="ChevronLeft" className="w-4 h-4" />
                  Back to Overview
                </button>
                
                {(() => {
                  const eq = EQUIPMENT_DB[selectedEquipment];
                  const sessions = history[selectedEquipment] || [];
                  if (sessions.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">{eq.type === 'machine' ? '⚙️' : eq.type === 'dumbbell' ? '🏋️' : '🏋️‍♂️'}</div>
                        <h3 className="font-bold text-gray-900 mb-1">{eq.name}</h3>
                        <p className="text-sm text-gray-500">No sessions logged yet</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">{eq.name}</h3>
                      <MiniChart equipId={selectedEquipment} />
                    </div>
                  );
                })()}
              </Card>
            )}
          </div>
        </div>
      );
    };

    // ========== PROFILE TAB ==========
    const ProfileView = ({ settings, setSettings, onViewAnalytics, onExportData, onImportData, onResetApp, onResetOnboarding }) => {
      const [workoutOpen, setWorkoutOpen] = useState(false);
      const [appearanceOpen, setAppearanceOpen] = useState(false);
      const [analyticsOpen, setAnalyticsOpen] = useState(false);
      const [learnOpen, setLearnOpen] = useState(false);
      const [aboutOpen, setAboutOpen] = useState(false);
      const [dataToolsOpen, setDataToolsOpen] = useState(false);

      const accentOptions = [
        { id: 'purple', label: 'Purple', color: '#8B5CF6' },
        { id: 'red', label: 'Dark Red', color: '#B91C1C' },
        { id: 'gold', label: 'Gold', color: '#D97706' },
      ];

      const learnItems = [
        {
          title: 'How Insights Work',
          body: 'Insights are based only on your own history. No demographics, no comparisons—just you vs. you.'
        },
        {
          title: 'Staying Consistent',
          body: 'Log a little each session. Consistency beats intensity.'
        },
        {
          title: 'Editing a Log',
          body: 'Tap a set to edit it, or delete if it was an off day.'
        }
      ];

      return (
        <div className="flex flex-col h-full bg-gray-50">
          <div className="bg-white border-b border-gray-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <h1 className="text-2xl font-black text-gray-900 p-4 py-5">Profile & Settings</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
            <Card className="space-y-3">
              <button
                onClick={() => setAppearanceOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Appearance</div>
                  <div className="text-sm text-gray-500">Theme and accent</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${appearanceOpen ? 'rotate-180' : ''}`} />
              </button>
              {appearanceOpen && (
                <div className="space-y-3 animate-expand">
                  <ToggleRow
                    icon="Moon"
                    title="Dark Mode"
                    subtitle="Low-glare interface"
                    enabled={settings.darkMode}
                    onToggle={(next) => setSettings({ ...settings, darkMode: next })}
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Dark mode accent</div>
                    <div className="flex gap-2">
                      {accentOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setSettings({ ...settings, darkAccent: opt.id })}
                          className={`flex-1 accent-pill ${settings.darkAccent === opt.id ? 'active' : ''} rounded-xl p-2 flex items-center gap-2`}
                        >
                          <span className="w-6 h-6 rounded-lg" style={{ background: opt.color }}></span>
                          <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase mt-3">Theme preview</div>
                    <div className="theme-preview">
                      <div className="preview-btn">Primary</div>
                      <div className="preview-chip">Chip</div>
                      <div className="preview-card">Card border</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <button onClick={() => setWorkoutOpen(prev => !prev)} className="w-full flex items-center justify-between text-left">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Workout logging preferences</div>
                  <div className="text-sm text-gray-500">Insights and default views</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${workoutOpen ? 'rotate-180' : ''}`} />
              </button>
              {workoutOpen && (
                <div className="space-y-3 animate-expand">
                  <ToggleRow
                    icon="TrendingUp"
                    title="Insights"
                    subtitle="Optional, based only on your history"
                    enabled={settings.insightsEnabled !== false}
                    onToggle={(next) => setSettings({ ...settings, insightsEnabled: next })}
                  />
                  <ToggleRow
                    icon="List"
                    title="Show All Exercises"
                    subtitle="Start with the full library open"
                    enabled={settings.showAllExercises}
                    onToggle={(next) => setSettings({ ...settings, showAllExercises: next })}
                  />
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <button onClick={() => setAnalyticsOpen(prev => !prev)} className="w-full flex items-center justify-between text-left">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Analytics</div>
                  <div className="text-sm text-gray-500">Progress view</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${analyticsOpen ? 'rotate-180' : ''}`} />
              </button>
              {analyticsOpen && (
                <div className="space-y-3 animate-expand">
                  <button
                    onClick={onViewAnalytics}
                    className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold active:scale-[0.98] transition"
                  >
                    Open Analytics
                  </button>
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <button
                onClick={() => setLearnOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Learn</div>
                  <div className="text-sm text-gray-500">Quick hits</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${learnOpen ? 'rotate-180' : ''}`} />
              </button>
              {learnOpen && (
                <div className="space-y-2 animate-expand">
                  {learnItems.map(item => (
                    <details key={item.title} className="border border-gray-200 rounded-xl p-3 bg-white">
                      <summary className="text-sm font-bold text-gray-900 cursor-pointer">{item.title}</summary>
                      <p className="text-sm text-gray-600 mt-2">{item.body}</p>
                    </details>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <button onClick={() => setAboutOpen(prev => !prev)} className="w-full flex items-center justify-between text-left">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">About</div>
                  <div className="text-sm text-gray-500">What this app is for</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {aboutOpen && (
                <div className="space-y-3 animate-expand">
                  <div className="text-sm text-gray-600">A calm, no-noise workout tracker focused on simple logging and steady progress.</div>
                  <div className="text-xs text-gray-500">Version {APP_VERSION}</div>
                  <div className="grid grid-cols-1 gap-2">
                    <a href={`mailto:${FEEDBACK_EMAIL}`} target="_blank" rel="noopener noreferrer" className="w-full p-3 rounded-xl border border-gray-200 text-left font-semibold text-sm bg-white">
                      Send feedback
                    </a>
                    <a href={FOLLOW_URL} target="_blank" rel="noopener noreferrer" className="w-full p-3 rounded-xl border border-gray-200 text-left font-semibold text-sm bg-white">
                      Follow updates
                    </a>
                    <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="w-full p-3 rounded-xl border border-gray-200 text-left font-semibold text-sm bg-white">
                      Support the app
                    </a>
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <button
                onClick={() => setDataToolsOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Data tools</div>
                  <div className="text-sm text-gray-500">Export, import, and reset</div>
                </div>
                <Icon name="ChevronDown" className={`w-4 h-4 text-gray-400 transition-transform ${dataToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {dataToolsOpen && (
                <div className="grid grid-cols-1 gap-2 animate-expand">
                  <button
                    onClick={onExportData}
                    className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold active:scale-[0.98]"
                  >
                    Export Data
                  </button>
                  <button
                    onClick={onImportData}
                    className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold active:scale-[0.98]"
                  >
                    Import Data
                  </button>
                  <button
                    onClick={onResetApp}
                    className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold active:scale-[0.98]"
                  >
                    Reset App
                  </button>
                  <button
                    onClick={onResetOnboarding}
                    className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold active:scale-[0.98]"
                  >
                    Reset onboarding
                  </button>
                </div>
              )}
            </Card>

          </div>
        </div>
      );
    };

    // ========== CARDIO LOGGER ==========
const CardioLogger = ({ id, onClose, onUpdateSessionLogs, sessionLogs }) => {
  const eq = EQUIPMENT_DB[id] || { name: 'Cardio', emoji: '🏃' };
  const [entries, setEntries] = useState(sessionLogs || []);
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('mi');
  const [incline, setIncline] = useState('');
  const [notes, setNotes] = useState('');
  const minutesRef = useRef(null);

  useEffect(() => {
    setEntries(sessionLogs || []);
  }, [sessionLogs, id]);

  const handleAddEntry = () => {
    const mins = Number(minutes);
    if (!mins || mins <= 0) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateISO: toDayKey(new Date()),
      ts: Date.now(),
      type: 'cardio',
      minutes: mins,
      distance: distance ? Number(distance) : null,
      distanceUnit: distance ? distanceUnit : null,
      incline: incline ? Number(incline) : null,
      notes: notes ? notes.trim() : null
    };
    const nextEntries = [...entries, entry];
    setEntries(nextEntries);
    onUpdateSessionLogs?.(id, nextEntries);
    setMinutes('');
    setDistance('');
    setIncline('');
    setNotes('');
    requestAnimationFrame(() => minutesRef.current?.focus());
  };

  const removeEntry = (entryId) => {
    const nextEntries = entries.filter(entry => entry.id !== entryId);
    setEntries(nextEntries);
    onUpdateSessionLogs?.(id, nextEntries);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-full bg-gray-50 text-gray-500">
            <Icon name="ChevronLeft" className="w-5 h-5"/>
          </button>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cardio</div>
            <div className="text-lg font-black text-gray-900">{eq.name}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-gray-50 text-gray-500">
          <Icon name="X" className="w-5 h-5"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Minutes (required)</div>
            <input
              ref={minutesRef}
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="20"
              className="w-full text-lg font-bold text-center p-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 outline-none bg-white text-gray-900"
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Distance (optional)</div>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="3.2"
                className="w-full text-base font-semibold text-center p-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 outline-none bg-white text-gray-900"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Unit</div>
              <select
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 font-semibold"
              >
                <option value="mi">mi</option>
                <option value="km">km</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Incline (optional)</div>
            <input
              type="number"
              value={incline}
              onChange={(e) => setIncline(e.target.value)}
              placeholder="2.0"
              className="w-full text-base font-semibold text-center p-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Notes (optional)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-600 outline-none bg-white text-gray-900 min-h-[80px]"
            />
          </div>
          <button
            onClick={handleAddEntry}
            disabled={!minutes}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
              minutes ? 'bg-purple-600 shadow-lg' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Add Entry
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase text-gray-500">Logged entries</div>
            <div className="text-[11px] text-purple-700 font-semibold">{entries.length} entries</div>
          </div>
          {entries.length === 0 ? (
            <div className="text-sm text-gray-500">No cardio entries yet.</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-gray-900">Entry {idx + 1}</div>
                    <div className="text-sm font-semibold text-gray-800">
                      {entry.minutes} min
                      {entry.distance ? ` • ${entry.distance} ${entry.distanceUnit}` : ''}
                      {entry.incline ? ` • ${entry.incline}% incline` : ''}
                    </div>
                    {entry.notes && <div className="text-[11px] text-gray-500">{entry.notes}</div>}
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
    const App = () => {
      const [loaded, setLoaded] = useState(false);

      const [profile, setProfile] = useState({
        username: '',
        avatar: '💪',
        workoutLocation: 'gym',
        gymType: 'commercial',
        barWeight: 45,
        onboarded: false
      });

      const [settings, setSettings] = useState({ insightsEnabled: true, darkMode: false, darkAccent: 'purple', showAllExercises: false, pinnedExercises: [], workoutViewMode: 'all', suggestedWorkoutCollapsed: true });
      const [history, setHistory] = useState({});
      const [cardioHistory, setCardioHistory] = useState({});
      const [tab, setTab] = useState('home');
      const [activeEquipment, setActiveEquipment] = useState(null);
      const [activeCardio, setActiveCardio] = useState(null);
      const [view, setView] = useState('onboarding');
      const [showAnalytics, setShowAnalytics] = useState(false);
      const [activeSession, setActiveSession] = useState(null);
      const [inlineMessage, setInlineMessage] = useState(null);
      const messageTimerRef = useRef(null);
      const [toastMessage, setToastMessage] = useState(null);
      const toastTimerRef = useRef(null);
      const [sessionStartNotice, setSessionStartNotice] = useState(null);
      const sessionStartTimerRef = useRef(null);
      const [showPostWorkout, setShowPostWorkout] = useState(false);
      const [postWorkoutQuote, setPostWorkoutQuote] = useState(null);
      const postWorkoutTimerRef = useRef(null);

      const [appState, setAppState] = useState({
        lastWorkoutType: null,
        lastWorkoutDayKey: null,
        restDays: []
      });

      const [pinnedExercises, setPinnedExercises] = useState([]);
      const [recentExercises, setRecentExercises] = useState([]);
      const [exerciseUsageCounts, setExerciseUsageCounts] = useState({});
      const [dayEntries, setDayEntries] = useState({});
      const [lastExerciseStats, setLastExerciseStats] = useState({});
      const [draftPlan, setDraftPlan] = useState(null);
      const [dismissedDraftDate, setDismissedDraftDate] = useState(null);
      const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * motivationalQuotes.length));
      const [generatorOptions, setGeneratorOptions] = useState({ goal: '', duration: 45, equipment: '' });

      const normalizeActiveSession = (session) => {
        if (!session) return null;
        const date = session.dateKey || session.date || toDayKey(new Date());
        const logsByExercise = session.logsByExercise || session.setsByExercise || {};
        const rawItems = session.items || Object.values(session.exercises || {}).map(entry => ({
          exerciseId: entry.id,
          name: entry.label,
          sets: entry.sets || 0,
          kind: entry.kind || 'strength'
        }));
        const items = rawItems.map(item => {
          const exerciseId = item.exerciseId || item.id;
          const name = item.name || item.label || EQUIPMENT_DB[exerciseId]?.name || 'Exercise';
          const muscleGroup = item.muscleGroup || EQUIPMENT_DB[exerciseId]?.target || '';
          const derivedKind = EQUIPMENT_DB[exerciseId]?.type === 'cardio' ? 'cardio' : (item.kind || 'strength');
          const fallbackSets = item.sets || 0;
          if (!logsByExercise[exerciseId]) {
            logsByExercise[exerciseId] = derivedKind === 'cardio'
              ? []
              : Array.from({ length: fallbackSets }, () => ({ reps: null, weight: null }));
          }
          const resolvedSets = logsByExercise[exerciseId] || [];
          return {
            exerciseId,
            name,
            muscleGroup,
            kind: derivedKind,
            sets: resolvedSets.length,
            id: exerciseId,
            label: name
          };
        });
        const normalizedStatus = session.status === 'in_progress' ? 'active' : session.status;
        return {
          date,
          status: normalizedStatus || 'draft',
          items,
          logsByExercise,
          createdFrom: session.createdFrom || 'manual'
        };
      };

      const normalizeDraftPlan = (draft) => {
        if (!draft) return null;
        if (draft.exercises) {
          return {
            date: draft.date || toDayKey(new Date()),
            label: draft.label || 'Workout Draft',
            exercises: draft.exercises || [],
            options: draft.options || {},
            status: 'draft',
            createdFrom: draft.createdFrom || 'generated'
          };
        }
        if (draft.items) {
          return {
            date: draft.date || toDayKey(new Date()),
            label: draft.label || 'Workout Draft',
            exercises: (draft.items || []).map(item => item.id),
            options: draft.options || {},
            status: 'draft',
            createdFrom: draft.createdFrom || 'generated'
          };
        }
        return null;
      };

      useEffect(() => {
        const savedOnboarding = storage.get(ONBOARDING_KEY, false);
        const savedProfileRaw = storage.get('ps_v2_profile', null);
        const settingsDefaults = { insightsEnabled: true, darkMode: false, darkAccent: 'purple', showAllExercises: false, pinnedExercises: [], workoutViewMode: 'all', suggestedWorkoutCollapsed: true };
        const savedSettings = storage.get('ps_v2_settings', settingsDefaults);
        const savedHistory = storage.get('ps_v2_history', {});
        const savedCardio = storage.get('ps_v2_cardio', {});
        const savedState = storage.get('ps_v2_state', { lastWorkoutType: null, lastWorkoutDayKey: null, restDays: [] });
        const savedRestDays = storage.get(REST_DAY_KEY, []);
        const savedDismiss = storage.get('ps_dismissed_draft_date', null);
        const savedTodaySession = storage.get(TODAY_SESSION_KEY, null);
        const savedTodayWorkout = storage.get(TODAY_WORKOUT_KEY, null);
        const savedActiveSession = storage.get(ACTIVE_SESSION_KEY, null);
        const savedDraftSession = storage.get(DRAFT_SESSION_KEY, null);
        const normalizedActiveSession = normalizeActiveSession(
          savedTodaySession || savedTodayWorkout || savedActiveSession || savedDraftSession
        );
        const currentDayKey = toDayKey(new Date());
        const mergedRestDays = Array.from(new Set([...(savedState?.restDays || []), ...(savedRestDays || [])]));
        
        const migratedProfile = {
          username: '',
          avatar: '💪',
          workoutLocation: 'gym',
          gymType: 'commercial',
          barWeight: 45,
          onboarded: false,
          ...(savedProfileRaw || {}),
        };
        migratedProfile.workoutLocation = migratedProfile.workoutLocation || (migratedProfile.gymType === 'home' ? 'home' : 'gym');
        migratedProfile.gymType = migratedProfile.gymType || (migratedProfile.workoutLocation === 'home' ? 'home' : 'commercial');
        migratedProfile.onboarded = migratedProfile.onboarded || !!savedOnboarding;

        if (savedProfileRaw) setProfile(migratedProfile);
        if (migratedProfile.onboarded) setView('app');

        setSettings({ ...settingsDefaults, ...savedSettings });
        setHistory(savedHistory);
        setCardioHistory(savedCardio);
        setAppState({ ...savedState, restDays: mergedRestDays });
        storage.set(REST_DAY_KEY, mergedRestDays);
        setDismissedDraftDate(savedDismiss);
        const resolvedTodaySession = normalizedActiveSession?.date === currentDayKey ? normalizedActiveSession : null;
        setActiveSession(resolvedTodaySession);
        setDraftPlan(null);
        if (resolvedTodaySession) {
          storage.set(TODAY_SESSION_KEY, resolvedTodaySession);
        }

        const savedMeta = storage.get(STORAGE_KEY, null);
        const baseMeta = {
          version: STORAGE_VERSION,
          pinnedExercises: savedSettings?.pinnedExercises || [],
          recentExercises: [],
          exerciseUsageCounts: {},
          dayEntries: {},
          lastExerciseStats: {}
        };

        let metaToUse = baseMeta;
        if (savedMeta?.version === STORAGE_VERSION) {
          metaToUse = { ...baseMeta, ...savedMeta };
        } else {
          metaToUse = {
            ...baseMeta,
            recentExercises: deriveRecentExercises(savedHistory, 12),
            exerciseUsageCounts: deriveUsageCountsFromHistory(savedHistory),
            dayEntries: buildDayEntriesFromHistory(savedHistory, savedCardio, savedState?.restDays || [])
          };
          storage.set(STORAGE_KEY, metaToUse);
        }

        setPinnedExercises(metaToUse.pinnedExercises || []);
        setRecentExercises(metaToUse.recentExercises || []);
        setExerciseUsageCounts(metaToUse.exerciseUsageCounts || {});
        setDayEntries(metaToUse.dayEntries || {});
        setLastExerciseStats(metaToUse.lastExerciseStats || {});
        setLoaded(true);
      }, []);

      useEffect(() => { 
        if(loaded) {
          storage.set('ps_v2_profile', profile); 
          storage.set(ONBOARDING_KEY, !!profile.onboarded);
        }
      }, [profile, loaded]);
      useEffect(() => { if(loaded) storage.set('ps_v2_settings', settings); }, [settings, loaded]);
      useEffect(() => {
        if (!loaded) return;
        const persist = () => storage.set('ps_v2_history', history);
        if (typeof requestIdleCallback === 'function') {
          const idleId = requestIdleCallback(persist);
          return () => cancelIdleCallback(idleId);
        }
        const timeoutId = setTimeout(persist, 0);
        return () => clearTimeout(timeoutId);
      }, [history, loaded]);
      useEffect(() => {
        if (!loaded) return;
        const persist = () => storage.set('ps_v2_cardio', cardioHistory);
        if (typeof requestIdleCallback === 'function') {
          const idleId = requestIdleCallback(persist);
          return () => cancelIdleCallback(idleId);
        }
        const timeoutId = setTimeout(persist, 0);
        return () => clearTimeout(timeoutId);
      }, [cardioHistory, loaded]);
      useEffect(() => {
        if (!loaded) return;
        storage.set('ps_v2_state', appState);
        storage.set(REST_DAY_KEY, appState?.restDays || []);
      }, [appState, loaded]);
      useEffect(() => { if(loaded) storage.set('ps_dismissed_draft_date', dismissedDraftDate); }, [dismissedDraftDate, loaded]);
      useEffect(() => {
        if (!loaded) return;
        const persist = () => storage.set(TODAY_SESSION_KEY, activeSession);
        if (typeof requestIdleCallback === 'function') {
          const idleId = requestIdleCallback(persist);
          return () => cancelIdleCallback(idleId);
        }
        const timeoutId = setTimeout(persist, 0);
        return () => clearTimeout(timeoutId);
      }, [activeSession, loaded]);
      useEffect(() => {
        if (!loaded) return;
        storage.set(STORAGE_KEY, {
          version: STORAGE_VERSION,
          pinnedExercises,
          recentExercises,
          exerciseUsageCounts,
          dayEntries,
          lastExerciseStats
        });
      }, [loaded, pinnedExercises, recentExercises, exerciseUsageCounts, dayEntries, lastExerciseStats]);

      useEffect(() => {
        if (!loaded) return;
        const pinnedInSettings = settings?.pinnedExercises || [];
        const different = pinnedInSettings.length !== pinnedExercises.length || pinnedInSettings.some(id => !pinnedExercises.includes(id));
        if (different) {
          setSettings(prev => ({ ...(prev || {}), pinnedExercises }));
        }
      }, [pinnedExercises, loaded]); 

      useEffect(() => {
        if (!loaded) return;
        const pinnedInSettings = settings?.pinnedExercises || [];
        const different = pinnedInSettings.length !== pinnedExercises.length || pinnedExercises.some(id => !pinnedInSettings.includes(id));
        if (different) {
          setPinnedExercises(pinnedInSettings);
        }
      }, [settings?.pinnedExercises, loaded]);
      
      useEffect(() => {
        if (settings.darkMode) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }, [settings.darkMode]);

      useEffect(() => {
        return () => {
          if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        };
      }, []);

      useEffect(() => {
        return () => {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
      }, []);

      useEffect(() => {
        if (!sessionStartNotice) return;
        if (sessionStartTimerRef.current) clearTimeout(sessionStartTimerRef.current);
        sessionStartTimerRef.current = setTimeout(() => setSessionStartNotice(null), 4000);
        return () => {
          if (sessionStartTimerRef.current) clearTimeout(sessionStartTimerRef.current);
        };
      }, [sessionStartNotice]);

      const pushMessage = (text) => {
        if (!text || text === 'Workout saved.') return;
        setInlineMessage(text);
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => setInlineMessage(null), 3200);
      };

      const showToast = (text) => {
        if (!text) return;
        setToastMessage(text);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 1500);
      };

      useEffect(() => {
        if (!loaded) return;
        const lastOpen = storage.get(LAST_OPEN_KEY, null);
        const now = new Date();
        if (lastOpen) {
          const diffDays = Math.floor((now - new Date(lastOpen)) / (1000 * 60 * 60 * 24));
          if (diffDays >= 4) {
            pushMessage('Welcome back. No rush.');
          } else if (diffDays >= 1 && Math.random() < 0.35) {
            const options = ['Welcome back.', 'Good to see you.', 'Ready when you are.'];
            pushMessage(options[Math.floor(Math.random() * options.length)]);
          }
        } else if (Math.random() < 0.25) {
          pushMessage('Ready when you are.');
        }
        storage.set(LAST_OPEN_KEY, now.toISOString());
      }, [loaded]);

      useEffect(() => {
        const accents = {
          purple: { main: '#8B5CF6', hover: '#7C3AED', soft: 'rgba(139, 92, 246, 0.18)' },
          red: { main: '#B91C1C', hover: '#991B1B', soft: 'rgba(185, 28, 28, 0.18)' },
          gold: { main: '#D97706', hover: '#b45309', soft: 'rgba(217, 119, 6, 0.18)' },
        };
        const chosen = accents[settings.darkAccent] || accents.purple;
        const root = document.documentElement;
        root.style.setProperty('--accent', chosen.main);
        root.style.setProperty('--accent-soft', chosen.soft);
        root.style.setProperty('--accent-hover', chosen.hover);
        root.style.setProperty('--focus-ring', `0 0 0 3px ${chosen.soft}`);
      }, [settings.darkAccent]);

      const todayWorkoutType = useMemo(() => getTodaysWorkoutType(history, appState), [history, appState]);

      const strengthScoreObj = useMemo(() => {
        if (!showAnalytics) {
          return { score: 0, avgPct: 0, coveragePct: 0, loggedCount: 0, total: Object.keys(EQUIPMENT_DB).length };
        }
        if (!profile?.onboarded) return { score: 0, avgPct: 0, coveragePct: 0, loggedCount: 0, total: Object.keys(EQUIPMENT_DB).length };
        return computeStrengthScore(profile, history);
      }, [profile, history, showAnalytics]);

      const streakObj = useMemo(() => computeStreak(history, cardioHistory, appState?.restDays || [], dayEntries), [history, cardioHistory, appState?.restDays, dayEntries]);

      const achievements = useMemo(() => {
        if (!showAnalytics) return [];
        return computeAchievements({ history, cardioHistory, strengthScoreObj, streakObj });
      }, [history, cardioHistory, strengthScoreObj, streakObj, showAnalytics]);

      const lastWorkoutDate = useMemo(() => getLastWorkoutDate(history, cardioHistory), [history, cardioHistory]);

      const lastWorkoutLabel = useMemo(() => {
        if (!lastWorkoutDate) return null;
        const today = new Date();
        const diffDays = Math.floor((today - lastWorkoutDate) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return lastWorkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }, [lastWorkoutDate]);

      const weekWorkoutCount = useMemo(() => {
        const today = new Date();
        let count = 0;
        for (let i = 0; i < 7; i++) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          const key = toDayKey(day);
          if (dayEntries?.[key]?.type === 'workout') count += 1;
        }
        return count;
      }, [dayEntries]);

      const recordDayEntry = (dayKey, type = 'workout', extras = {}) => {
        setDayEntries(prev => {
          const existing = prev[dayKey];
          const resolvedType = existing?.type === 'workout' ? 'workout' : type;
          return { ...prev, [dayKey]: { ...(existing || {}), ...extras, type: resolvedType, date: dayKey } };
        });
      };

      const recordExerciseUse = (exerciseId, sets = []) => {
        if (!exerciseId) return;
        setRecentExercises(prev => {
          const filtered = prev.filter(id => id !== exerciseId);
          return [exerciseId, ...filtered].slice(0, 12);
        });
        setExerciseUsageCounts(prev => ({ ...prev, [exerciseId]: (prev[exerciseId] || 0) + Math.max(1, sets.length || 1) }));
        if (sets && sets.length > 0) {
          const lastSet = sets[sets.length - 1];
          setLastExerciseStats(prev => ({ ...prev, [exerciseId]: { weight: lastSet.weight, reps: lastSet.reps } }));
        }
      };

      const todayKey = toDayKey(new Date());
      const activeSessionToday = activeSession?.date === todayKey ? activeSession : null;
      const draftPlanToday = draftPlan?.date === todayKey ? draftPlan : null;
      const restDayDates = Array.isArray(appState?.restDays) ? appState.restDays : [];
      const isRestDay = restDayDates.includes(todayKey);
      const homeQuote = useMemo(() => getDailyQuote(homeQuotes, 'home'), [todayKey]);
      const suggestedFocus = useMemo(() => {
        const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
        const workoutDays = Object.entries(dayEntries || {})
          .filter(([, entry]) => entry?.type === 'workout')
          .sort((a, b) => new Date(b[0]) - new Date(a[0]))
          .slice(0, 2);
        if (workoutDays.length === 0) return 'Full Body';
        const used = new Set();
        workoutDays.forEach(([, entry]) => {
          (entry.exercises || []).forEach(id => {
            const group = resolveMuscleGroup(EQUIPMENT_DB[id]);
            if (group) used.add(group);
          });
        });
        const remaining = muscleGroups.filter(group => !used.has(group));
        return remaining[0] || 'Full Body';
      }, [dayEntries]);

      useEffect(() => {
        if (!isRestDay) return;
        setActiveEquipment(null);
        setActiveCardio(null);
        setActiveSession(null);
        setDraftPlan(null);
        setDismissedDraftDate(null);
      }, [isRestDay]);
      const createEmptySession = (overrides = {}) => ({
        date: todayKey,
        status: 'draft',
        items: [],
        logsByExercise: {},
        createdFrom: overrides.createdFrom || 'manual',
        ...overrides
      });

      const updateSessionItemsByIds = (ids = [], options = {}) => {
        const uniqueIds = Array.from(new Set(ids));
        setActiveSession(prev => {
          const base = (!prev || prev.date !== todayKey) ? createEmptySession({ createdFrom: options.createdFrom || 'manual' }) : prev;
          const items = buildSessionItemsFromIds(uniqueIds, base.items || []);
          const logsByExercise = { ...(base.logsByExercise || {}) };
          uniqueIds.forEach(id => {
            if (!logsByExercise[id]) logsByExercise[id] = [];
          });
          Object.keys(logsByExercise).forEach(key => {
            if (!uniqueIds.includes(key)) delete logsByExercise[key];
          });
          return {
            ...base,
            status: options.status || base.status,
            createdFrom: options.createdFrom || base.createdFrom || 'manual',
            items,
            logsByExercise
          };
        });
      };

      const buildSessionItem = (exerciseId, kind = 'strength') => {
        const equipment = EQUIPMENT_DB[exerciseId];
        const derivedKind = equipment?.type === 'cardio' ? 'cardio' : kind;
        const name = equipment?.name || 'Exercise';
        const muscleGroup = equipment?.target || '';
        return {
          exerciseId,
          name,
          muscleGroup,
          kind: derivedKind,
          sets: 0,
          id: exerciseId,
          label: name
        };
      };

      const buildSessionItemsFromIds = (ids = [], baseItems = []) => {
        return ids.map(id => {
          const existing = baseItems.find(item => item.exerciseId === id || item.id === id);
          if (existing) {
            const name = EQUIPMENT_DB[id]?.name || existing.name || existing.label || 'Exercise';
            const muscleGroup = existing.muscleGroup || EQUIPMENT_DB[id]?.target || '';
            const derivedKind = EQUIPMENT_DB[id]?.type === 'cardio' ? 'cardio' : (existing.kind || 'strength');
            return { ...existing, exerciseId: id, id, name, label: name, kind: derivedKind, muscleGroup };
          }
          return buildSessionItem(id);
        });
      };

      const updateDraftPlanExercises = (updater) => {
        setDraftPlan(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          const nextExercises = updater(prev.exercises || []);
          return { ...prev, exercises: nextExercises };
        });
      };

      const updateActiveSession = (entry, setsList = null) => {
        if (!entry?.id) return;
        setActiveSession(prev => {
          const base = (!prev || prev.date !== todayKey) ? createEmptySession({ createdFrom: 'manual' }) : prev;
          const items = [...(base.items || [])];
          const logsByExercise = { ...(base.logsByExercise || {}) };
          const idx = items.findIndex(item => (item.exerciseId || item.id) === entry.id);
          const resolvedSets = Array.isArray(setsList)
            ? setsList
            : (Array.isArray(logsByExercise[entry.id]) ? logsByExercise[entry.id] : Array.from({ length: entry.sets || 0 }, () => ({ reps: null, weight: null })));
          logsByExercise[entry.id] = resolvedSets;
          const name = entry.name || entry.label || EQUIPMENT_DB[entry.id]?.name || 'Exercise';
          const updatedItem = {
            ...(idx >= 0 ? items[idx] : buildSessionItem(entry.id, entry.kind || 'strength')),
            exerciseId: entry.id,
            id: entry.id,
            name,
            label: name,
            kind: entry.kind || (idx >= 0 ? items[idx].kind : 'strength'),
            muscleGroup: entry.muscleGroup || (idx >= 0 ? items[idx].muscleGroup : null) || EQUIPMENT_DB[entry.id]?.target || '',
            sets: resolvedSets.length
          };
          if (idx >= 0) items[idx] = updatedItem;
          else items.push(updatedItem);
          return {
            ...base,
            status: base.status,
            items,
            logsByExercise
          };
        });
      };

      const updateSessionLogs = (exerciseId, sets) => {
        if (!exerciseId) return;
        updateActiveSession({
          id: exerciseId,
          name: EQUIPMENT_DB[exerciseId]?.name || 'Exercise',
          kind: EQUIPMENT_DB[exerciseId]?.type === 'cardio' ? 'cardio' : 'strength'
        }, sets);
      };

      const ensureWorkoutDayEntry = (exercises = []) => {
        if (!profile.onboarded) return;
        recordDayEntry(todayKey, 'workout', { exercises: Array.from(new Set([...(dayEntries[todayKey]?.exercises || []), ...exercises])) });
      };

      const removeExerciseLogsForToday = (exerciseId, kind = 'strength') => {
        if (kind === 'cardio' && exerciseId.startsWith('cardio_')) {
          const cardioType = exerciseId.replace('cardio_', '');
          setCardioHistory(prev => {
            const existing = prev[cardioType] || [];
            const updated = existing.filter(s => toDayKey(new Date(s.date)) !== todayKey);
            if (updated.length === existing.length) return prev;
            return { ...prev, [cardioType]: updated };
          });
        }
        setHistory(prev => {
          const existing = prev[exerciseId] || [];
          const updated = existing.filter(s => toDayKey(new Date(s.date)) !== todayKey);
          if (updated.length === existing.length) return prev;
          return { ...prev, [exerciseId]: updated };
        });
        setDayEntries(prev => {
          const todayEntry = prev[todayKey];
          if (!todayEntry?.exercises) return prev;
          const updated = todayEntry.exercises.filter(id => id !== exerciseId);
          if (updated.length === todayEntry.exercises.length) return prev;
          return { ...prev, [todayKey]: { ...todayEntry, exercises: updated } };
        });
      };

      const createEmptyDraft = () => {
        createDraft({ label: 'Workout Draft', exercises: [], createdFrom: 'manual', type: todayWorkoutType });
        updateSessionItemsByIds([], { status: 'draft', createdFrom: 'manual' });
        setFocusDraft(true);
      };

      const finishActiveSession = () => {
        if (!activeSession) return;
        const hasData = Object.values(activeSession.logsByExercise || {}).some(sets => (sets || []).length > 0);
        if (activeSession.status !== 'active' && !hasData) return;
        const sessionDate = new Date().toISOString();
        const logsByExercise = activeSession.logsByExercise || {};
        const sessionExercises = activeSession.items || [];
        sessionExercises.forEach(item => {
          const exerciseId = item.exerciseId || item.id;
          const logs = logsByExercise[exerciseId] || [];
          if (!logs.length) return;
          if (item.kind === 'cardio') {
            handleSaveCardioSession(exerciseId, logs);
          } else {
            handleSaveSession(exerciseId, { date: sessionDate, type: 'strength', sets: logs }, { quiet: true });
          }
        });
        recordDayEntry(todayKey, 'workout', { exercises: sessionExercises.map(item => item.exerciseId || item.id) });
        setActiveSession(null);
        setDraftPlan(null);
        setDismissedDraftDate(null);
        setActiveEquipment(null);
        setActiveCardio(null);
        setSessionStartNotice(null);
        const chosenQuote = getRandomQuote(postWorkoutQuotes);
        setPostWorkoutQuote(chosenQuote);
        setShowPostWorkout(true);
        if (postWorkoutTimerRef.current) clearTimeout(postWorkoutTimerRef.current);
        postWorkoutTimerRef.current = setTimeout(() => setShowPostWorkout(false), 3600);
        setTab('home');
        pushMessage('Workout saved.');
      };

      const buildDraftPlan = (type, options = {}) => {
        const gymType = GYM_TYPES[profile.gymType];
        const planKey = type === 'legs' ? 'Legs' : type === 'push' ? 'Push' : type === 'pull' ? 'Pull' : type === 'full' ? 'Full Body' : todayWorkoutType;
        const plan = WORKOUT_PLANS[planKey] || {};
        const pool = [];
        const wantsMachines = options.equipment === 'machines';
        const wantsFree = options.equipment === 'free';
        const allowMachines = gymType?.machines && !wantsFree;
        const allowFree = (gymType?.dumbbells?.available || gymType?.barbells?.available) && !wantsMachines;
        if (allowMachines) pool.push(...(plan.machines || []));
        if (allowFree && gymType?.dumbbells?.available) pool.push(...(plan.dumbbells || []));
        if (allowFree && gymType?.barbells?.available) pool.push(...(plan.barbells || []));
        const uniquePool = Array.from(new Set(pool));
        if (uniquePool.length === 0) {
          uniquePool.push(...Object.keys(EQUIPMENT_DB).slice(0, 12));
        }
        const targetCount = options.duration === 30 ? 3 : options.duration === 60 ? 5 : 4;
        while (uniquePool.length < targetCount) {
          const fallback = Object.keys(EQUIPMENT_DB).filter(id => (EQUIPMENT_DB[id]?.tags || []).includes(planKey.toLowerCase()) || EQUIPMENT_DB[id]?.tags?.includes(planKey));
          if (fallback.length === 0) {
            uniquePool.push(...Object.keys(EQUIPMENT_DB).filter(id => uniquePool.indexOf(id) === -1).slice(0, targetCount - uniquePool.length));
          } else {
            uniquePool.push(...fallback);
          }
          uniquePool.splice(targetCount);
          if (uniquePool.length >= targetCount || fallback.length === 0) break;
        }
        const picks = [];
        const poolCopy = [...uniquePool];
        for (let i = 0; i < targetCount && poolCopy.length > 0; i++) {
          const idx = Math.floor(Math.random() * poolCopy.length);
          picks.push(poolCopy.splice(idx, 1)[0]);
        }
        const sanitizedOptions = {
          goal: options.goal || '',
          duration: options.duration || '',
          equipment: options.equipment || ''
        };
        return { type, label: planKey === 'Full Body' ? 'Full Body' : `${planKey} Day`, exercises: picks, options: sanitizedOptions };
      };

      const createDraft = (draft) => {
        const resolved = {
          date: todayKey,
          label: draft?.label || 'Workout Draft',
          exercises: draft?.exercises || [],
          options: draft?.options || {},
          status: 'draft',
          createdFrom: draft?.createdFrom || 'manual',
          type: draft?.type || todayWorkoutType
        };
        setDraftPlan(resolved);
        setDismissedDraftDate(null);
      };

      const triggerGenerator = (type) => {
        if (isRestDay) {
          setTab('home');
          return;
        }
        if (activeSessionToday?.status === 'active') {
          setTab('workout');
          return;
        }
        const chosen = type === 'surprise' ? ['legs','push','pull','full'][Math.floor(Math.random()*4)] : type;
        const draft = buildDraftPlan(chosen, generatorOptions || {});
        updateSessionItemsByIds(draft.exercises || [], { status: 'draft', createdFrom: 'generated' });
        showToast('Added to today’s workout');
        setTab('workout');
      };

      const regenerateDraftPlan = () => {
        if (!draftPlan) return;
        const hasOptions = generatorOptions?.goal || generatorOptions?.duration || generatorOptions?.equipment;
        const regenerated = buildDraftPlan(draftPlan.type, hasOptions ? generatorOptions : (draftPlan.options || {}));
        createDraft({ ...regenerated, createdFrom: 'generated' });
        updateSessionItemsByIds(regenerated.exercises || [], {
          status: activeSessionToday?.status === 'active' ? 'active' : 'draft',
          createdFrom: 'generated'
        });
      };

      const swapDraftExercise = (index, newId) => {
        const currentId = draftPlanToday?.exercises?.[index];
        const existingEntry = activeSessionToday?.items?.find(item => (item.exerciseId || item.id) === currentId);
        if (existingEntry?.sets > 0) {
          const confirmed = window.confirm('This will remove logged sets for this exercise from today’s session.');
          if (!confirmed) return;
          removeExerciseLogsForToday(currentId, existingEntry.kind);
        }
        setDraftPlan(prev => {
          if (!prev) return prev;
          const updated = [...prev.exercises];
          updated[index] = newId;
          return { ...prev, exercises: updated };
        });
        setActiveSession(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          const items = [...(prev.items || [])];
          const logsByExercise = { ...(prev.logsByExercise || {}) };
          if (items[index]) {
            items[index] = buildSessionItem(newId);
          } else if (currentId) {
            const idx = items.findIndex(item => item.id === currentId);
            if (idx >= 0) {
              items[idx] = buildSessionItem(newId);
            }
          }
          if (currentId) delete logsByExercise[currentId];
          if (!logsByExercise[newId]) logsByExercise[newId] = [];
          return { ...prev, items, logsByExercise };
        });
      };

      const removeDraftExercise = (index) => {
        const currentId = draftPlanToday?.exercises?.[index];
        const existingEntry = activeSessionToday?.items?.find(item => (item.exerciseId || item.id) === currentId);
        if (existingEntry?.sets > 0) {
          const confirmed = window.confirm('This will remove logged sets for this exercise from today’s session.');
          if (!confirmed) return;
          removeExerciseLogsForToday(currentId, existingEntry.kind);
        }
        setDraftPlan(prev => {
          if (!prev) return prev;
          const updated = prev.exercises.filter((_, idx) => idx !== index);
          return { ...prev, exercises: updated };
        });
        if (currentId) {
          setActiveSession(prev => {
            if (!prev || prev.date !== todayKey) return prev;
            const logsByExercise = { ...(prev.logsByExercise || {}) };
            delete logsByExercise[currentId];
            return { ...prev, items: (prev.items || []).filter(item => (item.exerciseId || item.id) !== currentId), logsByExercise };
          });
        }
      };

      const clearDraftPlan = () => {
        setDraftPlan(null);
        setDismissedDraftDate(null);
        if (activeSessionToday) {
          updateSessionItemsByIds([], {
            status: activeSessionToday?.status === 'active' ? 'active' : 'draft',
            createdFrom: 'manual'
          });
        }
      };

      const logRestDay = () => {
        setAppState(prev => {
          const restDays = new Set(prev?.restDays || []);
          restDays.add(todayKey);
          return { ...(prev || {}), restDays: Array.from(restDays) };
        });
        recordDayEntry(todayKey, 'rest');
        setActiveSession(null);
        setDraftPlan(null);
        setDismissedDraftDate(null);
        setActiveEquipment(null);
        setActiveCardio(null);
        setTab('workout');
        pushMessage('Rest day logged.');
      };

      const undoRestDay = () => {
        setAppState(prev => {
          const restDays = (prev?.restDays || []).filter(day => day !== todayKey);
          return { ...(prev || {}), restDays };
        });
        setDayEntries(prev => {
          const entry = prev[todayKey];
          if (!entry || entry.type !== 'rest') return prev;
          const next = { ...prev };
          delete next[todayKey];
          return next;
        });
        pushMessage('Rest day removed.');
      };

      const startWorkoutFromBuilder = () => {
        if (isRestDay || !activeSessionToday) return;
        ensureWorkoutDayEntry((activeSessionToday.items || []).map(item => item.exerciseId || item.id));
        setActiveSession(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          return { ...prev, status: 'active' };
        });
      };

      const handleStartWorkout = () => {
        if (isRestDay) {
          undoRestDay();
        }
        setTab('workout');
        if (activeSessionToday?.status === 'active') {
          return;
        }
        if (!activeSessionToday) {
          startEmptySession();
        }
      };

      const startEmptySession = () => {
        if (isRestDay) {
          undoRestDay();
        }
        setActiveSession(prev => {
          const base = (!prev || prev.date !== todayKey) ? createEmptySession({ createdFrom: 'manual' }) : prev;
          return { ...base, status: 'draft' };
        });
      };

      const cancelTodaySession = (isActive = false, hasLoggedSets = false) => {
        if (hasLoggedSets) {
          const confirmed = window.confirm('Discard today’s session? Your logged sets will be cleared.');
          if (!confirmed) return;
        } else if (isActive) {
          const confirmed = window.confirm('Cancel this workout?');
          if (!confirmed) return;
        }
        setActiveSession(null);
        setDraftPlan(null);
        setDismissedDraftDate(null);
        setActiveEquipment(null);
        setActiveCardio(null);
        setSessionStartNotice(null);
      };

      const addExerciseToDraft = (id) => {
        if (!id) return;
        addExerciseToSession(id, { status: activeSessionToday?.status || 'draft' });
      };

      const addExerciseToSession = (id, options = {}) => {
        if (isRestDay) return;
        if (!id) return;
        if (!activeSessionToday) return;
        let didAdd = false;
        setActiveSession(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          const base = prev;
          const items = [...(base.items || [])];
          const logsByExercise = { ...(base.logsByExercise || {}) };
          if (!items.find(item => (item.exerciseId || item.id) === id)) {
            items.push(buildSessionItem(id));
            logsByExercise[id] = [];
            didAdd = true;
          }
          const nextStatus = options.status || base.status;
          return { ...base, status: nextStatus, createdFrom: base.createdFrom || options.createdFrom || 'manual', items, logsByExercise };
        });
        if (options.toast && didAdd) {
          showToast('Added to today’s workout');
        }
      };

      const addExerciseFromSearch = (id) => {
        if (isRestDay) return;
        if (!id) return;
        addExerciseToSession(id, { status: activeSessionToday?.status === 'active' ? 'active' : 'draft', toast: true });
      };

      const handleSelectExercise = (id, mode, options = {}) => {
        if (isRestDay) return;
        if (options.createDraftOnly) {
          createEmptyDraft();
          return;
        }
        if (!id) return;
        if (!activeSessionToday) return;
        if (EQUIPMENT_DB[id]?.comingSoon) return;
        if (mode === 'session') {
          const entry = activeSessionToday?.items?.find(item => (item.exerciseId || item.id) === id);
          if (entry?.kind === 'cardio') {
            setActiveCardio(id);
          } else {
            setActiveEquipment(id);
          }
          return;
        }
      };

      const removeSessionExercise = (id) => {
        if (!id || !activeSessionToday) return;
        const entry = activeSessionToday.items?.find(item => (item.exerciseId || item.id) === id);
        const hasLoggedSets = (activeSessionToday.logsByExercise?.[id] || []).length > 0;
        if (hasLoggedSets) {
          const confirmed = window.confirm('This will remove logged sets for this exercise from today’s session.');
          if (!confirmed) return;
          removeExerciseLogsForToday(id, entry.kind);
        }
        setActiveSession(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          const logsByExercise = { ...(prev.logsByExercise || {}) };
          delete logsByExercise[id];
          return { ...prev, items: (prev.items || []).filter(item => (item.exerciseId || item.id) !== id), logsByExercise };
        });
        updateDraftPlanExercises(prev => prev.filter(exId => exId !== id));
      };

      const swapSessionExercise = (index, newId) => {
        if (!activeSessionToday) return;
        const entry = activeSessionToday.items?.[index];
        if (!entry) return;
        const entryId = entry.exerciseId || entry.id;
        if ((activeSessionToday.logsByExercise?.[entryId] || []).length > 0) {
          const confirmed = window.confirm('This will remove logged sets for this exercise from today’s session.');
          if (!confirmed) return;
          removeExerciseLogsForToday(entry.id, entry.kind);
        }
        setActiveSession(prev => {
          if (!prev || prev.date !== todayKey) return prev;
          const items = [...(prev.items || [])];
          const logsByExercise = { ...(prev.logsByExercise || {}) };
          if (!items[index]) return prev;
          const oldId = items[index].exerciseId || items[index].id;
          items[index] = buildSessionItem(newId);
          if (oldId) delete logsByExercise[oldId];
          if (!logsByExercise[newId]) logsByExercise[newId] = [];
          return { ...prev, items, logsByExercise };
        });
        updateDraftPlanExercises(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = newId;
            return updated;
          }
          const fallbackIndex = updated.findIndex(exId => exId === entry.id);
          if (fallbackIndex >= 0) updated[fallbackIndex] = newId;
          return updated;
        });
      };

      const handleSaveSession = (id, session, options = {}) => {
        if (isRestDay) return;
        if (!session) return;
        const normalizedSession = {
          ...session,
          sets: [...(session.sets || [])]
        };
        const sessionDay = toDayKey(new Date(session.date));
        const previousSessions = history[id] || [];
        const lastSession = previousSessions[previousSessions.length - 1];
        const lastMaxWeight = lastSession?.sets?.length ? Math.max(...lastSession.sets.map(s => s.weight || 0)) : null;
        const lastTotalReps = lastSession?.sets?.length ? lastSession.sets.reduce((sum, s) => sum + (s.reps || 0), 0) : null;
        const newMaxWeight = normalizedSession?.sets?.length ? Math.max(...normalizedSession.sets.map(s => s.weight || 0)) : null;
        const newTotalReps = normalizedSession?.sets?.length ? normalizedSession.sets.reduce((sum, s) => sum + (s.reps || 0), 0) : null;
        setHistory(prev => {
          const prevSessions = prev[id] || [];
          const existingIdx = prevSessions.findIndex(s => toDayKey(new Date(s.date)) === sessionDay);
          const updated = [...prevSessions];
          if (existingIdx >= 0) updated[existingIdx] = normalizedSession;
          else updated.push(normalizedSession);
          return { ...prev, [id]: updated };
        });

        setAppState(prev => ({
          ...prev,
          lastWorkoutType: todayWorkoutType,
          lastWorkoutDayKey: toDayKey(new Date())
        }));

        // Unlock beginner mode after first workoutrecordExerciseUse(id, session.sets || []);
        recordDayEntry(sessionDay, 'workout', { exercises: Array.from(new Set([...(dayEntries[sessionDay]?.exercises || []), id])) });
        updateActiveSession({
          id,
          name: EQUIPMENT_DB[id]?.name || 'Exercise',
          kind: 'strength'
        }, normalizedSession.sets || []);

        // Only close modal if not explicitly told to keep it open (e.g., from cleanup/auto-save)
        if (!options.keepOpen) {
          setActiveEquipment(null);
        }
        if (!options.quiet) {
          if (settings.insightsEnabled !== false && lastSession && newMaxWeight !== null) {
            const improved = newMaxWeight > (lastMaxWeight || 0) || (newMaxWeight === lastMaxWeight && newTotalReps > (lastTotalReps || 0));
            if (improved) {
              const responses = ['More than last time.', 'That’s progress.'];
              pushMessage(responses[Math.floor(Math.random() * responses.length)]);
            } else {
              pushMessage('Workout saved.');
            }
          } else {
            pushMessage('Workout saved.');
          }
        }
        // Stay on suggested workout screen if user is there
      };

      const handleSaveCardioSession = (exerciseId, entries = []) => {
        if (isRestDay) return;
        if (!exerciseId) return;
        const eq = EQUIPMENT_DB[exerciseId];
        const cardioType = exerciseId.startsWith('cardio_') ? exerciseId.replace('cardio_', '') : exerciseId;
        const totalMinutes = entries.reduce((sum, entry) => sum + (entry.minutes || 0), 0);
        const session = {
          date: new Date().toISOString(),
          type: 'cardio',
          entries: [...entries],
          duration: totalMinutes || null,
          cardioLabel: eq?.name || 'Cardio',
          cardioType,
          cardioGroup: eq?.cardioGroup || null
        };
        setHistory(prev => {
          const prevSessions = prev[exerciseId] || [];
          const sessionDay = toDayKey(new Date(session.date));
          const existingIdx = prevSessions.findIndex(s => toDayKey(new Date(s.date)) === sessionDay);
          const updated = [...prevSessions];
          if (existingIdx >= 0) updated[existingIdx] = session;
          else updated.push(session);
          return { ...prev, [exerciseId]: updated };
        });
        if (exerciseId.startsWith('cardio_')) {
          setCardioHistory(prev => {
            const prevSessions = prev[cardioType] || [];
            const sessionDay = toDayKey(new Date(session.date));
            const existingIdx = prevSessions.findIndex(s => toDayKey(new Date(s.date)) === sessionDay);
            const updated = [...prevSessions];
            if (existingIdx >= 0) updated[existingIdx] = session;
            else updated.push(session);
            return { ...prev, [cardioType]: updated };
          });
        }
        recordDayEntry(todayKey, 'workout', {
          exercises: Array.from(new Set([...(dayEntries[todayKey]?.exercises || []), exerciseId]))
        });
      };

      const handleReset = () => {
        if(confirm("Reset all data? This can't be undone.")) {
          const freshProfile = { 
            username: '', 
            avatar: '💪', 
            workoutLocation: 'gym',
            gymType: 'commercial',
            barWeight: 45,
            onboarded: false,
          };
          setProfile(freshProfile);
          setHistory({});
          setCardioHistory({});
          setActiveSession(null);
          setView('onboarding');
          setTab('home');
          setAppState({ lastWorkoutType: null, lastWorkoutDayKey: null, restDays: [] });
          setSettings({ insightsEnabled: true, darkMode: false, darkAccent: 'purple', showAllExercises: false, pinnedExercises: [], workoutViewMode: 'all', suggestedWorkoutCollapsed: true });
          setPinnedExercises([]);
          setRecentExercises([]);
          setExerciseUsageCounts({});
          setDayEntries({});
          setLastExerciseStats({});
          setDraftPlan(null);
          setDismissedDraftDate(null);
          storage.set('ps_v2_profile', null);
          storage.set('ps_v2_history', {});
          storage.set('ps_v2_cardio', {});
          storage.set('ps_v2_state', { lastWorkoutType: null, lastWorkoutDayKey: null, restDays: [] });
          storage.set('ps_v2_settings', { insightsEnabled: true, darkMode: false, darkAccent: 'purple', showAllExercises: false, pinnedExercises: [], workoutViewMode: 'all', suggestedWorkoutCollapsed: true });
          storage.set(STORAGE_KEY, { version: STORAGE_VERSION, pinnedExercises: [], recentExercises: [], exerciseUsageCounts: {}, dayEntries: {}, lastExerciseStats: {} });
          storage.set(ONBOARDING_KEY, false);
          storage.set('ps_dismissed_draft_date', null);
          storage.set(ACTIVE_SESSION_KEY, null);
          storage.set(DRAFT_SESSION_KEY, null);
          storage.set(TODAY_WORKOUT_KEY, null);
          storage.set(TODAY_SESSION_KEY, null);
          storage.set(REST_DAY_KEY, []);
        }
      };

      const handleResetOnboarding = () => {
        storage.set(ONBOARDING_KEY, false);
        setProfile(prev => ({ ...prev, onboarded: false }));
        setView('onboarding');
      };

      const completeOnboarding = () => {
        setProfile(prev => ({
          ...prev,
          onboarded: true,
          workoutLocation: prev.workoutLocation || 'gym',
          gymType: prev.gymType || 'commercial'
        }));
        storage.set(ONBOARDING_KEY, true);
        setView('app');
        setTab('home');
      };

      const handleExportData = () => {
        try {
          const exportData = {
            version: 'v2',
            exportDate: new Date().toISOString(),
            profile,
            settings,
            history,
            cardioHistory,
            appState,
            restDayDates: appState?.restDays || [],
            meta: {
              version: STORAGE_VERSION,
              pinnedExercises,
              recentExercises,
              exerciseUsageCounts,
              dayEntries,
              lastExerciseStats
            }
          };

          const dataStr = JSON.stringify(exportData, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `planet-strength-backup-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          alert('✅ Data exported successfully! Your backup file has been downloaded.');
        } catch (error) {
          alert('❌ Export failed: ' + error.message);
        }
      };

      const handleImportData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const importedData = JSON.parse(event.target.result);
              const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

              // Validate the imported data
              if (!isPlainObject(importedData)
                || !isPlainObject(importedData.profile)
                || !isPlainObject(importedData.settings)
                || !isPlainObject(importedData.history)
                || !isPlainObject(importedData.cardioHistory)
              ) {
                alert('❌ Invalid backup file format.');
                return;
              }

              if (confirm('⚠️ Import will replace all current data. Continue?')) {
                // Restore all data
                if (importedData.profile) {
                  setProfile(importedData.profile);
                  storage.set('ps_v2_profile', importedData.profile);
                }
                if (importedData.settings) {
                  setSettings(importedData.settings);
                  storage.set('ps_v2_settings', importedData.settings);
                }
                if (importedData.history) {
                  setHistory(importedData.history);
                  storage.set('ps_v2_history', importedData.history);
                }
                if (importedData.cardioHistory) {
                  setCardioHistory(importedData.cardioHistory);
                  storage.set('ps_v2_cardio', importedData.cardioHistory);
                }
                if (importedData.appState || importedData.restDayDates) {
                  const restDays = Array.isArray(importedData?.restDayDates)
                    ? importedData.restDayDates
                    : (Array.isArray(importedData?.appState?.restDays) ? importedData.appState.restDays : []);
                  const nextAppState = {
                    lastWorkoutType: importedData.appState?.lastWorkoutType || null,
                    lastWorkoutDayKey: importedData.appState?.lastWorkoutDayKey || null,
                    restDays
                  };
                  setAppState(nextAppState);
                  storage.set('ps_v2_state', nextAppState);
                  storage.set(REST_DAY_KEY, restDays);
                } else {
                  const nextAppState = { lastWorkoutType: null, lastWorkoutDayKey: null, restDays: [] };
                  setAppState(nextAppState);
                  storage.set('ps_v2_state', nextAppState);
                  storage.set(REST_DAY_KEY, []);
                }
                if (importedData.meta) {
                  const meta = {
                    version: STORAGE_VERSION,
                    pinnedExercises: importedData.meta.pinnedExercises || [],
                    recentExercises: importedData.meta.recentExercises || [],
                    exerciseUsageCounts: importedData.meta.exerciseUsageCounts || {},
                    dayEntries: importedData.meta.dayEntries || {},
                    lastExerciseStats: importedData.meta.lastExerciseStats || {}
                  };
                  setPinnedExercises(meta.pinnedExercises);
                  setRecentExercises(meta.recentExercises);
                  setExerciseUsageCounts(meta.exerciseUsageCounts);
                  setDayEntries(meta.dayEntries);
                  setLastExerciseStats(meta.lastExerciseStats);
                  storage.set(STORAGE_KEY, meta);
                } else {
                  const derivedMeta = {
                    version: STORAGE_VERSION,
                    pinnedExercises: importedData.settings?.pinnedExercises || [],
                    recentExercises: deriveRecentExercises(importedData.history || {}),
                    exerciseUsageCounts: deriveUsageCountsFromHistory(importedData.history || {}),
                    dayEntries: buildDayEntriesFromHistory(
                      importedData.history || {},
                      importedData.cardioHistory || {},
                      Array.isArray(importedData?.restDayDates)
                        ? importedData.restDayDates
                        : (importedData.appState?.restDays || [])
                    ),
                    lastExerciseStats: {}
                  };
                  setPinnedExercises(derivedMeta.pinnedExercises);
                  setRecentExercises(derivedMeta.recentExercises);
                  setExerciseUsageCounts(derivedMeta.exerciseUsageCounts);
                  setDayEntries(derivedMeta.dayEntries);
                  setLastExerciseStats(derivedMeta.lastExerciseStats);
                  storage.set(STORAGE_KEY, derivedMeta);
                }

                alert('✅ Data imported successfully! Your backup has been restored.');
              }
            } catch (error) {
              alert('❌ Import failed: Invalid JSON file or corrupted data.');
            }
          };
          reader.readAsText(file);
        };

        input.click();
      };

      if (!loaded) return null;if (view === 'onboarding') return <OnboardingFlow profile={profile} setProfile={setProfile} onFinish={completeOnboarding} />;

      
return (
        <>
          <InstallPrompt />
          <div className="app-root bg-gray-50 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <InlineMessage message={tab === 'home' && inlineMessage === 'Workout saved.' ? null : inlineMessage} />
              <Toast message={toastMessage} />
              {showPostWorkout && (
                <div className="post-workout-screen" onClick={() => setShowPostWorkout(false)}>
                  <div className="post-workout-card" onClick={(e) => e.stopPropagation()}>
                    <div className="post-workout-header">
                      <div className="text-xs font-bold text-gray-400 uppercase">Session</div>
                      <button className="post-workout-close" onClick={() => setShowPostWorkout(false)}>
                        <Icon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-2xl font-black text-gray-900">Workout saved.</div>
                    {postWorkoutQuote && (
                      <div className="quote-block subtle">
                        <p className="quote-text">“{postWorkoutQuote.text}”</p>
                        <p className="quote-meta">— {postWorkoutQuote.movie}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {showAnalytics ? (
                <div className="h-full flex flex-col bg-gray-50">
                  <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
                    <button onClick={() => setShowAnalytics(false)} className="p-2 rounded-full bg-gray-100">
                      <Icon name="ChevronLeft" className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Analytics</div>
                      <div className="text-lg font-black text-gray-900">Progress</div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <Progress
                      profile={profile}
                      history={history}
                      strengthScoreObj={strengthScoreObj}
                      cardioHistory={cardioHistory}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {tab === 'home' && (
                    <Home
                      profile={profile}
                      lastWorkoutLabel={lastWorkoutLabel}
                      suggestedFocus={suggestedFocus}
                      onStartWorkout={handleStartWorkout}
                      onGenerate={(label) => {
                        const map = {
                          'Push': 'push',
                          'Pull': 'pull',
                          'Legs': 'legs',
                          'Full Body': 'full',
                          'Surprise Me': 'surprise'
                        };
                        triggerGenerator(map[label] || 'surprise');
                      }}
                      homeQuote={homeQuote}
                      isRestDay={isRestDay}
                      onLogRestDay={logRestDay}
                      onUndoRestDay={undoRestDay}
                    />
                  )}
                  {tab === 'workout' && (
                    <Workout
                      profile={profile}
                      onSelectExercise={handleSelectExercise}
                      settings={settings}
                      setSettings={setSettings}
                      pinnedExercises={pinnedExercises}
                      setPinnedExercises={setPinnedExercises}
                      recentExercises={recentExercises}
                      onStartWorkoutFromBuilder={startWorkoutFromBuilder}
                      activeSession={activeSessionToday}
                      onFinishSession={finishActiveSession}
                      onAddExerciseFromSearch={addExerciseFromSearch}
                      onPushMessage={pushMessage}
                      onRemoveSessionExercise={removeSessionExercise}
                      onSwapSessionExercise={swapSessionExercise}
                      onStartEmptySession={startEmptySession}
                      isRestDay={isRestDay}
                      onCancelSession={cancelTodaySession}
                    />
                  )}
                  {tab === 'profile' && (
                    <ProfileView
                      settings={settings}
                      setSettings={setSettings}
                      onViewAnalytics={() => setShowAnalytics(true)}
                      onExportData={handleExportData}
                      onImportData={handleImportData}
                      onResetApp={handleReset}
                      onResetOnboarding={handleResetOnboarding}
                    />
                  )}
                </>
              )}
            </div>

            {!showAnalytics && <TabBar currentTab={tab} setTab={setTab} />}

            {activeEquipment && (
              <EquipmentDetail
                id={activeEquipment}
                profile={profile}
                history={history[activeEquipment] || []}
                onSave={handleSaveSession}
                onUpdateSessionLogs={updateSessionLogs}
                sessionLogs={activeSessionToday?.logsByExercise?.[activeEquipment] || []}
                onClose={() => setActiveEquipment(null)}
              />
            )}

            {activeCardio && (
              <CardioLogger
                id={activeCardio}
                onUpdateSessionLogs={updateSessionLogs}
                sessionLogs={activeSessionToday?.logsByExercise?.[activeCardio] || []}
                onClose={() => setActiveCardio(null)}
              />
            )}
          </div>
        </>
      );
    };

    ReactDOM.render(
      React.createElement(App),
      document.getElementById('root')
    );
