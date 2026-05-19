import { useRef, type ChangeEvent } from 'react'

export interface ImageMask {
  width: number
  height: number
  data: Uint8Array
  fileName: string
}

interface ImageLoaderProps {
  onLoad: (mask: ImageMask | null) => void
}

const ImageLoader: React.FC<ImageLoaderProps> = ({ onLoad }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onLoad(null)
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const maxSize = 64
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
      const width = Math.max(1, Math.round(img.naturalWidth * scale))
      const height = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        onLoad(null)
        URL.revokeObjectURL(url)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const mask = new Uint8Array(width * height)

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        const alpha = imageData.data[i + 3]
        const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        mask[i / 4] = alpha > 16 ? brightness : 255
      }

      onLoad({ width, height, data: mask, fileName: file.name })
      URL.revokeObjectURL(url)
      event.target.value = ''
    }

    img.onerror = () => {
      onLoad(null)
      URL.revokeObjectURL(url)
      event.target.value = ''
    }

    img.src = url
  }

  return (
    <>
      <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={handleChange} />
      <button
        onClick={handleClick}
        className='w-full px-3 py-2 bg-zinc-700 text-white rounded border border-zinc-600 cursor-pointer hover:border-cyan-500 focus:outline-none focus:border-cyan-500'
      >
        Load image
      </button>
    </>
  )
}

export default ImageLoader
