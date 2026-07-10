'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/utils/format';

// Bảng quy đổi tên màu tiếng Việt -> mã màu hiển thị chấm tròn.
// Chỉ mang tính minh hoạ (đa số sản phẩm dùng chung 1 giá + 1 ảnh cho mọi màu),
// màu nào không có trong bảng sẽ hiển thị chấm xám trung tính thay vì đoán sai.
const COLOR_SWATCH_MAP = {
    'đen': '#18181b',
    'trắng': '#f4f4f5',
    'bạc': '#d4d4d8',
    'xám': '#71717a',
    'vàng': '#eab308',
    'đỏ': '#dc2626',
    'hồng': '#f472b6',
    'tím': '#a855f7',
    'cam': '#f97316',
    'xanh lá': '#22c55e',
    'xanh dương': '#3b82f6',
    'xanh': '#3b82f6',
};

function getSwatchColor(colorName) {
    const key = (colorName || '').toLowerCase();
    const found = Object.keys(COLOR_SWATCH_MAP).find((k) => key.includes(k));
    return found ? COLOR_SWATCH_MAP[found] : '#a1a1aa';
}

function CheckBadge() {
    return (
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <i className="fas fa-check text-[10px]" />
        </span>
    );
}

export default function ProductVariantSelector({ currentProductId, variants, colors, price }) {
    const [selectedColor, setSelectedColor] = useState(colors?.[0] || null);

    const hasStorageChoice = variants && variants.length > 1;
    const hasColorChoice = colors && colors.length > 0;

    if (!hasStorageChoice && !hasColorChoice) return null;

    return (
        <div className="mt-6 space-y-5">
            {hasStorageChoice && (
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Phiên bản</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {variants.map((v) => {
                            const isActive = v.id === currentProductId;
                            return (
                                <Link
                                    key={v.id}
                                    href={`/product/${v.id}`}
                                    className={[
                                        'relative flex items-center justify-center h-14 border rounded-sm text-sm font-medium transition-colors',
                                        isActive
                                            ? 'border-amber-500 text-slate-900'
                                            : 'border-slate-200 text-slate-700 hover:border-amber-300',
                                    ].join(' ')}
                                >
                                    {v.storageGB}
                                    {isActive && <CheckBadge />}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {hasColorChoice && (
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Màu sắc</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {colors.map((color) => {
                            const isActive = color === selectedColor;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={[
                                        'relative flex items-center gap-3 px-3 py-2.5 border rounded-sm text-left transition-colors',
                                        isActive
                                            ? 'border-amber-500'
                                            : 'border-slate-200 hover:border-amber-300',
                                    ].join(' ')}
                                >
                                    <span
                                        className="shrink-0 w-8 h-8 rounded-full border border-black/10"
                                        style={{ backgroundColor: getSwatchColor(color) }}
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-800 truncate">
                                            {color}
                                        </span>
                                        {price != null && (
                                            <span className="block text-xs text-slate-500">
                                                {formatPrice(price)}
                                            </span>
                                        )}
                                    </span>
                                    {isActive && <CheckBadge />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}