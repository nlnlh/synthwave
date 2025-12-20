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
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      
      // Calculate distance from center (0.0 at center, 1.0 at edges)
      float dist = abs(uv.x - 0.5) * 2.0;
      
      // Valley Logic: Flat in the center (road), rising at edges
      // We start rising when dist > 0.4 (creating a wide path for the city)
      float elevation = 0.0;
      
      if (dist > 0.4) {
        float factor = (dist - 0.4) / 0.6; // Normalize the side slope 0..1
        elevation = pow(factor, 3.0) * 30.0; // Exponential rise for mountains
        
        // Add moving waves/noise to the mountains so they feel like they are passing by
        // We offset the sine wave by uTime to match the grid scrolling speed roughly
        float waveSpeed = 12.0;
        
        // Combine sine waves for a "digital terrain" look
        float waveZ = sin(uv.y * 10.0 + uTime * 12.0) * 2.0; 
        float waveX = cos(uv.x * 20.0) * 2.0;
        
        elevation += (waveZ + waveX) * factor; // Scale noise by height factor
      }
      
      vElevation = elevation;

      vec3 newPos = position;
      newPos.z += elevation; // Displace Z (which is vertical Y in world space after rotation)

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColorBg;
    uniform vec3 uColorCenter;
    uniform vec3 uColorEdge;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Scale UVs for grid density
      vec2 gridUv = vUv * 60.0;
      
      // Move texture to simulate speed
      gridUv.y += uTime * 12.0;

      vec2 grid = fract(gridUv);
      float lineThickness = 0.05;
      
      // Grid lines calculation
      float linesX = smoothstep(1.0 - lineThickness, 1.0, grid.x) + smoothstep(lineThickness, 0.0, grid.x);
      float linesY = smoothstep(1.0 - lineThickness, 1.0, grid.y) + smoothstep(lineThickness, 0.0, grid.y);
      float gridPattern = max(linesX, linesY);
      
      // Fade into distance
      float fade = 1.0 - smoothstep(0.0, 1.0, vUv.y); 

      // Gradient Color Logic
      float distFromCenter = abs(vUv.x - 0.5) * 2.0;
      
      // Use elevation to influence color - peaks get more intense/magenta
      float heightGlow = smoothstep(0.0, 15.0, vElevation);
      vec3 mixColor = mix(uColorCenter, uColorEdge, distFromCenter + heightGlow);

      // Final composition
      vec3 finalColor = mix(uColorBg, mixColor * 2.0, gridPattern * fade);
      
      // Slight atmospheric glow at the bottom of the mountains
      if (vElevation > 1.0) {
        finalColor += uColorEdge * 0.1 * fade;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ GridMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    gridMaterial: any
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
    // Lowered Y slightly (-4) so the road (elevation 0) sits below the buildings
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      {/* High segment count (64x64) is crucial for smooth vertex displacement */}
      <planeGeometry args={[200, 200, 64, 64]} />
      <gridMaterial ref={materialRef} />
    </mesh>
  );
};