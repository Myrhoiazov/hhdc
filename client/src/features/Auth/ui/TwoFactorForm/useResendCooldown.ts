import { useEffect, useState } from 'react';

export const RESEND_COOLDOWN_SECONDS = 60;

export const useResendCooldown = () => {
    // The server's own cooldown already starts counting from the moment the
    // first code was sent (during /login), so the resend button starts disabled.
    const [resendAvailableAt, setResendAvailableAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
        }, 250);
        return () => clearInterval(interval);
    }, [resendAvailableAt]);

    return { setResendAvailableAt, secondsLeft };
};
