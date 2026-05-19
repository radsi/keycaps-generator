import * as THREE from 'three'
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface ImageMask {
  width: number
  height: number
  data: Uint8Array
  fileName: string
}

interface FaceTransform {
  axis: 'x' | 'y' | 'z'
  sign: 1 | -1
  pos: number
  a: number
  b: number
}

export function createIconMesh(
  imageMask: ImageMask,
  face: FaceTransform,
  options: {
    depth?: number
    color?: number
  } = {},
): THREE.Mesh | null {
  const { depth = 0.15, color = 0x111111 } = options
  const pixelSize = Math.min(face.a / imageMask.width, face.b / imageMask.height) * 0.9
  const geometry = buildHeightMapGeometry(imageMask, pixelSize, depth)

  if (!geometry) return null

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  })

  const mesh = new THREE.Mesh(geometry, material)
  positionOnFace(mesh, face, depth)

  return mesh
}

function buildHeightMapGeometry(mask: ImageMask, pixelSize: number, maxHeight: number): THREE.BufferGeometry | null {
  const { width, height, data } = mask
  const cols = width + 1
  const rows = height + 1
  const topCount = cols * rows
  const positions = new Float32Array(topCount * 2 * 3)
  const indices: number[] = []

  const getCornerHeight = (ix: number, iy: number) => {
    let sum = 0
    let count = 0

    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -1; dx <= 0; dx++) {
        const px = ix + dx
        const py = iy + dy
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const value = data[py * width + px]
          sum += value
          count += 1
        }
      }
    }

    if (count === 0) return 0
    const normalized = Math.max(0, Math.min(1, (255 - sum / count) / 255))
    return normalized * maxHeight
  }

  const cornerHeights = new Float32Array(topCount)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const cellHeights: number[] = []

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      cornerHeights[iy * cols + ix] = getCornerHeight(ix, iy)
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    const nextHeights = new Float32Array(topCount)
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        let sum = 0
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = ix + dx
            const ny = iy + dy
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              sum += cornerHeights[ny * cols + nx]
              count += 1
            }
          }
        }
        nextHeights[iy * cols + ix] = sum / count
      }
    }
    for (let i = 0; i < topCount; i++) {
      cornerHeights[i] = nextHeights[i]
    }
  }

  let maxObservedHeight = 0
  for (let iy = 0; iy < rows; iy++) {
    const y = (halfHeight - iy) * pixelSize
    for (let ix = 0; ix < cols; ix++) {
      const z = cornerHeights[iy * cols + ix]
      maxObservedHeight = Math.max(maxObservedHeight, z)
      const positionIndex = (iy * cols + ix) * 3
      positions[positionIndex] = (ix - halfWidth) * pixelSize
      positions[positionIndex + 1] = y
      positions[positionIndex + 2] = z
    }
  }

  if (maxObservedHeight === 0) return null

  const heightThreshold = Math.max(maxHeight * 0.02, 0.03)
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const a = iy * cols + ix
      const b = a + 1
      const c = a + cols
      const d = c + 1
      const h00 = positions[a * 3 + 2]
      const h10 = positions[b * 3 + 2]
      const h01 = positions[c * 3 + 2]
      const h11 = positions[d * 3 + 2]
      const active = Math.max(h00, h10, h01, h11) > heightThreshold
      cellHeights.push(active ? 1 : 0)
    }
  }

  for (let i = 0; i < topCount; i++) {
    const base = topCount * 3 + i * 3
    positions[base] = positions[i * 3]
    positions[base + 1] = positions[i * 3 + 1]
    positions[base + 2] = 0
  }

  const isCellActive = (ix: number, iy: number) => {
    if (ix < 0 || iy < 0 || ix >= width || iy >= height) return false
    return cellHeights[iy * width + ix] === 1
  }

  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      if (!isCellActive(ix, iy)) continue

      const a = iy * cols + ix
      const b = a + 1
      const c = a + cols
      const d = c + 1
      const a2 = a + topCount
      const b2 = b + topCount
      const c2 = c + topCount
      const d2 = d + topCount

      indices.push(a, c, b, b, c, d)
      indices.push(a2, c2, b2, b2, c2, d2)

      if (!isCellActive(ix - 1, iy)) {
        indices.push(a, a2, c, c, a2, c2)
      }
      if (!isCellActive(ix + 1, iy)) {
        indices.push(b, d, b2, d, d2, b2)
      }
      if (!isCellActive(ix, iy - 1)) {
        indices.push(a, b, a2, b, b2, a2)
      }
      if (!isCellActive(ix, iy + 1)) {
        indices.push(c, c2, d, d, c2, d2)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)

  geometry.computeVertexNormals()
  return geometry
}

function positionOnFace(mesh: THREE.Mesh, face: FaceTransform, depth: number) {
  const offset = face.pos + face.sign * (depth / 2 - 0.1)

  if (face.axis === 'y') {
    mesh.rotation.x = -Math.PI / 2
    if (face.sign === -1) mesh.rotation.x = Math.PI / 2
    mesh.position.y = offset
  } else if (face.axis === 'z') {
    mesh.position.z = offset
    if (face.sign === -1) mesh.rotation.y = Math.PI
  } else {
    mesh.rotation.y = Math.PI / 2
    if (face.sign === -1) mesh.rotation.y = -Math.PI / 2
    mesh.position.x = offset
  }
}

