import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { uiText } from '@/lib/uiText';
import { useAuth } from '@/components/auth-provider';
import { Package } from 'lucide-react';

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60';
const buttonPrimaryClass = 'inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{uiText.common.appName}</h2>
          <p className="text-muted-foreground mt-2">{uiText.auth.signInDesc}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
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
  );
}
