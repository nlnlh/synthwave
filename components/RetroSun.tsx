import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// Define the shader material
const SunMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorA: new THREE.Color('#ff00cc'), // Hot Pink
    uColorB: new THREE.Color('#ffcc00'), // Yellow
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
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      
      // Add a wave effect that moves downwards
      // We distort the Y coordinate used for color mixing and stripes
      float wave = sin(uv.y * 10.0 - uTime * 2.0) * 0.05;
      float distortedY = uv.y + wave;

      // Create the gradient with the distorted Y
      vec3 color = mix(uColorA, uColorB, distortedY);
      
      // Calculate stripes
      float y = uv.y;
      float stripeCount = 25.0;
      float stripeSpeed = 0.8;
      
      // Deform the grid slightly for style
      float pos = y * stripeCount - uTime * stripeSpeed;
      
      // Step function to create the cuts
      float intensity = step(0.5 * (1.0 - y), sin(pos * 3.14159));
      
      // The sun is solid at the very top (above 0.5)
      if (y > 0.5) intensity = 1.0;

      // Add a pulsing glow overlay that moves down
      float pulse = sin(uv.y * 20.0 - uTime * 5.0) * 0.5 + 0.5;
      color += pulse * 0.1 * uColorB; // Add a bit of yellow pulse
      
      vec4 finalColor = vec4(color, intensity);
      
      // Cut holes for stripes
      if (intensity < 0.1) discard;

      gl_FragColor = finalColor;
    }
  `
);

extend({ SunMaterial });

// Add type definition for the custom element
declare module '@react-three/fiber' {
  interface ThreeElements {
    sunMaterial: any
  }
}

export const RetroSun = () => {
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  // Increased radius from 25 to 55, pushed Z back to -150
  return (
    <mesh position={[0, 25, -150]}>
      <circleGeometry args={[55, 64]} />
      <sunMaterial ref={materialRef} transparent side={THREE.DoubleSide} />
    </mesh>
  );
};