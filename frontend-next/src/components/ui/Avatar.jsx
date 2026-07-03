const COLORS = [
    "bg-violet-500", "bg-amber-500", "bg-emerald-500",
    "bg-sky-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500",
];

/**
 * Avatar
 * @param {string} name - tên người dùng (lấy chữ cái đầu)
 */
const Avatar = ({ name }) => {
    const color = COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
    const initial = (name || "?")[0].toUpperCase();

    return (
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
            {initial}
        </div>
    );
};

export default Avatar;