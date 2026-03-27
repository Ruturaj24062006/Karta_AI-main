import { useEffect, useState } from 'react';
import { deleteAdminUser, fetchAdminUsers, type AdminUser } from '../services/adminApi';

function UserManagementContent() {
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
    <div className="admin-view-section">
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Total Users</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{users.length}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">Admins</div>
          <div className="text-3xl font-bold text-emerald-900 mt-2">{users.filter((u) => u.role === 'admin').length}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-700">Analysts</div>
          <div className="text-3xl font-bold text-blue-900 mt-2">{users.filter((u) => u.role === 'analyst').length}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Active Users</h3>
          <button onClick={loadUsers} className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-white">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-600">Loading users...</div>
        ) : error ? (
          <div className="p-6 text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-slate-600">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Username</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Role</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{user.username}</td>
                    <td className="px-6 py-4 uppercase text-xs text-slate-600">{user.role}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onDelete(user.username)}
                        disabled={busyUser === user.username || user.role === 'admin'}
                        className="px-3 py-1.5 text-xs font-semibold rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
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
  );
}

export default UserManagementContent;
