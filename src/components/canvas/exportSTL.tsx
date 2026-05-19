import { STLExporter } from 'three/examples/jsm/exporters/STLExporter'
import * as THREE from 'three'
import { prepareScene } from './utils'

const expandInstancedMeshes = (scene: THREE.Group) => {
  const clone = scene.clone(true)

  clone.traverse((obj: any) => {
    if (!obj.isInstancedMesh) return

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
  })

  return clone
}

export const exportSTL = (scene: THREE.Group) => {
  const exporter = new STLExporter()

  const clean = prepareScene(scene)
  const expanded = expandInstancedMeshes(clean)

  expanded.rotation.set(0, 0, 0)
  expanded.updateMatrixWorld(true)

  const result = exporter.parse(expanded)

  const blob = new Blob([result], { type: 'model/stl' })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  document.body.appendChild(a)
  a.href = url
  a.download = 'keycap.stl'
  a.click()

  URL.revokeObjectURL(url)
  a.remove()
}
