import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, LockKeyhole, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, postApiResource } from '@/lib/api';
import { AuthUser, storeAuthUser } from '../lib/auth';

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Invalid identifier or password.';
    }

    if (error.status === 403) {
      return 'This employee account is inactive.';
    }
  }

  return 'Unable to sign in. Check that the backend is running and try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = location.state as { from?: { pathname?: string; search?: string } } | null;
  const redirectPath = from?.from?.pathname && from.from.pathname !== '/login'
    ? `${from.from.pathname}${from.from.search || ''}`
    : '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get('identifier') || '').trim();
    const password = String(formData.get('password') || '');
    const shouldRemember = formData.get('remember') === 'on';

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const employee = await postApiResource<AuthUser>('/employees/login', {
        identifier,
        password,
      });

      storeAuthUser(employee, shouldRemember);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="relative hidden overflow-hidden bg-[#0F172A] text-white lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <Link to="/" className="flex w-fit items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img className="h-full w-full object-cover" src="/project-icon.png" alt="SmartRFID" />
              </div>
              <span className="text-xl font-bold tracking-tight">SmartRFID</span>
            </Link>

            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center rounded-md border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-sm text-blue-100">
                Inventory control console
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                Secure access for live warehouse operations.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Monitor RFID events, device health, inventory movement, and alerts from a single operations dashboard.
              </p>
            </div>

            <div className="max-w-xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <h2 className="text-lg font-semibold text-white">About the project</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                SmartRFID is a warehouse inventory system for tracking RFID-tagged items across shelves, gates, readers,
                orders, and alerts in one operational dashboard.
              </p>
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                <div className="rounded-md border border-white/10 bg-slate-950/30 px-4 py-3">
                  Live RFID events and movement history
                </div>
                <div className="rounded-md border border-white/10 bg-slate-950/30 px-4 py-3">
                  Warehouse shelf visualization and item lookup
                </div>
                <div className="rounded-md border border-white/10 bg-slate-950/30 px-4 py-3">
                  Alerts, orders, employees, readers, and system settings
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img className="h-full w-full object-cover" src="/project-icon.png" alt="SmartRFID" />
              </div>
              <span className="text-xl font-bold tracking-tight">SmartRFID</span>
            </div>

            <Card className="rounded-lg border bg-white shadow-sm">
              <CardHeader className="gap-2 px-6 pt-6">
                <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
                <CardDescription>
                  Use your staff account to access the inventory dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Identifier</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-11 rounded-md bg-white pl-9"
                        type="text"
                        name="identifier"
                        autoComplete="username"
                        placeholder="Name, email, or phone"
                        required
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        className="h-11 rounded-md bg-white pl-9"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </label>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        type="checkbox"
                        name="remember"
                      />
                      Remember me
                    </label>
                    <button className="font-medium text-blue-600 hover:text-blue-700" type="button">
                      Forgot password?
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    className="h-11 w-full rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        Signing in
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
