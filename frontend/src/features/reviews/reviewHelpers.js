export const RATING_LABELS = {
    5: "Tuyệt vời",
    4: "Tốt",
    3: "Bình thường",
    2: "Tệ",
    1: "Rất tệ",
};

export const FILTERS = [
    { key: "all", label: "Tất cả" },
    { key: "5", label: "5 sao" },
    { key: "4", label: "4 sao" },
    { key: "3", label: "3 sao" },
    { key: "2", label: "2 sao" },
    { key: "1", label: "1 sao" },
];

export const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} ngày trước`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} tuần trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    return `${Math.floor(months / 12)} năm trước`;
};