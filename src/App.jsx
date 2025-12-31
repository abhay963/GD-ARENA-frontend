import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaMicrophone, FaSpinner, FaSkull,  } from "react-icons/fa";
import introMusic from "./audio/squid game music.mp3";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { FaSignOutAlt } from "react-icons/fa";

import StreakCalendar from "./components/StreakCalendar";




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
 

const [showCalendar, setShowCalendar] = useState(false);


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
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xl">
    <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#161616] to-[#0f0f0f] 
                    border border-[#2a2a2a]/50 shadow-2xl
                    rounded-2xl px-10 py-8 w-[360px]
                    text-center animate-streakPop overflow-hidden">

      {/* ANIMATED BACKGROUND GRADIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 via-transparent to-transparent 
                      opacity-70 animate-pulse pointer-events-none" />
      
      {/* ANIMATED SHIMMER EFFECT */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        animate-shimmer" style={{ animationDuration: '3s' }} />
      </div>

      {/* DECORATIVE CORNER ACCENTS WITH ANIMATION */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-transparent 
                      rounded-bl-full animate-pulse" style={{ animationDuration: '2s' }} />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-500/15 to-transparent 
                      rounded-tr-full animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

      

      {/* ENHANCED ANIMATED FIRE ICON WITH GROWING/SHRINKING EFFECT */}
      <div className="relative flex justify-center mb-5">
      
      
        
        {/* Fire container with breathing animation */}
        <div className="relative w-20 h-20 flex items-center justify-center 
                        rounded-3xl bg-gradient-to-br from-orange-500/15 via-yellow-500/15 to-orange-500/15 
                        border border-orange-500/30 backdrop-blur-sm"
             style={{ animation: 'fireBreathe 1.5s ease-in-out infinite' }}>
          
          {/* Entry animation for the entire fire container */}
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ animation: 'fireEntry 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}>
            
            {/* Large outer fire layer - main breathing effect */}
            <svg className="absolute w-12 h-12 text-orange-500 drop-shadow-lg" 
                 fill="currentColor" viewBox="0 0 24 24" 
                 style={{ animation: 'fireBreathe 1.2s ease-in-out infinite' }}>
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
            
            {/* Medium fire layer - secondary breathing */}
            <svg className="absolute w-10 h-10 text-yellow-400 drop-shadow-md" 
                 fill="currentColor" viewBox="0 0 24 24" 
                 style={{ animation: 'fireGrow 1s ease-in-out infinite', animationDelay: '0.2s' }}>
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
            </svg>
            
            {/* Small inner fire layer - fast flickering */}
            <svg className="absolute w-7 h-7 text-orange-300 drop-shadow-sm" 
                 fill="currentColor" viewBox="0 0 24 24" 
                 style={{ animation: 'fireFlicker 0.4s ease-in-out infinite', animationDelay: '0.1s' }}>
              <path d="M12 2c0 0-2 3-2 5 0 1.1.9 2 2 2s2-.9 2-2c0-2-2-5-2-5zm0 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"/>
            </svg>
            
            {/* Dynamic fire particles with growing effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="w-3 h-3 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-full" 
                   style={{ 
                     animation: 'fireBlow 1s ease-in-out infinite',
                     boxShadow: '0 0 10px rgba(251, 146, 60, 0.8)'
                   }} />
            </div>
            <div className="absolute -top-2 left-1/3">
              <div className="w-2 h-2 bg-gradient-to-t from-orange-400 to-yellow-300 rounded-full" 
                   style={{ 
                     animation: 'fireBlow 1.2s ease-in-out infinite', 
                     animationDelay: '0.3s',
                     boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)'
                   }} />
            </div>
            <div className="absolute -top-2 right-1/3">
              <div className="w-2.5 h-2.5 bg-gradient-to-t from-yellow-400 to-orange-300 rounded-full" 
                   style={{ 
                     animation: 'fireBlow 0.8s ease-in-out infinite', 
                     animationDelay: '0.5s',
                     boxShadow: '0 0 12px rgba(251, 146, 60, 0.9)'
                   }} />
            </div>
            
            {/* Additional floating embers */}
            <div className="absolute top-0 left-1/4">
              <div className="w-1 h-1 bg-orange-400 rounded-full" 
                   style={{ 
                     animation: 'fireBlow 1.5s ease-in-out infinite', 
                     animationDelay: '0.7s'
                   }} />
            </div>
            <div className="absolute top-1 right-1/4">
              <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full" 
                   style={{ 
                     animation: 'fireBlow 1.3s ease-in-out infinite', 
                     animationDelay: '0.9s'
                   }} />
            </div>
          </div>
        </div>
      </div>

      {/* STREAK COUNT WITH ENHANCED GLOW */}
      <div className="mb-4">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-400 blur-lg 
                          animate-pulse opacity-40" style={{ animationDuration: '2s' }} />
          <h2 className="relative text-6xl font-black text-transparent bg-clip-text 
                          bg-gradient-to-r from-orange-300 via-yellow-300 to-orange-300
                          tracking-tighter leading-none"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite'
              }}>
            {latestStreak}
          </h2>
        </div>
        <p className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-[0.2em]">
          Day Streak
        </p>
      </div>

      {/* MESSAGE WITH SUBTLE ANIMATION */}
      <p className="text-gray-400 text-sm font-light leading-relaxed px-3 opacity-0 
                    animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
        {latestStreak === 1 && "Nice start. Consistency begins today."}
        {latestStreak >= 2 && latestStreak <= 3 && "You're building momentum."}
        {latestStreak >= 4 && latestStreak <= 6 && "Strong consistency. Keep going."}
        {latestStreak >= 7 && "Excellent discipline. Don't break the chain."}
      </p>

      {/* ENHANCED PROGRESS BAR WITH ANIMATION */}
      <div className="mt-7 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</span>
          <span className="text-xs font-bold text-orange-400 animate-pulse">
            {Math.min(latestStreak * 10, 100)}%
          </span>
        </div>
        <div className="relative h-2 w-full bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 blur-sm 
                          animate-pulse" style={{ animationDuration: '1.5s' }} />
          <div
            className="relative h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-400 
                      rounded-full transition-all duration-1200 ease-out shadow-lg shadow-orange-500/25"
            style={{ 
              width: `${Math.min(latestStreak * 10, 100)}%`,
              backgroundSize: '200% 100%',
              animation: 'gradientShift 2s ease infinite'
            }}
          />
          {/* Progress bar shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                          animate-shimmer rounded-full" style={{ animationDuration: '2s' }} />
        </div>
      </div>

      {/* ENHANCED DECORATIVE DOTS */}
      <div className="mt-6 flex items-center justify-center space-x-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < Math.min(Math.ceil(latestStreak / 2), 5)
                ? 'bg-gradient-to-r from-orange-400 to-yellow-400 shadow-sm shadow-orange-400/50 animate-pulse'
                : 'bg-gray-700/50'
            }`}
            style={{
              width: i < Math.min(Math.ceil(latestStreak / 2), 5) ? '12px' : '6px',
              opacity: i < Math.min(Math.ceil(latestStreak / 2), 5) ? 1 : 0.3,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>

      {/* ANIMATED BOTTOM GLOW */}
      <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r 
                      from-transparent via-orange-500/50 to-transparent animate-pulse" 
           style={{ animationDuration: '2s' }} />
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

<div
  onClick={() => setShowCalendar(true)}
  className="cursor-pointer flex items-center gap-2 px-3 py-1 rounded-full 
             bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition"
>
  <span className="text-yellow-400 font-bold">🔥 {streak}</span>
  <span className="text-xs text-yellow-300">day streak</span>
</div>
{showCalendar && (
  <StreakCalendar streak={streak} onClose={() => setShowCalendar(false)} />
)}



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

<span
  className="
    fixed bottom-4 right-4 
    z-[99999]
    flex items-center      /* center content vertically */
    px-3 py-1.5 rounded-full
    bg-gradient-to-r from-slate-900 to-slate-800
    border border-white/10
    shadow-md
    transition-all duration-200 hover:shadow-lg hover:scale-[1.01]
  "
>
  <span className="flex items-center gap-2 leading-none">

    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>

    <span className="text-gray-400 text-[10px] tracking-wider uppercase leading-none">
      Developed by
    </span>

    <span className="text-white text-xs font-semibold leading-none">
      Abhay
    </span>

    <span className="text-red-400 text-xs leading-none">♥</span>
  </span>
</span>


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




@keyframes streakPop {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px) rotateX(10deg);
  }
  50% {
    transform: scale(1.02) translateY(-5px) rotateX(0deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotateX(0deg);
  }
}

@keyframes fireBreathe {
  0%, 100% { 
    transform: scale(1) rotate(-2deg); 
    filter: brightness(1);
  }
  25% { 
    transform: scale(1.15) rotate(1deg); 
    filter: brightness(1.2);
  }
  50% { 
    transform: scale(0.95) rotate(2deg); 
    filter: brightness(0.9);
  }
  75% { 
    transform: scale(1.1) rotate(-1deg); 
    filter: brightness(1.1);
  }
}

@keyframes fireGrow {
  0%, 100% { 
    transform: scale(1) translateY(0); 
    opacity: 1;
  }
  25% { 
    transform: scale(1.3) translateY(-2px); 
    opacity: 0.9;
  }
  50% { 
    transform: scale(0.85) translateY(1px); 
    opacity: 1;
  }
  75% { 
    transform: scale(1.2) translateY(-1px); 
    opacity: 0.95;
  }
}

@keyframes fireFlicker {
  0%, 100% { transform: scale(1) rotate(-2deg); }
  25% { transform: scale(1.05) rotate(1deg); }
  50% { transform: scale(0.98) rotate(2deg); }
  75% { transform: scale(1.03) rotate(-1deg); }
}

@keyframes fireBlow {
  0%, 100% { transform: translateY(0) scaleY(1); opacity: 1; }
  50% { transform: translateY(-4px) scaleY(1.2); opacity: 0.7; }
}

@keyframes fireGlow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.4); }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes fireEntry {
  0% {
    transform: scale(0) rotate(180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.3) rotate(90deg);
    opacity: 0.7;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.animate-streakPop {
  animation: streakPop 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  transform-style: preserve-3d;
}


      `}</style>
    </div>
  );
}
