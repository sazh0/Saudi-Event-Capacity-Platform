import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CapacityLanding from './CapacityLanding.jsx'
import TouchpointsPage from './TouchpointsPage.jsx'
import ExecutiveDashboard from './ExecutiveDashboard'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<CapacityLanding />} />
                <Route path="/touchpoints" element={<TouchpointsPage />} />
                <Route path="/touchpoints/*" element={<TouchpointsPage />} />
                <Route path="/dashboard" element={<App />} />
                <Route path="/executive" element={<ExecutiveDashboard />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
)