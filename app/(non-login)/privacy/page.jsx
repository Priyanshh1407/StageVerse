import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';

export const metadata = { title: 'Privacy | StageVerse' };

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col bg-[#050505] text-white">
            <Navbar />
            <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-32">
                <h1 className="text-4xl font-bold">Privacy</h1>
                <p className="mt-2 text-sm text-slate-400">Last updated: November 2026</p>
                <div className="mt-8 space-y-6 text-base leading-relaxed text-slate-300">
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">What we keep</h2>
                        <p>When you create an account we keep your name, email address and role, and a scrambled (hashed) copy of your password, never the password itself. Anything you add to your profile, such as a photo, your city or a short bio, is kept too.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">What you add</h2>
                        <p>Events, setlists, tasks, guest lists, messages, memories and other things you create are stored so you and the people you work with can see them.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Songs you light up</h2>
                        <p>A song you upload to the light show on the homepage is analysed in your own browser. The file never leaves your device and we never store it.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Cookies</h2>
                        <p>We use one cookie to keep you signed in. We do not use advertising or tracking cookies.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Your choices</h2>
                        <p>You can change your profile at any time. To have your account and its data deleted, write to us from the Contact page.</p>
                    </section>
                </div>
            </main>
            <MainFooter />
        </div>
    );
}
