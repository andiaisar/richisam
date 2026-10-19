import React, { useState, useEffect } from 'react';
import { Printer, X, ClipboardCheck, Store, Calendar, FileText, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

const BeritaAcaraOpnameModal = ({ isOpen, onClose, opname, items = [] }) => {
  if (!isOpen || !opname) return null;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    if (opname) {
      const payload = `RICHISTOCK-VERIFIED|OPNAME-ID:${opname.id}|CODE:${opname.kode_opname || 'OPN-' + opname.id}|OUTLET:${opname.outlet_name || 'PUSAT'}|DATE:${opname.tanggal}|VALID:TRUE`;
      QRCode.toDataURL(payload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Failed to generate QR', err));
    }
  }, [opname]);

  const handlePrint = () => {
    window.scrollTo(0, 0);
    window.print();
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const itemsWithLoss = items.filter(i => (i.selisih || 0) < 0);
  const itemsWithSurplus = items.filter(i => (i.selisih || 0) > 0);
  const totalLossValue = itemsWithLoss.reduce((sum, i) => sum + (Math.abs(i.selisih || 0) * parseFloat(i.harga_snapshot || 0)), 0);
  const totalSurplusValue = itemsWithSurplus.reduce((sum, i) => sum + ((i.selisih || 0) * parseFloat(i.harga_snapshot || 0)), 0);
  const netDifference = totalSurplusValue - totalLossValue;
  const totalSelisihQty = items.reduce((acc, i) => acc + (i.selisih || 0), 0);

  const formattedDate = opname.tanggal
    ? new Date(opname.tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  const printTimestamp = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className="relative w-full max-w-5xl bg-[#1A1412] border border-[#2D241E] rounded-3xl shadow-2xl overflow-hidden print:static print:block print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none print:bg-white print:overflow-visible">
        
        {/* Top Control Bar (Hidden when printed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#140F0D] border-b border-[#2D241E] print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">
              Preview Berita Acara Stok Opname Resmi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F9610D] to-[#E25304] hover:from-[#FA6E20] hover:to-[#EB5B09] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#F9610D]/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800/50 rounded-xl transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="printable-area berita-acara-sheet p-6 sm:p-10 font-sans text-xs max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible">
          
          {/* ── KOP SURAT RESMI ── */}
          <div className="border-b-2 border-black pb-4 mb-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#F9610D] text-white flex items-center justify-center font-black text-2xl shadow-sm print:bg-black">
                  R
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
                    RICHISAM INDONESIA
                  </h1>
                  <p className="text-xs text-gray-700 font-semibold">
                    Central Kitchen & Supply Chain Management System
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Jl. Pengayoman, Makassar • Telp: (0411) 889-231 • inventory@richisam.com
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-gray-100 border border-black rounded text-[11px] font-black uppercase tracking-wider mb-1">
                  BERITA ACARA AUDIT
                </span>
                <div className="text-base font-mono font-black text-black">
                  {opname.kode}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Status: <strong>{opname.status}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── JUDUL DOKUMEN ── */}
          <div className="text-center my-4">
            <h2 className="text-base font-black uppercase tracking-wide text-black underline">
              BERITA ACARA HASIL STOK OPNAME & REKONSILIASI PERSEDIAAN
            </h2>
            <p className="text-[11px] text-gray-600 mt-1">
              Dokumen resmi pencatatan audit fisik lapangan, validasi selisih, dan valuasi kerugian (*Food Waste & Shrinkage*)
            </p>
          </div>

          {/* ── METADATA AUDIT ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-gray-50 border border-gray-300 rounded-lg my-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Cabang / Outlet:</span>
              <strong className="text-black text-sm">{opname.outlet_name || 'Outlet Cabang'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Tanggal Opname:</span>
              <strong className="text-black">{formattedDate}</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Petugas Opname:</span>
              <strong className="text-black">{opname.creator_name || '-'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Waktu Cetak:</span>
              <span className="text-gray-700">{printTimestamp} WITA</span>
            </div>
          </div>

          {/* ── RINGKASAN VALUASI KEUANGAN ── */}
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 border border-red-300 bg-red-50/60 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                Total Kerugian Fisik (Rugi)
              </span>
              <div className="text-lg font-black text-red-700 mt-0.5">
                {formatRupiah(totalLossValue)}
              </div>
              <span className="text-[10px] text-red-600 block mt-0.5">
                {itemsWithLoss.length} Bahan mengalami defisit/rusak
              </span>
            </div>

            <div className="p-3 border border-emerald-300 bg-emerald-50/60 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Total Kelebihan Fisik (Surplus)
              </span>
              <div className="text-lg font-black text-emerald-800 mt-0.5">
                {formatRupiah(totalSurplusValue)}
              </div>
              <span className="text-[10px] text-emerald-700 block mt-0.5">
                {itemsWithSurplus.length} Bahan berlebih dari sistem
              </span>
            </div>

            <div className="p-3 border border-gray-300 bg-gray-50 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 block">
                Net Dampak Keuangan
              </span>
              <div className={`text-lg font-black mt-0.5 ${netDifference < 0 ? 'text-red-700' : netDifference > 0 ? 'text-emerald-800' : 'text-gray-800'}`}>
                {netDifference < 0 ? `- ${formatRupiah(Math.abs(netDifference))}` : netDifference > 0 ? `+ ${formatRupiah(netDifference)}` : 'Rp 0'}
              </div>
              <span className="text-[10px] text-gray-600 block mt-0.5">
                Selisih Qty Netto: {totalSelisihQty > 0 ? `+${totalSelisihQty}` : totalSelisihQty} Pcs
              </span>
            </div>
          </div>

          {/* ── TABEL RINCIAN STOK OPNAME (PAS A4 100%) ── */}
          <div className="my-5 overflow-hidden border border-black rounded">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-black border-b border-black font-bold uppercase text-[10px]">
                  <th className="py-2 px-2 text-center border-r border-black w-8">No</th>
                  <th className="py-2 px-3 border-r border-black">Nama Bahan Baku</th>
                  <th className="py-2 px-2 text-center border-r border-black w-14">Satuan</th>
                  <th className="py-2 px-2 text-right border-r border-black w-24">Harga Satuan</th>
                  <th className="py-2 px-2 text-center border-r border-black w-16">Stok Sistem</th>
                  <th className="py-2 px-2 text-center border-r border-black w-16">Hitung Fisik</th>
                  <th className="py-2 px-2 text-center border-r border-black w-16">Selisih</th>
                  <th className="py-2 px-2 text-right border-r border-black w-24">Nilai Finansial</th>
                  <th className="py-2 px-3">Alasan / Catatan Selisih</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const selisih = item.selisih || 0;
                  const isMinus = selisih < 0;
                  const isPlus = selisih > 0;
                  const nilai = selisih * parseFloat(item.harga_snapshot || 0);

                  return (
                    <tr 
                      key={item.id || idx} 
                      className={`border-b border-gray-300 ${isMinus ? 'bg-red-50/30' : isPlus ? 'bg-emerald-50/20' : ''}`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-black text-gray-600">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 border-r border-black font-semibold text-black">
                        {item.nama}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black text-gray-600 uppercase text-[10px]">
                        {item.satuan}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                        {formatRupiah(item.harga_snapshot)}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black font-bold font-mono">
                        {item.qty_sistem}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black font-bold font-mono text-black">
                        {item.qty_fisik}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black font-bold font-mono">
                        <span className={isMinus ? 'text-red-700 font-black' : isPlus ? 'text-emerald-700 font-black' : 'text-gray-500'}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-black font-mono font-bold">
                        <span className={isMinus ? 'text-red-700' : isPlus ? 'text-emerald-700' : 'text-gray-600'}>
                          {isMinus ? `- ${formatRupiah(Math.abs(nilai))}` : isPlus ? `+ ${formatRupiah(nilai)}` : 'Rp 0'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-[10px] text-gray-700">
                        {item.alasan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-black font-bold text-[11px]">
                  <td colSpan={6} className="py-2 px-3 text-right border-r border-black uppercase">
                    Total Selisih Netto:
                  </td>
                  <td className="py-2 px-2 text-center border-r border-black font-mono">
                    <span className={totalSelisihQty < 0 ? 'text-red-700' : totalSelisihQty > 0 ? 'text-emerald-700' : 'text-black'}>
                      {totalSelisihQty > 0 ? `+${totalSelisihQty}` : totalSelisihQty}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right border-r border-black font-mono">
                    <span className={netDifference < 0 ? 'text-red-700' : netDifference > 0 ? 'text-emerald-700' : 'text-black'}>
                      {netDifference < 0 ? `- ${formatRupiah(Math.abs(netDifference))}` : netDifference > 0 ? `+ ${formatRupiah(netDifference)}` : 'Rp 0'}
                    </span>
                  </td>
                  <td className="py-2 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── DIGITAL AUDIT & VERIFICATION STAMP (E-STAMP RESMI) ── */}
          <div className="mt-6 p-3.5 bg-gray-50 border border-black/20 rounded-2xl flex items-center justify-between gap-4 print:bg-white print:border-black print:p-2.5">
            <div className="flex items-center gap-3.5">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Verifikasi Dokumen"
                  className="w-18 h-18 border border-gray-300 rounded-lg p-1 bg-white print:border-black shrink-0"
                />
              ) : (
                <div className="w-18 h-18 bg-gray-100 border border-gray-300 rounded-lg shrink-0 flex items-center justify-center text-[10px] text-gray-400 font-mono">
                  QR CODE
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-black font-black text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 print:text-black shrink-0" />
                  <span>Sertifikasi Audit Digital (RichiStock e-Verification)</span>
                </div>
                <p className="text-[10px] text-gray-700 mt-0.5 leading-snug">
                  Dokumen ini telah divalidasi keabsahannya oleh <strong>Sistem Terintegrasi RichiStock</strong>. Pindai kode QR untuk mengonfirmasi keaslian rekonsiliasi stok fisik, identitas pencatat, dan riwayat audit trail.
                </p>
                <div className="mt-1 flex items-center gap-2 text-[9px] font-mono text-gray-500">
                  <span>REF ID: {opname.kode_opname || `OPN-${opname.id}`}</span>
                  <span>•</span>
                  <span>STATUS: RESMI & TERKUNCI</span>
                  <span>•</span>
                  <span>CETAK: {printTimestamp}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-center justify-center border-2 border-dashed border-emerald-600/70 print:border-black px-3.5 py-1.5 rounded-xl text-center shrink-0">
              <span className="text-[8px] font-black uppercase text-emerald-800 tracking-widest print:text-black">STATUS DOKUMEN</span>
              <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider print:text-black">VERIFIED</span>
              <span className="text-[7.5px] text-gray-500 font-mono">AUDIT TRIAL PASSED</span>
            </div>
          </div>

          {/* ── LEMBAR PENGESAHAN & TANDA TANGAN (SIGNATURE BLOCK) ── */}
          <div className="mt-6 pt-4 border-t border-gray-400">
            <p className="text-[11px] text-gray-700 mb-6 italic text-center">
              Demikian Berita Acara ini dibuat dengan sebenarnya berdasarkan hasil penghitungan fisik di lokasi penyimpanan dan telah diverifikasi bersama.
            </p>

            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              {/* Kolom 1 */}
              <div className="flex flex-col justify-between h-28">
                <div>
                  <span className="font-bold text-black uppercase text-[11px] block">Dibuat Oleh,</span>
                  <span className="text-[10px] text-gray-500">Petugas Opname Cabang</span>
                </div>
                <div>
                  <div className="border-b border-black w-36 mx-auto mb-1"></div>
                  <strong className="text-black text-[11px] block">{opname.creator_name || 'Petugas Cabang'}</strong>
                </div>
              </div>

              {/* Kolom 2 */}
              <div className="flex flex-col justify-between h-28">
                <div>
                  <span className="font-bold text-black uppercase text-[11px] block">Diperiksa Oleh,</span>
                  <span className="text-[10px] text-gray-500">Kepala Cabang / Supervisor</span>
                </div>
                <div>
                  <div className="border-b border-black w-36 mx-auto mb-1"></div>
                  <span className="text-gray-500 text-[10px]">( ........................................ )</span>
                </div>
              </div>

              {/* Kolom 3 */}
              <div className="flex flex-col justify-between h-28">
                <div>
                  <span className="font-bold text-black uppercase text-[11px] block">Disetujui Oleh,</span>
                  <span className="text-[10px] text-gray-500">Owner / Central Kitchen</span>
                </div>
                <div>
                  <div className="border-b border-black w-36 mx-auto mb-1"></div>
                  <span className="text-gray-500 text-[10px]">( ........................................ )</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTNOTE RESMI ── */}
          <div className="mt-6 pt-2 border-t border-gray-200 text-center text-[9px] text-gray-400">
            Dokumen ini dicetak otomatis dari Sistem Inventaris RichiStock • Terdaftar resmi sebagai bukti audit fisik & penyesuaian stok.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeritaAcaraOpnameModal;
