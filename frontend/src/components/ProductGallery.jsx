'use client';
import { useState } from 'react';

export default function ProductGallery({ images, productName }) {
    const [activeImage, setActiveImage] = useState(images[0] || null);

    return (
        <div className="self-start sticky top-8">
            <div className="h-96 w-full flex items-center justify-center bg-slate-50 rounded-sm p-4 mb-4">
                {activeImage
                    ? <img src={activeImage} alt={productName} className="max-h-full max-w-full object-contain" />
                    : <i className="fas fa-image text-6xl text-slate-300" />}
            </div>
            {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveImage(img)}
                            className={`h-16 w-16 rounded-sm border-2 overflow-hidden flex-shrink-0 ${activeImage === img ? 'border-[#fbbf24]' : 'border-slate-200'}`}
                        >
                            <img src={img} alt={`${productName} ${i + 1}`} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}