'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import Router
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Building, Wrench, Chrome, AlertTriangle, Music, Settings, ArrowLeft } from 'lucide-react';

const SignupPage = () => {
  const router = useRouter(); // Initialize Router
  const [role, setRole] = useState('fan');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add Loading State

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    jobTitle: '',
    genre: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);    if (!formData.name) { setIsLoading(false); return setError('ERR_MISSING_FIELD: Full_Name is required.'); }
    if (!formData.email.includes('@')) { setIsLoading(false); return setError('CRITICAL: Invalid_Email_Format.'); }
    if (formData.password.length < 6) { setIsLoading(false); return setError('SECURITY_WARN: Password too weak.'); }

    if (role === 'organizer' && !formData.orgName) { setIsLoading(false); return setError('ERR_ENTITY: Organization_Name missing.'); }
    if (role === 'production' && !formData.jobTitle) { setIsLoading(false); return setError('ERR_ROLE: Job_Title not selected.'); }
    if (role === 'artist' && !formData.genre) { setIsLoading(false); return setError('ERR_ARTIST: Genre is required.'); }

    try {      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,        ...(role === 'organizer' && { organization: formData.orgName }), // Ensure Schema has this field
        ...(role === 'production' && { jobTitle: formData.jobTitle }),   // Ensure Schema has this field
        ...(role === 'artist' && { genre: formData.genre }),             // Ensure Schema has this field
      };      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }      console.log('Signup Successful!');      router.push('/login'); 

    } catch (err) {
      console.error('Signup Error:', err);
      setError(err.message);
    } finally {
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
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-pink-500/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      </div>

      {}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          opacity: { duration: 0.5 },
          layout: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 }
        }}
        className="relative z-10 w-[95%] sm:w-[90%] max-w-4xl max-h-[95dvh] overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-12 m-2 scrollbar-hide"
      >
        <div
          className="absolute inset-0 rounded-[2rem] bg-black/40 backdrop-blur-xl border border-cyan-500/50"
          style={{ boxShadow: '0 0 50px 10px rgba(6,182,212, 0.2), inset 0 0 20px rgba(6,182,212, 0.1)' }}
        />

        <motion.div layout className="relative z-20 flex flex-col items-center w-full max-w-lg h-full justify-center">

          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-widest drop-shadow-md">StageVerse</span>
          </div>

          <div className="w-full flex justify-center min-h-[20px] mb-2">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="flex items-center gap-2 px-3 py-0.5 bg-yellow-900/60 border border-dashed border-yellow-500 rounded text-yellow-200 text-[10px] font-mono"
                >
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center drop-shadow-lg">
            Create your account
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mb-4 sm:mb-6 p-1 bg-white/5 rounded-xl border border-white/10">
            <RoleButton active={role === 'fan'} onClick={() => setRole('fan')} icon={User} label="Fan" />
            <RoleButton active={role === 'artist'} onClick={() => setRole('artist')} icon={Music} label="Artist" />
            <RoleButton active={role === 'organizer'} onClick={() => setRole('organizer')} icon={Building} label="Organizer" />
            <RoleButton active={role === 'production'} onClick={() => setRole('production')} icon={Wrench} label="Production" />
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4">

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <InputField name="name" type="text" placeholder="Full Name" icon={User} value={formData.name} onChange={handleChange} />
              <InputField name="email" type="text" placeholder="Email" icon={Mail} value={formData.email} onChange={handleChange} />
            </div>

            <AnimatePresence mode="wait">
              {role === 'artist' && (
                <motion.div
                  key="artist"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Music className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                    <select
                      name="genre"
                      value={formData.genre}
                      onChange={handleChange}
                      className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm sm:text-base appearance-none backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 cursor-pointer">
                      <option value="" className="bg-gray-900 text-gray-500">Select Genre...</option>
                      <option value="Pop" className="bg-gray-900">Pop</option>
                      <option value="Electronic" className="bg-gray-900">Electronic / EDM</option>
                      <option value="Rock" className="bg-gray-900">Rock</option>
                      <option value="Other" className="bg-gray-900">Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500">▼</div>
                  </div>
                </motion.div>
              )}

              {role === 'organizer' && (
                <motion.div
                  key="org"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <InputField name="orgName" type="text" placeholder="Organization Name" icon={Building} value={formData.orgName} onChange={handleChange} />
                </motion.div>
              )}

              {role === 'production' && (
                <motion.div
                  key="prod"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Wrench className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400" />
                    </div>
                    <select
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm sm:text-base appearance-none backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 cursor-pointer"
                    >
                      <option value="" className="bg-gray-900 text-gray-500">Select Job Title...</option>
                      <option value="LD" className="bg-gray-900">Lighting Designer (LD)</option>
                      <option value="FOH" className="bg-gray-900">FOH Audio Engineer</option>
                      <option value="SM" className="bg-gray-900">Stage Manager</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500">▼</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <InputField name="password" type="password" placeholder="Password" icon={Lock} value={formData.password} onChange={handleChange} />

            <button
              type="submit"
              disabled={isLoading} // Disable while loading
              className="w-full py-3 sm:py-3.5 rounded-xl text-white font-bold text-base sm:text-lg tracking-wider uppercase transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-[0.98] mt-2 disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
            
            {}
          </form>

          <p className="mt-4 sm:mt-6 text-gray-400 text-xs">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              Log in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};const RoleButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-300 ${active
      ? 'bg-cyan-500/20 border border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
      }`}
  >
    <Icon className={`w-4 h-4 mb-1 ${active ? 'text-cyan-400' : 'text-gray-500'}`} />
    <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
  </button>
);

const InputField = ({ name, type, placeholder, icon: Icon, value, onChange }) => (
  <div className="relative group w-full">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
    </div>
    <input
      name={name}
      type={type}
      className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder-gray-500 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export default SignupPage;