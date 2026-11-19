import Navbar from '@/components/Navbar';
import MainFooter from '@/components/MainFooter';

export const metadata = { title: 'Terms | StageVerse' };

export default function Page() {
    return (
        <div className="flex min-h-screen flex-col bg-[#050505] text-white">
            <Navbar />
            <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-32">
                <h1 className="text-4xl font-bold">Terms</h1>
                <p className="mt-2 text-sm text-slate-400">Last updated: November 2026</p>
                <div className="mt-8 space-y-6 text-base leading-relaxed text-slate-300">
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Using StageVerse</h2>
                        <p>StageVerse is a platform for fans, artists, organizers and production crews to plan and follow live shows. Use it lawfully and respect the people you work with on it.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Your account</h2>
                        <p>Keep your password to yourself. You are responsible for what is done with your account.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Your content</h2>
                        <p>What you add stays yours. You allow us to store and show it to the people it is meant for.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Tickets</h2>
                        <p>StageVerse does not sell tickets. An event page says where its tickets are sold; buying them is between you and that seller.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Music</h2>
                        <p>Songs on this site are used for educational, non-commercial purposes only. All rights belong to their respective owners.</p>
                    </section>
                    <section>
                        <h2 className="mb-2 text-xl font-bold text-white">Changes</h2>
                        <p>We may update these terms. The date at the top says when they last changed.</p>
                    </section>
                </div>
            </main>
            <MainFooter />
        </div>
    );
}
