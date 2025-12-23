import React, { Suspense, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { CommsSystem } from './components/CommsSystem';

const App = () => {
  // isEntered controls whether we are in the "Game/Simulation" mode or the "Title" mode
  const [isEntered, setIsEntered] = useState(false);
  
  // Audio State
  const [audioSrc, setAudioSrc] = useState("https://raw.githubusercontent.com/nlnlh/synthwave/master/musics/background.mp3");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStart = () => {
    if (audioRef.current) {
      // Resume AudioContext if it exists on the element (handled in Spectrum)
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
      setIsEntered(true);
    }
  };

  const handleExit = () => {
      setIsEntered(false);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          // Reset volume just in case it was ducked
          audioRef.current.volume = 1.0; 
      }
  };

  return (
    <div className="relative w-full h-full bg-[#1a0b2e]">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
            dpr={[1, 2]} // Handle pixel ratio
            gl={{ 
                antialias: false, // Turn off native antialias for better post-processing performance
                powerPreference: "high-performance" 
            }} 
        >
          <Suspense fallback={null}>
            <Scene audioRef={audioRef} />
          </Suspense>
        </Canvas>
      </div>

      {/* Retro Scanline Overlay */}
      <div className="scanlines pointer-events-none"></div>

      {/* COMMS SYSTEM (HUD) - Rendered when Entered */}
      {isEntered && (
          <CommsSystem 
            audioRef={audioRef} 
            onExit={handleExit}
            setAudioSrc={setAudioSrc}
          />
      )}

      {/* TITLE SCREEN UI - Rendered when NOT Entered */}
      {!isEntered && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-12 pointer-events-none transition-opacity duration-1000">
            
            {/* Header */}
            <header className="text-center space-y-2 animate-fade-in-down">
                <h1 className="text-4xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-pink-500 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                    GLITCH RESET
                </h1>
                <p className="text-pink-300 tracking-[0.5em] text-sm md:text-xl uppercase drop-shadow-md" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                    Blaze Factory
                </p>
            </header>

            {/* Start Button Area (Pointer events re-enabled for button) */}
            <div className="pointer-events-auto">
                <button 
                    onClick={handleStart}
                    className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-md transition-all duration-300 hover:scale-105"
                >
                    <div className="absolute inset-0 border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)] group-hover:shadow-[0_0_25px_rgba(0,255,255,0.8)] transition-shadow duration-300"></div>
                    <div className="absolute inset-0 bg-cyan-900/20 group-hover:bg-cyan-800/40 transition-colors duration-300"></div>
                    <span className="relative text-cyan-300 font-bold tracking-widest text-sm md:text-xl group-hover:text-white transition-colors" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                        ENTER WORLD
                    </span>
                </button>
            </div>

            {/* Footer */}
            <footer className="text-center animate-fade-in-up">
                <div className="flex items-center space-x-4 text-[10px] md:text-xs text-pink-500/80 font-mono">
                    <span>CYBERPUNK.SYS</span>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                    <span>XIN ONLINE</span>
                </div>
            </footer>
        </div>
      )}

      {/* Hidden Audio Element */}
      {/* crossOrigin="anonymous" is crucial for Web Audio API (Spectrum) */}
      <audio ref={audioRef} loop crossOrigin="anonymous" src={audioSrc}></audio>

      {/* Vignette Overlay (CSS fallback) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-10"></div>
    </div>
  );
};

export default App;