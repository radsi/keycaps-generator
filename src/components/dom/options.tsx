interface OptionsProps {
  children: React.ReactNode
}

const Options: React.FC<OptionsProps> = ({ children }) => {
  return (
    <div className='text-center absolute max-w-lg px-10 py-8 text-sm rounded-lg shadow-xl bg-zinc-800 md:text-base top-16 left-1/2 transform -translate-x-1/2'>
      {children}
    </div>
  )
}

export default Options
