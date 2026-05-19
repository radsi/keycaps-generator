import * as THREE from 'three'

export const prepareScene = (scene: THREE.Group) => {
  const snapshot = scene.clone(true)
  snapshot.rotation.set(0, 0, 0)
  snapshot.updateMatrixWorld(true)

  const exportGroup = new THREE.Group()

  snapshot.traverse((obj: any) => {
    if (obj.isMesh) {
      const geometry = obj.geometry.clone() as THREE.BufferGeometry
      geometry.applyMatrix4(obj.matrixWorld)
      geometry.scale(10, 10, 10)
      geometry.computeVertexNormals()
      exportGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()))
      return
    }

    if (obj.isInstancedMesh) {
      const dummy = new THREE.Object3D()
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, dummy.matrix)
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)

        const instanceMatrix = new THREE.Matrix4().multiplyMatrices(obj.matrixWorld, dummy.matrix)
        const geometry = obj.geometry.clone() as THREE.BufferGeometry
        geometry.applyMatrix4(instanceMatrix)
        geometry.scale(10, 10, 10)
        geometry.computeVertexNormals()

        exportGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()))
      }
    }
  })

  exportGroup.updateMatrixWorld(true)
  return exportGroup
}
