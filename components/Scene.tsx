import React from 'react';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import { RetroSun } from './RetroSun';
import { Terrain } from './Terrain';
import { City } from './City';
import { Spectrum } from './Spectrum';

// Automatic Flight Camera Rig
// Simulates a first-person aircraft flying through the scene
const FlightCameraRig = () => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        
        // Base Speed for the "waviness" of the flight
        const speed = 0.5;

        // Combine sine waves to create a pseudo-random, non-repetitive path
        // X motion (Left/Right)
        const x = Math.sin(t * speed * 0.5) * 3 
                + Math.sin(t * speed * 1.3) * 3
                + Math.cos(t * speed * 0.2) * 2;
        
        // Y motion (Up/Down) - Keeping it relatively low to the ground but with variation
        const y = 6 
                + Math.sin(t * speed * 0.7) * 3 
                + Math.cos(t * speed * 1.5) * 1;
        
        // Calculate velocity (derivative of x) to determine banking/roll angle
        // Approximation of derivative for X
        const dx = (Math.cos(t * speed * 0.5) * 0.5 * 3 
                  + Math.cos(t * speed * 1.3) * 1.3 * 3 
                  - Math.sin(t * speed * 0.2) * 0.2 * 2);

        // Add high-frequency jitter to simulate engine vibration/turbulence
        const jitterFreq = 25;
        const jitterAmp = 0.03;
        const jitterX = Math.sin(t * jitterFreq) * jitterAmp;
        const jitterY = Math.cos(t * jitterFreq * 1.2) * jitterAmp;
        const jitterRot = Math.sin(t * jitterFreq * 1.5) * (jitterAmp * 0.5);

        // Smoothly interpolate current camera position to target
        // This acts as a spring/damper system
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x + jitterX, 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, y + jitterY, 0.1);
        
        // Always look towards the horizon (Sun position is at Z -150)
        // We add a slight offset to the look target based on movement to simulate "looking into the turn"
        const lookTarget = new THREE.Vector3(
            x * 0.5, 
            y * 0.5 - 10, 
            -100
        );
        state.camera.lookAt(lookTarget);

        // Apply Roll (Banking)
        // When moving left, bank left.
        // We calculate desired roll and lerp to it for smoothness
        const targetRoll = -dx * 0.2; // Scaling factor for intensity of roll
        state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, targetRoll + jitterRot, 0.1);
    });
    return null;
}

// Speed lines component to give sense of motion
const SpeedLines = () => {
    const count = 30;
    const lines = React.useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 60,
            y: Math.random() * 20,
            z: -Math.random() * 100,
            speed: Math.random() * 0.5 + 0.5,
            length: Math.random() * 10 + 5
        }));
    }, []);

    const meshRefs = React.useRef<(THREE.Mesh | null)[]>([]);

    useFrame((state, delta) => {
        meshRefs.current.forEach((mesh, i) => {
            if (!mesh) return;
            // High speed multiplier for speed lines
            mesh.position.z += lines[i].speed * 80 * delta;
            
            if (mesh.position.z > 10) {
                mesh.position.z = -100;
                mesh.position.x = (Math.random() - 0.5) * 60;
                mesh.position.y = Math.random() * 20;
            }
        });
    });

    return (
        <group>
            {lines.map((l, i) => (
                <mesh key={i} ref={el => meshRefs.current[i] = el} position={[l.x, l.y, l.z]} rotation={[0,0,0]}>
                    <boxGeometry args={[0.2, 0.1, l.length]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
            ))}
        </group>
    )
}

interface SceneProps {
    audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export const Scene: React.FC<SceneProps> = ({ audioRef }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={75} />
      <FlightCameraRig />
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.5} color="#4c1d95" /> {/* Purple ambient */}
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 10, 10]} intensity={1} color="#ff00ff" />
      
      {/* Fog - adjusted to blend the mountains and city into the distance */}
      <fog attach="fog" args={['#1a0b2e', 20, 120]} />

      <group>
        <RetroSun />
        {/* Audio Spectrum Visualizer around the Sun */}
        <Spectrum audioRef={audioRef} />
        
        <City />
        <Terrain />
        <SpeedLines />
        <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </group>

      {/* Post Processing for the GLOW and Retro feel */}
      <EffectComposer enableNormalPass={false}>
        {/* Bloom creates the neon glow */}
        <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.6}
        />
        {/* Chromatic Aberration splits RGB channels slightly at edges */}
        <ChromaticAberration 
            offset={new THREE.Vector2(0.002, 0.002)}
            radialModulation={false}
            modulationOffset={0}
        />
        {/* Noise gives it that grainy film look */}
        <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};