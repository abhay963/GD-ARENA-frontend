
import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiAlertTriangle, FiUser, FiShield, FiZap, FiTarget } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGlowPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleEmailAuth = async () => {
    setError("");
    setLoading(true);
    
    if (!email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom Cursor */}
      <div 
        className="fixed w-6 h-6 pointer-events-none z-50 transition-transform duration-100"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transform: 'translate(0, 0)'
        }}
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-red-500 rounded-full opacity-50 blur-sm"></div>
          <div className="absolute inset-0 bg-red-600 rounded-full"></div>
          <div className="absolute inset-1 bg-black rounded-full"></div>
          <div className="absolute inset-2 bg-red-500 rounded-full"></div>
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden cursor-none">
        {/* Dynamic Background Layers */}
        <div className="absolute inset-0">
          {/* Moving Gradient Overlay */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-900 via-transparent to-red-900 animate-pulse"></div>
          </div>
          
          {/* Animated Orbs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-800 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-700 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Scanning Lines */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50 animate-pulse" style={{ animation: 'scan 4s linear infinite' }}></div>
          </div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, rgba(255,0,0,0.2) 0%, transparent 50%)
            `,
            backgroundSize: '50px 50px, 50px 50px, 200px 200px',
            backgroundPosition: '0 0, 0 0, 50% 50%'
          }}></div>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-lg px-4">
          {/* Glowing Border Container */}
          <div ref={containerRef} className="relative group">
            {/* Dynamic Glow Effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-3xl blur-xl opacity-60 transition-all duration-300"
              style={{
                background: `radial-gradient(600px circle at ${glowPosition.x}px ${glowPosition.y}px, rgba(255,0,0,0.4), transparent 40%)`,
              }}
            ></div>
            
            {/* Main Card */}
            <div className="relative bg-black/95 backdrop-blur-2xl border border-red-900/60 rounded-3xl p-8 shadow-2xl overflow-hidden">
              {/* Corner Decorations */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500"></div>
              
              {/* Header Section */}
              <div className="text-center mb-8 relative">
                {/* Animated Danger Symbol */}
                <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative group">
                  <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse"></div>
                  <div className="relative bg-black border-2 border-red-500 rounded-full w-20 h-20 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                    <FiTarget className="text-3xl text-red-500 animate-pulse" />
                  </div>
                  {/* Orbiting Dots */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 relative animate-spin" style={{ animationDuration: '10s' }}>
                      <div className="absolute top-0 left-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2"></div>
                      <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2"></div>
                      <div className="absolute left-0 top-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-y-1/2"></div>
                      <div className="absolute right-0 top-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-y-1/2"></div>
                    </div>
                  </div>
                </div>
                
                <h1 className="text-5xl font-black text-white mb-3 tracking-wider" style={{ 
                  textShadow: '0 0 30px rgba(255,0,0,0.8), 0 0 60px rgba(255,0,0,0.4)',
                  letterSpacing: '0.1em'
                }}>
                  GD ARENA
                </h1>
                <p className="text-red-400 text-sm font-black tracking-[0.3em] uppercase">
                  {isLogin ? "ENTER THE ARENA" : "JOIN THE GAME"}
                </p>
                
                {/* Status Indicators */}
                <div className="mt-6 flex justify-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
                    <span className="text-red-600 text-xs font-semibold tracking-wider">ACTIVE</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiShield className="text-red-600 text-xs" />
                    <span className="text-red-600 text-xs font-semibold tracking-wider">SECURED</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiZap className="text-red-600 text-xs" />
                    <span className="text-red-600 text-xs font-semibold tracking-wider">ONLINE</span>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="space-y-6">
                {/* Email Input */}
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-800/20 rounded-xl blur-lg transition-all duration-300 ${focusedField === 'email' ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}></div>
                  <div className="relative flex items-center">
                    <FiMail className={`absolute left-5 text-xl transition-all duration-300 z-10 ${focusedField === 'email' ? 'text-red-400 scale-110' : 'text-red-900'}`} />
                    <input
                      type="email"
                      className="relative w-full pl-14 pr-4 py-4 bg-black/60 border border-red-900/60 rounded-xl text-white placeholder-red-900/50 focus:outline-none focus:border-red-500 focus:bg-black/80 transition-all duration-300 z-10 font-mono text-sm"
                      placeholder="IDENTIFIER"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      disabled={loading}
                      style={{ cursor: 'none' }}
                    />
                    {email && (
                      <div className="absolute right-4 text-green-500 text-xs animate-pulse">
                        ✓
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-800/20 rounded-xl blur-lg transition-all duration-300 ${focusedField === 'password' ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}></div>
                  <div className="relative flex items-center">
                    <FiLock className={`absolute left-5 text-xl transition-all duration-300 z-10 ${focusedField === 'password' ? 'text-red-400 scale-110' : 'text-red-900'}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="relative w-full pl-14 pr-14 py-4 bg-black/60 border border-red-900/60 rounded-xl text-white placeholder-red-900/50 focus:outline-none focus:border-red-500 focus:bg-black/80 transition-all duration-300 z-10 font-mono text-sm"
                      placeholder="ACCESS CODE"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      disabled={loading}
                      style={{ cursor: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 text-red-900 hover:text-red-400 transition-all duration-300 z-10 hover:scale-110"
                      disabled={loading}
                      style={{ cursor: 'none' }}
                    >
                      {showPassword ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center space-x-3 p-4 bg-red-900/20 border border-red-800/60 rounded-xl backdrop-blur-sm animate-pulse">
                    <FiAlertTriangle className="text-red-500 text-xl flex-shrink-0 animate-pulse" />
                    <p className="text-red-400 text-sm font-bold tracking-wide">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleEmailAuth}
                  disabled={loading}
                  className="relative w-full py-5 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-black text-xl rounded-xl shadow-2xl hover:shadow-red-600/70 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group overflow-hidden"
                  style={{ cursor: 'none' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center space-x-3 tracking-widest">
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin text-2xl" />
                        <span>{isLogin ? "AUTHENTICATING..." : "INITIATING..."}</span>
                      </>
                    ) : (
                      <>
                        <FiTarget className="text-xl" />
                        <span>{isLogin ? "EXECUTE ENTRY" : "ACCEPT CONTRACT"}</span>
                      </>
                    )}
                  </span>
                </button>

                {/* Enhanced Divider */}
                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-red-900/40"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-black text-red-900 font-black tracking-widest text-[10px]">EXTERNAL ACCESS</span>
                  </div>
                </div>

                {/* Google Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="relative w-full py-4 bg-black/60 border border-red-900/60 text-red-400 font-black text-lg rounded-xl hover:bg-black/80 hover:border-red-500/60 hover:text-red-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 group overflow-hidden"
                  style={{ cursor: 'none' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <FcGoogle className="text-2xl" />
                  <span className="tracking-wider">GOOGLE AUTH</span>
                </button>

                {/* Switch Auth Mode */}
                <div className="text-center pt-6 border-t border-red-900/40">
                  <p className="text-red-900/80 text-sm font-bold">
                    {isLogin ? "NO ACCESS?" : "ALREADY REGISTERED?"}{" "}
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError("");
                      }}
                      className="text-red-500 hover:text-red-400 font-black uppercase tracking-wider transition-all duration-300 hover:scale-110 inline-block"
                      disabled={loading}
                      style={{ cursor: 'none' }}
                    >
                      {isLogin ? "JOIN →" : "ENTER →"}
                    </button>
                  </p>
                </div>
              </div>

              {/* Enhanced Warning Footer */}
              <div className="mt-8 pt-6 border-t border-red-900/40">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-center text-red-900/80 text-xs font-black tracking-widest uppercase">
                    WARNING: HIGH-STAKES ENVIRONMENT
                  </p>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-center text-red-900/50 text-xs font-semibold">
                  Entry constitutes binding agreement to terms & conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </>
  );
}