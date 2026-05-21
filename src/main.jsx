import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CapacityLanding from './CapacityLanding.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<CapacityLanding />} />
                <Route path="/landing" element={<App />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
)