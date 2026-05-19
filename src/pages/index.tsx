import { lazy, useState, useRef } from 'react'
import ImageLoader, { type ImageMask } from '~/components/dom/imageloader'
import Options from '~/components/dom/options'
import { useCanvas } from '~/pages/root'
import { exportGLB } from '~/components/canvas/exportGLB'
import { exportSTL } from '~/components/canvas/exportSTL'

const Keycap = lazy(() => import('~/components/canvas/keycap'))

const Index = () => {
  const [selectedKeycap] = useState<string>('1.00u.stl')
  const [imageMask, setImageMask] = useState<ImageMask | null>(null)

  const exportRef = useRef<THREE.Group>(null)
  const canvasContent = <Keycap ref={exportRef} fileName={selectedKeycap} imageMask={imageMask} face='front' />
  useCanvas(canvasContent)

  return (
    <>
      <Options>
        <div>
          <label htmlFor='image-loader' className='block mb-2 font-semibold'>
            Keycap icon: {imageMask?.fileName ?? 'none'}
          </label>
          <ImageLoader onLoad={setImageMask} />
          <p className='mt-3 text-xs text-gray-400'>White background and black icon works great</p>
        </div>
        <div className='pt-3 md-10'>
          <button onClick={() => exportGLB(exportRef.current!)} className='px-4 py-2 bg-blue-600 text-white rounded'>
            Export GLB (editable)
          </button>

          <button onClick={() => exportSTL(exportRef.current!)} className='px-4 py-2 bg-green-600 text-white rounded'>
            Export STL (print)
          </button>
        </div>
      </Options>
    </>
  )
}

export default Index
