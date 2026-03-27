import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Triangle, AlertTriangle } from 'lucide-react';
import api from '../services/apiConfig';
import { setAuthSession, type UserRole } from '../services/auth';

type LoginResponse = {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
};

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/login', {
        username: username.trim(),
        password,
      });

      const data = res.data;
      setAuthSession(data.access_token, data.role, data.username);

      navigate('/upload');
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(15,23,42,0.09),transparent_28%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white p-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wider">
              <ShieldCheck size={14} /> RBI-COMPLIANT CREDIT INTELLIGENCE
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight">KARTA AI Access Portal</h1>
            <p className="mt-4 text-slate-200 text-sm leading-6">
              Securely sign in to run underwriting workflows, inspect fraud signals,
              and monitor portfolio risk with role-based controls.
            </p>
          </div>

          <div className="text-xs text-slate-300">
            <div>Demo credentials:</div>
            <div className="mt-2">Analyst: analyst / analyst123</div>
            <div>Admin: admin / admin123</div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xl">
            <Triangle size={20} className="rotate-180 fill-slate-800 stroke-none" />
            KARTA
          </div>

          <h2 className="mt-8 text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use your role credentials to continue.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Username</span>
              <div className="mt-1 relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="mt-1 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            Back to home?{' '}
            <Link to="/" className="text-blue-700 font-semibold hover:underline">Go to landing page</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
