'use client';

import { Suspense, useState } from 'react';
import { track } from '@vercel/analytics';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Building, Wrench, Music, ArrowLeft, Loader2, Check } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import AuthField from '@/components/auth/AuthField';
import { ROLES, ROLE_INFO, homeFor, safeNext } from '@/lib/roles';
import { signIn } from '@/lib/authClient';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8; // (the server's rule: app/api/auth/signup/route.js)
const ICONS = { fan: User, artist: Music, organizer: Building, production: Wrench };

// (?next= and ?role= are read with useSearchParams, which needs a Suspense boundary)
export default function SignupPage() {
  return <Suspense><SignupPageForm /></Suspense>;
}

function SignupPageForm() {
  const router = useRouter();
  const params = useSearchParams();
  // (?role= from a "Sign up as …" link picks the role; ?next= is the page to carry on to)
  const [role, setRole] = useState(() => (ROLES.includes(params.get('role')) ? params.get('role') : 'fan'));
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFailed('');
    // every problem at once, next to its field
    const found = {};
    if (!form.name.trim()) found.name = 'Please enter your name, as you want it shown on StageVerse.';
    if (!form.email.trim()) found.email = 'Please enter your email address.';
    else if (!EMAIL.test(form.email.trim())) found.email = 'That email address looks incomplete, for example name@example.com.';
    if (form.password.length < MIN_PASSWORD) found.password = `Please use at least ${MIN_PASSWORD} characters.`;
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrors({ email: 'There is already an account with this email. Log in instead, or use another email.' });
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      track('Sign up', { role });
      // signed in straight away: no second form to fill in
      const user = await signIn(form.email.trim(), form.password);
      router.replace(next ?? homeFor(user.role));
    } catch (err) {
      setFailed(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-black font-sans text-white">
      <div aria-hidden className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <Link href="/" className="absolute left-4 top-4 z-20 flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/80 backdrop-blur-md hover:bg-white/10 hover:text-white">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Home
      </Link>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-20">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
          <h1 className="mb-1 text-center text-3xl font-bold">Create your account</h1>
          <p className="mb-6 text-center text-sm text-gray-300">Free, and it takes a minute.</p>

          {failed && <p role="alert" className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{failed}</p>}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-white/90">I am…</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                {ROLES.map((key) => {
                  const Icon = ICONS[key];
                  const on = role === key;
                  return (
                    <button key={key} type="button" role="radio" aria-checked={on} onClick={() => setRole(key)}
                      className={`relative flex min-h-12 items-start gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-amber-300 bg-amber-300/10' : 'border-white/15 bg-white/5 hover:border-white/40'}`}>
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? 'text-amber-300' : 'text-gray-300'}`} aria-hidden />
                      <span>
                        <span className="block font-bold">{ROLE_INFO[key].label}</span>
                        <span className="block text-sm leading-snug text-gray-300">{ROLE_INFO[key].blurb}</span>
                      </span>
                      {on && <Check className="absolute right-3 top-3 h-4 w-4 text-amber-300" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <AuthField label="Your name" icon={User} value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" placeholder="As you want it shown" />
            <AuthField label="Email" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" placeholder="name@example.com" />
            <AuthField label="Password" type="password" icon={Lock} value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} />

            <button type="submit" disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-lg font-bold hover:from-amber-400 hover:to-pink-500 disabled:opacity-60">
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Creating your account…</> : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-300">
            Already have an account?{' '}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-semibold text-amber-300 hover:underline">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
