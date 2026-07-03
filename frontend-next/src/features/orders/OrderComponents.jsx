import { STATUS_CONFIG } from "./orderConstants";

export const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {cfg.label}
        </span>
    );
};

export const OrderTimeline = ({ timeline = [] }) => {
    if (!timeline.length) return null;
    return (
        <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Lịch sử đơn hàng
            </p>
            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                {timeline.map((step, i) => (
                    <li key={i} className="ml-4">
                        <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                        <p className="text-xs font-semibold text-slate-700">{step.label}</p>
                        <p className="text-xs text-slate-400">{step.time}</p>
                        {step.note && (
                            <p className="text-xs text-slate-500 mt-0.5 italic">{step.note}</p>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
};