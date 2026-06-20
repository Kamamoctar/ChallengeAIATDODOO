import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { TeamProvider } from './context/TeamContext'
import { TimerProvider } from './context/TimerContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TeamProvider>
          <TimerProvider>
            <App />
            <Toaster position="top-center" />
          </TimerProvider>
        </TeamProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
