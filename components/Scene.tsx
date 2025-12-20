import React from 'react';
import { PerspectiveCamera, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import { RetroSun } from './RetroSun';
import { Terrain } from './Terrain';
import { City } from './City';

// Camera Rig for Mouse Parallax
const CameraRig = () => {
    useFrame((state) => {
        const { x, y } = state.pointer;
        // Smoothly interpolate camera position based on mouse coordinates
        // This gives the feeling of looking around or piloting
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x * 4, 0.2);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 3 + y * 2, 0.2);
        
        // Always look towards the horizon/sun
        state.camera.lookAt(0, 5, -100);
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

export const Scene = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={75} />
      <CameraRig />
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.5} color="#4c1d95" /> {/* Purple ambient */}
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 10, 10]} intensity={1} color="#ff00ff" />
      
      {/* Fog - adjusted to blend the mountains and city into the distance */}
      <fog attach="fog" args={['#1a0b2e', 20, 120]} />

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