import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

const GridMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorBg: new THREE.Color('#120024'), // Dark purple bg
    uColorCenter: new THREE.Color('#00ffff'), // Cyan center
    uColorEdge: new THREE.Color('#ff00ff'),   // Magenta edges
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColorBg;
    uniform vec3 uColorCenter;
    uniform vec3 uColorEdge;
    varying vec2 vUv;

    void main() {
      // Create a moving coordinate system
      // Scale UVs up to create grid cells
      vec2 gridUv = vUv * 40.0;
      
      // Move the Z (y in UV terms here) towards camera
      // Increased speed from 2.0 to 12.0 for high speed flight
      gridUv.y += uTime * 12.0;

      // Calculate grid lines
      vec2 grid = fract(gridUv);
      float lineThickness = 0.05;
      
      // Smoothstep for slightly softer glowing lines
      float linesX = smoothstep(1.0 - lineThickness, 1.0, grid.x) + smoothstep(lineThickness, 0.0, grid.x);
      float linesY = smoothstep(1.0 - lineThickness, 1.0, grid.y) + smoothstep(lineThickness, 0.0, grid.y);
      float gridPattern = max(linesX, linesY);
      
      // Distance fade
      float fade = 1.0 - smoothstep(0.0, 1.0, vUv.y); 

      // Gradient Logic: Mix Cyan (center) to Magenta (edges)
      // vUv.x goes from 0 to 1. Center is 0.5.
      float distFromCenter = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges
      vec3 gridColor = mix(uColorCenter, uColorEdge, distFromCenter);

      // Apply grid pattern
      vec3 finalColor = mix(uColorBg, gridColor, gridPattern * fade);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ GridMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      gridMaterial: any;
    }
  }
}

export const Terrain = () => {
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[100, 100, 1, 1]} />
      <gridMaterial ref={materialRef} />
    </mesh>
  );
};