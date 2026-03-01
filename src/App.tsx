/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Package, ClipboardList, Settings, FileText, Menu, X, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MasterItems from './pages/MasterItems';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { uiText } from './lib/uiText';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { AuthProvider, useAuth } from './components/auth-provider';

function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{uiText.common.appName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        pt-16 md:pt-0
      `}>
        <div className="hidden md:flex p-6 border-b border-border items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{uiText.common.appName}</h1>
            <p className="text-xs text-muted-foreground mt-1">{uiText.common.appDesc}</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Package className="w-4 h-4" />
            {uiText.nav.dashboard}
          </Link>
          <Link to="/items" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Settings className="w-4 h-4" />
            {uiText.nav.masterItems}
          </Link>
          <Link to="/transactions" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <ClipboardList className="w-4 h-4" />
            {uiText.nav.transactions}
          </Link>
          <Link to="/reports" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <FileText className="w-4 h-4" />
            {uiText.nav.reports}
          </Link>
        </nav>
        <div className="p-4 border-t border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{user?.username}</span>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground p-1 rounded-md" title={uiText.auth.logout}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            {uiText.common.developedBy}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 bg-background">
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">{uiText.common.loading}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/items" element={<ProtectedRoute><MasterItems /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

