import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, Truck, Store, Calendar, FileText } from 'lucide-react';

const SuratJalanModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.created_at 
    ? new Date(data.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  const docCode = data.kode_transfer || data.kode_tiket || `SJ-${Date.now()}`;
  const senderName = data.from_outlet_name || 'Gudang Pusat Richisam';
  const senderAddress = data.from_outlet_address || 'Makassar, Sulawesi Selatan';
  const receiverName = data.to_outlet_name || data.outlet_name || 'Outlet Cabang';
  const receiverAddress = data.to_outlet_address || 'Makassar, Sulawesi Selatan';
  const creatorName = data.creator_name || 'Petugas Gudang';
  const items = data.items || [
    {
      product_kode: data.product_kode || 'PRD-001',
      product_name: data.product_name || 'Produk',
      product_satuan: data.product_satuan || 'pcs',
      qty: data.qty_approved || data.qty_requested || data.qty || 1
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-[#1A1412] border border-[#2D241E] rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:bg-white print:w-full print:max-w-none print:m-0">
        
        {/* Top Control Bar (Hidden when printed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#140F0D] border-b border-[#2D241E] print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Preview Dokumen Resmi Surat Jalan</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#F9610D] hover:bg-[#d9530a] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#F9610D]/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 text-stone-200 bg-[#16110F] print:bg-white print:text-black print:p-8 font-sans">
          
          {/* Header Surat */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-[#3D302A] pb-6 gap-4 print:border-black">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#F9610D] flex items-center justify-center text-white font-black text-xl shadow-md print:bg-black print:text-white">
                  R
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black uppercase">
                    RICHISAM INDONESIA
                  </h1>
                  <p className="text-xs text-stone-400 print:text-gray-600 font-medium">
                    Central Kitchen & Supply Chain Management System
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-stone-500 print:text-gray-500 mt-2">
                Jl. Pengayoman, Makassar • Hotline: (0411) 889-231 • logistics@richisam.com
              </p>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-[#241A16] print:bg-gray-100 border border-[#3D302A] print:border-gray-400 rounded-lg text-xs font-bold text-[#FFCE00] print:text-black tracking-wider uppercase mb-1">
                SURAT JALAN RESMI
              </span>
              <div className="text-lg font-mono font-bold text-white print:text-black">
                {docCode}
              </div>
              <div className="text-xs text-stone-400 print:text-gray-600 flex items-center sm:justify-end gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Pengirim & Penerima Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            {/* Asal */}
            <div className="p-4 rounded-2xl bg-[#1C1613] border border-[#2D241E] print:bg-gray-50 print:border-gray-300">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 print:text-gray-700 mb-2">
                <Store className="w-4 h-4" />
                <span>Lokasi Asal (Pengirim)</span>
              </div>
              <div className="text-base font-bold text-white print:text-black">
                {senderName}
              </div>
              <p className="text-xs text-stone-400 print:text-gray-600 mt-1">
                {senderAddress}
              </p>
              <div className="text-[11px] text-stone-500 print:text-gray-500 mt-2 pt-2 border-t border-[#2D241E] print:border-gray-200">
                Petugas Dispatch: <strong className="text-stone-300 print:text-gray-800">{creatorName}</strong>
              </div>
            </div>

            {/* Tujuan */}
            <div className="p-4 rounded-2xl bg-[#1C1613] border border-[#2D241E] print:bg-gray-50 print:border-gray-300">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-gray-700 mb-2">
                <Truck className="w-4 h-4" />
                <span>Lokasi Tujuan (Penerima)</span>
              </div>
              <div className="text-base font-bold text-white print:text-black">
                {receiverName}
              </div>
              <p className="text-xs text-stone-400 print:text-gray-600 mt-1">
                {receiverAddress}
              </p>
              <div className="text-[11px] text-stone-500 print:text-gray-500 mt-2 pt-2 border-t border-[#2D241E] print:border-gray-200">
                Metode Pengiriman: <strong className="text-stone-300 print:text-gray-800">Kurir Internal / Antar Langsung</strong>
              </div>
            </div>
          </div>

          {/* Table Items */}
          <div className="my-6 overflow-hidden rounded-2xl border border-[#2D241E] print:border-black">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#140F0D] print:bg-gray-200 text-stone-300 print:text-black text-xs uppercase font-bold tracking-wider border-b border-[#2D241E] print:border-black">
                <tr>
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Kode Barang</th>
                  <th className="px-4 py-3">Deskripsi Bahan Baku</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-center">Satuan</th>
                  <th className="px-4 py-3 text-center">Kondisi Cek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241B17] print:divide-gray-300 font-medium">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1E1714] print:hover:bg-transparent">
                    <td className="px-4 py-3 text-center text-stone-400 print:text-black">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#FFCE00] print:text-black font-semibold">
                      {item.product_kode || `PRD-0${idx + 1}`}
                    </td>
                    <td className="px-4 py-3 text-white print:text-black font-bold">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-center text-base font-black text-white print:text-black">
                      {item.qty}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-300 print:text-gray-700 capitalize">
                      {item.product_satuan || 'pcs'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-emerald-400 print:text-gray-700">
                      [ ✓ ] Baik / Sesuai
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Catatan Khusus */}
          <div className="p-3.5 rounded-xl bg-[#140F0D] border border-[#2D241E] print:bg-gray-50 print:border-gray-300 text-xs text-stone-400 print:text-gray-700 mb-8">
            <span className="font-bold text-stone-300 print:text-black">Instruksi & Catatan Khusus: </span>
            {data.catatan ? data.catatan : 'Barang telah diperiksa fisik dan dikeluarkan dari gudang. Mohon staf penerima memverifikasi kuantitas dan kesegaran bahan sebelum menandatangani bukti ini.'}
          </div>

          {/* Kolom Tanda Tangan Resmi (3 Pihak) */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#2D241E] print:border-black text-center">
            {/* Pengirim */}
            <div className="flex flex-col items-center justify-between h-36">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 print:text-gray-700">
                Diserahkan Oleh (Asal)
              </span>
              <div className="w-28 border-b border-dashed border-stone-600 print:border-black my-2"></div>
              <div>
                <p className="text-xs font-bold text-white print:text-black">
                  ( {creatorName} )
                </p>
                <p className="text-[10px] text-stone-500 print:text-gray-500">Staf Gudang / Asal</p>
              </div>
            </div>

            {/* Kurir */}
            <div className="flex flex-col items-center justify-between h-36">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 print:text-gray-700">
                Dibawa Oleh (Kurir)
              </span>
              <div className="w-28 border-b border-dashed border-stone-600 print:border-black my-2"></div>
              <div>
                <p className="text-xs font-bold text-white print:text-black">
                  ( ............................. )
                </p>
                <p className="text-[10px] text-stone-500 print:text-gray-500">Driver / Kurir Pengantar</p>
              </div>
            </div>

            {/* Penerima */}
            <div className="flex flex-col items-center justify-between h-36">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 print:text-gray-700">
                Diterima Oleh (Outlet)
              </span>
              <div className="w-28 border-b border-dashed border-stone-600 print:border-black my-2"></div>
              <div>
                <p className="text-xs font-bold text-white print:text-black">
                  ( ............................. )
                </p>
                <p className="text-[10px] text-stone-500 print:text-gray-500">Staf Penerima Cabang</p>
              </div>
            </div>
          </div>

          {/* Footer Security Stamp */}
          <div className="mt-8 pt-4 border-t border-[#2D241E] print:border-gray-300 flex items-center justify-between text-[10px] text-stone-500 print:text-gray-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dokumen ini diterbitkan sah secara digital oleh sistem RichiStock UNHAS.</span>
            </div>
            <div>
              Dicetak pada: {new Date().toLocaleTimeString('id-ID')} WITA
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SuratJalanModal;
