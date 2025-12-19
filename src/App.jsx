import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaMicrophone, FaSpinner, FaSkull,  } from "react-icons/fa";
import introMusic from "./audio/squid game music.mp3";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { FaSignOutAlt } from "react-icons/fa";





export default function App() {
    const { user, loading } = useAuth();

  // ✅ THEN states
  const [streak, setStreak] = useState(0);
  const [lastShownStreak, setLastShownStreak] = useState(0);

  const [step, setStep] = useState("enter");
  const [topic, setTopic] = useState("");
  const [history, setHistory] = useState([]);
  const [listening, setListening] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

const [showStreakPopup, setShowStreakPopup] = useState(false);
const [latestStreak, setLatestStreak] = useState(0);


const [showHowToPlay, setShowHowToPlay] = useState(false);
const recognitionTimerRef = useRef(null);
 



  const audioRef = useRef(null);
  const chatEndRef = useRef(null);

  // Speech recognition references
  const recognitionRef = useRef(null);
  const fullSpeechRef = useRef(""); // 🔥 sores entire speech safely




useEffect(() => {
  if (!user) return;

  axios
    .get(`${import.meta.env.VITE_API_URL}/api/streak/${user.uid}`)
    .then(res => {
      setStreak(res.data.streak);
      setLastShownStreak(res.data.streak); // ✅ sync baseline
    })
    .catch(console.error);

}, [user?.uid]);





  // Scroll to bottom every time history updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [history]);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    fullSpeechRef.current = "";
    setListening(false);
  };

  const speakText = (text) => {
    try {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = "en-US";
      speech.pitch = 0.9;
      speech.rate = 0.95;
      window.speechSynthesis.speak(speech);
    } catch (err) {
      console.error("SpeechSynthesis error:", err);
    }
  };

  const handleEnter = () => {
    setStep("audio");
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }
  };

  

  const handleStartCountdown = () => {
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(timer);
        setFlash(true);
        setShake(true);
        setTimeout(() => startGD(), 800);
      }
      setCountdown(count);
    }, 1000);
  };

  const startGD = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/start-gd`);
      setTopic(res.data.topic);

      setHistory([
        { speaker: "Player 1", text: res.data.agents["Player 1"], avatar: "🤖" },
        { speaker: "Player 2", text: res.data.agents["Player 2"], avatar: "🤖" },
      ]);

      speakText(res.data.agents["Player 1"]);
      speakText(res.data.agents["Player 2"]);

      if (audioRef.current) audioRef.current.pause();
      setFlash(false);
      setShake(false);
      setStep("gd");
    } catch (error) {
      console.error("Failed to start GD:", error);
    }
  };

  const handleUserSpeech = async (userSpeech) => {
    setHistory((prev) => [...prev, { speaker: "You", text: userSpeech, avatar: "👤" }]);
    setLoadingAI(true);

    try {
      const ai = await axios.post(`${import.meta.env.VITE_API_URL}/api/gd`, {
        userSpeech,
        topic,
        history: history.map((h) => ({
          ...h,
          speaker: h.speaker.replace("Agent", "Player"),
        })),
      });

      setHistory((prev) => [
        ...prev,
        { speaker: "Player 1", text: ai.data["Player 1"], avatar: "🤖" },
        { speaker: "Player 2", text: ai.data["Player 2"], avatar: "🤖" },
      ]);

      speakText(ai.data["Player 1"]);
      speakText(ai.data["Player 2"]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  // 🔥 NEW FIXED SPEECH RECOGNITION (works like Google Assistant)
const startSpeaking = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Speech Recognition not supported.");
    return;
  }

  // HARD RESET EVERYTHING
  window.speechSynthesis.cancel();
  if (audioRef.current) audioRef.current.pause();

  fullSpeechRef.current = "";

  if (recognitionRef.current) {
    try {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.stop();
    } catch {}
    recognitionRef.current = null;
  }

  const recognition = new SR();
  recognitionRef.current = recognition;

  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        fullSpeechRef.current += " " + e.results[i][0].transcript;
      }
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech error:", e.error);
    stopListening(); // HARD STOP on error
  };

  recognition.onend = () => {
    // DO NOT restart if user stopped
    if (listening) {
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    }
  };

  try {
    recognition.start();
    setListening(true);
  } catch (e) {
    console.error("Start failed:", e);
    setListening(false);
  }

  // 🔥 HARD AUTO-REFRESH every 4 minutes
  recognitionTimerRef.current = setTimeout(() => {
    stopListening();
  }, 4 * 60 * 1000);
};


  
const stopListening = () => {
  if (recognitionTimerRef.current) {
    clearTimeout(recognitionTimerRef.current);
    recognitionTimerRef.current = null;
  }

  const recognition = recognitionRef.current;
  if (!recognition) return;

  try {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.stop();
  } catch {}

  setTimeout(() => {
    const speech = fullSpeechRef.current.trim();
    if (speech) handleUserSpeech(speech);

    fullSpeechRef.current = "";
    recognitionRef.current = null;
    setListening(false);
  }, 300);
};


const handleLogout = async () => {
  await signOut(auth);
  stopAllAudio(); // optional, but good UX
  setStep("enter");
};


  

if (loading) {
  return <div className="text-white">Loading...</div>;
}

if (!user) {
  return <Auth />;
}


const handleExit = async () => {
  stopAllAudio();

  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/streak/update`,
      {
        uid: user.uid,
        email: user.email,
      }
    );

    const newStreak = res.data.streak;

    setStreak(newStreak);

    // ✅ SHOW POPUP ONLY IF STREAK INCREASED
    if (newStreak > lastShownStreak) {
      setLatestStreak(newStreak);
      setShowStreakPopup(true);
      setLastShownStreak(newStreak);

      setTimeout(() => {
        setShowStreakPopup(false);
        setStep("enter");
      }, 2500);
    } else {
      // ❌ Same day → no popup
      setStep("enter");
    }

  } catch (err) {
    console.error(err);
    setStep("enter");
  }
};







  return (
    <div
      className={`relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden ${
        shake ? "animate-pulse" : ""
      } ${flash ? "bg-red-900" : ""}`}
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

{showStreakPopup && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    {/* Sophisticated backdrop with animated gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000" />
      </div>
    </div>

    {/* Main popup container */}
    <div className="relative animate-streakReveal">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-30 animate-pulse" />
      
      {/* Card */}
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl 
                      border border-white/20 rounded-3xl p-8 w-[400px] shadow-2xl
                      overflow-hidden group">
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r 
                        from-transparent via-white/10 to-transparent 
                        group-hover:translate-x-full transition-transform duration-1000" />

        {/* Floating particles background */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon with sophisticated animation */}
          <div className="flex justify-center mb-6">
            <div className="relative animate-iconBounce">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 
                              rounded-3xl blur-xl opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl 
                              bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 
                              flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Streak number with premium typography */}
          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-7xl font-black text-transparent bg-clip-text 
                               bg-gradient-to-r from-white to-gray-300 
                               leading-none animate-countUp">
                {latestStreak}
              </span>
              <span className="text-2xl font-light text-gray-400 mb-2">/ ∞</span>
            </div>
            <p className="text-center text-xs font-bold text-gray-400 mt-2 
                         uppercase tracking-[0.3em] letter-spacing-2">
              Consecutive Days
            </p>
          </div>

          {/* Premium message with typewriter effect */}
          <div className="h-6 mb-6">
            <p className="text-center text-gray-300 text-sm font-light 
                         animate-fadeInUp animation-delay-300">
              {latestStreak === 1 && "Your journey begins today 🔥"}
              {latestStreak >= 2 && latestStreak <= 3 && "Building momentum, keep it up! ⚡"}
              {latestStreak >= 4 && latestStreak <= 6 && "You're on fire! 🔥🔥"}
              {latestStreak >= 7 && latestStreak <= 13 && "Unstoppable force! 💪"}
              {latestStreak >= 14 && latestStreak <= 29 && "Legendary consistency! 👑"}
              {latestStreak >= 30 && "You've achieved mastery! 🏆"}
            </p>
          </div>

          {/* Sophisticated progress ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(latestStreak / 10, 1))}`}
                  className="transition-all duration-1500 ease-out"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {Math.min(latestStreak * 10, 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Achievement badges */}
          <div className="flex justify-center gap-2">
            {[
              { threshold: 3, icon: '⚡', achieved: latestStreak >= 3 },
              { threshold: 7, icon: '🔥', achieved: latestStreak >= 7 },
              { threshold: 14, icon: '💎', achieved: latestStreak >= 14 },
              { threshold: 30, icon: '👑', achieved: latestStreak >= 30 }
            ].map((badge, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                          transition-all duration-500 transform
                          ${badge.achieved 
                            ? 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 scale-100' 
                            : 'bg-gray-800/50 scale-75 opacity-30'}`}
                style={{
                  animationDelay: `${i * 100}ms`
                }}
              >
                {badge.icon}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)}


      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <audio ref={audioRef} src={introMusic} />

      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 text-red-600 text-9xl font-black animate-ping blur-xl">
              {countdown}
            </div>
            <div className="relative text-red-500 text-9xl font-black animate-bounce drop-shadow-2xl">
              {countdown}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
      <header className="border-b border-red-900/30 backdrop-blur-sm bg-black/20">
  <div className="container mx-auto px-6 py-4 flex items-center justify-between">

    {/* LEFT SIDE — LOGO */}
    <div
      className="flex items-center gap-3 cursor-pointer"
      onClick={() => {
        stopAllAudio();
        setStep("enter");
      }}
    >
      <FaSkull className="text-3xl text-red-500 animate-pulse" />
      <h1
        className="text-2xl font-black tracking-wider bg-gradient-to-r 
                   from-red-500 to-red-700 bg-clip-text text-transparent"
      >
        GD ARENA
      </h1>
    </div>

    {/* CENTER — HOW TO PLAY */}
    <button
      onClick={() => setShowHowToPlay(true)}
      className="
        relative px-6 py-3 rounded-xl font-bold text-lg tracking-wide 
        text-red-300 cursor-pointer overflow-hidden
        transition-all duration-300 group
      "
    >
      <span className="absolute inset-0 bg-red-700/40 group-hover:bg-red-700/80 
                       rounded-xl blur-sm transition-all duration-300 animate-dangerPulse"></span>

      <span className="absolute inset-0 rounded-xl border-2 border-red-600 
                       group-hover:border-red-400 animate-electricBorder"></span>

      <span className="relative z-10">HOW TO PLAY</span>
    </button>





<div className="flex items-center gap-4">

  {/* STREAK BADGE */}
  <div className="flex items-center gap-2 px-3 py-1 rounded-full 
                  bg-yellow-500/10 border border-yellow-500/30">
    <span className="text-yellow-400 font-bold">
      🔥 {streak}
    </span>
    <span className="text-xs text-yellow-300">day streak</span>
  </div>

  <span className="text-sm text-gray-400 hidden md:block">
    {user?.email}
  </span>

  <button onClick={handleLogout}>
    <FaSignOutAlt />
  </button>
</div>







   

  </div>
</header>


 {/* HOW TO PLAY GAMING MODAL */}
{/* HOW TO PLAY — RED DANGER CYBER MODAL */}
{showHowToPlay && (
  <div className="fixed inset-0 flex items-center justify-center z-[999] overflow-hidden">
    
    {/* Dark Overlay */}
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-dangerFade"></div>

    {/* Floating red lights */}
    <div className="absolute w-80 h-80 bg-red-600/20 blur-[120px] rounded-full animate-pulseSlow top-10 left-10"></div>
    <div className="absolute w-96 h-96 bg-red-800/30 blur-[150px] rounded-full animate-pulseSlow2 bottom-10 right-10"></div>

    {/* MODAL CARD */}
    <div className="relative w-full max-w-2xl p-[3px] rounded-2xl bg-gradient-to-br 
                    from-red-700 to-red-900 shadow-[0_0_60px_rgba(255,0,0,0.7)]
                    animate-dangerPop">

      {/* Inner panel */}
      <div className="relative bg-black/90 rounded-2xl p-10 overflow-hidden">

        {/* SCANLINE EFFECT */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px)] 
                        bg-[length:100%_4px] animate-scanlines"></div>

        {/* CLOSE BUTTON */}
        <button
          onClick={() => setShowHowToPlay(false)}
          className="absolute top-5 right-5 text-red-500 hover:text-red-300 
                     text-3xl font-black animate-glitch cursor-pointer"
        >
          ✖
        </button>

        {/* TITLE */}
        <h2 className="text-5xl font-black text-center tracking-widest text-red-500 
                       drop-shadow-[0_0_15px_red] mb-10 animate-glowPulse">
          HOW TO PLAY
        </h2>

        {/* STEPS */}
        <div className="space-y-8">

  {[
  ["①", "ENTER PLAYGROUND — Begin your interactive session."],
  ["②", "PRESS ENTER — The system prepares your environment."],
  ["③", "COUNTDOWN STARTS — Getting everything ready for you."],
  ["④", "TOPIC GENERATED — AI participants join the discussion."],
  ["⑤", "SPEAK & SUBMIT — Share your points, then press STOP."]
]
.map(([num, text], i) => (
    
    <div
      key={i}
      className="flex gap-6 items-start animate-stepReveal relative"
      style={{ animationDelay: `${i * 0.25}s` }}
    >
      
      {/* NUMBER BADGE */}
      <span className="text-red-500 text-5xl font-black drop-shadow-[0_0_20px_red] animate-numberPulse">
        {num}
      </span>

      {/* TEXT BLOCK */}
      <div className="flex-1">
        <p className="text-red-400 font-bold text-xl tracking-widest animate-glitchFlicker">
          {text.split(" — ")[0]}
        </p>

        <p className="text-gray-300 mt-2 text-[15px] animate-holoSlide">
          {text.split(" — ")[1]}
        </p>
      </div>

      {/* ELECTRIC SHOCK LINE ON EACH STEP */}
      <div className="absolute left-0 -bottom-2 w-full h-[2px] bg-red-800/40 overflow-hidden">
        <div className="h-full w-full bg-red-500 animate-electricZap"></div>
      </div>
    </div>

  ))}

</div>

      </div>
    </div>
  </div>
)}


        <main className="flex-1 container mx-auto px-6 py-8 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {step === "enter" && (
              <div className="text-center space-y-8 animate-fade-in">
                <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-widest text-red-500">WELCOME TO THE ARENA</h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Enter a world where every word matters. Face intelligent agents in a battle of wits. Only
                    the strongest survive.
                  </p>
                </div>
                <button
                  onClick={handleEnter}
                  className="group relative px-12 py-5 text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50 cursor-pointer"
                >
                  <span className="relative z-10 ">ENTER PLAYGROUND</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            )}

            {step === "audio" && (
              
              <div className="text-center space-y-8 animate-fade-in">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-900/20 rounded-full border border-red-900/50">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-300 font-medium">SYSTEM CALIBRATING</span>
                  </div>
                  <p className="text-gray-400 text-lg">Prepare yourself. The challenge awaits.</p>
                </div>
                <button
                  onClick={handleStartCountdown}
                  className="group relative px-12 py-5 text-xl font-bold bg-gradient-to-r from-green-600 to-green-800 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50 cursor-pointer"
                >
                  <span className="relative z-10 flex items-center gap-3 ">
                    <FaSkull className="animate-pulse" />
                    ENTER 
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            )}

            {step === "gd" && (
              <div className="space-y-6 animate-fade-in relative">
               

                <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 backdrop-blur-sm border border-red-900/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <h2 className="text-xl font-bold text-red-400">ACTIVE TOPIC</h2>
                  </div>
                  <p className="text-2xl font-light text-gray-200">{topic}</p>
                </div>

                {/* CONTROL PANEL */}
                <div className="flex items-center justify-between bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-gray-800">

  {/* SPEAK / STOP BUTTON */}
  <button
    onClick={listening ? stopListening : startSpeaking}
    disabled={loadingAI}
    className={`cursor-pointer group flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
      listening
        ? "bg-red-600 animate-pulse shadow-lg shadow-red-500/50"
        : loadingAI
        ? "bg-gray-700 cursor-not-allowed"
        : "bg-gradient-to-r from-blue-600 to-blue-800 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50"
    }`}
  >
    <FaMicrophone className="text-xl" />
    <span>{listening ? "STOP" : "SPEAK"}</span>
  </button>

  {/* EXIT BUTTON (NEW) */}
  <button
  onClick={handleExit}
  className="cursor-pointer px-6 py-3 bg-red-700 hover:bg-red-800 rounded-xl text-white font-bold shadow-lg transition"
>
  EXIT
</button>


  {/* AGENTS PROCESSING */}
  {loadingAI && (
    <div className="flex items-center gap-3 text-yellow-400">
      <FaSpinner className="animate-spin text-xl" />
      <span className="font-medium">PLAYERS PROCESSING...</span>
    </div>
  )}

</div>


                <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 shadow-2xl">

  {/* FIXED HEADER */}
  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-black/40 backdrop-blur-sm z-10 py-2">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-700"></div>
    <span className="text-sm font-bold text-gray-500 tracking-widest">DISCUSSION LOG</span>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-700"></div>
  </div>

  {/* SCROLLABLE AREA */}
  <div className="h-96 overflow-y-auto space-y-4 custom-scrollbar pr-2">

    {history.map((msg, i) => (
      <div
        key={i}
        className={`group relative p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
          msg.speaker === "You"
            ? "bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-l-4 border-blue-500"
            : "bg-gradient-to-r from-purple-900/20 to-purple-800/10 border-l-4 border-purple-500"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{msg.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm uppercase tracking-wider">{msg.speaker}</span>
              {msg.speaker !== "You" && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-gray-300 leading-relaxed">{msg.text}</p>
          </div>
        </div>
      </div>
    ))}

    {/* AUTO SCROLL TARGET (BOTTOM) */}
    <div ref={chatEndRef}></div>

  </div>
</div>

              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ef4444, #991b1b);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #dc2626, #7f1d1d);
        }

/* Red pulsing glow */
@keyframes dangerPulse {
  0% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
  100% { opacity: 0.4; transform: scale(1); }
}
.animate-dangerPulse {
  animation: dangerPulse 2s infinite ease-in-out;
}

/* Electric border moving animation */
@keyframes electricBorder {
  0% { box-shadow: 0 0 5px red; }
  50% { box-shadow: 0 0 20px rgba(255,0,0,0.8); }
  100% { box-shadow: 0 0 5px red; }
}
.animate-electricBorder {
  animation: electricBorder 1.8s infinite linear;
}

/* Glitching duplicate text */
@keyframes glitchText {
  0% { transform: translate(0,0); opacity: 0.2; }
  20% { transform: translate(-2px,2px); opacity: 0.6; }
  40% { transform: translate(2px,-2px); opacity: 0.4; }
  60% { transform: translate(-1px,1px); opacity: 0.7; }
  80% { transform: translate(1px,-1px); opacity: 0.5; }
  100% { transform: translate(0,0); opacity: 0.2; }
}
.animate-glitchText {
  animation: glitchText 0.25s infinite;
}



/* Each step reveal slide + fade */
@keyframes stepReveal {
  0% { opacity: 0; transform: translateX(-30px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
.animate-stepReveal {
  animation: stepReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Big pulsing SQUID GAME number */
@keyframes numberPulse {
  0%, 100% { transform: scale(1); text-shadow: 0 0 20px red; }
  50% { transform: scale(1.2); text-shadow: 0 0 40px red; }
}
.animate-numberPulse {
  animation: numberPulse 2s infinite ease-in-out;
}

/* Glitch flicker title */
@keyframes glitchFlicker {
  0% { opacity: 0.6; transform: skew(0deg); }
  20% { opacity: 1; transform: skew(-2deg); }
  40% { opacity: 0.8; transform: skew(2deg); }
  60% { opacity: 1; transform: skew(-1deg); }
  100% { opacity: 0.9; transform: skew(0deg); }
}
.animate-glitchFlicker {
  animation: glitchFlicker 1.5s infinite;
}

/* Hologram sliding text */
@keyframes holoSlide {
  0% { opacity: 0; transform: translateX(20px); filter: blur(4px); }
  100% { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.animate-holoSlide {
  animation: holoSlide 1.4s ease-out forwards;
}

/* Red electric zap line */
@keyframes electricZap {
  0% { transform: translateX(-100%); opacity: 0.3; }
  100% { transform: translateX(100%); opacity: 1; }
}
.animate-electricZap {
  animation: electricZap 1.2s infinite linear;
}



@keyframes streakReveal {
    0% {
      opacity: 0;
      transform: scale(0.5) rotateY(90deg);
      filter: blur(20px);
    }
    50% {
      transform: scale(1.05) rotateY(0deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotateY(0deg);
      filter: blur(0);
    }
  }

  @keyframes iconBounce {
    0%, 100% { transform: translateY(0) scale(1); }
    25% { transform: translateY(-10px) scale(1.1); }
    50% { transform: translateY(0) scale(1); }
    75% { transform: translateY(-5px) scale(1.05); }
  }

  @keyframes countUp {
    from { 
      opacity: 0; 
      transform: translateY(20px) scale(0.5);
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% { 
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10% { opacity: 0.3; }
    90% { opacity: 0.3; }
    50% { 
      transform: translateY(-20px) translateX(10px);
      opacity: 1;
    }
  }

  .animate-streakReveal {
    animation: streakReveal 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .animate-iconBounce {
    animation: iconBounce 1.5s ease-in-out;
  }

  .animate-countUp {
    animation: countUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
  }

  .animate-fadeInUp {
    animation: fadeInUp 0.5s ease-out both;
  }

  .animate-float {
    animation: float 4s ease-in-out infinite;
  }

  .animation-delay-300 { animation-delay: 300ms; }
  .animation-delay-2000 { animation-delay: 2s; }
  .animation-delay-4000 { animation-delay: 4s; }



      `}</style>
    </div>
  );
}
