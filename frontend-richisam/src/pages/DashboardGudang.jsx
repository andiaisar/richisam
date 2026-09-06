import { useEffect, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow,
  Button, Badge, Spinner, Alert,
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

      {/* ══ KARTU METRIK — warna eksplisit agar tidak ikut dark mode OS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kartu Menunggu */}
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '20px 24px',
          borderLeft: '4px solid #EAB308',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          border: '1px solid #F3F0EC', borderLeftColor: '#EAB308',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', margin: '0 0 6px' }}>Menunggu Diproses</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#CA8A04', margin: '0 0 4px', lineHeight: 1 }}>
            {loading ? '—' : totalMenunggu}
          </p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>tiket perlu tindakan gudang</p>
        </div>

        {/* Kartu Diproses */}
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '20px 24px',
          border: '1px solid #F3F0EC', borderLeftColor: '#3B82F6',
          borderLeft: '4px solid #3B82F6',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', margin: '0 0 6px' }}>Sedang Diproses</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#2563EB', margin: '0 0 4px', lineHeight: 1 }}>
            {loading ? '—' : totalDiproses}
          </p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>dalam perjalanan ke cabang</p>
        </div>

        {/* Kartu Selesai */}
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '20px 24px',
          border: '1px solid #F3F0EC', borderLeftColor: '#22C55E',
          borderLeft: '4px solid #22C55E',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', margin: '0 0 6px' }}>Selesai</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#16A34A', margin: '0 0 4px', lineHeight: 1 }}>
            {loading ? '—' : totalSelesai}
          </p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>dikonfirmasi oleh cabang</p>
        </div>
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
              {/* ✅ TableRow wajib di dalam TableHead */}
              <TableRow>
                <TableHeadCell>ID Tiket</TableHeadCell>
                <TableHeadCell>Cabang Pemohon</TableHeadCell>
                <TableHeadCell>Tanggal Minta</TableHeadCell>
                <TableHeadCell className="text-center">Status</TableHeadCell>
                <TableHeadCell className="text-center">
                  Aksi Gudang
                  <span className="block text-xs font-normal text-gray-400">(Selesai = hak cabang)</span>
                </TableHeadCell>
              </TableRow>
            </TableHead>
            {/* ✅ Hapus prop divideY — tidak dikenal di v0.12 */}
            <TableBody>
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
                      <Button size="xs"
                        disabled={prosesId === tiket.id_permintaan}
                        onClick={() => handleProses(tiket.id_permintaan)}
                        style={{ background: 'var(--color-richisam-orange)', border: 'none' }}>
                        {prosesId === tiket.id_permintaan
                          ? <><Spinner size="xs" className="mr-1" />Memproses...</>
                          : <><HiTruck className="mr-1 h-4 w-4" />Proses & Kirim</>}
                      </Button>
                    ) : (
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
