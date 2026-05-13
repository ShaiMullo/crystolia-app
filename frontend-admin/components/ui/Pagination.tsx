"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { useAdminI18n } from "@/i18n/I18nProvider";

export interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
    const { t, dir } = useAdminI18n();
    if (totalPages <= 1) return null;
    // Logical previous/next icons. Lucide is direction-agnostic so we flip on RTL.
    const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
    const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
    return (
        <div className={`flex items-center justify-between gap-3 py-3 ${className ?? ""}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 tabular">
                {t("common.pageOf", { page, total: totalPages })}
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    iconStart={<Prev size={14} />}
                >
                    {t("common.previous")}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    iconEnd={<Next size={14} />}
                >
                    {t("common.next")}
                </Button>
            </div>
        </div>
    );
}
