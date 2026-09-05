import { useState } from 'react'
import {createBrowserRouter,RouterProvider} from 'react-router-dom'
import './App.css'
import Login from './Login';
import Register from './Register';

function App() {
  const Home = ()=> <h2>Hello!</h2>;
  const router = createBrowserRouter([
    {
      path:'/',
      element:<Home/>,
      errorElement:<>Error</>
    },
    {
      path:"/auth/login",
      element:<Login/>
    },
    {
      path:'/auth/register',
      element:<Register/>
    }
  ])
  return (
    <RouterProvider router={router}/>
  )
}

export default App
