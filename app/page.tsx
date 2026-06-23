import { ThemeToggle } from '@/components/ThemeToggle';
import { LampContainer } from '@/components/ui/lamp';
import { LogoTyping } from '@/components/LogoTyping';
import { WriteButton } from '@/components/WriteButton';

const PROMPTS = [
  "What made you pause today?",
  "Describe a texture you noticed.",
  "What sound stayed with you?",
  "Who surprised you today, and how?",
  "What did the light look like this morning?",
  "Name something small that brought comfort.",
  "What were you thinking about on your commute?",
  "Describe a moment you wanted to hold onto.",
  "What conversation lingered in your mind?",
  "What do you wish you'd said differently?",
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HomePage() {
  const today = new Date();
  const prompt = PROMPTS[getDayOfYear() % PROMPTS.length];
  const day = today.toLocaleDateString('en-US', { weekday: 'long' });
  const date = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', transition: 'background 0.3s' }}>
      {/* Nav */}
      <nav className="glass fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <LogoTyping />
        <ThemeToggle />
      </nav>

      <LampContainer className="flex-1">
        <div className="text-center max-w-xl w-full">
          <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--fg-tertiary)' }}>
            {day}
          </p>
          <h1 className="font-display font-semibold mb-6" style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'var(--fg)', letterSpacing: '-0.03em' }}>
            {date}
          </h1>

          <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--fg-tertiary)' }}>
            A thought, if you need one
          </p>
          <p className="font-display text-2xl leading-snug mb-2" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            {prompt}
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-secondary)' }}>
            Or just write whatever&apos;s on your mind.
          </p>

          <div className="flex justify-center">
            <WriteButton />
          </div>
        </div>
      </LampContainer>
    </main>
  );
}
