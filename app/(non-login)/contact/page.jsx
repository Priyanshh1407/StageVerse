'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Mail, LifeBuoy, MapPin, ArrowRight, Navigation, CheckCircle2, Loader2 } from 'lucide-react';
import MainFooter from '@/components/MainFooter';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const [status, setStatus] = useState('idle');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();

      if (json.success) {
        setStatus('success');
        toast.success("Message sent successfully!");
        setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('idle');
        toast.error(json.error || "Failed to send message");
      }
    } catch (err) {
      console.error(err);
      setStatus('idle');
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #27272A inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className="bg-[#0F0F10] text-gray-200 min-h-screen flex flex-col font-sans antialiased selection:bg-[#00d4ff] selection:text-black">

        <Navbar />

        <main className="flex-grow">

          {}
          <div className="relative py-16 sm:py-24 bg-[#0F0F10]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                Get in touch
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Have questions about an event? Want to partner with StageVerse? We&apos;re here to help. Fill out the form or reach out directly.
              </p>
            </div>
          </div>

          {}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

              {}
              <div className="space-y-8">

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {}
                  <div className="bg-[#18181B] p-6 rounded-2xl border border-white/5 shadow-sm hover:border-[#00d4ff]/50 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-[#00d4ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#00d4ff]/20 transition-colors">
                      <Mail className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Email Us</h3>
                    <p className="text-gray-400 text-sm mb-4">For general inquiries and support.</p>
                    <a href="mailto:hello@stageverse.com" className="text-[#00d4ff] hover:text-cyan-300 font-medium text-sm inline-flex items-center gap-1">
                      hello@stageverse.com
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>

                  {}
                  <div className="bg-[#18181B] p-6 rounded-2xl border border-white/5 shadow-sm hover:border-[#00d4ff]/50 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-[#00d4ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#00d4ff]/20 transition-colors">
                      <LifeBuoy className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Support Center</h3>
                    <p className="text-gray-400 text-sm mb-4">Check our FAQs for quick answers.</p>
                    <a href="#" className="text-[#00d4ff] hover:text-cyan-300 font-medium text-sm inline-flex items-center gap-1">
                      Visit Help Center
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {}
                <div className="bg-[#18181B] p-2 rounded-2xl border border-white/5 shadow-sm h-64 relative overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop"
                    alt="Map of office location"
                    className="w-full h-full object-cover rounded-xl filter grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      <MapPin className="w-12 h-12 text-[#00d4ff] drop-shadow-lg" />
                      <div className="w-8 h-2 bg-black/50 blur-sm rounded-full absolute bottom-1 left-1/2 -translate-x-1/2"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 bg-[#18181B]/90 backdrop-blur p-3 rounded-lg border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Headquarters</p>
                      <p className="text-sm text-white font-medium">1200 Music Row, Nashville, TN</p>
                    </div>
                    <a href="#" className="w-8 h-8 rounded-full bg-[#00d4ff] text-black flex items-center justify-center hover:bg-cyan-300 transition-colors">
                      <Navigation className="w-4 h-4" />
                    </a>
                  </div>
                </div>

              </div>

              {}
              <div className="bg-[#18181B] p-8 sm:p-10 rounded-3xl border border-white/5 shadow-xl">
                <form className="space-y-6" onSubmit={handleSubmit}>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                        className="block w-full rounded-lg border border-white/10 bg-[#27272A] text-white shadow-sm focus:bg-[#27272A] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] sm:text-sm py-3 px-4 placeholder-gray-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="block w-full rounded-lg border border-white/10 bg-[#27272A] text-white shadow-sm focus:bg-[#27272A] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] sm:text-sm py-3 px-4 placeholder-gray-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="block w-full rounded-lg border border-white/10 bg-[#27272A] text-white shadow-sm focus:bg-[#27272A] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] sm:text-sm py-3 px-4 transition-all outline-none appearance-none"
                    >
                      <option>General Inquiry</option>
                      <option>Ticket Support</option>
                      <option>Artist Partnership</option>
                      <option>Press & Media</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                      required
                      className="block w-full rounded-lg border border-white/10 bg-[#27272A] text-white shadow-sm focus:bg-[#27272A] focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] sm:text-sm py-3 px-4 placeholder-gray-500 transition-all outline-none resize-none"
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={status !== 'idle'}
                      className={`
                        w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00d4ff] focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed
                        ${status === 'success'
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-[#00d4ff] text-black hover:bg-cyan-400'}
                      `}
                    >
                      {status === 'loading' ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Message Sent!
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-center text-gray-500 mt-4">
                    By submitting this form, you agree to our <a href="#" className="underline hover:text-[#00d4ff]">Privacy Policy</a>.
                  </p>

                </form>
              </div>

            </div>
          </div>
        </main>

        <MainFooter />
      </div>
    </>
  );
}