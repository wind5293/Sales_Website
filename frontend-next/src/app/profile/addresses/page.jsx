'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CITIES = [
    "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng",
    "Cần Thơ", "Bình Dương", "Đồng Nai", "Thừa Thiên Huế", "Khánh Hòa"
];

const emptyForm = {
    name: '', street: '', district: '', city: '', zip_code: '', phone: '', is_default: false,
};

const AddressBook = () => {
    const router = useRouter();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [alert, setAlert] = useState({ type: '', message: '' });

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: '', message: '' }), 3500);
    };

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/users/addresses');

            if (res.status === 401) {
                showAlert('error', 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!');
                setTimeout(() => router.push('/login'), 1500);
                return;
            }

            const data = await res.json();
            setAddresses(data.addresses || []);
        } catch {
            showAlert('error', 'Không thể tải danh sách địa chỉ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAddresses(); }, []);

    const openAddModal = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

    const openEditModal = (addr) => {
        setEditingId(addr.address_id);
        setForm({
            name: addr.name || '', street: addr.street || '', district: addr.district || '',
            city: addr.city || '', zip_code: addr.zip_code || '', phone: addr.phone || '',
            is_default: addr.is_default || false,
        });
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(emptyForm); };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.street || !form.city) {
            showAlert('error', 'Vui lòng nhập đường/số nhà và thành phố.');
            return;
        }
        setSaving(true);
        try {
            const res = editingId
                ? await fetch(`/api/users/addresses/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                })
                : await fetch('/api/users/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });

            if (!res.ok) throw new Error();

            showAlert('success', editingId ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ mới thành công!');
            closeModal();
            fetchAddresses();
        } catch {
            showAlert('error', 'Lưu địa chỉ thất bại. Vui lòng thử lại!');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (addressId) => {
        if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
        setDeleting(addressId);
        try {
            const res = await fetch(`/api/users/addresses/${addressId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            showAlert('success', 'Đã xóa địa chỉ.');
            fetchAddresses();
        } catch {
            showAlert('error', 'Xóa địa chỉ thất bại.');
        } finally {
            setDeleting(null);
        }
    };

    const handleSetDefault = async (addr) => {
        if (addr.is_default) return;
        try {
            const res = await fetch(`/api/users/addresses/${addr.address_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_default: true }),
            });
            if (!res.ok) throw new Error();
            showAlert('success', 'Đã đặt làm địa chỉ mặc định.');
            fetchAddresses();
        } catch {
            showAlert('error', 'Cập nhật thất bại.');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans py-10">
            <div className="max-w-4xl mx-auto px-4">

                {alert.message && (
                    <div className={`mb-6 p-4 flex items-center gap-3 text-sm font-medium ${alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <i className={`fas ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        {alert.message}
                    </div>
                )}

                <div className="bg-white rounded-sm border border-slate-100 overflow-hidden">

                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                                <i className="fas fa-arrow-left text-xs"></i>
                            </button>
                            <div><h1 className="text-xl font-bold text-white tracking-wide">Địa chỉ của Tôi</h1></div>
                        </div>
                        <button onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-sm transition-colors">
                            <i className="fas fa-plus text-xs"></i> Thêm địa chỉ
                        </button>
                    </div>

                    <div className="p-8">
                        {loading ? (
                            <div className="flex justify-center items-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-map-marker-alt text-2xl text-slate-300"></i>
                                </div>
                                <h3 className="text-slate-700 font-semibold mb-1">Chưa có địa chỉ nào</h3>
                                <p className="text-slate-400 text-sm mb-6">Thêm địa chỉ để nhận hàng nhanh hơn khi đặt mua.</p>
                            </div>
                        ) : (
                            <div>
                                {addresses.map((addr) => (
                                    <div key={addr.address_id} className="border-b border-slate-100 py-5 last:border-b-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            {addr.name && <span className="font-bold text-slate-600 text-sm">{addr.name}</span>}
                                            {addr.phone && (<><span className="text-slate-300 text-xs">|</span><span className="text-slate-500 text-sm">{addr.phone}</span></>)}
                                        </div>
                                        {addr.street && <p className="text-slate-600 text-sm">{addr.street}</p>}
                                        <p className="text-slate-600 text-sm">{[addr.district, addr.city].filter(Boolean).join(', ')}</p>
                                        {addr.is_default && (
                                            <span className="inline-block mt-2 px-2 py-0.5 border border-amber-500 text-amber-500 text-[11px] font-medium rounded-sm">Mặc định</span>
                                        )}
                                        <div className="mt-3 flex items-center gap-3">
                                            <button onClick={() => openEditModal(addr)} className="text-xs text-slate-500 hover:text-slate-800 transition-colors">Chỉnh sửa</button>
                                            <span className="text-slate-300 text-xs">|</span>
                                            <button onClick={() => handleDelete(addr.address_id)} disabled={deleting === addr.address_id}
                                                className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                                                {deleting === addr.address_id ? 'Đang xóa...' : 'Xóa'}
                                            </button>
                                            {!addr.is_default && (
                                                <>
                                                    <span className="text-slate-300 text-xs">|</span>
                                                    <button onClick={() => handleSetDefault(addr)} className="text-xs text-amber-500 hover:text-amber-600 transition-colors">Đặt mặc định</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-white rounded-sm shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between">
                            <h2 className="text-white font-bold tracking-wide">{editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times"></i></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên người nhận <span className="text-red-400">*</span></label>
                                <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="VD: Nguyễn Văn A" required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Số nhà, tên đường <span className="text-red-400">*</span></label>
                                <input type="text" name="street" value={form.street} onChange={handleFormChange} placeholder="VD: 123 Nguyễn Huệ" required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Quận / Huyện</label>
                                    <input type="text" name="district" value={form.district} onChange={handleFormChange} placeholder="VD: Quận 1" required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Mã bưu chính</label>
                                    <input type="text" name="zip_code" value={form.zip_code} onChange={handleFormChange} placeholder="VD: 70000"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Tỉnh / Thành phố <span className="text-red-400">*</span></label>
                                <select name="city" value={form.city} onChange={handleFormChange} required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors text-slate-700 cursor-pointer">
                                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                                    {CITIES.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Số điện thoại nhận hàng</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="VD: 0901234567" required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors" />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleFormChange} className="sr-only" />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${form.is_default ? 'bg-amber-500' : 'bg-slate-200'}`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_default ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                                    </div>
                                </div>
                                <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors select-none">Đặt làm địa chỉ mặc định</span>
                            </label>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-sm transition-colors">Hủy</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-[#FBBF24] hover:bg-amber-400 text-white font-semibold text-sm rounded-sm transition-all flex items-center gap-2 disabled:opacity-50">
                                    {saving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Đang lưu...</>) : (<><i className="far fa-save"></i>{editingId ? 'Lưu thay đổi' : 'Thêm địa chỉ'}</>)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressBook;