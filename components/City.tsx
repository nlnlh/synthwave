import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend, Object3DNode } from '@react-three/fiber';
import { shaderMaterial, Edges } from '@react-three/drei';

// Custom Building Shader to handle Z-depth fading and vertical gradient
const BuildingMaterial = shaderMaterial(
    {
        uTime: 0,
        uColorBase: new THREE.Color('#1a0b2e'), // Dark purple base
        uColorTop: new THREE.Color('#3b0764'),  // Lighter purple top
        uFadeZ: -140.0, // Point where opacity is 0 (Horizon)
        uVisibleZ: -80.0, // Point where opacity is 1
    },
    // Vertex Shader
    `
      varying vec2 vUv;
      varying float vZ;
      varying float vY;
      void main() {
        vUv = uv;
        
        // Calculate world position to determine Z depth
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vZ = worldPosition.z;
        vY = position.y; // Local Y for vertical gradient
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    // Fragment Shader
    `
      uniform vec3 uColorBase;
      uniform vec3 uColorTop;
      uniform float uFadeZ;
      uniform float uVisibleZ;
      
      varying vec2 vUv;
      varying float vZ;
      varying float vY;
  
      void main() {
        // Vertical gradient on the building itself
        // Assumes typical building height is around 5-20 units, mapped roughly 0 to 1
        float heightFactor = smoothstep(0.0, 15.0, vY);
        vec3 color = mix(uColorBase, uColorTop, heightFactor);
  
        // Horizon Fade Logic
        // Calculate opacity based on Z position
        // vZ goes from negative (far) to positive (near)
        // fade range: uFadeZ (-150) to uVisibleZ (-100)
        float alpha = smoothstep(uFadeZ, uVisibleZ, vZ);
  
        gl_FragColor = vec4(color, alpha);
      }
    `
  );
  
  extend({ BuildingMaterial });
  
  declare module '@react-three/fiber' {
    interface ThreeElements {
      buildingMaterial: Object3DNode<THREE.ShaderMaterial, typeof BuildingMaterial>
    }
  }

// Helper to generate random buildings
const generateBuildings = (count: number) => {
  const buildings = [];
  const roadWidth = 10;
  
  for (let i = 0; i < count; i++) {
    // Determine side of the road (-1 left, 1 right)
    const side = Math.random() > 0.5 ? 1 : -1;
    
    // Position
    const x = side * (roadWidth / 2 + Math.random() * 30 + 5); // Wider spread
    // Initial spread matches the loop logic below
    const z = -Math.random() * 160; 
    
    // Dimensions
    const width = Math.random() * 4 + 2;
    const depth = Math.random() * 4 + 2;
    const height = Math.random() * 20 + 5;
    
    // Edge Colors
    const isCyan = Math.random() > 0.5;
    const edgeColor = isCyan ? '#00ffff' : '#ff00ff';

    buildings.push({
      position: [x, height / 2 - 2, z] as [number, number, number],
      args: [width, height, depth] as [number, number, number],
      edgeColor,
    });
  }
  
  return buildings;
};

export const City = () => {
  // Use more buildings for denser high-speed effect
  const buildingsData = useMemo(() => generateBuildings(120), []);
  const buildingRefs = useRef<(THREE.Mesh | null)[]>([]);
  // We need refs for materials to update uniforms if we wanted (e.g. pulsing colors), 
  // but currently shader uniforms are static or world-pos dependent.

  useFrame((state, delta) => {
    // High Speed Flight: 30 units/second
    const speed = 30.0;
    const respawnZ = -150; // Just at/behind the sun position

    buildingRefs.current.forEach((mesh) => {
      if (!mesh) return;

      // Move building towards camera (positive Z)
      mesh.position.z += speed * delta;

      // Reset when it passes the camera 
      if (mesh.position.z > 20) {
        // Send back to horizon
        mesh.position.z = respawnZ;
        
        // Randomize X again for variety
        const roadWidth = 10;
        const side = Math.random() > 0.5 ? 1 : -1;
        mesh.position.x = side * (roadWidth / 2 + Math.random() * 30 + 5);
      }
    });
  });

  return (
    <group>
      {buildingsData.map((b, i) => (
        <mesh 
            key={i} 
            ref={(el) => (buildingRefs.current[i] = el)}
            position={b.position}
        >
          <boxGeometry args={b.args} />
          
          {/* Custom Shader Material that fades out at the horizon */}
          <buildingMaterial transparent />
          
          {/* Glowing Edges - Note: Edges don't support custom opacity easily without custom shaders too, 
              but they will be obscured by the main mesh transparency or distance fog eventually. 
              To make edges fade perfectly, we'd need a custom Line material, but standard fog usually handles Edges well enough.
          */}
          <Edges 
            scale={1.0} 
            threshold={15} 
            color={b.edgeColor}
          />
        </mesh>
      ))}
    </group>
  );
};