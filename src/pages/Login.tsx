import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Cpu, Loader2, LockKeyhole, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, postApiResource } from '@/lib/api';

type LoginEmployee = {
  id: number;
  name: string;
  role: 'admin' | 'operation' | 'security';
  department: string | null;
};

const AUTH_USER_STORAGE_KEY = 'smart-rfid-auth-user';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get('identifier') || '').trim();
    const password = String(formData.get('password') || '');
    const shouldRemember = formData.get('remember') === 'on';

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const employee = await postApiResource<LoginEmployee>('/employees/login', {
        identifier,
        password,
      });

      const serializedEmployee = JSON.stringify(employee);

      if (shouldRemember) {
        window.localStorage.setItem(AUTH_USER_STORAGE_KEY, serializedEmployee);
        window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serializedEmployee);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }

      navigate('/');
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] text-slate-950">
      <style>
        {`
          @keyframes package-route-a {
            0%, 10% { transform: translate3d(28px, 180px, 0); }
            28%, 42% { transform: translate3d(260px, 180px, 0); }
            58%, 70% { transform: translate3d(260px, 64px, 0); }
            88%, 100% { transform: translate3d(72px, 64px, 0); }
          }

          @keyframes package-route-b {
            0%, 12% { transform: translate3d(310px, 304px, 0); }
            30%, 42% { transform: translate3d(92px, 304px, 0); }
            58%, 70% { transform: translate3d(92px, 186px, 0); }
            88%, 100% { transform: translate3d(304px, 186px, 0); }
          }

          @keyframes package-route-c {
            0%, 14% { transform: translate3d(78px, 418px, 0); }
            34%, 48% { transform: translate3d(328px, 418px, 0); }
            66%, 78% { transform: translate3d(328px, 300px, 0); }
            92%, 100% { transform: translate3d(168px, 300px, 0); }
          }

          @keyframes scanner-pulse {
            0%, 100% { opacity: 0.22; transform: scaleX(0.76); }
            50% { opacity: 0.8; transform: scaleX(1); }
          }

          .package-route-a { animation: package-route-a 8s linear infinite; }
          .package-route-b { animation: package-route-b 9.5s linear infinite; }
          .package-route-c { animation: package-route-c 11s linear infinite; }
          .scanner-pulse { animation: scanner-pulse 2.4s ease-in-out infinite; }
        `}
      </style>
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="relative hidden overflow-hidden bg-[#0F172A] text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(59,130,246,0.32),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.94))]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <Link to="/" className="flex w-fit items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                <Cpu className="h-6 w-6" />
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

            <div className="relative h-[510px] max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-slate-950/45 p-6 shadow-2xl shadow-black/20">
              <div className="absolute left-6 right-6 top-16 h-px bg-blue-300/25" />
              <div className="absolute left-6 right-6 top-[182px] h-px bg-blue-300/25" />
              <div className="absolute left-6 right-6 top-[300px] h-px bg-blue-300/25" />
              <div className="absolute left-6 right-6 top-[418px] h-px bg-blue-300/25" />

              <div className="absolute left-12 top-10 h-[430px] w-1 rounded-full bg-slate-500/30" />
              <div className="absolute left-[252px] top-10 h-[430px] w-1 rounded-full bg-slate-500/30" />
              <div className="absolute right-16 top-10 h-[430px] w-1 rounded-full bg-slate-500/30" />

              <div className="scanner-pulse absolute left-16 right-16 top-[238px] h-16 origin-center rounded-full border border-emerald-300/30 bg-emerald-300/10 blur-[1px]" />

              {[
                ['A-12', 'left-[72px] top-[76px]'],
                ['B-04', 'left-[268px] top-[76px]'],
                ['C-21', 'right-[76px] top-[76px]'],
                ['D-08', 'left-[72px] top-[194px]'],
                ['E-16', 'left-[268px] top-[194px]'],
                ['F-09', 'right-[76px] top-[194px]'],
                ['G-31', 'left-[72px] top-[312px]'],
                ['H-22', 'left-[268px] top-[312px]'],
                ['J-17', 'right-[76px] top-[312px]'],
                ['K-06', 'left-[72px] top-[430px]'],
                ['L-14', 'left-[268px] top-[430px]'],
                ['M-28', 'right-[76px] top-[430px]'],
              ].map(([label, position]) => (
                <div
                  key={label}
                  className={`absolute flex h-9 w-20 items-center justify-center rounded-md border border-slate-500/30 bg-slate-700/80 font-mono text-xs text-slate-200 ${position}`}
                >
                  {label}
                </div>
              ))}

              <div className="package-route-a absolute left-0 top-0 h-10 w-14 rounded-md border border-amber-200/60 bg-amber-400 shadow-lg shadow-amber-950/30">
                <div className="mx-auto h-full w-px bg-amber-700/40" />
              </div>
              <div className="package-route-b absolute left-0 top-0 h-9 w-12 rounded-md border border-blue-200/60 bg-blue-400 shadow-lg shadow-blue-950/30">
                <div className="mx-auto h-full w-px bg-blue-800/40" />
              </div>
              <div className="package-route-c absolute left-0 top-0 h-8 w-11 rounded-md border border-emerald-200/60 bg-emerald-400 shadow-lg shadow-emerald-950/30">
                <div className="mx-auto h-full w-px bg-emerald-800/40" />
              </div>

              <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-300">
                <span className="font-mono text-emerald-300">LIVE MOVEMENT</span>
                <span>RFID shelf-to-shelf tracking</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                <Cpu className="h-6 w-6" />
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
