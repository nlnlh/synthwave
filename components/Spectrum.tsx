import React, { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SpectrumProps {
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const Spectrum: React.FC<SpectrumProps> = ({ audioRef }) => {
  const count = 16;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geomRef = useRef<THREE.BoxGeometry>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // Reusable objects for frame loops
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const colorA = useMemo(() => new THREE.Color('#00ffff'), []); // Cyan
  const colorB = useMemo(() => new THREE.Color('#ff00ff'), []); // Magenta

  useEffect(() => {
    // Cast to any to attach custom properties safely without extending HTMLAudioElement type globally
    const audioEl = audioRef?.current as any;
    if (!audioEl) return;

    let analyser = audioEl.__analyser as AnalyserNode;
    let ctx = audioEl.__audioContext as AudioContext;

    // Initialize AudioContext if not already present on the element
    if (!analyser) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContext();
        
        // Connect to the audio element
        const source = ctx.createMediaElementSource(audioEl);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 32; // resulting frequencyBinCount will be 32
        
        source.connect(analyser);
        analyser.connect(ctx.destination); // Connect back to speakers
        
        // Store on the element to persist across re-renders/HMR
        audioEl.__analyser = analyser;
        audioEl.__audioContext = ctx;
      } catch (e) {
        console.warn("Audio Context init failed or already connected:", e);
        // Attempt to recover if it was already connected but references lost (rare)
        if (!analyser && audioEl.__analyser) {
            analyser = audioEl.__analyser;
            ctx = audioEl.__audioContext;
        }
      }
    }

    if (analyser) {
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    // Ensure context is running when audio plays
    const handlePlay = () => {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Could not resume audio context:", e));
      }
    };

    // If already playing, try to resume immediately
    if (!audioEl.paused) {
        handlePlay();
    }

    audioEl.addEventListener('play', handlePlay);
    return () => {
      audioEl.removeEventListener('play', handlePlay);
    };
  }, [audioRef]);

  useLayoutEffect(() => {
    if (geomRef.current) {
        // Shift pivot to bottom
        geomRef.current.translate(0, 0.5, 0);
    }
  }, []);

  useFrame(() => {
    if (!meshRef.current || !analyserRef.current || !dataArrayRef.current) return;

    // Get current frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Config matches the RetroSun position
    const center = new THREE.Vector3(0, 25, -150);
    const baseRadius = 65; // Just outside the sun (radius 55)

    for (let i = 0; i < count; i++) {
      // Get intensity (0-1)
      const data = dataArrayRef.current[i];
      const intensity = data / 100.0 - 1.2;
      
      // Calculate scale - ensure a minimum visibility
      const scaleY = Math.max(0, intensity * 40); 
      
      // Calculate position around circle
      const angle = (i / count) * Math.PI * 2;
      
      const x = center.x + Math.cos(angle) * baseRadius;
      const y = center.y + Math.sin(angle) * baseRadius;
      const z = center.z;

      dummy.position.set(x, y, z);
      
      // Rotate to point outwards from center
      // Subtract PI/2 because default box points up (Y), we want Y to point radially outward
      dummy.rotation.set(0, 0, angle - Math.PI / 2);
      
      // Scale: X=width, Y=length, Z=depth
      const width = (2 * Math.PI * baseRadius) / count * 0.5; 
      dummy.scale.set(width, scaleY, 1);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Dynamic Color: Cyan (low) -> Magenta (high)
      color.copy(colorA).lerp(colorB, intensity * intensity * 1.2); 
      meshRef.current.setColorAt(i, color);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* BoxGeometry with pivot at bottom (y=0 after translate) so it grows outwards */}
      <boxGeometry ref={geomRef} args={[1, 1, 1]} />
      {/* Basic material ensures bright neon colors unaffected by lighting, works well with bloom */}
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};