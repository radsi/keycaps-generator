import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter'
import * as THREE from 'three'

export const exportGLB = (scene: THREE.Group) => {
  const exporter = new GLTFExporter()

  const clean = expandInstancedMesh(scene)
  clean.rotation.set(0, 0, 0)
  clean.updateMatrixWorld(true)

  exporter.parse(
    clean,
    (result: any) => {
      const blob = new Blob([result instanceof ArrayBuffer ? result : JSON.stringify(result)], {
        type: result instanceof ArrayBuffer ? 'model/gltf-binary' : 'model/gltf+json',
      })

      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      document.body.appendChild(a)
      a.href = url
      a.download = 'keycap.glb'
      a.click()

      URL.revokeObjectURL(url)
      a.remove()
    },
    (error: ErrorEvent) => console.error(error),
  )
}

const expandInstancedMesh = (scene: THREE.Group) => {
  const clone = scene.clone(true)

  clone.traverse((obj: any) => {
    if (obj.isInstancedMesh) {
      const dummy = new THREE.Object3D()

      const parent = obj.parent
      if (!parent) return

      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, dummy.matrix)
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)

        const mesh = new THREE.Mesh(obj.geometry, obj.material)
        mesh.position.copy(dummy.position)
        mesh.quaternion.copy(dummy.quaternion)
        mesh.scale.copy(dummy.scale)

        parent.add(mesh)
      }

      obj.visible = false
    }
  })

  return clone
}
