/**
 * Admin Users Page Component
 * Displays registered users and allows admin to manage their status
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { User } from '../types/index';
import Spinner from '../components/Spinner';

type UserStatus = 'active' | 'pending' | 'disabled';

function getUserStatus(user: User): UserStatus {
  if (!user.is_active) return 'disabled';
  if (!user.is_verified) return 'pending';
  return 'active';
}

export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  const getStatusBadge = (status: UserStatus) => {
    const badges = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        dot: 'bg-green-500',
        label: t('status.active')
      },
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        dot: 'bg-yellow-500',
        label: t('status.pending')
      },
      disabled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        dot: 'bg-red-500',
        label: t('status.disabled')
      }
    };
    return badges[status];
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const loadUsers = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError('');
      const data = await api.getUsers(token);
      setUsers(data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || t('errors.loadFailed'));
      } else {
        setError(t('errors.loadFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserActive = async (userId: number | string, currentlyActive: boolean) => {
    if (!token) return;

    try {
      setActionLoading(userId);
      const numericId = typeof userId === 'string' ? parseInt(userId) || userId : userId;
      const updatedUser = await api.updateUserStatus(token, numericId as number, {
        is_active: !currentlyActive
      });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || t('errors.updateFailed'));
      } else {
        setError(t('errors.updateFailed'));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserVerified = async (userId: number | string, currentlyVerified: boolean) => {
    if (!token) return;

    try {
      setActionLoading(userId);
      const numericId = typeof userId === 'string' ? parseInt(userId) || userId : userId;
      const updatedUser = await api.updateUserStatus(token, numericId as number, {
        is_verified: !currentlyVerified
      });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || t('errors.updateFailed'));
      } else {
        setError(t('errors.updateFailed'));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: number | string) => {
    if (!token) return;
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    try {
      setActionLoading(userId);
      const numericId = typeof userId === 'string' ? parseInt(userId) || userId : userId;
      await api.deleteUser(token, numericId as number);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || t('errors.deleteFailed'));
      } else {
        setError(t('errors.deleteFailed'));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-red-800 mb-2">{t('accessDenied')}</h2>
          <p className="text-red-600">{t('noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-1">{t('subtitle')}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('stats.totalUsers')}</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('stats.active')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.is_active && u.is_verified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('stats.pending')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.is_active && !u.is_verified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('stats.disabled')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => !u.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className="text-gray-500 mt-4">{t('loading')}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500">{t('noUsers')}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.registered')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const status = getUserStatus(user);
                const badge = getStatusBadge(status);
                const isCurrentUser = user.id === currentUser?.id;

                return (
                  <tr key={user.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600">{tCommon('you')}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dot} mr-1.5`}></span>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {t('roles.admin')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">{t('roles.user')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actionLoading === user.id ? (
                        <Spinner size="sm" />
                      ) : isCurrentUser ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Active/Disabled */}
                          <button
                            onClick={() => toggleUserActive(user.id, user.is_active)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={user.is_active ? t('actions.disableUser') : t('actions.enableUser')}
                          >
                            {user.is_active ? t('actions.disable') : t('actions.enable')}
                          </button>

                          {/* Toggle Verified */}
                          {user.is_active && !user.is_verified && (
                            <button
                              onClick={() => toggleUserVerified(user.id, user.is_verified)}
                              className="px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                              title={t('actions.manualVerify')}
                            >
                              {t('actions.verify')}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            title={t('actions.deleteUser')}
                          >
                            {t('actions.delete')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
