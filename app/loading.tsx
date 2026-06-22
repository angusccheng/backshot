import { GooeyLoader } from '@/components/ui/loader-10';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <GooeyLoader />
    </div>
  );
}
