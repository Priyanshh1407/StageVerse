'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Chrome, AlertTriangle, ArrowLeft } from 'lucide-react';
const ROLE_PATHS = {
  fan: '/dashboard',
  organizer: '/manage/dashboard',
  crew: '/prod-dashboard',
  artist: '/artist-dashboard', // Note: Artist path is unique
  admin: '/admin/overview'     // Easy to add new roles later
};

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    if (!email.includes('@') || password.length < 6) {
      setError('Invalid credentials format.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login Failed');
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      const userRole = data.user.role;
      const destination = ROLE_PATHS[userRole] || '/dashboard';

      console.log(`✅ Login Success! User is a ${userRole}. Redirecting to ${destination}...`);
      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 500);
    } catch (err) {
      console.log('Login Error: ', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-black font-sans">

      {}
      <Link
        href="/"
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium hidden sm:inline">Home</span>
      </Link>

      {}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-pink-500/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      </div>

      {}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-[90%] max-w-lg flex flex-col items-center justify-center p-6 sm:p-12 md:p-16"
      >
        <div
          className="absolute inset-0 rounded-[2rem] bg-black/40 backdrop-blur-xl border border-cyan-500/50"
          style={{
            boxShadow: '0 0 50px 10px rgba(6,182,212, 0.2), inset 0 0 20px rgba(6,182,212, 0.1)'
          }}
        />

        <div className="relative z-20 flex flex-col items-center w-full">

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.001c-3.701 2.88-8.2 5.264-13.256 5.264a.75.75 0 01-.75-.75c0-5.056 2.384-9.555 6.084-12.436z" clipRule="evenodd" />
                <path d="M4.5 16.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM16.5 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white tracking-widest drop-shadow-md">StageVerse</span>
          </div>

          <div className="h-8 mb-2 w-full flex justify-center">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 px-3 py-1 bg-yellow-900/60 border border-dashed border-yellow-500 rounded text-yellow-200 text-xs font-mono"
                >
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8 text-center drop-shadow-lg">
            Log in to your account
          </h2>

          <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-6">

            <InputField
              type="text"
              placeholder="Email Address"
              icon={Mail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
            />

            <InputField
              type="password"
              placeholder="Password"
              icon={Lock}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 sm:py-4 rounded-xl text-white font-bold text-lg sm:text-xl tracking-wider uppercase transition-all duration-300 
                         bg-gradient-to-r from-cyan-500 to-blue-600 
                         hover:from-cyan-400 hover:to-blue-500
                         hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]
                         active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? 'Verifying...' : 'Login'}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-sm">or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              type="button"
              className="w-full py-3 sm:py-4 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-all duration-300
                         bg-white/5 border border-white/10 backdrop-blur-md
                         hover:bg-white/10 hover:border-cyan-500/30
                         hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <Chrome className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </form>

          <p className="mt-6 sm:mt-8 text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              Signup
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const InputField = ({ type, placeholder, icon: Icon, value, onChange }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <Icon className="h-6 w-6 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
    </div>
    <input
      type={type}
      className="block w-full pl-12 pr-4 py-3 sm:py-4 bg-black/50 border border-white/10 rounded-xl 
               text-white text-lg placeholder-gray-500 backdrop-blur-sm
               focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50
               transition-all duration-300"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export default LoginPage;