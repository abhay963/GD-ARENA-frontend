import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaMicrophone, FaSpinner, FaSkull, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import introMusic from "./audio/squid game music.mp3";

export default function App() {
  const [step, setStep] = useState("enter");
  const [topic, setTopic] = useState("");
  const [history, setHistory] = useState([]);
  const [listening, setListening] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const chatEndRef = useRef(null);

  // Recognition instance and transcript storage
  const recognitionRef = useRef(null);
  const transcriptRef = useRef(""); // collects final transcripts while listening

  // Auto-scroll to bottom when history changes
useEffect(() => {
  if (chatEndRef.current) {
    chatEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }
}, [history]);



  const stopAllAudio = () => {
  // Stop intro music
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  // Stop speech synthesis
  window.speechSynthesis.cancel();

  // Stop speech recognition
  if (recognitionRef.current) {
    recognitionRef.current._shouldRestart = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
    recognitionRef.current = null;
  }

  transcriptRef.current = "";
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
      audioRef.current.play().catch(() => {
        /* autoplay may be blocked; user will click to play later */
      });
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/start-gd`)
;
      setTopic(res.data.topic);
      setHistory([
        { speaker: "Agent 1", text: res.data.agents.agent1, avatar: "🤖" },
        { speaker: "Agent 2", text: res.data.agents.agent2, avatar: "🎭" },
      ]);
      speakText(res.data.agents.agent1);
      speakText(res.data.agents.agent2);
      if (audioRef.current) audioRef.current.pause();
      setFlash(false);
      setShake(false);
      setStep("gd");
    } catch (error) {
      console.error("Failed to start GD:", error);
    }
  };

  const handleUserSpeech = async (userSpeech) => {
    // append user's speech to history first
    setHistory((prev) => [...prev, { speaker: "You", text: userSpeech, avatar: "👤" }]);
    setLoadingAI(true);

    try {
      const ai = await axios.post(`${import.meta.env.VITE_API_URL}/api/gd`, {
        userSpeech,
        topic,
        history,
      });

      setHistory((prev) => [
        ...prev,
        { speaker: "Agent 1", text: ai.data.agent1, avatar: "🤖" },
        { speaker: "Agent 2", text: ai.data.agent2, avatar: "🎭" },
      ]);

      speakText(ai.data.agent1);
      speakText(ai.data.agent2);
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  // Start continuous recognition. We add a small restart mechanism so browser auto-stops
  // on silence will be restarted — this ensures recognition stays ON until user presses STOP.
  const startSpeaking = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    // reset any previous
    transcriptRef.current = "";
    if (recognitionRef.current) {
      try {
        recognitionRef.current._shouldRestart = false;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    // Allow our code to restart recognition automatically onend when we still want to listen.
    recognition._shouldRestart = true;

    recognition.onresult = (e) => {
      // accumulate final transcripts to transcriptRef.current
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          // append with a space
          transcriptRef.current = (transcriptRef.current + " " + transcript).trim();
        } else {
          // interim available if you later want to show it in UI
          // const interim = transcript;
        }
      }
    };

    recognition.onerror = (ev) => {
      console.error("Speech recognition error:", ev.error);
      // don't immediately stop listening — let onend handle restart logic
    };

    recognition.onend = () => {
      // if we intend to keep listening, restart; otherwise end
      if (recognition._shouldRestart) {
        try {
          recognition.start();
        } catch (e) {
          // some browsers might throw; mark not listening
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      console.error("Failed to start recognition:", e);
      setListening(false);
    }
  };

  // STOP listening — stops recognition and then sends accumulated transcript to AI
  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    // tell the instance not to restart, then stop
    recognition._shouldRestart = false;

    try {
      recognition.stop();
    } catch (e) {
      // ignore
    }

    // small delay to let onend finish and final results settle
    setTimeout(() => {
      const final = transcriptRef.current.trim();
      if (final) {
        // send final transcript to AI
        handleUserSpeech(final);
      }
      // clear
      transcriptRef.current = "";
      recognitionRef.current = null;
      setListening(false);
    }, 250);
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
            <div
  className="flex items-center gap-3 cursor-pointer"
  onClick={() => {
    stopAllAudio();
    setStep("enter");
  }}
>
  <FaSkull className="text-3xl text-red-500 animate-pulse" />
  <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent cursor-pointer">
    GD ARENA
  </h1>
</div>


            {step === "audio" && (
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-red-900/20 hover:bg-red-900/30 transition-colors"
              >
                {isMuted ? <FaVolumeMute className="text-xl" /> : <FaVolumeUp className="text-xl" />}
              </button>
            )}
          </div>
        </header>

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
                  className="group relative px-12 py-5 text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50"
                >
                  <span className="relative z-10 cursor-pointer">ENTER PLAYGROUND</span>
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
                  className="group relative px-12 py-5 text-xl font-bold bg-gradient-to-r from-green-600 to-green-800 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50"
                >
                  <span className="relative z-10 flex items-center gap-3 cursor-pointer">
                    <FaSkull className="animate-pulse" />
                    ENTER 
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            )}

            {step === "gd" && (
              <div className="space-y-6 animate-fade-in relative">
                {/* EXIT button (right side) */}
                <div className="absolute top-6 right-6">
                  <div className="absolute top-6 right-6">
  <button
    onClick={() => {
      stopAllAudio();
      setStep("enter");
    }}
    className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-xl text-white font-bold shadow-lg transition cursor-pointer"
  >
    EXIT
  </button>
</div>

                </div>

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
    onClick={() => {
      stopAllAudio();
      setStep("enter");
    }}
    className="cursor-pointer px-6 py-3 bg-red-700 hover:bg-red-800 rounded-xl text-white font-bold shadow-lg transition"
  >
    EXIT
  </button>

  {/* AGENTS PROCESSING */}
  {loadingAI && (
    <div className="flex items-center gap-3 text-yellow-400">
      <FaSpinner className="animate-spin text-xl" />
      <span className="font-medium">AGENTS PROCESSING...</span>
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
      `}</style>
    </div>
  );
}
