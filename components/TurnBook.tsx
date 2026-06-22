'use client';

/**
 * TurnBook — React port of turn.js fold algorithm.
 * Uses 2D CSS transforms (not backface-visibility) to compute a true paper-fold.
 * The fold line is computed geometrically; two DOM elements show each side of the fold.
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const A90 = Math.PI / 2;

function pt(x: number, y: number) { return { x, y }; }

function bezierPt(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
  t: number
) {
  const m = 1 - t, m3 = m * m * m, t3 = t * t * t;
  return pt(
    Math.round(m3 * p1.x + 3 * t * m * m * p2.x + 3 * t * t * m * p3.x + t3 * p4.x),
    Math.round(m3 * p1.y + 3 * t * m * m * p2.y + 3 * t * t * m * p3.y + t3 * p4.y)
  );
}

// turn.js circular ease-out
function easeOut(t: number) { return Math.sqrt(1 - (t - 1) * (t - 1)); }

function applyTx(el: HTMLElement | null, tx: string, origin = '0% 0%') {
  if (!el) return;
  el.style.transformOrigin = origin;
  el.style.transform = tx;
}

// ── Fold math (ported from turn.js _fold, br/bl cases) ────────────────────

function computeFold(
  px: number, py: number,
  W: number, H: number, S: number,
  corner: 'br' | 'bl'
) {
  const left = corner === 'bl';
  const top = false;
  const ox = left ? 0 : W;
  const oy = H;

  const relX = left ? px - ox : ox - px;
  const relY = oy - py;
  if (relX === 0 && relY === 0) return null;

  const tanAngle = Math.atan2(relY, relX);
  const alpha = A90 - tanAngle;
  const a = (alpha / Math.PI) * 180;

  const midX = left ? W - relX / 2 : px + relX / 2;
  const midY = relY / 2;

  const gamma = alpha - Math.atan2(midY, midX);
  const dist = Math.max(0, Math.sin(gamma) * Math.sqrt(midX * midX + midY * midY));

  let trX = dist * Math.sin(alpha);
  let trY = dist * Math.cos(alpha);
  let mvX = 0, mvY = 0;

  if (alpha > A90) {
    trX += Math.abs(trY * Math.tan(Math.PI - alpha));
    trY = 0;
    const beta = Math.PI - alpha;
    const dd = S - H / Math.sin(beta);
    mvX = Math.round(dd * Math.cos(beta));
    mvY = Math.round(dd * Math.sin(beta));
    if (left) mvX = -mvX;
  }

  const foldPx = Math.round(trY / Math.tan(alpha) + trX);
  const side = W - foldPx;
  const sideX = side * Math.cos(alpha * 2);
  const sideY = side * Math.sin(alpha * 2);

  const dfX = Math.round(left ? side - sideX : foldPx + sideX);
  const dfY = Math.round(H - sideY);

  const gradientSize = side * Math.sin(alpha);
  const far = Math.sqrt(Math.pow((left ? W * 2 : -W) - px, 2) + Math.pow(H - py, 2));
  const gradientOpacity = Math.min(1, far / W);

  return {
    a: corner === 'bl' ? -a : a,
    rawA: a,
    alpha,
    trX: Math.round(trX),
    trY: Math.round(trY),
    mvX, mvY, dfX, dfY,
    gradientSize, gradientOpacity,
    left,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export interface TurnBookRef {
  flipNext: () => void;
  flipPrev: () => void;
}

interface Props {
  pages: React.ReactNode[];
  pageWidth: number;
  pageHeight: number;
  duration?: number;
  onFlip?: (spread: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const TurnBook = forwardRef<TurnBookRef, Props>(function TurnBook(
  { pages, pageWidth: W, pageHeight: H, duration = 650, onFlip, className, style },
  ref
) {
  const S = Math.round(Math.sqrt(W * W + H * H)); // diagonal — fwrapper size

  const [spreadIdx, setSpreadIdx] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');

  // We store "flip content" as refs so we can start animation immediately
  // after state change without waiting for another render cycle
  const flipFrontRef = useRef<React.ReactNode>(null);
  const flipBackRef = useRef<React.ReactNode>(null);
  const [, forceFlipRender] = useState(0);

  const totalSpreads = Math.ceil(pages.length / 2);
  const targetSpreadRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingFlipRef = useRef<'next' | 'prev' | null>(null);

  // DOM refs — moving elements
  const flipWrapRef = useRef<HTMLDivElement>(null);    // clips flat part (overflow:hidden)
  const flipPageRef = useRef<HTMLDivElement>(null);    // gets rotated
  const ashadowRef = useRef<HTMLDivElement>(null);     // front gradient
  const bshadowRef = useRef<HTMLDivElement>(null);     // shadow on static side

  // fold wrapper DOM
  const fparentRef = useRef<HTMLDivElement>(null);
  const fwrapperRef = useRef<HTMLDivElement>(null);
  const fwrapInnerRef = useRef<HTMLDivElement>(null);
  const fpageRef = useRef<HTMLDivElement>(null);

  function getSpread(idx: number) {
    return {
      left: pages[idx * 2] ?? null,
      right: pages[idx * 2 + 1] ?? null,
    };
  }

  // Apply all fold transforms to DOM elements
  function applyFold(fold: NonNullable<ReturnType<typeof computeFold>>, corner: 'br' | 'bl') {
    const { a, trX, trY, mvX, mvY, dfX, dfY, gradientSize, gradientOpacity, alpha } = fold;
    const mvH = H - S; // always negative (S > H)

    if (corner === 'br') {
      // Page element: rotate around bottom-left corner
      if (flipPageRef.current) {
        flipPageRef.current.style.left = '0';
        flipPageRef.current.style.top = 'auto';
        flipPageRef.current.style.right = 'auto';
        flipPageRef.current.style.bottom = '0';
      }
      applyTx(flipPageRef.current, `rotate(${a}deg) translate(${-trX + 1}px, ${-trY}px)`, '0% 100%');
      applyTx(flipWrapRef.current, `translate(${trX - 1}px, ${trY + mvH}px) rotate(${-a}deg)`, '0% 100%');
      applyTx(fwrapperRef.current, `translate(${trX + mvX}px, ${trY + mvY + mvH}px) rotate(${-a}deg)`, '0% 100%');
      if (fwrapInnerRef.current) {
        fwrapInnerRef.current.style.left = '0';
        fwrapInnerRef.current.style.top = 'auto';
        fwrapInnerRef.current.style.right = 'auto';
        fwrapInnerRef.current.style.bottom = '0';
      }
      applyTx(fwrapInnerRef.current, `rotate(${a}deg) translate(${-trX + dfX - mvX}px, ${-trY + dfY - mvY}px)`, '0% 100%');
      applyTx(fpageRef.current, `rotate(${90 - a * 2}deg)`, '0% 0%');
    } else {
      // bl corner — mirror
      if (flipPageRef.current) {
        flipPageRef.current.style.left = 'auto';
        flipPageRef.current.style.top = 'auto';
        flipPageRef.current.style.right = '0';
        flipPageRef.current.style.bottom = '0';
      }
      applyTx(flipPageRef.current, `rotate(${a}deg) translate(${trX - 1}px, ${-trY}px)`, '100% 100%');
      applyTx(flipWrapRef.current, `translate(${-trX + 1}px, ${trY + mvH}px) rotate(${-a}deg)`, '100% 100%');
      applyTx(fwrapperRef.current, `translate(${-trX + mvX}px, ${trY + mvY + mvH}px) rotate(${-a}deg)`, '100% 100%');
      if (fwrapInnerRef.current) {
        fwrapInnerRef.current.style.left = 'auto';
        fwrapInnerRef.current.style.top = 'auto';
        fwrapInnerRef.current.style.right = '0';
        fwrapInnerRef.current.style.bottom = '0';
      }
      applyTx(fwrapInnerRef.current, `rotate(${a}deg) translate(${trX - dfX + mvX}px, ${-trY + dfY - mvY}px)`, '100% 100%');
      applyTx(fpageRef.current, `rotate(${-90 + a * 2}deg)`, '100% 0%');
    }

    // Front gradient shadow on the fold face
    if (ashadowRef.current) {
      const startV = gradientSize > 100 ? (gradientSize - 100) / gradientSize : 0;
      const endX = gradientSize * Math.sin(A90 - alpha) / H * 100;
      const endY = gradientSize * Math.cos(A90 - alpha) / W * 100;
      const g0 = `rgba(0,0,0,0)`;
      const g1 = `rgba(0,0,0,${(0.2 * gradientOpacity).toFixed(3)})`;
      const g2 = `rgba(255,255,255,${(0.2 * gradientOpacity).toFixed(3)})`;
      const fx = corner === 'br' ? 100 : 0, fy = 100;
      ashadowRef.current.style.background =
        `linear-gradient(from ${fx}% ${fy}% to ${endX}% ${endY}%, ${g0} ${(startV * 100).toFixed(1)}%, ${g1} ${((1 - startV) * 0.8 + startV) * 100}%, ${g2} 100%)`;
    }

    // Back shadow on the static opposite page
    if (bshadowRef.current) {
      const endX2 = gradientSize * Math.sin(alpha) / W * 100;
      const endY2 = gradientSize * Math.cos(alpha) / H * 100;
      const bfx = corner === 'br' ? 0 : 100, bfy = 100;
      const ex = corner === 'br' ? endX2 : 100 - endX2;
      bshadowRef.current.style.background =
        `linear-gradient(from ${bfx}% ${bfy}% to ${ex}% ${endY2}%, rgba(0,0,0,0) 80%, rgba(0,0,0,${(0.3 * gradientOpacity).toFixed(3)}) 100%)`;
      bshadowRef.current.style.display = '';
    }
  }

  function resetTransforms() {
    [flipWrapRef, flipPageRef, fwrapperRef, fwrapInnerRef, fpageRef].forEach(r => {
      if (r.current) { r.current.style.transform = ''; r.current.style.transformOrigin = ''; }
    });
    if (flipPageRef.current) {
      flipPageRef.current.style.left = '';
      flipPageRef.current.style.top = '';
      flipPageRef.current.style.right = '';
      flipPageRef.current.style.bottom = '';
    }
    if (fwrapInnerRef.current) {
      fwrapInnerRef.current.style.left = '';
      fwrapInnerRef.current.style.top = '';
      fwrapInnerRef.current.style.right = '';
      fwrapInnerRef.current.style.bottom = '';
    }
    if (ashadowRef.current) ashadowRef.current.style.background = 'none';
    if (bshadowRef.current) { bshadowRef.current.style.background = 'none'; bshadowRef.current.style.display = 'none'; }
  }

  // Kick off animation — called after state update & re-render
  useEffect(() => {
    if (!pendingFlipRef.current) return;
    const dir = pendingFlipRef.current;
    pendingFlipRef.current = null;

    const corner: 'br' | 'bl' = dir === 'next' ? 'br' : 'bl';
    const startX = corner === 'br' ? W - 2 : 2;
    const startY = H - 2;
    const endX = corner === 'br' ? -W : W * 2;
    const endY = H;

    const p1 = pt(startX, startY);
    const p4 = pt(endX, endY);

    if (fparentRef.current) fparentRef.current.style.visibility = 'visible';

    const t0 = performance.now();

    function tick(now: number) {
      const raw = Math.min(1, (now - t0) / duration);
      const t = easeOut(raw);
      const np = bezierPt(p1, p1, p4, p4, t);
      const fold = computeFold(np.x, np.y, W, H, S, corner);
      if (fold) applyFold(fold, corner);

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Done
        if (fparentRef.current) fparentRef.current.style.visibility = 'hidden';
        resetTransforms();
        const newSpread = targetSpreadRef.current;
        setSpreadIdx(newSpread);
        setIsFlipping(false);
        onFlip?.(newSpread);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isFlipping]); // eslint-disable-line react-hooks/exhaustive-deps

  const startFlip = useCallback((dir: 'next' | 'prev') => {
    if (isFlipping) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const target = dir === 'next' ? spreadIdx + 1 : spreadIdx - 1;
    if (target < 0 || target >= totalSpreads) return;

    targetSpreadRef.current = target;

    const current = getSpread(spreadIdx);
    const next = getSpread(target);

    // For forward: front = current right, back = next left
    // For backward: front = current left, back = prev right
    flipFrontRef.current = dir === 'next' ? current.right : current.left;
    flipBackRef.current = dir === 'next' ? next.left : next.right;

    setFlipDir(dir);
    setIsFlipping(true);
    pendingFlipRef.current = dir;
    forceFlipRender(n => n + 1); // ensure re-render triggers the effect
  }, [isFlipping, spreadIdx, totalSpreads, pages]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ flipNext: () => startFlip('next'), flipPrev: () => startFlip('prev') }));

  const current = getSpread(spreadIdx);
  const target = getSpread(targetSpreadRef.current);
  const corner: 'br' | 'bl' = flipDir === 'next' ? 'br' : 'bl';

  // Which side is static (not moving) during flip?
  const staticSideContent = isFlipping
    ? (flipDir === 'next' ? current.left : current.right)
    : null;

  return (
    <div className={className} style={{ position: 'relative', width: W * 2, height: H, ...style }}>

      {/* ── Base layer: full destination spread, always below everything ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 1 }}>
        <div style={{ width: W, height: H, overflow: 'hidden', flexShrink: 0 }}>
          {isFlipping ? target.left : current.left}
        </div>
        <div style={{ width: W, height: H, overflow: 'hidden', flexShrink: 0 }}>
          {isFlipping ? target.right : current.right}
        </div>
      </div>

      {/* ── Static side: the half of the current spread that doesn't move ── */}
      {isFlipping && (
        <div style={{
          position: 'absolute',
          left: flipDir === 'next' ? 0 : W,
          top: 0, width: W, height: H, overflow: 'hidden', zIndex: 3,
        }}>
          {staticSideContent}
        </div>
      )}

      {/* ── Flipping wrapper: clips the flat remaining part of the flipping page ── */}
      <div
        ref={flipWrapRef}
        style={{
          position: 'absolute',
          left: flipDir === 'next' ? W : 0,
          top: 0, width: W, height: H,
          overflow: 'hidden',
          zIndex: isFlipping ? 4 : 0,
          display: isFlipping ? '' : 'none',
        }}
      >
        <div
          ref={flipPageRef}
          style={{ position: 'absolute', width: W, height: H }}
        >
          {flipFrontRef.current}
          {/* Front gradient shadow */}
          <div ref={ashadowRef} style={{
            position: 'absolute', top: 0, left: 0,
            width: H, height: W, zIndex: 1, pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* ── Back shadow on the static page (behind the fold) ── */}
      <div ref={bshadowRef} style={{
        position: 'absolute',
        left: flipDir === 'next' ? 0 : W,
        top: 0, width: W, height: H,
        display: 'none', zIndex: 5, pointerEvents: 'none',
      }} />

      {/* ── Fold parent: positioned at book origin, shows the curled triangle ── */}
      <div ref={fparentRef} style={{
        position: 'absolute', top: 0,
        left: corner === 'br' ? W : 0,
        pointerEvents: 'none', visibility: 'hidden',
        overflow: 'visible', zIndex: 6,
      }}>
        {/* Fold wrapper: S×S diagonal box, clips the fold triangle */}
        <div ref={fwrapperRef} style={{
          position: 'absolute', top: 0, left: 0,
          width: S, height: S, overflow: 'hidden',
        }}>
          {/* Fold inner: gets rotated + translated to position the fold */}
          <div ref={fwrapInnerRef} style={{ position: 'absolute', overflow: 'visible' }}>
            {/* Fold page: transposed (H wide, W tall) to accommodate rotated content */}
            <div ref={fpageRef} style={{
              position: 'absolute', top: 0,
              left: corner === 'br' ? 0 : 'auto',
              right: corner === 'bl' ? 0 : 'auto',
              width: H, height: W, overflow: 'hidden',
            }}>
              {/* Back face content: rotated 90° + translated so it fills the fold correctly */}
              <div style={{
                position: 'absolute', width: W, height: H,
                transformOrigin: '0% 0%',
                transform: corner === 'br'
                  ? `rotate(90deg) translate(0px, ${-H}px)`
                  : `rotate(270deg) translate(${-W}px, 0px)`,
              }}>
                {flipBackRef.current}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Spine ── */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: W,
        width: 14, transform: 'translateX(-50%)',
        background: 'linear-gradient(to right, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.04) 40%, transparent 50%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)',
        borderLeft: '1px solid rgba(0,0,0,0.08)',
        borderRight: '1px solid rgba(0,0,0,0.08)',
        pointerEvents: 'none', zIndex: 20,
      }} />

      {/* ── Click zones ── */}
      {!isFlipping && (
        <>
          {spreadIdx > 0 && (
            <div
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: W, zIndex: 15, cursor: 'w-resize' }}
              onClick={() => startFlip('prev')}
            />
          )}
          {spreadIdx < totalSpreads - 1 && (
            <div
              style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: W, zIndex: 15, cursor: 'e-resize' }}
              onClick={() => startFlip('next')}
            />
          )}
        </>
      )}
    </div>
  );
});

export default TurnBook;
