import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Clock,
  Calendar,
  Store,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  PackageX,
  History,
  FileText,
  RotateCcw,
  Sparkles,
  Filter,
  Eye,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const SHIFT_OPTIONS = [
  { value: 'PAGI', label: 'Shift Pagi (09:00 - 16:00)', desc: 'Operasional buka hingga persiapan siang' },
  { value: 'SORE', label: 'Shift Sore / Malam (16:00 - 23:00)', desc: 'Operasional ramai malam & tutup toko' },
  { value: 'MIDNIGHT', label: 'Shift Midnight / Lembur', desc: 'Shift khusus prep dini hari' },
];

const ShiftClosing = () => {
  const { user } = useAuthStore();
  const isSuperUser = user?.role === 'OWNER' || user?.role === 'ADMIN_PUSAT';

  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(() => {
    if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
      return String(user.outlet_id);
    }
    return '';
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('PAGI');
  
  const [loading, setLoading] = useState(true);
  const [shiftData, setShiftData] = useState(null);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Executive Compliance Matrix (Khusus Admin / Owner)
  const [outletsStatus, setOutletsStatus] = useState([]);
  const [outletsStatusLoading, setOutletsStatusLoading] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('closing'); // 'closing' | 'history'
  const [historyOutletFilter, setHistoryOutletFilter] = useState(() => {
    if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
      return String(user.outlet_id);
    }
    return 'ALL';
  });
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Unlock Modal
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [targetClosingToUnlock, setTargetClosingToUnlock] = useState(null);

  // Close Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync user outlet if STAF_CABANG
  useEffect(() => {
    if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
      setSelectedOutlet(String(user.outlet_id));
      setHistoryOutletFilter(String(user.outlet_id));
    }
  }, [user]);

  // 1. Fetch Outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const res = await axiosClient.get('/outlets');
        const rawList = res?.data?.data || res?.data || res || [];
        const list = Array.isArray(rawList)
          ? rawList
          : Array.isArray(rawList?.data)
          ? rawList.data
          : [];
        setOutlets(list);
        if (list.length > 0) {
          if (user?.role === 'STAF_CABANG' && user?.outlet_id) {
            setSelectedOutlet(String(user.outlet_id));
            setHistoryOutletFilter(String(user.outlet_id));
          } else {
            // Untuk Owner / Admin Pusat: default ke cabang operasional pertama (bukan Gudang Pusat)
            const firstBranch = list.find((o) => o.tipe === 'CABANG') || list[0];
            setSelectedOutlet((prev) => prev || String(firstBranch.id));
            setHistoryOutletFilter('ALL');
          }
        }
      } catch (e) {
        console.error('Error fetching outlets', e);
      }
    };
    fetchOutlets();
  }, [user]);

  // 2. Fetch Executive Outlets Compliance Status (Admin / Owner)
  const fetchOutletsStatus = async () => {
    if (!isSuperUser) return;
    try {
      setOutletsStatusLoading(true);
      const res = await axiosClient.get('/shifts/outlets-status', {
        params: {
          tanggal: selectedDate,
          shift: selectedShift
        }
      });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setOutletsStatus(list);
    } catch (e) {
      console.error('Error fetching outlets status', e);
    } finally {
      setOutletsStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperUser) {
      fetchOutletsStatus();
    }
  }, [isSuperUser, selectedDate, selectedShift]);

  // 3. Fetch Shift Summary
  const fetchShiftSummary = async () => {
    const outletToFetch = selectedOutlet || (user?.role === 'STAF_CABANG' && user?.outlet_id ? String(user.outlet_id) : '');
    if (!outletToFetch) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axiosClient.get('/shifts/summary', {
        params: {
          outlet_id: outletToFetch,
          tanggal: selectedDate,
          shift: selectedShift
        }
      });
      const data = res?.data || res || null;
      setShiftData(data);
      if (data?.closing_info?.notes) {
        setHandoverNotes(data.closing_info.notes);
      } else {
        setHandoverNotes('');
      }
    } catch (e) {
      toast.error('Gagal memuat data shift: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftSummary();
  }, [selectedOutlet, selectedDate, selectedShift]);

  // 4. Fetch History
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const outletParam = user?.role === 'STAF_CABANG'
        ? user?.outlet_id
        : (historyOutletFilter === 'ALL' ? undefined : historyOutletFilter);

      const res = await axiosClient.get('/shifts/history', {
        params: {
          outlet_id: outletParam,
          status: historyStatusFilter === 'ALL' ? undefined : historyStatusFilter,
          limit: 30
        }
      });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setHistoryList(list);
    } catch (e) {
      console.error('Error fetching shift history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyOutletFilter, historyStatusFilter]);

  // 5. Handle Close Shift
  const handleCloseShift = async () => {
    if (isLocked) {
      toast.error(`Shift ${selectedShift} pada tanggal ${selectedDate} sudah berstatus dikunci.`);
      setShowConfirmModal(false);
      return;
    }
    try {
      setSubmitting(true);
      setShowConfirmModal(false);
      const res = await axiosClient.post('/shifts/close', {
        outlet_id: selectedOutlet,
        tanggal: selectedDate,
        shift: selectedShift,
        notes: handoverNotes
      });
      toast.success(res?.message || res?.data?.message || 'Shift berhasil ditutup dan dikunci!');
      await fetchShiftSummary();
      if (isSuperUser) fetchOutletsStatus();
      if (activeTab === 'history') fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menutup shift');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Handle Open Unlock Modal
  const openUnlockModal = (closingObj) => {
    setTargetClosingToUnlock(closingObj);
    setUnlockReason('');
    setShowUnlockModal(true);
  };

  // 7. Handle Unlock Shift
  const handleUnlockShift = async () => {
    if (!unlockReason.trim()) {
      toast.error('Wajib mengisi alasan pembukaan kunci shift.');
      return;
    }

    const closingId = targetClosingToUnlock?.id || shiftData?.closing_info?.id;
    if (!closingId) {
      toast.error('Data penutupan shift tidak ditemukan.');
      return;
    }

    try {
      setUnlocking(true);
      const res = await axiosClient.post(`/shifts/unlock/${closingId}`, {
        reason: unlockReason
      });
      toast.success(res?.message || res?.data?.message || 'Kunci shift berhasil dibuka!');
      setShowUnlockModal(false);
      setUnlockReason('');
      setTargetClosingToUnlock(null);
      await fetchShiftSummary();
      if (isSuperUser) fetchOutletsStatus();
      if (activeTab === 'history') fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuka kunci shift');
    } finally {
      setUnlocking(false);
    }
  };

  const isLocked = shiftData?.is_locked;
  const isUnlocked = shiftData?.is_unlocked || shiftData?.closing_info?.status === 'UNLOCKED';

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 text-white">
      {/* ── HEADER TITLE & ROLE BADGE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isSuperUser ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-400" />
                Mode Supervisor & Otorisasi Manajerial ({user?.role === 'OWNER' ? 'Owner' : 'Admin Pusat'})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#F9610D]/15 text-[#F9610D] border border-[#F9610D]/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Store size={14} className="text-[#F9610D]" />
                Mode Operasional Staf Cabang
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1412] border border-[#2D241E] text-xs font-medium text-stone-300">
              <Lock size={12} className="text-emerald-400" />
              Period Immutability Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight flex items-center gap-2.5">
            <Lock className="text-[#F9610D]" size={28} />
            Tutup Buku Shift & Rekonsiliasi Mutasi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            {isSuperUser
              ? 'Monitoring kepatuhan tutup shift seluruh cabang, reviu serah terima bahan, dan otorisasi pembukaan kunci shift.'
              : 'Rekonsiliasi serah terima stok harian dan pembekuan transaksi mutasi cabang untuk integritas data.'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-[#1A1412] p-1 rounded-2xl border border-[#2D241E] shrink-0">
          <button
            onClick={() => setActiveTab('closing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'closing'
                ? 'bg-[#F9610D] text-white shadow-lg shadow-[#F9610D]/25'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Clock size={15} /> Form & Review Shift
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#F9610D] text-white shadow-lg shadow-[#F9610D]/25'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <History size={15} /> Riwayat Tutup Shift
          </button>
        </div>
      </div>

      {activeTab === 'closing' ? (
        <>
          {/* ── SUPERVISOR COMPLIANCE MATRIX (ADMIN PUSAT & OWNER ONLY) ── */}
          {isSuperUser && (
            <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#241C18]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-[#F9610D]" />
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white">
                      Monitoring Kepatuhan Shift Seluruh Cabang
                    </h2>
                    <p className="text-xs text-stone-400">
                      Sesi: <strong className="text-white">{selectedDate} (Shift {selectedShift})</strong> — Klik cabang untuk meninjau detail atau buka kunci.
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchOutletsStatus}
                  disabled={outletsStatusLoading}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#F9610D]/40 bg-[#F9610D]/10 hover:bg-[#F9610D]/20 text-[#F9610D] text-xs font-bold transition-all shadow-sm cursor-pointer w-fit"
                >
                  <RotateCcw size={13} className={outletsStatusLoading ? 'animate-spin' : ''} />
                  <span>Segarkan Status</span>
                </button>
              </div>

              {outletsStatusLoading ? (
                <div className="py-6 text-center text-xs text-stone-400 animate-pulse">
                  Memeriksa kepatuhan shift seluruh cabang...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {outletsStatus.map((card) => {
                    const isCurrent = String(selectedOutlet) === String(card.outlet_id);
                    const isCardLocked = card.status === 'CLOSED';
                    const isCardUnlocked = card.status === 'UNLOCKED';

                    return (
                      <div
                        key={card.outlet_id}
                        onClick={() => setSelectedOutlet(String(card.outlet_id))}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-[#221A16] border-[#F9610D] shadow-lg shadow-[#F9610D]/10 ring-1 ring-[#F9610D]'
                            : 'bg-[#15100E] border-[#2D241E] hover:border-stone-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                {card.outlet_nama}
                              </h4>
                              <span className="text-[10px] text-stone-400 uppercase font-semibold">
                                {card.outlet_tipe === 'PUSAT' ? 'Gudang Pusat' : 'Cabang Resto'}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider shrink-0 ${
                                isCardLocked
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : isCardUnlocked
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  : 'bg-stone-500/15 text-stone-400 border-stone-500/30'
                              }`}
                            >
                              {isCardLocked ? 'LOCKED' : isCardUnlocked ? 'UNLOCKED' : 'OPEN'}
                            </span>
                          </div>

                          <div className="mt-2.5 text-[11px] text-stone-400 space-y-0.5">
                            {isCardLocked ? (
                              <>
                                <p className="text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Ditutup: {card.closing_info?.closed_by_nama || 'Staf'}
                                </p>
                                <p className="text-[10px] text-stone-500">
                                  In: +{card.closing_info?.total_items_in || 0} / Out: -{card.closing_info?.total_items_out || 0}
                                </p>
                              </>
                            ) : isCardUnlocked ? (
                              <>
                                <p className="text-amber-400 font-medium flex items-center gap-1">
                                  <Unlock size={12} /> Revisi: {card.closing_info?.unlocked_by_nama || 'Supervisor'}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate" title={card.closing_info?.notes}>
                                  {card.closing_info?.notes || '-'}
                                </p>
                              </>
                            ) : (
                              <p className="text-stone-400">Operasional shift berjalan</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#241C18] flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${isCurrent ? 'text-[#F9610D]' : 'text-stone-400'}`}>
                            {isCurrent ? '● Sedang Ditinjau' : 'Klik untuk Tinjau'}
                          </span>

                          {isCardLocked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUnlockModal({
                                  id: card.closing_info.id,
                                  outlet_nama: card.outlet_nama,
                                  shift_name: selectedShift,
                                  shift_date: selectedDate
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Unlock size={11} /> Buka Kunci
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── FILTER CONTROL PANEL ── */}
          <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#F9610D]/10 blur-[80px]" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cabang */}
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 flex items-center gap-1.5">
                  <Store size={14} className="text-[#F9610D]" /> Cabang Restoran
                </label>
                <select
                  value={selectedOutlet}
                  disabled={user?.role === 'STAF_CABANG'}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D] disabled:opacity-60 cursor-pointer"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nama} {o.tipe === 'PUSAT' ? '(Pusat)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#FFCE00]" /> Tanggal Operasional
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D]"
                />
              </div>

              {/* Shift */}
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-400" /> Sesi Shift
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full bg-[#120E0C] border border-[#2D241E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#F9610D] cursor-pointer"
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center bg-[#1A1412] rounded-3xl border border-[#2D241E]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#2D241E] border-t-[#F9610D]" />
                <span className="text-xs font-semibold text-stone-400">Menghitung rekapitulasi shift...</span>
              </div>
            </div>
          ) : (
            <>
              {/* ── STATUS BANNER: 1) LOCKED, 2) UNLOCKED (REVISI), 3) OPEN ── */}
              {isLocked ? (
                /* STATUS LOCKED */
                <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-950/60 via-[#1A1412] to-[#120E0C] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Lock size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                          Status: Dikunci (Closed & Locked)
                        </span>
                        <span className="text-xs text-stone-400">
                          {shiftData?.closing_info?.closed_by_nama ? `Ditutup Oleh: ${shiftData.closing_info.closed_by_nama}` : ''}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1">
                        Shift {selectedShift} pada {selectedDate} ({shiftData?.outlet_nama}) Telah Ditutup Permanen
                      </h3>
                      <p className="text-xs text-stone-300 mt-0.5">
                        Seluruh transaksi mutasi dan pengeluaran bahan pada sesi ini telah dibekukan (Period Immutability).
                      </p>
                      {shiftData?.closing_info?.notes && (
                        <div className="mt-3 p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-stone-300">
                          <strong className="text-white font-bold">Catatan Handover:</strong> {shiftData.closing_info.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSuperUser && (
                    <button
                      onClick={() =>
                        openUnlockModal({
                          id: shiftData?.closing_info?.id,
                          outlet_nama: shiftData?.outlet_nama,
                          shift_name: selectedShift,
                          shift_date: selectedDate
                        })
                      }
                      className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-lg cursor-pointer"
                    >
                      <Unlock size={16} />
                      Buka Kunci (Unlock Shift)
                    </button>
                  )}
                </div>
              ) : isUnlocked ? (
                /* STATUS UNLOCKED (SEDANG DIREVISI) */
                <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-950/60 via-[#1A1412] to-[#120E0C] border border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                      <Unlock size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                          Status: Kunci Dibuka untuk Revisi (UNLOCKED)
                        </span>
                        <span className="text-xs text-stone-400">
                          {shiftData?.closing_info?.unlocked_by_nama ? `Dibuka Oleh: ${shiftData.closing_info.unlocked_by_nama}` : ''}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1">
                        Shift {selectedShift} ({shiftData?.outlet_nama}) Sedang Dibuka untuk Revisi Data
                      </h3>
                      <p className="text-xs text-stone-300 mt-0.5">
                        Staf cabang berwenang melakukan koreksi atau penyesuaian mutasi stok. Kunci kembali shift setelah perbaikan selesai.
                      </p>
                      {shiftData?.closing_info?.notes && (
                        <div className="mt-3 p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-stone-300">
                          <strong className="text-amber-400 font-bold">Catatan Otorisasi:</strong> {shiftData.closing_info.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F9610D] to-[#BA4F18] hover:from-[#e55307] hover:to-[#a83d0d] text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                  >
                    <Lock size={16} />
                    Kunci Kembali Shift Ini
                  </button>
                </div>
              ) : (
                /* STATUS OPEN */
                <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-950/40 via-[#1A1412] to-[#120E0C] border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Unlock size={24} />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                        Status: Terbuka / Sedang Berjalan (Open)
                      </span>
                      <h3 className="text-lg font-black text-white mt-1">
                        Shift {selectedShift} Belum Ditutup
                      </h3>
                      <p className="text-xs text-stone-300 mt-0.5">
                        {isSuperUser
                          ? `Cabang ${shiftData?.outlet_nama} belum melakukan penutupan buku untuk shift ini.`
                          : 'Periksa rincian mutasi bahan di bawah ini sebelum melakukan serah terima shift ke staf berikutnya.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 font-medium">
                    Cabang: <strong className="text-white">{shiftData?.outlet_nama}</strong>
                  </span>
                </div>
              )}

              {/* ── KARTU METRIK SHIFT (WALLETS) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Item Masuk */}
                <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Barang Masuk (In)</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ArrowDownLeft size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-3">
                    +{shiftData?.stats?.total_qty_masuk || 0}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">Dari transfer gudang / supplier</p>
                </div>

                {/* Total Item Keluar */}
                <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Barang Terpakai (Out)</span>
                    <div className="w-7 h-7 rounded-lg bg-[#F9610D]/10 border border-[#F9610D]/20 flex items-center justify-center text-[#F9610D]">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#F9610D] mt-3">
                    -{shiftData?.stats?.total_qty_keluar || 0}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">Konsumsi dapur shift ini</p>
                </div>

                {/* Bahan Terlibat */}
                <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Varian Bahan</span>
                    <div className="w-7 h-7 rounded-lg bg-[#FFCE00]/10 border border-[#FFCE00]/20 flex items-center justify-center text-[#FFCE00]">
                      <Sparkles size={16} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
                    {shiftData?.stats?.total_produk_terlibat || 0} Item
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">Mengalami mutasi stok</p>
                </div>

                {/* Barang Cacat / Defect */}
                <div className="rounded-2xl sm:rounded-3xl p-5 bg-[#1A1412] border border-[#2D241E] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Defect / Rusak</span>
                    <div className="w-7 h-7 rounded-lg bg-[#EC1F27]/10 border border-[#EC1F27]/20 flex items-center justify-center text-[#EC1F27]">
                      <PackageX size={16} />
                    </div>
                  </div>
                  <p className={`text-2xl sm:text-3xl font-extrabold mt-3 ${(shiftData?.stats?.total_kasus_defect || 0) > 0 ? 'text-[#EC1F27]' : 'text-stone-300'}`}>
                    {shiftData?.stats?.total_kasus_defect || 0} Kasus
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    {(shiftData?.stats?.total_kasus_defect || 0) > 0 ? `${shiftData?.stats?.total_qty_defect} Qty terbuang` : 'Nihil kerusakan'}
                  </p>
                </div>
              </div>

              {/* ── TABEL MUTASI BAHAN SHIFT ── */}
              <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#241C18]">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#F9610D]" />
                    <h2 className="text-base sm:text-lg font-extrabold text-white">
                      Rincian Mutasi Bahan Baku pada Shift Ini ({shiftData?.outlet_nama})
                    </h2>
                  </div>
                  <span className="text-xs text-stone-400">
                    Total {shiftData?.items?.length || 0} item tercatat
                  </span>
                </div>

                {shiftData?.items?.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs sm:text-sm">
                    Belum ada pencatatan mutasi untuk Shift {selectedShift} pada {selectedDate} di cabang ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-3">Bahan Baku</th>
                          <th className="py-3 px-3 text-center">Satuan</th>
                          <th className="py-3 px-3 text-right">Stok Awal (SAW)</th>
                          <th className="py-3 px-3 text-right text-emerald-400">Masuk (+)</th>
                          <th className="py-3 px-3 text-right text-[#F9610D]">Keluar/Masak (-)</th>
                          <th className="py-3 px-3 text-right font-bold text-white">Sisa Akhir (SAK)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#241C18]">
                        {shiftData?.items?.map((item) => (
                          <tr key={item.product_id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3 font-bold text-white">
                              {item.nama_produk}
                            </td>
                            <td className="py-3 px-3 text-center text-stone-400 text-xs">
                              {item.satuan}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-stone-300">
                              {item.saw}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-emerald-400">
                              +{item.masuk}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-[#F9610D]">
                              -{item.keluar}
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-white">
                              {item.sak}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── FORM TUTUP BUKU & CATATAN HANDOVER (JIKA BELUM DIKUNCI) ── */}
              {!isLocked && (
                <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#241C18]">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-extrabold text-white">
                      Proses Tutup Buku & Serah Terima Shift
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-2">
                      Catatan Handover / Serah Terima ke Shift Selanjutnya:
                    </label>
                    <textarea
                      rows={3}
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      placeholder="Contoh: Stok ayam marinasi sisa 15 ekor, saus sambal aman, freezer pintu 2 sudah dibersihkan..."
                      className="w-full bg-[#120E0C] border border-[#2D241E] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#F9610D]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      Setelah ditutup, mutasi shift ini akan langsung dibekukan dan dikunci di sistem.
                    </p>

                    <button
                      id="btn-trigger-close"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#F9610D] to-[#BA4F18] hover:from-[#e55307] hover:to-[#a83d0d] text-white text-xs sm:text-sm font-black rounded-2xl shadow-xl shadow-[#F9610D]/25 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Lock size={16} />
                      {submitting ? 'Sedang Mengunci Shift...' : isUnlocked ? 'Kunci Kembali Shift Ini' : 'Kunci & Selesaikan Shift Ini'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* ── TAB RIWAYAT TUTUP SHIFT (HISTORICAL LOGS & SUPERVISOR CONTROL) ── */
        <div className="rounded-3xl bg-[#1A1412] border border-[#2D241E] p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#241C18]">
            <div className="flex items-center gap-2.5">
              <History size={20} className="text-[#FFCE00]" />
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Riwayat Tutup Shift & Audit Penguncian
                </h2>
                <p className="text-xs text-stone-400">
                  {isSuperUser
                    ? 'Rekam jejak seluruh penutupan shift cabang beserta riwayat pembukaan kunci (dual-control).'
                    : 'Rekam jejak penutupan shift pada cabang Anda.'}
                </p>
              </div>
            </div>

            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#F9610D]/40 bg-[#F9610D]/10 hover:bg-[#F9610D]/20 text-[#F9610D] text-xs font-bold transition-all shadow-sm cursor-pointer w-fit"
            >
              <RotateCcw size={14} className={historyLoading ? 'animate-spin' : ''} />
              <span>Segarkan Data</span>
            </button>
          </div>

          {/* Filter Bar Riwayat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#120E0C] border border-[#2D241E]">
            {/* Filter Cabang */}
            <div>
              <label className="block text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                <Store size={12} className="text-[#F9610D]" /> Filter Cabang:
              </label>
              <select
                value={historyOutletFilter}
                disabled={user?.role === 'STAF_CABANG'}
                onChange={(e) => setHistoryOutletFilter(e.target.value)}
                className="w-full bg-[#1A1412] border border-[#2D241E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F9610D] disabled:opacity-60 cursor-pointer"
              >
                {isSuperUser && <option value="ALL">Semua Cabang (Global)</option>}
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                <Filter size={12} className="text-[#FFCE00]" /> Filter Status:
              </label>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="w-full bg-[#1A1412] border border-[#2D241E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F9610D] cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="CLOSED">Terkunci (LOCKED)</option>
                <option value="UNLOCKED">Sedang Direvisi (UNLOCKED)</option>
              </select>
            </div>

            <div className="flex items-end">
              <span className="text-[11px] text-stone-400 pb-2">
                Menampilkan <strong>{historyList.length}</strong> catatan penutupan shift.
              </span>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-16 text-center text-stone-400 text-xs animate-pulse">
              Memuat data riwayat penutupan shift...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-stone-400 text-xs sm:text-sm">
              Belum ada riwayat penutupan shift yang cocok dengan kriteria filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#2D241E] text-stone-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Tanggal & Shift</th>
                    <th className="py-3 px-3">Cabang</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">In / Out</th>
                    <th className="py-3 px-3">Petugas Penutup</th>
                    <th className="py-3 px-3">Catatan Handover & Otorisasi</th>
                    <th className="py-3 px-3 text-right">Waktu Tutup</th>
                    {isSuperUser && <th className="py-3 px-3 text-center">Aksi Supervisor</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241C18]">
                  {historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">
                          {new Date(h.shift_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <span className="text-[11px] text-amber-400 font-semibold">Shift {h.shift_name}</span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-stone-300">
                        {h.outlet_nama}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          h.status === 'CLOSED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}>
                          {h.status === 'CLOSED' ? 'LOCKED' : 'UNLOCKED (Revisi)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-xs">
                        <span className="text-emerald-400 font-bold">+{h.total_items_in}</span> / <span className="text-[#F9610D] font-bold">-{h.total_items_out}</span>
                      </td>
                      <td className="py-3.5 px-3 text-stone-300 text-xs">
                        {h.closed_by_nama || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-stone-400 text-xs max-w-sm">
                        <div className="truncate" title={h.notes}>
                          {h.notes || '-'}
                        </div>
                        {h.unlocked_by_nama && (
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            🔓 Dibuka oleh: <strong>{h.unlocked_by_nama}</strong>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right text-stone-400 text-[11px]">
                        {new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {isSuperUser && (
                        <td className="py-3.5 px-3 text-center">
                          {h.status === 'CLOSED' ? (
                            <button
                              onClick={() =>
                                openUnlockModal({
                                  id: h.id,
                                  outlet_nama: h.outlet_nama,
                                  shift_name: h.shift_name,
                                  shift_date: h.shift_date
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Unlock size={12} /> Buka Kunci
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-500 italic">
                              Revisi Aktif
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL UNLOCK SHIFT (SUPERVISOR ONLY) ── */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 pb-3 border-b border-[#241C18]">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Otorisasi Pembukaan Kunci Shift</h3>
                <p className="text-xs text-stone-400">Tindakan ini dicatat ke dalam Audit Trail permanen.</p>
              </div>
            </div>

            {targetClosingToUnlock && (
              <div className="p-3.5 rounded-2xl bg-[#120E0C] border border-[#2D241E] text-xs text-stone-300 space-y-1">
                <p>
                  Cabang: <strong className="text-white">{targetClosingToUnlock.outlet_nama}</strong>
                </p>
                <p>
                  Sesi: <strong className="text-white">Shift {targetClosingToUnlock.shift_name}</strong> | Tanggal: <strong className="text-white">{targetClosingToUnlock.shift_date ? new Date(targetClosingToUnlock.shift_date).toLocaleDateString('id-ID') : selectedDate}</strong>
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-2">
                Alasan Resmi Pembukaan Kunci (Wajib Diisi):
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Contoh: Koreksi salah hitung stok sisa ayam marinasi oleh Staf Ahmad berdasarkan persetujuan Manager Operasional..."
                className="w-full bg-[#120E0C] border border-[#2D241E] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#F9610D]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnlockModal(false);
                  setTargetClosingToUnlock(null);
                }}
                className="px-4 py-2.5 rounded-xl text-stone-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUnlockShift}
                disabled={unlocking}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Unlock size={14} />
                {unlocking ? 'Membuka Kunci...' : 'Konfirmasi Buka Kunci'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI TUTUP SHIFT ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A1412] border border-[#2D241E] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3 pb-3 border-b border-[#241C18]">
              <div className="w-10 h-10 rounded-xl bg-[#F9610D]/20 text-[#F9610D] border border-[#F9610D]/30 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Konfirmasi Tutup Shift</h3>
                <p className="text-xs text-stone-400">Pembekuan dan Penguncian Mutasi Periode</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-300">
              <p>
                Anda akan mengunci seluruh mutasi <strong className="text-white">Shift {selectedShift}</strong> pada tanggal <strong className="text-white">{selectedDate}</strong> ({shiftData?.outlet_nama}).
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Setelah dikunci, status shift menjadi <strong>Dikunci (Closed & Locked)</strong> dan data mutasi tidak dapat diubah lagi oleh staf cabang tanpa otorisasi Supervisor/Owner.
                </span>
              </div>
              {handoverNotes && (
                <div className="p-3 rounded-xl bg-black/30 border border-[#2D241E] text-xs">
                  <span className="text-stone-400 block font-semibold mb-1">Catatan Handover:</span>
                  <span className="text-white italic">"{handoverNotes}"</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-close"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-stone-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-close"
                type="button"
                onClick={handleCloseShift}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F9610D] to-[#BA4F18] hover:from-[#e55307] hover:to-[#a83d0d] text-white font-extrabold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Lock size={14} />
                {submitting ? 'Sedang Mengunci...' : 'Ya, Kunci & Selesaikan Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftClosing;
