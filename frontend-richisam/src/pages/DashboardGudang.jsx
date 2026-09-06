import { useEffect, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow,
  Button, Badge, Spinner, Alert, Card,
} from 'flowbite-react';
import { HiExclamationTriangle, HiTruck, HiArrowPath } from 'react-icons/hi2';
import api from '../utils/api';

const badgeColor = {
  Menunggu: 'warning',
  Diproses: 'info',
  Dikirim:  'purple',
  Selesai:  'success',
};

export default function DashboardGudang() {
  const [tikets, setTikets]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [prosesId, setProsesId] = useState(null);

  const fetchTikets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/permintaan');
      setTikets(res.data ?? []);
    } catch {
      setError('Gagal memuat antrean permintaan. Pastikan backend aktif.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTikets(); }, [fetchTikets]);

  const handleProses = async (idPermintaan) => {
    setProsesId(idPermintaan);
    try {
      await api.put(`/permintaan/${idPermintaan}/status`, { status: 'Diproses' });
      await fetchTikets();
    } catch {
      alert('Gagal memperbarui status. Coba lagi.');
    } finally { setProsesId(null); }
  };

  const totalMenunggu = tikets.filter(t => t.status === 'Menunggu').length;
  const totalDiproses = tikets.filter(t => t.status === 'Diproses').length;
  const totalSelesai  = tikets.filter(t => t.status === 'Selesai').length;

  return (
    <div className="space-y-6">

      {/* ══ KARTU METRIK ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-400">
          <p className="text-sm font-medium text-gray-500">Menunggu Diproses</p>
          <p className="text-4xl font-black text-yellow-500 mt-1">{loading ? '—' : totalMenunggu}</p>
          <p className="text-xs text-gray-400 mt-1">tiket perlu tindakan gudang</p>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <p className="text-sm font-medium text-gray-500">Sedang Diproses</p>
          <p className="text-4xl font-black text-blue-500 mt-1">{loading ? '—' : totalDiproses}</p>
          <p className="text-xs text-gray-400 mt-1">dalam perjalanan ke cabang</p>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <p className="text-sm font-medium text-gray-500">Selesai</p>
          <p className="text-4xl font-black text-green-500 mt-1">{loading ? '—' : totalSelesai}</p>
          <p className="text-xs text-gray-400 mt-1">dikonfirmasi oleh cabang</p>
        </Card>
      </div>

      {/* ══ TABEL ANTREAN TIKET ══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📋 Antrean Permintaan Stok</h2>
            <p className="text-sm text-gray-500 mt-0.5">Semua tiket dari seluruh cabang</p>
          </div>
          <Button size="sm" color="light" onClick={fetchTikets}>
            <HiArrowPath className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>

        {error && (
          <Alert color="failure" icon={HiExclamationTriangle} className="mb-3">{error}</Alert>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <Table hoverable>
            <TableHead>
              <TableHeadCell>ID Tiket</TableHeadCell>
              <TableHeadCell>Cabang Pemohon</TableHeadCell>
              <TableHeadCell>Tanggal Minta</TableHeadCell>
              <TableHeadCell className="text-center">Status</TableHeadCell>
              <TableHeadCell className="text-center">
                Aksi Gudang
                <span className="block text-xs font-normal text-gray-400">(Selesai = hak cabang)</span>
              </TableHeadCell>
            </TableHead>
            <TableBody divideY>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span className="text-gray-500">Memuat antrean tiket...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tikets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                    Belum ada tiket permintaan masuk.
                  </TableCell>
                </TableRow>
              ) : tikets.map((tiket) => (
                <TableRow key={tiket.id_permintaan} className="bg-white">
                  <TableCell className="font-mono font-semibold text-gray-700">
                    #{tiket.id_permintaan}
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">
                    {tiket.nama_cabang ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(tiket.tanggal_minta).toLocaleString('id-ID', {
                      dateStyle: 'medium', timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge color={badgeColor[tiket.status] ?? 'gray'}>{tiket.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {tiket.status === 'Menunggu' ? (
                      // ✅ Hanya "Proses & Kirim" — tidak ada tombol Selesai
                      <Button size="xs"
                        disabled={prosesId === tiket.id_permintaan}
                        onClick={() => handleProses(tiket.id_permintaan)}
                        style={{ background: 'var(--color-richisam-orange)', border: 'none' }}>
                        {prosesId === tiket.id_permintaan
                          ? <><Spinner size="xs" className="mr-1" />Memproses...</>
                          : <><HiTruck className="mr-1 h-4 w-4" />Proses & Kirim</>}
                      </Button>
                    ) : (
                      // ❌ Tidak ada tombol untuk status lain
                      <span className="text-xs text-gray-400 italic">
                        {tiket.status === 'Selesai' ? 'Dikonfirmasi cabang ✓' : 'Menunggu konfirmasi cabang'}
                      </span>
                    )}
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
