export const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    return Number(price).toLocaleString('vi-VN') + 'đ';
};