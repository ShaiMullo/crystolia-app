"use client";

import { useCallback, useEffect, useState } from "react";
import { getRegistrationsCount } from "@/lib/registrationsApi";

const POLL_MS = 60_000;

/**
 * Pending registration-requests counter for the nav badge and the dashboard
 * widget. Polls like NotificationsBell; failures are silent and keep the last
 * known value. Call `refresh()` after an approve/reject to update immediately.
 */
export function useRegistrationsCount(): { count: number; refresh: () => void } {
    const [count, setCount] = useState(0);

    const refresh = useCallback(() => {
        getRegistrationsCount()
            .then(setCount)
            .catch(() => {
                // Silent — a badge must never block or error the UI.
            });
    }, []);

    useEffect(() => {
        const t0 = setTimeout(refresh, 0);
        const id = setInterval(refresh, POLL_MS);
        return () => {
            clearTimeout(t0);
            clearInterval(id);
        };
    }, [refresh]);

    return { count, refresh };
}
