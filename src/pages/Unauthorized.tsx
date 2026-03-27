import { Link } from 'react-router-dom';

function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-lg p-8 text-center">
        <p className="text-xs font-bold tracking-wide text-rose-600">ACCESS DENIED</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Unauthorized</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your account does not have permission to view this page.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Go to Login
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;
