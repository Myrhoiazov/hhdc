import { memo, useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SCRIPT_ID = 'cf-turnstile-script';

interface TurnstileRenderOptions {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
    'timeout-callback'?: () => void;
}

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
            remove: (widgetId: string) => void;
        };
    }
}

const loadTurnstileScript = () => new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
        resolve();
        return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')));
        return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
});

interface TurnstileWidgetProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onReset?: () => void;
    className?: string;
}

// Loaded only when the server signals CAPTCHA_REQUIRED/CAPTCHA_INVALID — the
// Turnstile script is never fetched on an ordinary page visit.
export const TurnstileWidget = memo(({ siteKey, onVerify, onReset, className }: TurnstileWidgetProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        loadTurnstileScript()
            .then(() => {
                if (cancelled || !containerRef.current || !window.turnstile) return;
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: onVerify,
                    'expired-callback': onReset,
                    'error-callback': onReset,
                    'timeout-callback': onReset,
                });
            })
            .catch((error: unknown) => {
                console.error(error);
            });

        return () => {
            cancelled = true;
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, [siteKey, onVerify, onReset]);

    return <div ref={containerRef} className={className} />;
});
