import { useEffect, useState } from 'react';
import AdminPageHeader from '../components/AdminPageHeader';
import { deleteAdminUser, fetchAdminUsers, type AdminUser } from '../services/adminApi';

function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const loadUsers = async () => {
    setError('');
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onDelete = async (username: string) => {
    setBusyUser(username);
    setError('');
    try {
      await deleteAdminUser(username);
      await loadUsers();
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setBusyUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminPageHeader
        title="User Management"
        description="Admin-only page for managing users and role assignments."
      />
      <div className="px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-lg p-6 md:p-8">
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Total Users</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{users.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Admins</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{users.filter((u) => u.role === 'admin').length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Analysts</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{users.filter((u) => u.role === 'analyst').length}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Users</h2>
              <button
                onClick={loadUsers}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading users...</div>
            ) : error ? (
              <div className="p-4 text-sm text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-800">{user.username}</td>
                        <td className="px-4 py-3 uppercase text-xs tracking-wide text-slate-500">{user.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onDelete(user.username)}
                            disabled={busyUser === user.username || user.role === 'admin'}
                            className="rounded-md border border-rose-200 text-rose-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busyUser === user.username ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
