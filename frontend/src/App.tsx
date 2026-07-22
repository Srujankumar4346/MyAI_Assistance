import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from './types';
import { getAuthToken } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { Voice } from './pages/Voice';
import { Memory } from './pages/Memory';
import { SettingsPage } from './pages/Settings';
import { Logs } from './pages/Logs';
import { About } from './pages/About';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemma');

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setUser({ username: 'admin', token });
    }
  }, []);

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">

        {/* Sidebar Navigation */}
        <Sidebar selectedModel={selectedModel} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar
            user={user}
            onLogout={() => setUser(null)}
            title="SAI Operating System"
          />

          <main className="flex-1 overflow-y-auto p-6 relative">
            <Routes>
              <Route path="/" element={<Home selectedModel={selectedModel} />} />
              <Route path="/chat" element={<Chat selectedModel={selectedModel} setSelectedModel={setSelectedModel} />} />
              <Route path="/voice" element={<Voice selectedModel={selectedModel} />} />
              <Route path="/memory" element={<Memory />} />
              <Route path="/settings" element={<SettingsPage selectedModel={selectedModel} setSelectedModel={setSelectedModel} />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
