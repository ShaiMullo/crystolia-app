"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/apiError";

export interface RunMutationOptions<T> {
    /** The async operation to run (typically an API call). */
    request: () => Promise<T>;
    /** Toast shown on success. Omit for no success toast. */
    successMessage?: string;
    /** Fallback toast when the backend provides no error message. */
    errorMessage?: string;
    /** Runs after a successful request (e.g. close a modal, refetch a list). */
    onSuccess?: (data: T) => void | Promise<void>;
    /** Runs after a failed request (after the error toast is shown). */
    onError?: (err: unknown) => void;
}

/**
 * Generic, domain-agnostic mutation runner.
 *
 * It knows nothing about users, companies, orders, etc. — the caller configures
 * it. Centralizes loading state, success/error toasts, backend error
 * extraction, and post-success / post-error hooks. Reuse across every module.
 *
 *   const { run, busy } = useMutationRunner();
 *   run({
 *     request: () => createUser(payload),
 *     successMessage: t("users.toasts.created"),
 *     errorMessage: t("users.toasts.saveFailed"),
 *     onSuccess: () => { closeModal(); refetch(); },
 *   });
 */
export function useMutationRunner() {
    const [busy, setBusy] = useState(false);

    const run = useCallback(
        async <T,>(opts: RunMutationOptions<T>): Promise<T | undefined> => {
            setBusy(true);
            try {
                const data = await opts.request();
                if (opts.successMessage) toast.success(opts.successMessage);
                await opts.onSuccess?.(data);
                return data;
            } catch (err) {
                toast.error(getApiErrorMessage(err, opts.errorMessage));
                opts.onError?.(err);
                return undefined;
            } finally {
                setBusy(false);
            }
        },
        [],
    );

    return { run, busy };
}
