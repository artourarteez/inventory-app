/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Package, ClipboardList, Settings, FileText, ShoppingCart, Menu, X, LogOut, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MasterItems from './pages/MasterItems';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import PurchaseOrders from './pages/PurchaseOrders';
import CreatePurchaseOrder from './pages/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { uiText } from './lib/uiText';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { AuthProvider, useAuth } from './components/auth-provider';

const navItems = [
  { to: '/', icon: Package, label: (t: typeof uiText) => t.nav.dashboard, exact: true },
  { to: '/items', icon: Settings, label: (t: typeof uiText) => t.nav.masterItems, exact: false },
  { to: '/transactions', icon: ClipboardList, label: (t: typeof uiText) => t.nav.transactions, exact: false },
  { to: '/reports', icon: FileText, label: (t: typeof uiText) => t.nav.reports, exact: false },
  { to: '/purchase-orders', icon: ShoppingCart, label: () => 'Purchase Orders', exact: false },
  { to: '/profile', icon: User, label: () => 'Profile', exact: false },
];

function NavLink({ to, icon: Icon, label, exact }: { to: string; icon: any; label: string; exact: boolean }) {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
      {label}
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between px-4 z-50">
        <h1 className="text-base font-bold text-neutral-800 dark:text-neutral-200">{uiText.common.appName}</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-56 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        pt-14 md:pt-0
      `}>
        {/* Sidebar Brand */}
        <div className="hidden md:flex px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-neutral-800 dark:text-neutral-200">{uiText.common.appName}</h1>
            <p className="text-xs text-neutral-400 mt-0.5">{uiText.common.appDesc}</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label(uiText)}
              exact={item.exact}
            />
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between px-2 py-1.5">
            <Link
              to="/profile"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
            >
              {user?.username}
            </Link>
            <button
              onClick={logout}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={uiText.auth.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-center text-neutral-400 mt-1">{uiText.common.developedBy}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 bg-neutral-50 dark:bg-neutral-950">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        {uiText.common.loading}
      </div>
    );
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
            <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
            <Route path="/purchase-orders/create" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
            <Route path="/purchase-orders/:id" element={<ProtectedRoute><PurchaseOrderDetail /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
