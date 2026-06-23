"use client";

import { Select } from "@/components/ui";
import type { Company } from "@/lib/companiesApi";

interface CompanySelectProps {
    value: string | null;
    onChange: (companyId: string | null) => void;
    /** Options supplied by the parent — this component never fetches. */
    companies: Company[];
    disabled?: boolean;
    invalid?: boolean;
    /** Label for the empty / "no company" option. */
    noneLabel: string;
}

/**
 * Company picker — presentation-only (companies come in via props; no data
 * fetching here, per the presentation/logic split).
 *
 * Today it renders the native <Select>. The interface (value / onChange /
 * companies) is intentionally decoupled from the rendering, so it can be
 * upgraded to a searchable combobox — including server-side search via
 * lib/companiesApi.listCompanies({ search }) — WITHOUT touching any consumer
 * (UserFormModal / page). That keeps the "scales to hundreds" path open.
 */
export function CompanySelect({ value, onChange, companies, disabled, invalid, noneLabel }: CompanySelectProps) {
    return (
        <Select
            value={value ?? ""}
            invalid={invalid}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value || null)}
        >
            <option value="">{noneLabel}</option>
            {companies.map((c) => (
                <option key={c._id} value={c._id}>
                    {c.name}
                </option>
            ))}
        </Select>
    );
}

export default CompanySelect;
