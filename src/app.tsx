import { StrictMode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Root from '~/pages/root'
import About from '~/pages/about'
import Error from '~/pages/error'
import Index from '~/pages/index'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <Error />,
    children: [
      {
        path: '/',
        index: true,
        element: <Index />,
      },
      {
        path: '/about',
        element: <About />,
      },
    ],
  },
])

function App() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}

export default App
