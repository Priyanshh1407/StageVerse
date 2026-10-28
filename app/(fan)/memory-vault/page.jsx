import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import MemoryVaultContent from './MemoryVaultContent';

export const metadata = {
  title: 'Memory Vault | StageVerse',
  description: 'Your concert history and media collection.',
};
function VaultLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f5f7f8] dark:bg-[#101b22]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#0d93f2]" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Vault...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<VaultLoader />}>
      <MemoryVaultContent />
    </Suspense>
  );
}