import React, { Suspense, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';

const App = () => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStart = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
      setAudioPlaying(true);
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
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* Retro Scanline Overlay */}
      <div className="scanlines pointer-events-none"></div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-12 pointer-events-none">
        
        {/* Header */}
        <header className="text-center space-y-2">
            <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-pink-500 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                GLITCH RESET
            </h1>
            <p className="text-pink-300 tracking-[0.5em] text-lg md:text-xl uppercase drop-shadow-md" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                Blaze Factory
            </p>
        </header>

        {/* Start Button Area (Pointer events re-enabled for button) */}
        {!audioPlaying && (
            <div className="pointer-events-auto">
                <button 
                    onClick={handleStart}
                    className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-md transition-all duration-300 hover:scale-105"
                >
                    <div className="absolute inset-0 border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)] group-hover:shadow-[0_0_25px_rgba(0,255,255,0.8)] transition-shadow duration-300"></div>
                    <div className="absolute inset-0 bg-cyan-900/20 group-hover:bg-cyan-800/40 transition-colors duration-300"></div>
                    <span className="relative text-cyan-300 font-bold tracking-widest text-xl group-hover:text-white transition-colors" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                        ENTER WORLD
                    </span>
                </button>
            </div>
        )}

        {/* Footer */}
        <footer className="text-center">
            <div className="flex items-center space-x-4 text-xs text-pink-500/80 font-mono">
                <span>CYBERPUNK.SYS</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                <span>ONLINE</span>
            </div>
        </footer>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} loop>
        <source src="/musics/background.mp3" type="audio/mpeg" />
      </audio>

      {/* Vignette Overlay (CSS fallback) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-10"></div>
    </div>
  );
};

export default App;
