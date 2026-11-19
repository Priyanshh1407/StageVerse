'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowLeft, User, Music, Building, Wrench, Loader2 } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import AuthField from '@/components/auth/AuthField';
import { homeFor, safeNext } from '@/lib/roles';
import { signIn } from '@/lib/authClient';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The public demo accounts (their password is in the README), one per role: try StageVerse in one click
const DEMO_PASSWORD = 'stageverse-demo';
const DEMOS = [
  { role: 'fan', label: 'Fan', icon: User, email: 'recruiter.fan@stageverse.demo' },
  { role: 'artist', label: 'Artist', icon: Music, email: 'recruiter.artist@stageverse.demo' },
  { role: 'organizer', label: 'Organizer', icon: Building, email: 'recruiter.organizer@stageverse.demo' },
  { role: 'production', label: 'Crew', icon: Wrench, email: 'recruiter.crew@stageverse.demo' },
];

// (?next= and ?role= are read with useSearchParams, which needs a Suspense boundary)
export default function LoginPage() {
  return <Suspense><LoginPageForm /></Suspense>;
}

function LoginPageForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(null); // 'form' or a demo role
  // (the page to return to: ?next=, set by the page gate when a signed-out visitor opened a signed-in page)
  const next = safeNext(useSearchParams().get('next'));

  const go = (user) => router.replace(next ?? homeFor(user.role));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFailed('');
    // every problem at once, next to its field
    const found = {};
    if (!email.trim()) found.email = 'Please enter your email address.';
    else if (!EMAIL.test(email.trim())) found.email = 'That email address looks incomplete, for example name@example.com.';
    if (!password) found.password = 'Please enter your password.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy('form');
    try { go(await signIn(email.trim(), password)); } catch (err) { setFailed(err.message); setBusy(null); }
  };

  const tryDemo = async (demo) => {
    setFailed('');
    setErrors({});
    setBusy(demo.role);
    try { go(await signIn(demo.email, DEMO_PASSWORD)); } catch (err) {
      setFailed(`The ${demo.label} demo account isn't available right now. ${err.message}`);
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-black font-sans text-white">
      <div aria-hidden className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <Link href="/" className="absolute left-4 top-4 z-20 flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/80 backdrop-blur-md hover:bg-white/10 hover:text-white">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Home
      </Link>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-20">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
          <h1 className="mb-1 text-center text-3xl font-bold">Log in</h1>
          <p className="mb-6 text-center text-sm text-gray-300">{next ? 'Log in to carry on where you were.' : 'Welcome back.'}</p>

          {failed && <p role="alert" className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{failed}</p>}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthField label="Email" type="email" icon={Mail} value={email} autoComplete="email" inputMode="email" placeholder="name@example.com"
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: null })); }} error={errors.email} />
            <AuthField label="Password" type="password" icon={Lock} value={password} autoComplete="current-password"
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: null })); }} error={errors.password} />
            <div className="flex justify-end">
              <Link href="/contact?topic=password" className="flex min-h-11 items-center text-sm font-medium text-amber-300 hover:underline">Forgot your password?</Link>
            </div>
            <button type="submit" disabled={Boolean(busy)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-lg font-bold hover:from-amber-400 hover:to-pink-500 disabled:opacity-60">
              {busy === 'form' ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Logging in…</> : 'Log in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-gray-300">
            <span className="h-px flex-1 bg-white/15" /> or try a demo account <span className="h-px flex-1 bg-white/15" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMOS.map((demo) => (
              <button key={demo.role} type="button" onClick={() => tryDemo(demo)} disabled={Boolean(busy)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 font-semibold hover:border-amber-300/60 hover:bg-white/10 disabled:opacity-60">
                {busy === demo.role ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <demo.icon className="h-4 w-4" aria-hidden />}
                Try as {demo.label}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-gray-300">
            New to StageVerse?{' '}
            <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className="font-semibold text-amber-300 hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
