import React, { useState, useEffect, useRef } from 'react';
import OpenAI from 'openai';

interface CommsSystemProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onExit: () => void;
  setAudioSrc: (src: string) => void;
}

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

// Default system prompt
const DEFAULT_PROMPT = "你是芯，一架高速赛博喷气式飞机的AI机载导航员。我们目前正以 2 马赫的速度在城市中巡航。回复要简洁、冷静，带点机械感但能提供帮助，且具策略性。回复最多 3 句话。";

export const CommsSystem: React.FC<CommsSystemProps> = ({ audioRef, onExit, setAudioSrc }) => {
  // UI Visibility States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false); // Default OFF as requested
  
  // Audio State
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  
  // AI/Chat States
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [imgError, setImgError] = useState(false);
  
  // AI Configuration States
  const [apiKey, setApiKey] = useState(process.env.OPENAI_API_KEY || "");
  const [baseURL, setBaseURL] = useState("https://api.siliconflow.cn/v1");
  const [model, setModel] = useState("deepseek-ai/DeepSeek-V3.2");

  // Refs for stable access inside callbacks (avoids stale closures)
  const recognitionRef = useRef<any>(null);
  const transcriptionRef = useRef(""); 
  const isAiEnabledRef = useRef(isAiEnabled);
  const handleSendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  // Sync refs with state
  useEffect(() => { isAiEnabledRef.current = isAiEnabled; }, [isAiEnabled]);
  useEffect(() => { transcriptionRef.current = transcription; }, [transcription]);

  // --- Audio Ducking Logic ---
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Target volume: 0.1 (-20dB approx) when listening, 1.0 when not
    const targetVolume = isListening ? 0.1 : 1.0;
    
    // Simple smooth transition
    const fadeAudio = setInterval(() => {
        if (!audioRef.current) return clearInterval(fadeAudio);
        
        const current = audioRef.current.volume;
        if (Math.abs(current - targetVolume) < 0.05) {
            audioRef.current.volume = targetVolume;
            clearInterval(fadeAudio);
        } else {
            // Lerp volume
            audioRef.current.volume = current + (targetVolume - current) * 0.1;
        }
    }, 50);

    return () => clearInterval(fadeAudio);
  }, [isListening, audioRef]);


  // --- API Call ---
  const handleSendMessage = async (text: string) => {
    if (isProcessing) return;

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', text }]);
    setTranscription(""); 
    transcriptionRef.current = "";
    setIsProcessing(true);

    try {
      const ai = new OpenAI({ apiKey: apiKey , baseURL: baseURL , dangerouslyAllowBrowser: true });
      
      // Build history for context
      const history = messages.slice(-6).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const response = await ai.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: text }],
        max_tokens: 100,
      });

      const aiText = response.choices[0].message.content || "...Signal Lost...";
      setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      console.error("AI Comms Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: "ERR: ENCRYPTION_FAIL" }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Keep the latest handler in a ref so onend can call it
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }); // Update on every render

  // --- Speech Recognition Setup ---
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one sentence
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setIsListening(true);
        transcriptionRef.current = ""; // Reset internal ref
      };
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        // Update state for UI
        setTranscription(transcript);
        // Update ref for logic
        transcriptionRef.current = transcript;
      };

      recognition.onend = () => {
        setIsListening(false);
        // Use Refs to get latest values without stale closures
        const text = transcriptionRef.current;
        if (text.trim().length > 0 && isAiEnabledRef.current) {
             handleSendMessageRef.current(text);
        }
      };

      recognitionRef.current = recognition;
    }
    
    // Cleanup
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []); // Run ONCE on mount

  const toggleListening = () => {
    if (!isAiEnabled) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscription("");
      transcriptionRef.current = "";
      recognitionRef.current?.start();
    }
  };


  // --- System Controls ---
  const handleMusicToggle = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setTimeout(() => {
          if (audioRef.current) {
              audioRef.current.play();
              setIsMusicPlaying(true);
          }
      }, 200);
    }
  };

  // --- Display Logic ---
  // Determine what text to show in the dialog box
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  
  let displayText = "";
  let displayRole = "system";

  if (isListening && transcription) {
      displayText = transcription + "...";
      displayRole = "user";
  } else if (isProcessing && lastMessage?.role === 'user') {
      displayText = lastMessage.text;
      displayRole = "user";
  } else if (lastMessage) {
      displayText = lastMessage.text;
      displayRole = lastMessage.role;
  } else {
      displayText = "COMMS LINK ESTABLISHED.";
      displayRole = "assistant";
  }

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between">
      
      {/* 1. TOP LEFT: SMALL SETTINGS BUTTON */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="group w-10 h-10 flex items-center justify-center border border-cyan-500/50 bg-black/40 rounded-sm hover:bg-cyan-900/40 transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)]"
            title="Open Config"
        >
             {/* Gear Icon */}
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-300 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
      </div>

      {/* Spacer to push content down */}
      <div className="flex-grow"></div>

      {/* 2. BOTTOM CENTER: AI INTERFACE (NOVEL STYLE) */}
      {/* Only visible if enabled in settings */}
      {isAiEnabled && (
        <div className="relative w-full flex flex-col items-center justify-end pb-8 pointer-events-auto">
             
            {/* The Dialog Box */}
            <div className={`
                w-[90%] md:w-[600px] min-h-[120px] bg-black/80 border-2 
                backdrop-blur-md rounded-lg p-6 mb-4
                shadow-[0_0_20px_rgba(0,255,255,0.15)]
                flex flex-col gap-2 transition-colors duration-300
                ${displayRole === 'user' ? 'border-cyan-500/60' : 'border-pink-500/60'}
            `}>
                {/* Header / Name Tag */}
                <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
                    <span className={`font-['Press_Start_2P'] text-xs ${displayRole === 'user' ? 'text-cyan-400' : 'text-pink-400'}`}>
                        {displayRole === 'user' ? 'PILOT [YOU]' : 'NAV [XIN]'}
                    </span>
                    {isProcessing && <span className="text-xs text-white animate-pulse">COMPUTING...</span>}
                    {isListening && <span className="text-xs text-red-500 animate-pulse">● REC -20dB</span>}
                </div>

                {/* Text Content */}
                <p className="font-['Rajdhani'] font-medium text-lg md:text-xl text-white leading-relaxed drop-shadow-sm">
                    {displayText}
                    <span className="animate-pulse inline-block ml-1">_</span>
                </p>
            </div>

            {/* The Avatar & Mic Trigger */}
            <div className="relative group cursor-pointer" onClick={toggleListening}>
                 {/* Avatar Frame */}
                 <div className={`
                    w-20 h-20 md:w-24 md:h-24 rounded-full border-2 overflow-hidden bg-black
                    transition-all duration-300 z-10 relative
                    ${isListening ? 'border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.5)] scale-110' : 'border-pink-500 shadow-[0_0_15px_rgba(255,0,255,0.4)] group-hover:border-white'}
                 `}>
                    {!imgError ? (
                        <img 
                            src="https://raw.githubusercontent.com/nlnlh/synthwave/master/musics/profile.png" 
                            onError={() => setImgError(true)}
                            className={`w-full h-full object-cover ${isListening ? 'opacity-50' : 'opacity-100'}`}
                            alt="AI Avatar"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-pink-900/20 text-[10px] text-pink-300 font-mono">Xin</div>
                    )}
                 </div>

                 {/* Mic Icon Overlay (On Hover or Active) */}
                 <div className={`
                    absolute inset-0 flex items-center justify-center rounded-full z-20 transition-opacity duration-300
                    ${isListening ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                 `}>
                     <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isListening ? 'text-red-500' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                     </div>
                 </div>

                 {/* Connection Lines (Decoration) */}
                 <div className="absolute top-1/2 left-full w-24 h-[2px] bg-gradient-to-r from-pink-500/50 to-transparent -z-10 hidden md:block"></div>
                 <div className="absolute top-1/2 right-full w-24 h-[2px] bg-gradient-to-l from-pink-500/50 to-transparent -z-10 hidden md:block"></div>
            </div>
            
            <div className="mt-2 text-[10px] text-cyan-500/60 font-mono">
                {isListening ? "LISTENING..." : "CLICK AVATAR TO SPEAK"}
            </div>

        </div>
      )}


      {/* 3. SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto z-50 animate-fade-in">
            <div className="w-[90%] max-w-md bg-[#120520] border border-cyan-500 p-6 shadow-[0_0_50px_rgba(0,255,255,0.2)] relative">
                
                {/* Header */}
                <h2 className="text-xl text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-pink-500 font-['Press_Start_2P'] mb-6">
                    SYSTEM CONFIG
                </h2>

                <div className="space-y-6 font-['Rajdhani'] text-cyan-100">
                    
                    {/* Toggle AI */}
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-white">AI COMMS LINK</span>
                            <span className="text-xs text-cyan-400">Voice Interface Module</span>
                        </div>
                        <button 
                            onClick={() => setIsAiEnabled(!isAiEnabled)}
                            className={`px-4 py-1 font-mono text-xs border transition-all ${isAiEnabled ? 'border-green-400 text-green-400 bg-green-900/20 shadow-[0_0_10px_rgba(74,222,128,0.3)]' : 'border-gray-600 text-gray-500'}`}
                        >
                            {isAiEnabled ? "ONLINE" : "OFFLINE"}
                        </button>
                    </div>

                    {/* AI Configuration */}
                    {isAiEnabled && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-1">
                                <label className="text-xs text-pink-400 font-bold uppercase tracking-wider">API Key</label>
                                <input 
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-black/50 border border-pink-900/50 text-sm p-2 text-pink-100 focus:border-pink-500 focus:outline-none"
                                    placeholder="Enter API key..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-pink-400 font-bold uppercase tracking-wider">Base URL</label>
                                <input 
                                    type="text"
                                    value={baseURL}
                                    onChange={(e) => setBaseURL(e.target.value)}
                                    className="w-full bg-black/50 border border-pink-900/50 text-sm p-2 text-pink-100 focus:border-pink-500 focus:outline-none"
                                    placeholder="Enter base URL..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-pink-400 font-bold uppercase tracking-wider">Model</label>
                                <input 
                                    type="text"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full bg-black/50 border border-pink-900/50 text-sm p-2 text-pink-100 focus:border-pink-500 focus:outline-none"
                                    placeholder="Enter model name..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-pink-400 font-bold uppercase tracking-wider">Persona Protocol</label>
                                <textarea 
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="w-full h-20 bg-black/50 border border-pink-900/50 text-sm p-2 text-pink-100 focus:border-pink-500 focus:outline-none resize-none"
                                    placeholder="Define AI behavior..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Audio Controls */}
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-lg text-white">AUDIO DECK</span>
                            <button 
                                onClick={handleMusicToggle}
                                className={`w-8 h-8 flex items-center justify-center border rounded-full transition-colors ${isMusicPlaying ? 'border-cyan-400 text-cyan-400' : 'border-red-500 text-red-500'}`}
                            >
                                {isMusicPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                                )}
                            </button>
                        </div>
                        
                        <div className="relative group">
                             <div className="absolute inset-0 bg-cyan-900/10 border border-cyan-800 border-dashed rounded pointer-events-none"></div>
                             <input 
                                type="file" 
                                accept="audio/*"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-gray-400
                                file:mr-4 file:py-3 file:px-4
                                file:rounded-l-sm file:border-0
                                file:text-xs file:font-bold
                                file:bg-cyan-900/40 file:text-cyan-300
                                hover:file:bg-cyan-800/60 cursor-pointer p-1"
                             />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex gap-3">
                    <button 
                        onClick={onExit}
                        className="flex-1 py-3 border border-red-500/40 text-red-400 bg-red-900/10 font-['Press_Start_2P'] text-[10px] hover:bg-red-900/30 hover:border-red-500 transition-all"
                    >
                        SYSTEM RESET
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="flex-1 py-3 border border-cyan-500 text-cyan-300 bg-cyan-900/20 font-['Press_Start_2P'] text-[10px] hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
                    >
                        RESUME
                    </button>
                </div>

                {/* Decorative Corners */}
                <div className="absolute top-[-1px] left-[-1px] w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                <div className="absolute top-[-1px] right-[-1px] w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
                <div className="absolute bottom-[-1px] left-[-1px] w-4 h-4 border-b-2 border-l-2 border-pink-500"></div>
                <div className="absolute bottom-[-1px] right-[-1px] w-4 h-4 border-b-2 border-r-2 border-pink-500"></div>
            </div>
        </div>
      )}
    </div>
  );
};