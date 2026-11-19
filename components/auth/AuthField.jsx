'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * A labelled sign-in or sign-up field: its label above it, its own error under it (read out when it appears), and
 * for a password a button to show what was typed.
 */
export default function AuthField({ label, type = 'text', value, onChange, error, hint, icon: Icon, ...props }) {
    const id = useId();
    const [shown, setShown] = useState(false);
    const isPassword = type === 'password';
    const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-white/90">{label}</label>
            <div className="relative">
                {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />}
                <input
                    id={id}
                    type={isPassword && shown ? 'text' : type}
                    value={value}
                    onChange={onChange}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={`block min-h-12 w-full rounded-xl border bg-black/50 py-3 pr-12 text-base text-white placeholder-gray-500 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/60 ${Icon ? 'pl-12' : 'pl-4'} ${error ? 'border-red-400' : 'border-white/15'}`}
                    {...props}
                />
                {isPassword && (
                    <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white">
                        {shown ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                    </button>
                )}
            </div>
            {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-sm text-gray-300">{hint}</p>}
            {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-300">{error}</p>}
        </div>
    );
}
