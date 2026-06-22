'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GooeyLoader } from '@/components/ui/loader-10';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OriginButton } from '@/components/ui/origin-button';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Bold, Italic, Underline, Strikethrough, Quote, Highlighter, Palette, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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

function getDailyPrompt(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return PROMPTS[dayOfYear % PROMPTS.length];
}

interface PhotoPreview {
  id: string;
  base64: string;
  preview: string;
}

type LoadingState = 'idle' | 'analyzing' | 'creating' | 'done';

const TEXT_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2980B9', '#8E44AD'];
const HIGHLIGHT_COLORS = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#BDE0FE', '#E2BAFF'];

function Divider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />;
}

function ToolbarBtn({ label, active, tooltip, setTooltip, onMouseDown, children }: {
  label: string; active: boolean; tooltip: string | null;
  setTooltip: (v: string | null) => void; onMouseDown: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={() => setTooltip(label)} onMouseLeave={() => setTooltip(null)}>
      <button type="button"
        onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
        style={{ background: active ? 'var(--fg)' : 'transparent', color: active ? 'var(--bg)' : 'var(--fg-secondary)' }}
        onMouseOver={e => { if (!active) e.currentTarget.style.background = 'var(--border)'; }}
        onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        {children}
      </button>
      <AnimatePresence>
        {tooltip === label && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-nowrap text-xs px-2 py-1 rounded-md pointer-events-none z-50"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WritePage() {
  const router = useRouter();
  const prompt = getDailyPrompt();
  const [entryText, setEntryText] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [highlightOn, setHighlightOn] = useState(false);
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[2]);
  const [fontSize, setFontSize] = useState(3); // 1–7 html font sizes; 3 = normal
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [textColor, setTextColor] = useState<string | null>(null);
  const [flashMinus, setFlashMinus] = useState(false);
  const [flashPlus, setFlashPlus] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DRAFT_KEY = 'backshot-draft';

  // Restore draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved && editorRef.current) {
      editorRef.current.innerHTML = saved;
      const text = editorRef.current.innerText;
      setEntryText(text);
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }
  }, []);

  // Auto-save draft on every keystroke
  const saveDraft = useCallback(() => {
    if (editorRef.current) {
      localStorage.setItem(DRAFT_KEY, editorRef.current.innerHTML);
    }
  }, []);

  const updateActiveFormats = () => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const el = node?.nodeType === 3 ? node.parentElement : node as Element | null;
    const inBlockquote = !!el?.closest('blockquote');
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      quote: inBlockquote,
    });
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    updateActiveFormats();
  };

  const toggleQuote = () => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const inBlockquote = !!(node && (node.nodeType === 3 ? node.parentElement : node as Element)?.closest('blockquote'));
    exec('formatBlock', inBlockquote ? 'div' : 'blockquote');
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
    setTextColor(color);
    setColorPickerOpen(false);
  };

  const getEditorText = () => editorRef.current?.innerText ?? '';
  const getEditorHTML = () => editorRef.current?.innerHTML ?? '';

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = useCallback(async (files: File[]) => {
    const toAdd = files.filter(f => f.type.startsWith('image/'));
    const newPhotos: PhotoPreview[] = await Promise.all(
      toAdd.map(async (file) => ({
        id: crypto.randomUUID(),
        base64: await fileToBase64(file),
        preview: URL.createObjectURL(file),
      }))
    );
    setPhotos(prev => [...prev, ...newPhotos]);
    setImportOpen(false);
  }, []);

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  const handleSubmit = async () => {
    const text = getEditorText().trim();
    if (!text) { setError('Write something first.'); return; }
    setError(null);
    try {
      let photoIds: string[] = [];
      if (photos.length > 0) {
        setLoadingState('analyzing');
        const res = await fetch('/api/analyze-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: photos.map(p => ({ base64: p.base64, photoId: p.id })) }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to analyze photos');
        const data = await res.json();
        photoIds = data.fingerprints.map((f: { photoId: string }) => f.photoId);
      }
      setLoadingState('creating');
      const res = await fetch('/api/create-daylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryText: text, entryHtml: getEditorHTML(), photoIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create entry');
      const { daylistId } = await res.json();
      setLoadingState('done');
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/daylist/${daylistId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingState('idle');
    }
  };

  const isLoading = loadingState !== 'idle' && loadingState !== 'done';
  const canSubmit = charCount > 0;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="glass fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-center relative" style={{ borderBottom: '1px solid var(--border)' }}>
        <BackButton />
        <span className="font-display font-semibold text-sm" style={{ color: 'var(--fg)' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </span>
        <ThemeToggle />
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pt-12 pb-24">
        <p className="text-xs uppercase tracking-widest mb-2 font-medium" style={{ color: 'var(--fg-tertiary)' }}>
          Today&apos;s prompt
        </p>
        <p className="font-display text-2xl mb-1 leading-snug" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
          {prompt}
        </p>
        <p className="text-sm mb-5" style={{ color: 'var(--fg-secondary)' }}>
          Or just write whatever&apos;s on your mind.
        </p>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 mb-2 -ml-1 sticky top-14 z-10 py-2" style={{ background: 'var(--bg)' }}>

          {/* Group 1: Bold Italic Underline Strikethrough */}
          {([
            { label: 'Bold', icon: Bold, cmd: 'bold' },
            { label: 'Italic', icon: Italic, cmd: 'italic' },
            { label: 'Underline', icon: Underline, cmd: 'underline' },
            { label: 'Strikethrough', icon: Strikethrough, cmd: 'strikeThrough' },
          ] as { label: string; icon: React.ComponentType<{ size?: number }>; cmd: string }[]).map(tool => {
            const active = !!activeFormats[tool.cmd];
            return (
              <ToolbarBtn key={tool.label} label={tool.label} active={active} tooltip={tooltip} setTooltip={setTooltip}
                onMouseDown={() => exec(tool.cmd)}>
                <tool.icon size={14} />
              </ToolbarBtn>
            );
          })}

          <Divider />

          {/* Group 2: Color, Highlight */}
          <div className="relative"
            onMouseEnter={() => { setTooltip('Color'); setColorPickerOpen(true); }}
            onMouseLeave={() => { setTooltip(null); setColorPickerOpen(false); }}>
            <button type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: textColor ?? 'var(--fg-secondary)' }}
>
              <Palette size={14} />
            </button>
            <AnimatePresence>
              {colorPickerOpen && (
                <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }} transition={{ duration: 0.14 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 p-2 rounded-xl flex gap-1.5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  {TEXT_COLORS.map(color => (
                    <button key={color} type="button"
                      onMouseDown={e => { e.preventDefault(); applyColor(color); }}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{ background: color }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative"
            onMouseEnter={() => { setTooltip('Highlight'); setHighlightPickerOpen(true); }}
            onMouseLeave={() => { setTooltip(null); setHighlightPickerOpen(false); }}>
            <button type="button"
              onMouseDown={e => {
                e.preventDefault();
                const next = !highlightOn;
                setHighlightOn(next);
                const color = next ? highlightColor : 'transparent';
                const ok = document.execCommand('backColor', false, color);
                if (!ok) document.execCommand('hiliteColor', false, color);
                editorRef.current?.focus();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ background: highlightOn ? highlightColor : 'transparent', color: highlightOn ? '#000' : 'var(--fg-secondary)' }}
              onMouseOver={e => { if (!highlightOn) e.currentTarget.style.background = 'var(--border)'; }}
              onMouseOut={e => { if (!highlightOn) e.currentTarget.style.background = 'transparent'; }}>
              <Highlighter size={14} />
            </button>
            <AnimatePresence>
              {highlightPickerOpen && (
                <motion.div initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }} transition={{ duration: 0.14 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 p-2 rounded-xl flex gap-1.5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  {HIGHLIGHT_COLORS.map(color => (
                    <button key={color} type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        setHighlightColor(color);
                        setHighlightOn(true);
                        const ok = document.execCommand('backColor', false, color);
                        if (!ok) document.execCommand('hiliteColor', false, color);
                        editorRef.current?.focus();
                      }}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ background: color, outline: highlightColor === color ? '2px solid var(--fg)' : 'none', outlineOffset: 1 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Divider />

          {/* Group 3: Quote */}
          <ToolbarBtn label="Quote" active={!!activeFormats.quote} tooltip={tooltip} setTooltip={setTooltip}
            onMouseDown={toggleQuote}>
            <Quote size={14} />
          </ToolbarBtn>

          <Divider />

          {/* Group 4: Alignment */}
          {([
            { label: 'Align Left', icon: AlignLeft, cmd: 'justifyLeft' },
            { label: 'Align Center', icon: AlignCenter, cmd: 'justifyCenter' },
            { label: 'Align Right', icon: AlignRight, cmd: 'justifyRight' },
          ] as { label: string; icon: React.ComponentType<{ size?: number }>; cmd: string }[]).map(tool => (
            <ToolbarBtn key={tool.label} label={tool.label} active={!!activeFormats[tool.cmd]} tooltip={tooltip} setTooltip={setTooltip}
              onMouseDown={() => exec(tool.cmd)}>
              <tool.icon size={14} />
            </ToolbarBtn>
          ))}

          <Divider />

          {/* Group 5: Font size */}
          <div className="flex items-center gap-1 px-1">
            <button type="button"
              onMouseDown={e => {
                e.preventDefault();
                const next = Math.max(1, fontSize - 1);
                setFontSize(next);
                exec('fontSize', String(next));
                setFlashMinus(true); setTimeout(() => setFlashMinus(false), 150);
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors hover:bg-[var(--border)] hover:text-[var(--fg)]"
              style={{ background: flashMinus ? 'var(--fg)' : undefined, color: flashMinus ? 'var(--bg)' : 'var(--fg-secondary)' }}
>
              −
            </button>
            <span className="text-xs tabular-nums w-4 text-center select-none" style={{ color: 'var(--fg-secondary)' }}>
              {fontSize}
            </span>
            <button type="button"
              onMouseDown={e => {
                e.preventDefault();
                const next = Math.min(7, fontSize + 1);
                setFontSize(next);
                exec('fontSize', String(next));
                setFlashPlus(true); setTimeout(() => setFlashPlus(false), 150);
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors hover:bg-[var(--border)] hover:text-[var(--fg)]"
              style={{ background: flashPlus ? 'var(--fg)' : undefined, color: flashPlus ? 'var(--bg)' : 'var(--fg-secondary)' }}
>
              +
            </button>
          </div>

        </div>

        {/* Rich text editor */}
        <div
          ref={editorRef}
          contentEditable={!isLoading}
          suppressContentEditableWarning
          onInput={() => {
            const text = editorRef.current?.innerText ?? '';
            setCharCount(text.trim().length);
            setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
            updateActiveFormats();
            saveDraft();
          }}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          onKeyDown={e => {
            // Exit blockquote on Enter when current line is empty
            if (e.key === 'Enter' && !e.shiftKey) {
              const sel = window.getSelection();
              if (!sel || !sel.rangeCount) return;
              const node = sel.getRangeAt(0).startContainer;
              const blockquote = (node.nodeType === 3 ? node.parentElement : node as Element)?.closest('blockquote');
              if (blockquote) {
                const lineText = (node.nodeType === 3 ? node.textContent : (node as Element).textContent) ?? '';
                if (lineText.trim() === '') {
                  e.preventDefault();
                  exec('formatBlock', 'div');
                }
              }
            }
          }}
          className="w-full outline-none text-lg leading-relaxed font-display min-h-[16rem] empty:before:content-[attr(data-placeholder)] empty:before:pointer-events-none"
          data-placeholder="..."
          style={{
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '24px',
            opacity: isLoading ? 0.4 : 1,
          }}
        />

        <style>{`
          [contenteditable]:empty:before { color: var(--fg-tertiary); }
          [contenteditable]::selection, [contenteditable] *::selection {
            background: var(--fg);
            color: var(--bg);
          }
          [contenteditable] blockquote {
            border-left: 3px solid var(--border);
            margin: 0.5em 0;
            padding-left: 1em;
            color: var(--fg-secondary);
          }
        `}</style>

        <div className="group flex gap-3 items-center mt-1.5 mb-4 w-fit cursor-default">
          <span className="transition-opacity duration-200 opacity-0 group-hover:opacity-100" style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} characters
          </span>
        </div>

        {/* Hidden file input — lives outside popup so file dialog survives mouse-leave */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
        />

        {/* Photo thumbnails */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="Preview" className="w-20 h-20 object-cover rounded-2xl"
                  style={{ border: '1px solid var(--border)' }} />
                <button
                  onClick={() => removePhoto(photo.id)}
                  disabled={isLoading}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--fg)' }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Import button */}
        <div className="flex justify-center">
          <OriginButton onClick={() => fileInputRef.current?.click()} aria-label="Add photos">
            <Upload size={15} />
          </OriginButton>
        </div>

        {error && (
          <p className="mt-3 text-sm" style={{ color: '#C0392B' }}>{error}</p>
        )}

        <div className="mt-4">
          {isLoading ? (
            <GooeyLoader className="w-full" />
          ) : (
            <OriginButton
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              See my day
            </OriginButton>
          )}
        </div>
      </div>
    </main>
  );
}
