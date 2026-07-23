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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check URL parameters for OAuth token redirect
    const urlParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
    const urlToken = urlParams.get('token');
    const urlUsername = urlParams.get('username');

    if (urlToken && urlUsername) {
      localStorage.setItem('novax_token', urlToken);
      localStorage.setItem('novax_username', urlUsername);
      setUser({ username: urlUsername, token: urlToken });
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
      return;
    }

    const token = getAuthToken();
    if (token) {
      const savedUser = localStorage.getItem('novax_username') || 'admin';
      setUser({ username: savedUser, token });
    }
  }, []);

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 relative">
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <div className={`fixed md:relative md:flex h-full z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          <Sidebar selectedModel={selectedModel} onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar
            user={user}
            onLogout={() => setUser(null)}
            title="NOVA_X Operating System"
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
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
