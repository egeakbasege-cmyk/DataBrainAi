'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere, Environment } from '@react-three/drei'
import { useRef } from 'react'
import type * as THREE from 'three'

function LiquidSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.x = t * 0.08
    meshRef.current.rotation.y = t * 0.12
    // Slow drift up/down
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.15
  })

  return (
    <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={1.6} position={[2.5, -0.5, -3]}>
      <MeshDistortMaterial
        color="#F8FAFC"
        envMapIntensity={2}
        clearcoat={1}
        clearcoatRoughness={0.05}
        metalness={0.5}
        roughness={0.08}
        distort={0.35}
        speed={1.2}
      />
    </Sphere>
  )
}

function SecondaryOrb() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.x = -t * 0.06
    meshRef.current.rotation.z = t * 0.1
    meshRef.current.position.y = Math.sin(t * 0.3 + 1.2) * 0.1
  })

  return (
    <Sphere ref={meshRef} args={[0.8, 48, 48]} scale={1} position={[-3, 1, -4]}>
      <MeshDistortMaterial
        color="#E2E8F0"
        envMapIntensity={1.5}
        clearcoat={0.8}
        clearcoatRoughness={0.1}
        metalness={0.3}
        roughness={0.15}
        distort={0.25}
        speed={0.8}
      />
    </Sphere>
  )
}

export default function Background3D() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} color="#FFFFFF" />
        <directionalLight position={[8, 10, 5]} intensity={0.6} color="#F1F5F9" />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#E2E8F0" />
        <LiquidSphere />
        <SecondaryOrb />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
