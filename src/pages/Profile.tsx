import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { uiText } from '@/lib/uiText';
import { useAuth } from '@/components/auth-provider';

const fieldClass =
  'w-full px-3 py-2 text-sm border rounded-lg border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

export default function Profile() {
  const { updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError('');
      try {
        const res = await axios.get('/api/users/me');
        setUsername(String(res.data?.username || ''));
        setEmail(String(res.data?.email || ''));
      } catch (err: any) {
        setProfileError(err.response?.data?.error || uiText.common.error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedUsername || !trimmedEmail) {
      setProfileError('Username and email are required');
      return;
    }

    setIsSavingProfile(true);
    try {
      await axios.put('/api/users/profile', {
        username: trimmedUsername,
        email: trimmedEmail,
      });
      updateUser({ username: trimmedUsername, email: trimmedEmail });
      setUsername(trimmedUsername);
      setEmail(trimmedEmail);
      setProfileSuccess('Profile updated successfully');
    } catch (err: any) {
      setProfileError(err.response?.data?.error || uiText.common.error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError(uiText.profile.passwordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(uiText.profile.passwordTooShort);
      return;
    }

    setIsSavingPassword(true);
    try {
      await axios.post('/api/users/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || uiText.common.error);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">{uiText.profile.title}</h2>
        <p className="text-sm text-neutral-500">{uiText.profile.desc}</p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">{uiText.profile.accountInfo}</h3>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          {profileError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm p-3 rounded-lg">
              {profileSuccess}
            </div>
          )}
          <div>
            <label htmlFor="profile-username" className={labelClass}>Username</label>
            <input
              id="profile-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoadingProfile || isSavingProfile}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="profile-email" className={labelClass}>Email</label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoadingProfile || isSavingProfile}
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingProfile || isSavingProfile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingProfile ? uiText.common.loading : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">{uiText.profile.changePassword}</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {passwordError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm p-3 rounded-lg">
              {passwordSuccess}
            </div>
          )}
          <div>
            <label htmlFor="old-password" className={labelClass}>{uiText.profile.oldPassword}</label>
            <input
              id="old-password"
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              disabled={isSavingPassword}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>{uiText.profile.newPassword}</label>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={isSavingPassword}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={labelClass}>{uiText.profile.confirmPassword}</label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={isSavingPassword}
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={isSavingPassword}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingPassword ? uiText.common.loading : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
