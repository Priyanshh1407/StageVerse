'use client';

import { useEffect } from 'react';

/**
 * Escape closes the topmost popup, on every page. The site's popups are full-screen overlays
 * (`fixed inset-0`) with a backdrop that closes them when clicked, so Escape does what clicking
 * outside does: it finds the topmost element covering the screen's corner, checks that it belongs
 * to such an overlay, and clicks it. With no popup open, the corner is ordinary page content and
 * nothing happens. Popups that handle Escape themselves (or call preventDefault) are left alone.
 */
export default function EscapeToClose() {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            const x = 3;
            const y = Math.round(window.innerHeight / 2);
            const hit = document.elementFromPoint(x, y);
            if (!hit) return;
            // walk up to a full-screen fixed overlay
            for (let el = hit; el && el !== document.body; el = el.parentElement) {
                const style = getComputedStyle(el);
                if (style.position === 'fixed') {
                    const r = el.getBoundingClientRect();
                    const fullScreen = r.left <= 1 && r.top <= 1 && r.right >= window.innerWidth - 1 && r.bottom >= window.innerHeight - 1;
                    // the loading screen and the full-screen show are not popups
                    if (!fullScreen || el.closest('[role="status"]')) return;
                    // only ever click a backdrop: an element that itself covers the screen, never a control
                    const h = hit.getBoundingClientRect();
                    const backdrop = h.width >= window.innerWidth - 2 && h.height >= window.innerHeight - 2;
                    if (backdrop && !hit.closest('button, a, input, textarea, select, label, [role="button"]')) hit.click();
                    return;
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return null;
}
