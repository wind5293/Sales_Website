import { useState } from "react";

/**
 * StarRating
 * @param {number}   value       - điểm hiện tại (0–5)
 * @param {number}   max         - số sao tối đa (mặc định 5)
 * @param {string}   size        - "sm" | "md" | "lg" | "xl"
 * @param {boolean}  interactive - cho phép click chọn sao
 * @param {function} onChange    - callback(newValue) khi chọn sao
 */
const StarRating = ({ value, max = 5, size = "sm", interactive = false, onChange }) => {
    const [hovered, setHovered] = useState(null);
    const display = interactive ? (hovered ?? value) : value;
    const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-2xl" };

    return (
        <span className={`inline-flex gap-0.5 ${sizes[size]}`}>
            {Array.from({ length: max }).map((_, i) => (
                <i
                    key={i}
                    className={`fas fa-star transition-colors
                        ${i < Math.round(display) ? "text-amber-400" : "text-slate-200"}
                        ${interactive ? "cursor-pointer" : ""}`}
                    onMouseEnter={() => interactive && setHovered(i + 1)}
                    onMouseLeave={() => interactive && setHovered(null)}
                    onClick={() => interactive && onChange?.(i + 1)}
                />
            ))}
        </span>
    );
};

export default StarRating;