export default function SearchPage({ keyword }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 sm:px-6 py-10">
            {/* Tiêu đề Tìm kiếm */}
            <h1 className="text-2xl font-bold text-gray-800 mb-8">
                Kết quả tìm kiếm cho: <span className="text-amber-500">"{keyword}"</span>
            </h1>

            {/* Khối thông báo đang phát triển (Hiển thị tách biệt xuống dưới) */}
            <div className="flex flex-col items-center justify-center p-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                {/* Icon minh họa */}
                <i className="fas fa-tools text-5xl text-gray-300 mb-4"></i>

                {/* Tiêu đề thông báo */}
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Chức năng tìm kiếm đang được phát triển
                </h2>

                {/* Dòng chữ phụ */}
                <p className="text-gray-500">
                    Hệ thống đang được cập nhật. Vui lòng quay lại sau nhé!
                </p>
            </div>
        </div>
    );
}