import { useEffect, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow,
  Button, Badge, Spinner, Alert,
} from 'flowbite-react';
import { HiExclamationTriangle, HiCheckCircle, HiArrowPath } from 'react-icons/hi2';
import api from '../utils/api';

// ID cabang: sementara hardcode ke 2 (Cabang Alauddin)
// Nanti ambil dari JWT: JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id_cabang
const ID_CABANG = 2;

export default function DashboardCabang() {
  const [stokKurang, setStokKurang]         = useState([]);
  const [pesananDiproses, setPesanan]       = useState([]);
  const [loadingStok, setLoadingStok]       = useState(true);
  const [loadingPesanan, setLoadingPesanan] = useState(true);
  const [errorStok, setErrorStok]           = useState('');
  const [errorPesanan, setErrorPesanan]     = useState('');
  const [konfirmasiId, setKonfirmasiId]     = useState(null);

  const fetchStokKurang = useCallback(async () => {
    setLoadingStok(true); setErrorStok('');
    try {
      const res = await api.get(`/stok-cabang/${ID_CABANG}/cek-kurang`);
      setStokKurang(res.data.data_barang_kurang ?? []);
    } catch {
      setErrorStok('Gagal memuat data stok. Pastikan backend aktif.');
    } finally { setLoadingStok(false); }
  }, []);

  const fetchPesanan = useCallback(async () => {
    setLoadingPesanan(true); setErrorPesanan('');
    try {
      const res = await api.get('/permintaan');
      setPesanan((res.data ?? []).filter(p => p.status === 'Diproses'));
    } catch {
      setErrorPesanan('Gagal memuat daftar pesanan.');
    } finally { setLoadingPesanan(false); }
  }, []);

  useEffect(() => { fetchStokKurang(); fetchPesanan(); }, [fetchStokKurang, fetchPesanan]);

  const handleKonfirmasi = async (idPermintaan) => {
    setKonfirmasiId(idPermintaan);
    try {
      await api.put(`/permintaan/${idPermintaan}/status`, { status: 'Selesai' });
      await fetchPesanan();
    } catch {
      alert('Gagal mengonfirmasi penerimaan barang. Coba lagi.');
    } finally { setKonfirmasiId(null); }
  };

  return (
    <div className="space-y-8">

      {/* ══ SEKSI 1: STOK PAGI ══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📦 Pemantauan Stok Pagi</h2>
            <p className="text-sm text-gray-500 mt-0.5">Barang yang stoknya di bawah batas minimum</p>
          </div>
          <Button size="sm" color="light" onClick={fetchStokKurang}>
            <HiArrowPath className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>

        {errorStok && (
          <Alert color="failure" icon={HiExclamationTriangle} className="mb-3">{errorStok}</Alert>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Nama Bahan</TableHeadCell>
              <TableHeadCell className="text-center">Stok Saat Ini</TableHeadCell>
              <TableHeadCell className="text-center">Stok Minimum</TableHeadCell>
              <TableHeadCell className="text-center">Kekurangan</TableHeadCell>
              <TableHeadCell className="text-center">Aksi</TableHeadCell>
            </TableHead>
            <TableBody divideY>
              {loadingStok ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Spinner size="md" /><span className="ml-2 text-gray-500">Memuat data stok...</span>
                  </TableCell>
                </TableRow>
              ) : stokKurang.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-green-600 font-medium">
                    ✅ Semua stok dalam kondisi aman!
                  </TableCell>
                </TableRow>
              ) : stokKurang.map((item) => (
                <TableRow key={`${item.id_cabang}-${item.id_bahan}`} className="bg-white">
                  <TableCell className="font-medium text-gray-900">{item.nama_bahan}</TableCell>
                  <TableCell className="text-center">
                    <Badge color="failure">{item.jumlah_sekarang} {item.nama_satuan}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-gray-600">{item.stok_minimum} {item.nama_satuan}</TableCell>
                  <TableCell className="text-center font-bold text-red-600">-{item.kekurangan} {item.nama_satuan}</TableCell>
                  <TableCell className="text-center">
                    <Button size="xs" style={{ background: 'var(--color-richisam-orange)', border: 'none' }}
                      onClick={() => alert(`Fitur ajukan untuk "${item.nama_bahan}" segera tersedia.`)}>
                      + Ajukan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ══ SEKSI 2: PENERIMAAN BARANG ══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🚚 Penerimaan Barang</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pesanan <strong>Diproses</strong> — konfirmasi setelah barang dihitung secara fisik
            </p>
          </div>
          <Button size="sm" color="light" onClick={fetchPesanan}>
            <HiArrowPath className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>

        {errorPesanan && (
          <Alert color="failure" icon={HiExclamationTriangle} className="mb-3">{errorPesanan}</Alert>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <Table hoverable>
            <TableHead>
              <TableHeadCell>ID Tiket</TableHeadCell>
              <TableHeadCell>Cabang Pemohon</TableHeadCell>
              <TableHeadCell>Tanggal Minta</TableHeadCell>
              <TableHeadCell className="text-center">Status</TableHeadCell>
              <TableHeadCell className="text-center">Aksi (SOP Cabang)</TableHeadCell>
            </TableHead>
            <TableBody divideY>
              {loadingPesanan ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Spinner size="md" /><span className="ml-2 text-gray-500">Memuat pesanan...</span>
                  </TableCell>
                </TableRow>
              ) : pesananDiproses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-400">
                    Tidak ada pesanan yang sedang diproses saat ini.
                  </TableCell>
                </TableRow>
              ) : pesananDiproses.map((p) => (
                <TableRow key={p.id_permintaan} className="bg-white">
                  <TableCell className="font-mono font-semibold text-gray-700">#{p.id_permintaan}</TableCell>
                  <TableCell>{p.nama_cabang ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(p.tanggal_minta).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color="info">Diproses</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="xs" color="success"
                      disabled={konfirmasiId === p.id_permintaan}
                      onClick={() => handleKonfirmasi(p.id_permintaan)}>
                      {konfirmasiId === p.id_permintaan
                        ? <><Spinner size="xs" className="mr-1" />Memproses...</>
                        : <><HiCheckCircle className="mr-1 h-4 w-4" />Konfirmasi Terima</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
