import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { uiText } from '@/lib/uiText';
import { useAuth } from '@/components/auth-provider';
import { Package, ArrowDownRight, ArrowUpRight, RefreshCw, SlidersHorizontal } from 'lucide-react';

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60';
const buttonPrimaryClass = 'inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

interface RecentTransaction {
  item_name: string;
  type: 'IN' | 'OUT' | 'EXCHANGE' | 'ADJUSTMENT';
  quantity: number;
  stock_unit: string;
  created_at: string;
}

const typeBadge: Record<RecentTransaction['type'], string> = {
  IN: 'bg-green-500/20 text-green-400',
  OUT: 'bg-red-500/20 text-red-400',
  ADJUSTMENT: 'bg-amber-400/10 text-amber-300/80',
  EXCHANGE: 'bg-blue-500/20 text-blue-400',
};

const typeIcon: Record<RecentTransaction['type'], React.ReactNode> = {
  IN: <ArrowDownRight className="w-4 h-4" />,
  OUT: <ArrowUpRight className="w-4 h-4" />,
  EXCHANGE: <RefreshCw className="w-3.5 h-3.5" />,
  ADJUSTMENT: <SlidersHorizontal className="w-3.5 h-3.5" />,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    axios
      .get<RecentTransaction[]>('/api/public-recent-transactions')
      .then((r) => setRecentTx(r.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      });
      login(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || uiText.auth.invalidCreds);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
     <div className="mx-auto max-w-6xl w-full px-6">
      {/* Header — Centered branding */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="bg-primary/10 p-3 rounded-full mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{uiText.common.appName}</h1>
        <p className="text-muted-foreground mt-1">Sistem Inventori Gudang</p>
      </div>

      {/* Main content — two-column grid: login first on mobile, activity left / login right on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12 items-start">
        {/* Left — Recent Warehouse Activity (order-2 on mobile so login comes first) */}
        <div className="w-full order-2 lg:order-1">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 opacity-90">
            <h2 className="text-base font-semibold text-neutral-300 mb-3">Aktivitas Gudang Terkini</h2>

            {recentTx.length === 0 ? (
              <p className="text-sm text-neutral-500">Belum ada aktivitas gudang</p>
            ) : (
              <div className="space-y-1.5">
                {recentTx.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-md border border-neutral-700/60 bg-neutral-800/50 px-2.5 py-2"
                  >
                    <span
                      className={`mt-0.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${typeBadge[tx.type]}`}
                    >
                      {typeIcon[tx.type]}
                      {tx.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-300 truncate">
                        {tx.item_name}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {tx.quantity} {tx.stock_unit}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-neutral-500">
                      {timeAgo(tx.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Login Card (order-1 on mobile so it appears first) */}
        <div className="w-full flex justify-center lg:justify-start order-1 lg:order-2">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-xl ring-1 ring-white/5">
            <h2 className="text-lg font-semibold text-neutral-200 mb-1">{uiText.auth.signIn}</h2>
            <p className="text-sm text-neutral-500 mb-5">{uiText.auth.signInDesc}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.auth.usernameOrEmail}</label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="contoh: admin atau admin@nds.co.id"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  disabled={isLoading}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{uiText.auth.password}</label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={fieldClass}
                />
              </div>
              <button
                type="submit"
                className={buttonPrimaryClass}
                disabled={isLoading}
              >
                {isLoading ? uiText.common.loading : uiText.auth.login}
              </button>
            </form>
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}
