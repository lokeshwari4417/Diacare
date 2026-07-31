import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function TorusMesh() {
  const meshRef = useRef()
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2
  })

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1.5, 0.45, 16, 100]} />
      <meshStandardMaterial
        color="#2563EB"
        roughness={0.1}
        metalness={0.8}
        wireframe={false}
      />
    </mesh>
  )
}

export default function RotatingTorus() {
  return (
    <div className="w-full h-full min-h-[300px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        <TorusMesh />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}