const parseSTL = async (arrayBuffer: ArrayBuffer): Promise<THREE.BufferGeometry> => {
  const view = new DataView(arrayBuffer)
  const isASCII = isASCIISTL(arrayBuffer)

  if (isASCII) {
    return parseASCIISTL(new TextDecoder().decode(arrayBuffer))
  }

  return parseBinarySTL(view)
}

const isASCIISTL = (arrayBuffer: ArrayBuffer): boolean => {
  const view = new Uint8Array(arrayBuffer)
  const header = new TextDecoder().decode(view.slice(0, 5))
  return header === 'solid'
}

const parseBinarySTL = (view: DataView): THREE.BufferGeometry => {
  const faces = view.getUint32(80, true)
  const geometry = new THREE.BufferGeometry()

  const vertices: number[] = []
  const normals: number[] = []

  let offset = 84
  for (let i = 0; i < faces; i++) {
    const nx = view.getFloat32(offset, true)
    offset += 4
    const ny = view.getFloat32(offset, true)
    offset += 4
    const nz = view.getFloat32(offset, true)
    offset += 4

    for (let j = 0; j < 3; j++) {
      vertices.push(view.getFloat32(offset, true))
      offset += 4
      vertices.push(view.getFloat32(offset, true))
      offset += 4
      vertices.push(view.getFloat32(offset, true))
      offset += 4

      normals.push(nx, ny, nz)
    }

    offset += 2
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))

  return geometry
}

const parseASCIISTL = (data: string): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const normals: number[] = []

  const normalPattern =
    /normal\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g
  const vertexPattern =
    /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g

  let normalMatch
  let vertexMatch
  let currentNormal = [0, 0, 0]

  while ((normalMatch = normalPattern.exec(data)) !== null) {
    currentNormal = [parseFloat(normalMatch[1]), parseFloat(normalMatch[3]), parseFloat(normalMatch[5])]
  }

  while ((vertexMatch = vertexPattern.exec(data)) !== null) {
    vertices.push(parseFloat(vertexMatch[1]), parseFloat(vertexMatch[3]), parseFloat(vertexMatch[5]))
    normals.push(...currentNormal)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))

  return geometry
}

interface KeycapProps {
  fileName?: string
  imageMask?: ImageMask | null
  face?: FaceType
}

type FaceType = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'

const getFaceTransform = (face: FaceType, bbox: THREE.Box3): FaceTransform => {
  const size = new THREE.Vector3()
  bbox.getSize(size)

  switch (face) {
    case 'top':
      return { axis: 'y', sign: 1, pos: bbox.max.y, a: size.x, b: size.z }
    case 'bottom':
      return { axis: 'y', sign: -1, pos: bbox.min.y, a: size.x, b: size.z }
    case 'front':
      return { axis: 'z', sign: 1, pos: bbox.max.z, a: size.x, b: size.y }
    case 'back':
      return { axis: 'z', sign: -1, pos: bbox.min.z, a: size.x, b: size.y }
    case 'left':
      return { axis: 'x', sign: -1, pos: bbox.min.x, a: size.y, b: size.z }
    case 'right':
      return { axis: 'x', sign: 1, pos: bbox.max.x, a: size.y, b: size.z }
  }
}

const Keycap = forwardRef<Group, KeycapProps>(({ fileName, imageMask, face = 'top' }, ref) => {
  const groupRef = useRef<Group>(null)
  const iconRef = useRef<THREE.Mesh | null>(null)

  const removePreviousIcon = () => {
    if (!iconRef.current || !groupRef.current) return

    const icon = iconRef.current

    if (icon.geometry) icon.geometry.dispose()

    if (icon.material) {
      if (Array.isArray(icon.material)) {
        icon.material.forEach((m) => m.dispose())
      } else {
        icon.material.dispose()
      }
    }

    groupRef.current.remove(icon)
    iconRef.current = null
  }

  useImperativeHandle(ref, () => groupRef.current!)

  useEffect(() => {
    if (!groupRef.current) return

    const group = groupRef.current

    group.children.forEach((child: any) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
      group.remove(child)
    })

    const url = `/keycaps/${fileName}`
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => parseSTL(arrayBuffer))
      .then((geometry) => {
        geometry.center()
        geometry.scale(0.1, 0.1, 0.1)
        geometry.computeVertexNormals()

        const material = new THREE.MeshPhongMaterial({
          color: 0x0077ff,
          shininess: 100,
          specular: 0x111111,
        })

        const mesh = new THREE.Mesh(geometry, material)
        groupRef.current?.add(mesh)

        const bbox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position as THREE.BufferAttribute)

        const faceTransform = getFaceTransform(face, bbox)

        if (imageMask && faceTransform) {
          removePreviousIcon()

          const iconMesh = createIconMesh(imageMask, faceTransform, {
            depth: 0.12,
            color: 0x111111,
          })

          if (iconMesh) {
            groupRef.current?.add(iconMesh)
            iconRef.current = iconMesh
          }
        }
      })
      .catch(() => {})
  }, [fileName, imageMask, face])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2
    }
  })

  return <group ref={groupRef} />
})

export default Keycap
