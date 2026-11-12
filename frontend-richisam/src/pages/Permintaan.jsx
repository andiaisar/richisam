import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { PackagePlus, Search, Plus, Filter, RefreshCw, FileText, X, AlertTriangle, Check, Printer, Trash2, Layers, AlertCircle, Clock, Truck } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import SuratJalanModal from '../components/SuratJalanModal';
import Pagination from '../components/Pagination';
import SearchableProductSelect from '../components/SearchableProductSelect';

const Permintaan = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Surat Jalan State
  const [isSuratJalanOpen, setIsSuratJalanOpen] = useState(false);
  const [selectedSuratJalan, setSelectedSuratJalan] = useState(null);

  // Form states - Multi item order
  const [formData, setFormData] = useState({
    outlet_id: '',
    items: [{ product_id: '', qty_requested: '' }]
  });

  // Detail Modal item edit state
  const [detailItems, setDetailItems] = useState([]);
  const [updateData, setUpdateData] = useState({ status: '', qty_approved: '' });
  const [receivingNote, setReceivingNote] = useState('');
  
  // Emergency Form State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyData, setEmergencyData] = useState({ outlet_id: '', product_id: '', qty: '', password: '' });
  const [outlets, setOutlets] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/requests?limit=100${filter !== 'ALL' ? `&status=${filter}` : ''}`);
      const raw = res?.data?.data?.data || res?.data?.data || res?.data || [];
      setTickets(Array.isArray(raw) ? raw : []);
    } catch (e) {
      toast.error('Gagal mengambil data permintaan');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/products?limit=1000');
      const list = res?.data?.data || res?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {}
  };

  const fetchOutlets = async () => {
    try {
      const res = await axiosClient.get('/outlets');
      const list = res?.data?.data || res?.data || [];
      setOutlets(Array.isArray(list) ? list : []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTickets();
    fetchProducts();
    fetchOutlets();
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (location.state?.openAddModal) {
      const branchOutlets = outlets.filter(o => Number(o.id) !== 1);
      setFormData({
        outlet_id: location.state.outlet_id ? String(location.state.outlet_id) : (branchOutlets[0]?.id ? String(branchOutlets[0].id) : ''),
        items: [{
          product_id: location.state.product_id ? String(location.state.product_id) : '',
          qty_requested: location.state.qty_needed ? String(location.state.qty_needed) : ''
        }]
      });
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, outlets]);

  const openEmergencyModal = () => {
    setEmergencyData({ outlet_id: '', product_id: '', qty: '', password: '' });
    setIsEmergencyModalOpen(true);
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!emergencyData.outlet_id || !emergencyData.product_id || !emergencyData.qty || !emergencyData.password) {
      toast.error('Mohon lengkapi semua field termasuk PIN/Password');
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post('/requests/emergency', {
        outlet_id: parseInt(emergencyData.outlet_id),
        items: [{
          product_id: parseInt(emergencyData.product_id),
          qty: parseInt(emergencyData.qty)
        }],
        password: emergencyData.password
      });
      toast.success('Pengambilan Darurat Berhasil!');
      setIsEmergencyModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses pengambilan darurat');
    } finally {
      setSubmitting(false);
    }
  };

  const isCK = user?.role === 'ADMIN_GUDANG';
  const canManageShipment = user?.role === 'ADMIN_PUSAT' || user?.role === 'ADMIN_GUDANG' || user?.role === 'OWNER';
  const isOutletStaff = !canManageShipment;

  const openAddModal = () => {
    const branchOutlets = outlets.filter(o => Number(o.id) !== 1);
    setFormData({
      outlet_id: isOutletStaff ? String(user?.outlet_id || '') : (branchOutlets[0]?.id ? String(branchOutlets[0].id) : ''),
      items: [{ product_id: '', qty_requested: '' }]
    });
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', qty_requested: '' }]
    }));
  };

  const handleRemoveItemRow = (idx) => {
    if (formData.items.length <= 1) {
      return toast.error('Minimal harus ada 1 baris bahan');
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemChange = (idx, field, val) => {
    setFormData(prev => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...prev, items: nextItems };
    });
  };

  const openDetailModal = (ticket) => {
    setSelectedTicket(ticket);
    const itms = Array.isArray(ticket.items) && ticket.items.length > 0
      ? ticket.items.map(it => {
          const stokCK = it.stok_pusat !== undefined && it.stok_pusat !== null ? Number(it.stok_pusat) : null;
          let qtyKirim = it.qty_dikirim !== null && it.qty_dikirim !== undefined ? Number(it.qty_dikirim) : Number(it.qty_diminta);
          
          // Jika status tiket masih DIAJUKAN atau DIPROSES, batasi qty_dikirim agar tidak pernah melebihi stok CK saat ini!
          if (ticket.status === 'DIAJUKAN' || ticket.status === 'DIPROSES') {
            if (stokCK !== null) {
              qtyKirim = Math.min(qtyKirim, Math.max(0, stokCK));
            }
          }

          return {
            id: it.id,
            product_id: it.product_id,
            product_name: it.product_name,
            product_kode: it.product_kode,
            product_satuan: it.product_satuan,
            qty_diminta: it.qty_diminta,
            qty_dikirim: qtyKirim,
            qty_diterima: it.qty_diterima !== null && it.qty_diterima !== undefined ? it.qty_diterima : qtyKirim,
            catatan: it.catatan || '',
            stok_pusat: stokCK !== null ? stokCK : 0
          };
        })
      : [{
          id: 1,
          product_id: ticket.product_id || 1,
          product_name: ticket.product_name,
          product_kode: ticket.product_kode,
          product_satuan: ticket.product_satuan,
          qty_diminta: ticket.qty_requested || 1,
          qty_dikirim: ticket.qty_approved || ticket.qty_requested || 1,
          qty_diterima: ticket.qty_approved || ticket.qty_requested || 1,
          catatan: '',
          stok_pusat: 0
        }];
    setDetailItems(itms);
    setReceivingNote(ticket.catatan || '');
    setUpdateData({ 
      status: ticket.status === 'DIAJUKAN' ? 'DIPROSES' : (ticket.status === 'DIPROSES' ? 'DIKIRIM' : 'SELESAI'), 
      qty_approved: ticket.qty_approved || ticket.qty_requested 
    });
    setIsDetailModalOpen(true);
  };

  const handleCheckAllComplete = () => {
    setDetailItems(prev => prev.map(it => {
      const kirim = it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : it.qty_diminta;
      return {
        ...it,
        qty_diterima: kirim,
        catatan: ''
      };
    }));
    toast.success('Semua barang ditandai tiba lengkap sesuai surat jalan');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const validItems = formData.items
      .filter(it => it.product_id && Number(it.qty_requested) > 0)
      .map(it => ({
        product_id: parseInt(it.product_id, 10),
        qty_requested: parseInt(it.qty_requested, 10)
      }));

    if (validItems.length === 0) {
      return toast.error('Harap pilih minimal 1 produk dan masukkan jumlah yang valid');
    }

    // Check duplicate products
    const productIds = validItems.map(it => it.product_id);
    if (new Set(productIds).size !== productIds.length) {
      return toast.error('Terdapat produk yang duplikat pada formulir. Harap gabungkan baris produk yang sama.');
    }

    setSubmitting(true);
    try {
      const payload = { items: validItems };
      if (!isOutletStaff && formData.outlet_id) {
        payload.outlet_id = parseInt(formData.outlet_id, 10);
      }
      await axiosClient.post('/requests', payload);
      toast.success(`Tiket permintaan berhasil dibuat dengan ${validItems.length} jenis bahan`);
      setIsModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceipt = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      // Validasi: jika ada barang yang diterima kurang dari yang dikirim, staf wajib menulis catatan kondisi
      const missingNote = detailItems.find(it => {
        const kirim = parseInt(it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : it.qty_diminta, 10) || 0;
        const terima = parseInt(it.qty_diterima !== undefined && it.qty_diterima !== null ? it.qty_diterima : kirim, 10) || 0;
        return terima < kirim && (!it.catatan || it.catatan.trim() === '');
      });

      if (missingNote) {
        setSubmitting(false);
        return toast.error(`Harap isi catatan untuk "${missingNote.product_name}" yang diterima kurang atau rusak!`);
      }

      const payload = { 
        status: 'SELESAI',
        catatan: receivingNote || undefined,
        items: detailItems.map(it => {
          const kirim = parseInt(it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : it.qty_diminta, 10) || 0;
          return {
            id: it.id,
            product_id: it.product_id,
            qty_diterima: Math.max(0, parseInt(it.qty_diterima !== undefined && it.qty_diterima !== null ? it.qty_diterima : kirim, 10) || 0),
            catatan: it.catatan || ''
          };
        })
      };

      await axiosClient.put(`/requests/${selectedTicket.id}`, payload);
      toast.success('Konfirmasi berhasil! Barang telah diverifikasi dan stok cabang telah disesuaikan.');
      setIsDetailModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memproses konfirmasi terima barang');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!updateData.status) return toast.error('Silakan pilih status');
      
      // Validasi: Qty Kirim tidak boleh 0 dan tidak boleh melebihi stok fisik Gudang Pusat (CK) saat status DIKIRIM
      if (updateData.status === 'DIKIRIM') {
        const totalKirim = detailItems.reduce((acc, it) => acc + (parseInt(it.qty_dikirim, 10) || 0), 0);
        if (totalKirim <= 0) {
          setSubmitting(false);
          return toast.error('Tidak dapat mengirim barang: Semua kuantitas kirim bernilai 0 (tidak ada barang fisik yang dikirim)! Harap biarkan status tetap DIPROSES sampai bahan baku siap di Gudang Pusat.');
        }

        const overStockItem = detailItems.find(it => {
          const kirim = parseInt(it.qty_dikirim, 10) || 0;
          const stok = it.stok_pusat !== undefined && it.stok_pusat !== null ? Number(it.stok_pusat) : Infinity;
          return kirim > stok;
        });
        if (overStockItem) {
          setSubmitting(false);
          return toast.error(`Jumlah kirim "${overStockItem.product_name}" (${overStockItem.qty_dikirim}) melebihi stok Gudang Pusat (${overStockItem.stok_pusat})!`);
        }
      }

      const payload = { 
        status: updateData.status,
        items: detailItems.map(it => ({
          id: it.id,
          product_id: it.product_id,
          qty_dikirim: parseInt(it.qty_dikirim, 10) || 0,
          catatan: it.catatan || ''
        }))
      };

      await axiosClient.put(`/requests/${selectedTicket.id}`, payload);
      toast.success(
        updateData.status === 'DIKIRIM' 
          ? 'Barang berhasil dikirim & stok Central Kitchen telah dipotong!' 
          : 'Status tiket berhasil diperbarui'
      );
      setIsDetailModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memperbarui tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBackorder = async () => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      const res = await axiosClient.post(`/requests/${selectedTicket.id}/create-backorder`);
      toast.success(`Tiket pengiriman susulan [${res.data?.data?.kode_tiket}] berhasil dibuat!`);
      setIsDetailModalOpen(false);
      fetchTickets();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat tiket susulan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSuratJalan = (t) => {
    const rawItems = Array.isArray(t.items) && t.items.length > 0
      ? t.items.map(it => {
          const qtyKirim = it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : (it.qty_disetujui || it.qty_diminta);
          const sisa = it.qty_diminta - qtyKirim;
          return {
            product_kode: it.product_kode || 'PRD',
            product_name: it.product_name,
            product_satuan: it.product_satuan || 'pcs',
            qty: qtyKirim,
            catatan: sisa > 0 ? `Menyusul ${sisa} ${it.product_satuan || ''}` : 'Lengkap'
          };
        })
      : [{
          product_kode: t.product_kode || 'PRD',
          product_name: t.product_name,
          product_satuan: t.product_satuan || 'pcs',
          qty: t.qty_approved || t.qty_requested || 1,
          catatan: 'Lengkap'
        }];

    setSelectedSuratJalan({
      kode_transfer: t.kode_tiket,
      created_at: t.created_at,
      from_outlet_name: 'Gudang Pusat Richisam (Central Kitchen)',
      from_outlet_address: 'Makassar, Sulawesi Selatan',
      to_outlet_name: t.outlet_name,
      to_outlet_address: 'Makassar, Sulawesi Selatan',
      creator_name: user?.nama || 'Admin/Staf',
      catatan: `Surat Pengiriman Barang untuk Tiket Permintaan: ${t.kode_tiket}${t.ada_selisih ? ' (Pengiriman Parsial / Ada Susulan)' : ''}`,
      items: rawItems
    });
    setIsSuratJalanOpen(true);
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchItems = Array.isArray(t.items) && t.items.some(it => it.product_name?.toLowerCase().includes(q));
    return t.kode_tiket?.toLowerCase().includes(q) || 
           t.product_name?.toLowerCase().includes(q) ||
           t.outlet_name?.toLowerCase().includes(q) ||
           matchItems;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-richisam-orange" />
            {isCK ? 'Tiket Permintaan Cabang' : isOutletStaff ? 'Permintaan Barang Harian' : 'Manajemen Tiket Permintaan'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isCK 
              ? 'Kelola, siapkan, dan kirim pesanan bahan baku dari cabang-cabang outlet (mendukung pengiriman parsial/susulan).' 
              : isOutletStaff 
              ? 'Ajukan pesanan seluruh bahan baku harian (pagi) dalam 1 tiket resmi ke Central Kitchen (CK).' 
              : 'Pantau pengadaan bahan baku harian antar Central Kitchen dan seluruh cabang outlet.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTickets} className="p-2 rounded-lg border border-line bg-white hover:bg-cream text-ink transition-colors" title="Muat Ulang">
            <RefreshCw size={18} className={loading ? 'animate-spin text-muted' : ''} />
          </button>
          {(user?.role === 'ADMIN_PUSAT' || isCK) && (
            <button onClick={openEmergencyModal} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm cursor-pointer text-sm">
              <AlertTriangle size={17} />
              Pengambilan Cito (Darurat)
            </button>
          )}
          {(isOutletStaff || user?.role === 'ADMIN_PUSAT' || user?.role === 'OWNER') && (
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-richisam-orange hover:bg-[#d9530a] text-white rounded-lg font-bold transition-colors shadow-sm cursor-pointer text-sm">
              <Plus size={18} />
              Buat Permintaan Pagi (Multi-Bahan)
            </button>
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-4 justify-between items-center bg-cream/30">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kode tiket, produk, atau cabang..." className="w-full pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-richisam-orange/20 focus:border-richisam-orange transition-all" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-white border border-line rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-richisam-orange/20">
              <option value="ALL">Semua Status</option>
              <option value="DIAJUKAN">Diajukan</option>
              <option value="DIPROSES">Diproses</option>
              <option value="DIKIRIM">Dikirim</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-cream/50 text-muted font-semibold border-b border-line">
              <tr>
                <th className="px-6 py-4">Kode Tiket</th>
                <th className="px-6 py-4">Rincian Bahan Baku</th>
                {!isOutletStaff && <th className="px-6 py-4">Cabang Pemohon</th>}
                <th className="px-6 py-4 text-center">Total Diminta</th>
                <th className="px-6 py-4 text-center">Total Disetujui</th>
                <th className="px-6 py-4">Status & Alokasi</th>
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={!isOutletStaff ? 8 : 7} className="px-6 py-12 text-center text-muted">Memuat data...</td>
                </tr>
              ) : filteredTickets.length > 0 ? (
                filteredTickets
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t) => {
                    const itemCount = t.total_items || (Array.isArray(t.items) ? t.items.length : 1);
                    return (
                      <tr key={t.id} className="hover:bg-cream/30 transition-colors group">
                        <td className="px-6 py-4 font-mono font-medium text-ink">
                          {t.kode_tiket}
                          {t.catatan && t.catatan.includes('SUSULAN') && (
                            <span className="block text-[10px] text-amber-600 font-sans font-bold">Susulan</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-ink">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{t.product_name || 'Bahan Baku'}</span>
                            {itemCount > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F9610D]/10 text-[#F9610D] border border-[#F9610D]/20">
                                +{itemCount - 1} bahan lain
                              </span>
                            )}
                          </div>
                          {Array.isArray(t.items) && t.items.length > 1 && (
                            <div className="text-[11px] text-muted truncate max-w-xs mt-0.5">
                              {t.items.slice(0, 3).map(it => `${it.product_name} (${it.qty_diminta})`).join(', ')}
                              {t.items.length > 3 ? '...' : ''}
                            </div>
                          )}
                        </td>
                        {!isOutletStaff && <td className="px-6 py-4 text-ink/80 font-medium">{t.outlet_name}</td>}
                        <td className="px-6 py-4 text-center font-bold text-ink">{t.qty_requested}</td>
                        <td className="px-6 py-4 text-center text-ink/80 font-semibold">{t.qty_approved || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={t.status} />
                            {t.ada_selisih && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-700 border border-amber-500/40">
                                Ada Susulan
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openDetailModal(t)} 
                            className={`font-semibold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              isOutletStaff && t.status === 'DIKIRIM'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : !isOutletStaff && t.status === 'DIAJUKAN'
                                ? 'bg-richisam-orange hover:bg-[#d9530a] text-white shadow-sm'
                                : !isOutletStaff && t.status === 'DIPROSES'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                : 'text-richisam-orange hover:text-richisam-merah-muda'
                            }`}
                          >
                            {isOutletStaff 
                              ? (t.status === 'DIKIRIM' ? 'Terima Barang' : 'Detail') 
                              : (t.status === 'DIAJUKAN' ? 'Proses Tiket' : t.status === 'DIPROSES' ? 'Kirim Barang' : 'Detail')}
                          </button>
                          {!isOutletStaff && (t.status === 'DIKIRIM' || t.status === 'SELESAI' || t.status === 'DIPROSES') && (
                            <button 
                              onClick={() => handleOpenSuratJalan(t)}
                              className="p-1.5 text-stone-500 hover:text-white hover:bg-stone-800 rounded-lg transition-all cursor-pointer"
                              title="Cetak Surat Jalan Resmi"
                            >
                              <Printer size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={!isOutletStaff ? 8 : 7} className="px-6 py-16 text-center text-muted"><FileText size={24} className="mx-auto mb-2 opacity-50"/>Tidak ada tiket permintaan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination 15 Data Per Halaman */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTickets.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Add Request (Multi-Item Store Requisition) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-visible border border-line my-8 animate-fade-in relative">
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-line bg-cream/40 rounded-t-3xl">
              <div>
                <h2 className="font-bold text-ink text-xl flex items-center gap-2">
                  <PackagePlus className="text-richisam-orange h-6 w-6" />
                  Form Permintaan Barang Harian (Pagi)
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Ajukan seluruh daftar kebutuhan bahan baku outlet untuk hari ini dalam 1 tiket resmi.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-ink cursor-pointer p-1.5 rounded-lg hover:bg-cream">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 sm:p-6 space-y-5">
              {/* Info Cabang */}
              {!isOutletStaff ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Cabang Pemohon <span className="text-[#F9610D]">*</span>
                  </label>
                  <select
                    required
                    value={formData.outlet_id}
                    onChange={e => setFormData({ ...formData, outlet_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-sm font-medium focus:outline-none focus:border-richisam-orange"
                  >
                    <option value="">-- Pilih Cabang Pemohon --</option>
                    {outlets.filter(o => Number(o.id) !== 1).map(o => (
                      <option key={o.id} value={o.id}>{o.nama}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-cream/60 border border-line rounded-xl flex items-center justify-between text-xs text-ink font-medium">
                  <span>Cabang Pemohon: <strong>{user?.outlet_name || 'Outlet Cabang'}</strong></span>
                  <span className="text-muted">SOP Pengajuan Pagi (06:00 - 11:00)</span>
                </div>
              )}

              {/* Banner Transparansi Stok Pusat */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Transparansi Stok Gudang Pusat (CK):</strong>
                  <p className="mt-0.5 text-amber-800">
                    Sistem menampilkan sisa stok fisik di Gudang Pusat untuk setiap bahan baku. Jika stok di Pusat terbatas, Pusat akan membagi secara proporsional dan sisa pesanan akan berstatus <strong>Menyusul (Backorder)</strong>.
                  </p>
                </div>
              </div>

              {/* Multi-Item Table Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Layers size={14} className="text-richisam-orange" />
                    Daftar Bahan Baku Yang Diminta ({formData.items.length} Baris)
                  </label>
                </div>

                <div className="border border-line rounded-2xl bg-white shadow-xs overflow-visible">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cream/60 border-b border-line text-muted font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3 min-w-[260px]">Pilih Produk</th>
                        <th className="py-2.5 px-3 w-32 text-center">Stok Pusat</th>
                        <th className="py-2.5 px-3 w-36">Jumlah Diminta</th>
                        <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {formData.items.map((item, idx) => {
                        const selectedProd = products.find(p => String(p.id) === String(item.product_id));
                        const stokCK = selectedProd?.stok_pusat !== undefined ? selectedProd.stok_pusat : null;

                        return (
                          <tr key={idx} className="hover:bg-cream/20" style={{ position: 'relative', zIndex: formData.items.length - idx + 10 }}>
                            <td className="py-2.5 px-3 text-center font-bold text-muted">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <SearchableProductSelect
                                products={products}
                                value={item.product_id}
                                onChange={(productId) => handleItemChange(idx, 'product_id', productId)}
                                placeholder="Ketik nama bahan (contoh: Ayam, Beras, Teh)..."
                                required
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              {selectedProd ? (
                                <span className={`px-2 py-1 rounded-md text-[11px] font-bold inline-block ${
                                  stokCK > 20 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : stokCK > 0 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {stokCK} {selectedProd.satuan}
                                </span>
                              ) : (
                                <span className="text-muted text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  required
                                  type="number"
                                  min="1"
                                  value={item.qty_requested}
                                  onChange={e => handleItemChange(idx, 'qty_requested', e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-line rounded-lg text-sm font-bold text-ink focus:outline-none focus:border-richisam-orange"
                                  placeholder="Jml"
                                />
                                {selectedProd && (
                                  <span className="text-xs font-semibold text-muted shrink-0 w-10">
                                    {selectedProd.satuan}
                                  </span>
                                )}
                              </div>
                              {selectedProd && item.qty_requested && Number(item.qty_requested) > (stokCK || 0) && (
                                <span className="block text-[10px] text-amber-600 font-bold mt-1 leading-tight">
                                  ⚠️ Melebihi stok CK ({stokCK}). Sisa akan berstatus menyusul.
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Baris"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 1 Button Tambah Baris Bahan */}
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-2.5 border-2 border-dashed border-[#F9610D]/30 hover:border-[#F9610D] bg-[#F9610D]/5 hover:bg-[#F9610D]/10 text-richisam-orange text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <Plus size={16} />
                  <span>Tambah Baris Bahan</span>
                </button>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  Total: <strong className="text-richisam-orange">{formData.items.filter(it => it.product_id).length}</strong> bahan baku akan dipesan
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted hover:text-ink cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm font-bold bg-richisam-orange text-white rounded-xl hover:bg-[#d9530a] disabled:opacity-50 transition-colors shadow-md shadow-[#F9610D]/20 cursor-pointer flex items-center gap-2">
                    {submitting ? <RefreshCw size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                    <span>Kirim Tiket Permintaan Pagi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail / Process / Backorder Handling */}
      {isDetailModalOpen && selectedTicket && (() => {
        const canConfirmReceipt = (isOutletStaff || user?.role === 'OWNER' || user?.role === 'ADMIN_PUSAT') && selectedTicket.status === 'DIKIRIM';
        const hasReceivingDiscrepancy = detailItems.some(it => {
          const minta = parseInt(it.qty_diminta, 10) || 0;
          const kirim = parseInt(it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : it.qty_diminta, 10) || 0;
          const terima = parseInt(it.qty_diterima !== undefined && it.qty_diterima !== null ? it.qty_diterima : kirim, 10) || 0;
          return terima < kirim || (minta > 0 && terima < minta);
        });
        const discrepancyCount = detailItems.filter(it => {
          const minta = parseInt(it.qty_diminta, 10) || 0;
          const kirim = parseInt(it.qty_dikirim !== null && it.qty_dikirim !== undefined ? it.qty_dikirim : it.qty_diminta, 10) || 0;
          const terima = parseInt(it.qty_diterima !== undefined && it.qty_diterima !== null ? it.qty_diterima : kirim, 10) || 0;
          return terima < kirim || (minta > 0 && terima < minta);
        }).length;

        return (
          <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-line my-8 animate-fade-in">
              {/* Header Modal */}
              <div className="flex items-center justify-between p-5 border-b border-line bg-cream/30">
                <div>
                  <h2 className="font-bold text-ink text-xl flex items-center gap-2">
                    <FileText className="text-richisam-orange h-5 w-5" />
                    Rincian Tiket {selectedTicket.kode_tiket}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Cabang: <strong>{selectedTicket.outlet_name}</strong> • Tanggal: {new Date(selectedTicket.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-muted hover:text-ink cursor-pointer p-1.5 rounded-lg hover:bg-cream">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 sm:p-6 space-y-5">
                {/* Status Header */}
                <div className="flex items-center justify-between p-3.5 bg-cream/50 border border-line rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted uppercase tracking-wider">Status Tiket:</span>
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                  {selectedTicket.ada_selisih && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold flex items-center gap-1">
                      <Clock size={13} /> Terdapat Selisih / Barang Menyusul
                    </span>
                  )}
                </div>

                {/* KONDISI 1: CHECKLIST PENERIMAAN FISIK OLEH CABANG (Saat status DIKIRIM) */}
                {canConfirmReceipt ? (
                  <form onSubmit={handleConfirmReceipt} className="space-y-4">
                    {/* Banner Instruksi & Quick Button */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                          <Check size={16} className="text-emerald-600" />
                          Checklist Penerimaan Fisik di Outlet
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                          Harap periksa fisik barang yang tiba dari Central Kitchen. Sesuaikan kolom <strong>Qty Diterima Fisik</strong> dan cantumkan <strong>Catatan</strong> jika barang tidak lengkap atau rusak.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckAllComplete}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95"
                      >
                        <Check size={15} />
                        <span>Ceklis Semua Lengkap</span>
                      </button>
                    </div>

                    {/* Tabel Checklist Penerimaan */}
                    <div className="border border-line rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-cream/60 border-b border-line text-muted font-bold">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">No</th>
                            <th className="py-2.5 px-3 min-w-[160px]">Nama Produk</th>
                            <th className="py-2.5 px-3 text-center w-28">Dikirim (Pusat)</th>
                            <th className="py-2.5 px-3 text-center w-36">Diterima Fisik (Cabang)</th>
                            <th className="py-2.5 px-3 text-center w-28">Status Ceklis</th>
                            <th className="py-2.5 px-3 min-w-[200px]">Catatan Kondisi / Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {detailItems.map((item, idx) => {
                            const qtyDiminta = parseInt(item.qty_diminta, 10) || 0;
                            const qtyKirim = parseInt(item.qty_dikirim !== null && item.qty_dikirim !== undefined ? item.qty_dikirim : item.qty_diminta, 10) || 0;
                            const qtyTerima = item.qty_diterima !== undefined && item.qty_diterima !== '' ? parseInt(item.qty_diterima, 10) : qtyKirim;
                            const isLengkapSesuaiPermintaan = qtyTerima >= qtyDiminta && qtyDiminta > 0;
                            const isLengkapSesuaiKirim = qtyTerima >= qtyKirim && qtyKirim > 0;
                            const isZero = qtyTerima === 0;
                            const selisih = qtyKirim - qtyTerima;

                            return (
                              <tr key={idx} className={`transition-colors ${!isLengkapSesuaiPermintaan ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-cream/20'}`}>
                                <td className="py-2.5 px-3 text-center font-bold text-muted">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-ink">{item.product_name}</span>
                                  <span className="block text-[10px] text-muted font-mono">{item.product_kode || 'PRD'} • Satuan: {item.product_satuan || 'pcs'}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-ink bg-stone-100 px-2.5 py-1 rounded-lg text-xs">
                                    {qtyKirim} {item.product_satuan || ''}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.qty_diterima !== undefined ? item.qty_diterima : qtyKirim}
                                      onChange={(e) => {
                                        const next = [...detailItems];
                                        next[idx].qty_diterima = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                        setDetailItems(next);
                                      }}
                                      className={`w-20 px-2 py-1.5 border rounded-lg text-center font-bold text-sm focus:outline-none transition-all ${
                                        !isLengkapSesuaiPermintaan
                                          ? 'border-amber-400 bg-amber-50 text-amber-950 focus:border-amber-500 ring-2 ring-amber-300/50'
                                          : 'border-line bg-white text-ink focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                                      }`}
                                    />
                                    <span className="text-[11px] text-muted font-medium">{item.product_satuan}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isLengkapSesuaiPermintaan ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <Check size={12} /> Lengkap
                                    </span>
                                  ) : qtyKirim === 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <X size={12} /> Belum Dikirim (0/{qtyDiminta})
                                    </span>
                                  ) : isZero ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <X size={12} /> Belum Tiba (0/{qtyKirim})
                                    </span>
                                  ) : isLengkapSesuaiKirim ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <AlertTriangle size={12} /> Parsial ({qtyTerima}/{qtyDiminta})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <AlertTriangle size={12} /> Kurang ({selisih})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    placeholder={!isComplete ? "Wajib diisi (cth: 2 pack bocor di jalan)" : "Catatan kondisi fisik (opsional)"}
                                    value={item.catatan || ''}
                                    onChange={(e) => {
                                      const next = [...detailItems];
                                      next[idx].catatan = e.target.value;
                                      setDetailItems(next);
                                    }}
                                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none transition-all ${
                                      !isComplete && (!item.catatan || item.catatan.trim() === '')
                                        ? 'border-amber-400 bg-amber-50/60 placeholder:text-amber-700 focus:border-amber-500'
                                        : 'border-line bg-white text-ink placeholder:text-muted focus:border-emerald-500'
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Discrepancy Alert */}
                    {hasReceivingDiscrepancy && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950 font-bold mb-0.5">
                            Perhatian: Terdapat {discrepancyCount} barang diterima tidak lengkap / selisih!
                          </strong>
                          Stok cabang <strong>hanya akan bertambah sebesar jumlah yang diterima fisik</strong>. Selisih dan catatan kondisi Anda akan tersimpan resmi dalam sistem sehingga Gudang Pusat (CK) dapat menyiapkan pengiriman susulan (Backorder).
                        </div>
                      </div>
                    )}

                    {/* Catatan Umum Penerimaan */}
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Catatan Penerimaan / Surat Jalan (Opsional)</label>
                      <input
                        type="text"
                        value={receivingNote}
                        onChange={(e) => setReceivingNote(e.target.value)}
                        placeholder="Contoh: Diterima dalam kondisi baik oleh staf outlet, segel utuh..."
                        className="w-full px-3 py-2 bg-cream/40 border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Tombol Konfirmasi Selesai */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full px-4 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] ${
                          hasReceivingDiscrepancy
                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Memproses Verifikasi Penerimaan...</span>
                          </>
                        ) : hasReceivingDiscrepancy ? (
                          <>
                            <AlertTriangle size={16} />
                            <span>Konfirmasi Diterima Sebagian (Simpan Selisih & Tambah Stok Sesuai Fisik)</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Konfirmasi Selesai (Semua Barang Tiba Lengkap)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* KONDISI 2: TAMPILAN RINCIAN UNTUK STATUS LAIN (DIAJUKAN, DIPROSES, SELESAI, ATAU DIKIRIM OLEH CK) */
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                        {selectedTicket.status === 'SELESAI' ? 'Rincian Realisasi Penerimaan Barang' : `Rincian Barang Yang Diminta (${detailItems.length} Bahan)`}
                      </h3>
                      {canManageShipment && (selectedTicket.status === 'DIAJUKAN' || selectedTicket.status === 'DIPROSES') && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                          💡 Qty Kirim dibatasi maksimal stok CK. Berikan catatan jika barang menyusul.
                        </span>
                      )}
                    </div>

                    <div className="border border-line rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-cream/60 border-b border-line text-muted font-bold">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">No</th>
                            <th className="py-2.5 px-3">Nama Produk</th>
                            {selectedTicket.status !== 'SELESAI' && <th className="py-2.5 px-3 text-center">Stok Pusat</th>}
                            <th className="py-2.5 px-3 text-center">Diminta</th>
                            <th className="py-2.5 px-3 text-center w-36">
                              {canManageShipment && (selectedTicket.status === 'DIAJUKAN' || selectedTicket.status === 'DIPROSES') ? 'Qty Disetujui / Kirim' : 'Disetujui / Kirim'}
                            </th>
                            {selectedTicket.status === 'SELESAI' && <th className="py-2.5 px-3 text-center w-32">Diterima Fisik</th>}
                            <th className="py-2.5 px-3 text-center">Status Alokasi / Penerimaan</th>
                            <th className="py-2.5 px-3 min-w-[170px]">
                              {selectedTicket.status === 'SELESAI' ? 'Catatan Fisik' : 'Catatan Central Kitchen (CK)'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {detailItems.map((item, idx) => {
                            const qtyDiminta = parseInt(item.qty_diminta, 10) || 0;
                            const qtyKirim = parseInt(item.qty_dikirim !== null && item.qty_dikirim !== undefined ? item.qty_dikirim : item.qty_diminta, 10) || 0;
                            const qtyTerima = item.qty_diterima !== null && item.qty_diterima !== undefined ? parseInt(item.qty_diterima, 10) : qtyKirim;
                            const sisaMenyusul = Math.max(0, qtyDiminta - (selectedTicket.status === 'SELESAI' ? qtyTerima : qtyKirim));
                            const stokPusatNum = item.stok_pusat !== undefined && item.stok_pusat !== null ? Number(item.stok_pusat) : null;

                            return (
                              <tr key={idx} className="hover:bg-cream/20">
                                <td className="py-2.5 px-3 text-center font-bold text-muted">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-ink">{item.product_name}</span>
                                  <span className="block text-[10px] text-muted font-mono">{item.product_kode || 'PRD'} • Satuan: {item.product_satuan || 'pcs'}</span>
                                </td>
                                {selectedTicket.status !== 'SELESAI' && (
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md text-[11px]">
                                      {item.stok_pusat} {item.product_satuan || ''}
                                    </span>
                                  </td>
                                )}
                                <td className="py-2.5 px-3 text-center font-bold text-ink text-sm">
                                  {qtyDiminta}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {canManageShipment && (selectedTicket.status === 'DIAJUKAN' || selectedTicket.status === 'DIPROSES') ? (
                                    <div>
                                      <input
                                        type="number"
                                        min="0"
                                        max={stokPusatNum !== null ? Math.min(qtyDiminta, stokPusatNum) : qtyDiminta}
                                        value={item.qty_dikirim}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                          const maxCap = stokPusatNum !== null ? Math.min(qtyDiminta, stokPusatNum) : qtyDiminta;
                                          const clamped = val === '' ? '' : Math.min(maxCap, Math.max(0, val));
                                          const next = [...detailItems];
                                          next[idx].qty_dikirim = clamped;
                                          setDetailItems(next);
                                        }}
                                        className="w-24 px-2.5 py-1.5 border border-line rounded-lg text-center font-bold text-ink focus:outline-none focus:border-richisam-orange bg-white"
                                      />
                                      {stokPusatNum !== null && stokPusatNum < qtyDiminta && (
                                        <span className={`block text-[10px] font-bold mt-1 leading-tight ${
                                          stokPusatNum === 0 ? 'text-rose-600' : 'text-amber-600'
                                        }`}>
                                          {stokPusatNum === 0 ? '⚠️ Stok CK Kosong (0)' : `Maksimal: ${stokPusatNum} (Sesuai Stok CK)`}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-bold text-sm text-ink">{qtyKirim}</span>
                                  )}
                                </td>
                                {selectedTicket.status === 'SELESAI' && (
                                  <td className="py-2 px-3 text-center font-bold text-sm text-emerald-800 bg-emerald-50/50">
                                    {qtyTerima} {item.product_satuan}
                                  </td>
                                )}
                                <td className="py-2.5 px-3 text-center">
                                  {selectedTicket.status === 'SELESAI' ? (
                                    qtyTerima >= qtyKirim ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        ✓ Lengkap
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        ⚠ Kurang ({qtyKirim - qtyTerima})
                                      </span>
                                    )
                                  ) : (
                                    sisaMenyusul === 0 ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Lengkap
                                      </span>
                                    ) : qtyKirim === 0 ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        Menyusul Semua ({sisaMenyusul})
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        Menyusul {sisaMenyusul} {item.product_satuan}
                                      </span>
                                    )
                                  )}
                                </td>
                                {selectedTicket.status === 'SELESAI' ? (
                                  <td className="py-2.5 px-3 text-muted text-xs">
                                    {item.catatan || '-'}
                                  </td>
                                ) : (
                                  <td className="py-2 px-3">
                                    {canManageShipment && (selectedTicket.status === 'DIAJUKAN' || selectedTicket.status === 'DIPROSES') ? (
                                      <input
                                        type="text"
                                        placeholder={sisaMenyusul > 0 ? "Alasan menyusul & estimasi..." : "Catatan CK (opsional)..."}
                                        value={item.catatan || ''}
                                        onChange={(e) => {
                                          const next = [...detailItems];
                                          next[idx].catatan = e.target.value;
                                          setDetailItems(next);
                                        }}
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs ${
                                          sisaMenyusul > 0 && !item.catatan
                                            ? 'border-amber-400 bg-amber-50/50 text-amber-950 placeholder:text-amber-700/60 font-medium'
                                            : 'border-line text-ink bg-white'
                                        }`}
                                      />
                                    ) : item.catatan ? (
                                      <div className="flex items-start gap-1 p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                                        <span className="shrink-0">📢</span>
                                        <span>{item.catatan}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted text-xs italic">-</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Warning bila ada barang menyusul (status selain selesai) */}
                    {selectedTicket.status !== 'SELESAI' && detailItems.some(it => (parseInt(it.qty_diminta, 10) - (parseInt(it.qty_dikirim, 10) || 0)) > 0) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mt-2.5 flex items-center gap-2">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <span>
                          Sebagian pesanan dikirim parsial. Sisa kuantitas otomatis ditandai sebagai <strong>Menyusul (Backorder)</strong> dan dapat diantar menyusul begitu stok CK tersedia kembali.
                        </span>
                      </div>
                    )}

                    {/* Form Action Berdasarkan Status & Wewenang */}
                    {selectedTicket.status === 'DIAJUKAN' || selectedTicket.status === 'DIPROSES' ? (
                      canManageShipment ? (
                        <form onSubmit={handleUpdateStatus} className="space-y-4 border-t border-line pt-4 mt-4">
                          <div>
                            <label className="block text-xs font-bold text-ink mb-1.5">Tindakan / Status Pengiriman</label>
                            {(() => {
                              const totalKirim = detailItems.reduce((acc, it) => acc + (parseInt(it.qty_dikirim, 10) || 0), 0);
                              return (
                                <>
                                  <select 
                                    required 
                                    value={updateData.status} 
                                    onChange={e => setUpdateData({...updateData, status: e.target.value})} 
                                    className="w-full px-3 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-richisam-orange mb-3 font-medium"
                                  >
                                    {selectedTicket.status === 'DIAJUKAN' && (
                                      <option value="DIPROSES">DIPROSES (Sedang Disiapkan / Menunggu Stok di Gudang CK)</option>
                                    )}
                                    <option value="DIKIRIM" disabled={totalKirim === 0}>
                                      {totalKirim === 0 ? 'DIKIRIM (Terkunci: Semua Barang 0 / Stok Kosong)' : 'DIKIRIM (Kirim ke Cabang & Potong Stok CK)'}
                                    </option>
                                  </select>
                                  
                                  {totalKirim === 0 && (
                                    <p className="mt-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-medium">
                                      ⚠️ Tidak dapat mengirim barang karena jumlah semua barang yang dikirim bernilai 0. Simpan status sebagai <strong>DIPROSES</strong> sampai bahan baku siap di Gudang Pusat.
                                    </p>
                                  )}

                                  {updateData.status === 'DIKIRIM' && totalKirim > 0 && (
                                    <p className="mt-2 text-xs text-stone-500 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
                                      ℹ️ Saat status diubah ke <strong>DIKIRIM</strong>, stok bahan di <strong>Central Kitchen (CK)</strong> akan otomatis dipotong sesuai jumlah dikirim per item di atas.
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            <button 
                              type="submit" 
                              disabled={submitting} 
                              className="w-full px-4 py-2.5 text-sm font-bold bg-richisam-orange text-white rounded-xl hover:bg-[#d9530a] transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                              {submitting ? 'Menyimpan...' : updateData.status === 'DIKIRIM' ? 'Konfirmasi & Kirim Barang ke Cabang' : 'Simpan Status Diproses'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center mt-4">
                          ⏳ Tiket sedang dipersiapkan oleh Central Kitchen ({selectedTicket.status}). Staf hanya dapat mengonfirmasi selesai setelah barang dikirim dan tiba di cabang.
                        </div>
                      )
                    ) : selectedTicket.status === 'DIKIRIM' ? (
                      <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 text-center font-medium mt-4">
                        🚚 Barang sedang dalam perjalanan ke <strong>{selectedTicket.outlet_name}</strong>. Menunggu Staf Cabang memverifikasi checklist fisik barang tiba.
                      </div>
                    ) : (
                      <div className="space-y-3 mt-4 pt-4 border-t border-line">
                        <p className="text-sm text-green-700 text-center font-semibold">
                          ✓ Tiket telah diselesaikan. Stok cabang telah bertambah sesuai fisik barang yang diterima.
                        </p>
                        
                        {/* Tombol Buat Pengiriman Susulan Jika Ada Selisih */}
                        {selectedTicket.ada_selisih && detailItems.some(it => (parseInt(it.qty_diminta, 10) - (parseInt(it.qty_diterima !== null && it.qty_diterima !== undefined ? it.qty_diterima : it.qty_dikirim, 10) || 0)) > 0) && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-amber-900">
                              <strong className="block text-amber-950 font-bold mb-0.5">
                                {isOutletStaff ? 'Minta Pengiriman Susulan (Backorder)?' : 'Informasi Kekurangan Barang (Susulan)'}
                              </strong>
                              {isOutletStaff
                                ? 'Terdapat kekurangan barang pada penerimaan fisik di outlet. Klik tombol di samping untuk mengajukan tiket susulan agar Central Kitchen segera menyiapkan dan mengirim sisa bahan.'
                                : 'Terdapat kekurangan/selisih barang pada penerimaan tiket cabang ini. Pengajuan susulan dilakukan oleh staf cabang pemohon dan akan otomatis muncul di antrean tiket masuk.'}
                            </div>
                            {isOutletStaff && (
                              <button
                                type="button"
                                onClick={handleCreateBackorder}
                                disabled={submitting}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                              >
                                <Truck size={14} />
                                <span>Ajukan Pengiriman Susulan</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tombol Cetak Surat Jalan */}
                {!isOutletStaff && (
                  <div className="pt-4 border-t border-line mt-4">
                    <button
                      type="button"
                      onClick={() => handleOpenSuratJalan(selectedTicket)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F9610D]/10 hover:bg-[#F9610D] text-[#F9610D] hover:text-white border border-[#F9610D]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Printer size={16} />
                      <span>Cetak Surat Jalan Resmi (Delivery Note)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Emergency Request (CITO) */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border-2 border-red-500">
            <div className="flex items-center justify-between p-5 border-b border-line bg-red-50">
              <h2 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={20}/> Pengambilan Darurat (CITO)</h2>
              <button onClick={() => setIsEmergencyModalOpen(false)} className="text-muted hover:text-ink"><X size={20}/></button>
            </div>
            <form onSubmit={handleEmergencySubmit} className="p-5 space-y-4">
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm mb-4 border border-red-200">
                Fitur ini akan langsung memotong stok Gudang Pusat dan mencatatnya sebagai transaksi <b>SELESAI</b> tanpa persetujuan lebih lanjut. Gunakan hanya saat keadaan darurat.
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Cabang Yang Meminta</label>
                <select required value={emergencyData.outlet_id} onChange={e => setEmergencyData({...emergencyData, outlet_id: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white">
                  <option value="">Pilih Cabang</option>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Pilih Produk <span className="text-red-600">*</span></label>
                <SearchableProductSelect
                  products={products}
                  value={emergencyData.product_id}
                  onChange={(productId) => setEmergencyData({ ...emergencyData, product_id: productId })}
                  placeholder="Ketik nama atau kode produk darurat..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">Jumlah Fisik Diambil (Sesuai Satuan Di Atas)</label>
                <input type="number" required min="1" value={emergencyData.qty} onChange={e => setEmergencyData({...emergencyData, qty: e.target.value})} className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500" placeholder="Masukkan jumlah"/>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-bold text-red-700 flex items-center gap-2">
                   Otorisasi Admin Gudang
                </label>
                <input type="password" required value={emergencyData.password} onChange={e => setEmergencyData({...emergencyData, password: e.target.value})} className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500" placeholder="Masukkan password Anda sebagai Tanda Tangan Digital"/>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-line mt-6">
                <button type="button" onClick={() => setIsEmergencyModalOpen(false)} className="px-4 py-2 text-muted hover:text-ink font-medium">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                  {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                  Sahkan Pengambilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Surat Jalan Modal */}
      <SuratJalanModal
        isOpen={isSuratJalanOpen}
        onClose={() => setIsSuratJalanOpen(false)}
        data={selectedSuratJalan}
      />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const norm = String(status || '').toUpperCase().trim();
  const styles = {
    DIAJUKAN: 'bg-[#FFCE00]/20 text-[#FFCE00] border-[#FFCE00]/40',
    DIPROSES: 'bg-[#F9610D]/20 text-[#F9610D] border-[#F9610D]/40',
    DIKIRIM: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    SELESAI: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    DITOLAK: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  };

  const className = styles[norm] || 'bg-stone-800 text-stone-200 border-stone-700';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border uppercase inline-flex items-center justify-center shadow-sm ${className}`}>
      {status}
    </span>
  );
};

export default Permintaan;
