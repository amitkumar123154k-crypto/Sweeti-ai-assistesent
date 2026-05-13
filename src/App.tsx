import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2 } from "lucide-react";
import { getSweetiResponse, getSweetiAudio, resetSweetiSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "sweeti";
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("sweeti_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("sweeti_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    // If live session is active, send text through it
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");

    // 1. Check for browser commands
    const commandResult = processCommand(finalTranscript);

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "sweeti", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getSweetiAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }

      setAppState("idle");

      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      // 2. General Chit-Chat via Gemini
      responseText = await getSweetiResponse(finalTranscript, messagesRef.current);
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "sweeti", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        const audioBase64 = await getSweetiAudio(responseText);
        if (audioBase64) {
          await playPCM(audioBase64);
        }
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetSweetiSession();
    } else {
      try {
        setIsSessionActive(true);
        resetSweetiSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        
        session.onCommand = (url) => {
          setTimeout(() => {
            window.open(url, "_blank");
          }, 1000);
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050203] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => setShowPermissionModal(false)} 
        />
      )}

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-900/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-900/10 blur-[130px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-900/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-6 md:px-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-rose-500/20">
            S
          </div>
          <h1 className="text-2xl font-serif font-bold italic tracking-wider text-white/90 drop-shadow-sm">Sweeti</h1>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear the chat history?")) {
                  setMessages([]);
                  resetSweetiSession();
                }
              }}
              className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10 glass"
              title="Clear Chat History"
            >
              <Trash2 size={20} className="opacity-70" />
            </button>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10 glass"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX size={20} className="opacity-70" />
            ) : (
              <Volume2 size={20} className="opacity-70" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Visualizer & Chat */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-24 pb-28 px-4 md:px-12 pointer-events-none">
        
        {/* Left Column: Sweeti Status */}
        <div className="flex w-[35%] lg:w-[30%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-10">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="flex items-center gap-3 text-amber-300 font-serif text-lg md:text-xl italic drop-shadow-md"
                >
                  <Loader2 size={20} className="animate-spin" />
                  Thinking...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Visualizer */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} />
        </div>

        {/* Right Column: User Status */}
        <div className="flex w-[35%] lg:w-[30%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-10 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="flex items-center gap-3 text-rose-300 font-serif text-lg md:text-xl italic drop-shadow-md"
                >
                  <div className="w-3 h-3 rounded-full bg-rose-400 animate-pulse shadow-[0_0_10px_rgba(244,114,182,0.6)]" />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* Controls */}
      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-10 md:pb-12 z-30 shrink-0 gap-6">
        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-lg flex items-center gap-3 bg-black/60 border border-white/10 rounded-2xl p-2 pl-6 backdrop-blur-2xl shadow-2xl"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Talk to Sweeti..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-base py-2"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-3 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 disabled:opacity-30 disabled:grayscale transition-all shadow-lg"
              >
                <Send size={18} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-6">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-4 px-10 py-5 rounded-full font-semibold tracking-wider transition-all duration-500 shadow-2xl overflow-hidden
              ${
                isSessionActive
                  ? "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                  : "bg-white/5 text-white border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/5 hover:scale-105"
              }
            `}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${isSessionActive ? 'from-red-500/0 via-red-500/5 to-red-500/0' : 'from-rose-500/0 via-rose-500/10 to-rose-500/0'} -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />
            {isSessionActive ? (
              <>
                <MicOff size={22} className="relative z-10" />
                <span className="relative z-10 uppercase text-sm">Stop Session</span>
              </>
            ) : (
              <>
                <Mic size={22} className="relative z-10 group-hover:animate-bounce" />
                <span className="relative z-10 uppercase text-sm">Start Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-5 rounded-full bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-2xl glass"
              title="Type instead"
            >
              <Keyboard size={22} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
