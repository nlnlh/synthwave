import React from 'react';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import { RetroSun } from './RetroSun';
import { Terrain } from './Terrain';
import { City } from './City';

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
            mesh.position.z += lines[i].speed * 40 * delta;
            
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

export const Scene = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={75} />
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.5} color="#4c1d95" /> {/* Purple ambient */}
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 10, 10]} intensity={1} color="#ff00ff" />
      
      {/* Fog - adjusted to start further out and end before the sun (-150) so sun shines through, 
          but buildings fade out. Camera is at +8. Distance to sun is ~158.
          We want fog to cover the "pop in" point of buildings at -150.
      */}
      <fog attach="fog" args={['#1a0b2e', 30, 140]} />

      <group>
        <RetroSun />
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