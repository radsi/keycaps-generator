import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface ImageMask {
  width: number
  height: number
  data: Uint8Array
  fileName?: string
}

interface ImageModelProps {
  mask: ImageMask
}

const ImageModel: React.FC<ImageModelProps> = ({ mask }) => {
  const groupRef = useRef<Group>(null)

  useEffect(() => {
    if (!groupRef.current) return

    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0])
    }

    const onPixels = mask.data.reduce((count, value) => count + (value ? 1 : 0), 0)
    if (onPixels === 0) return

    const boxSize = 0.08
    const depth = 0.08
    const geometry = new THREE.BoxGeometry(boxSize, depth, boxSize)
    const material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.35,
      metalness: 0.15,
    })

    const mesh = new THREE.InstancedMesh(geometry, material, onPixels)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const centerX = mask.width / 2
    const centerY = mask.height / 2
    let index = 0

    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue

        const matrix = new THREE.Matrix4()
        const px = (x - centerX + 0.5) * boxSize
        const pz = (centerY - y - 0.5) * boxSize
        matrix.makeTranslation(px, depth * 0.5, pz)
        mesh.setMatrixAt(index, matrix)
        index += 1
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    groupRef.current.add(mesh)
  }, [mask])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35
    }
  })

  return <group ref={groupRef} />
}

export default ImageModel
