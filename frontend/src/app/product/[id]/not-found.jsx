// src/app/product/[id]/not-found.jsx
import Link from 'next/link';

export default function ProductNotFound() {
    return (
        <div className="text-center py-24 text-slate-400">
            <i className="fas fa-box-open text-4xl mb-3 block" />
            Không tìm thấy sản phẩm
            <div className="mt-4">
                <Link href="/" className="text-amber-500 font-semibold hover:underline">Quay về trang chủ</Link>
            </div>
        </div>
    );
}