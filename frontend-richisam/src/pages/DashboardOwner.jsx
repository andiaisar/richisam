import React, { useState } from 'react';
import { Card, Table, Button, Badge } from 'flowbite-react';
import { Store, Package, AlertOctagon, Download } from 'lucide-react';

const DashboardOwner = () => {
  // Dummy data untuk summary cards
  const [summary] = useState({
    totalCabang: 12,
    totalBahanBaku: 150,
    totalBarangRusak: 24
  });

  // Dummy data untuk tabel pemantauan stok global
  const [stokGlobal] = useState([
    { id: 1, bahan_baku: 'Kopi Arabica', cabang: 'Cabang Sudirman', stok_saat_ini: 15, par_stock: 20 },
    { id: 2, bahan_baku: 'Susu UHT', cabang: 'Cabang Thamrin', stok_saat_ini: 50, par_stock: 30 },
    { id: 3, bahan_baku: 'Gula Aren', cabang: 'Cabang Sudirman', stok_saat_ini: 5, par_stock: 15 },
    { id: 4, bahan_baku: 'Syrup Vanilla', cabang: 'Cabang Kemang', stok_saat_ini: 12, par_stock: 10 },
    { id: 5, bahan_baku: 'Cup Plastik', cabang: 'Cabang Thamrin', stok_saat_ini: 100, par_stock: 200 },
    { id: 6, bahan_baku: 'Teh Hijau', cabang: 'Cabang Kemang', stok_saat_ini: 40, par_stock: 30 },
  ]);

  // Fungsi simulasi download
  const handleDownload = () => {
    alert('Fitur download laporan (Excel) akan segera diimplementasikan.');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Dashboard */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Owner</h1>
        <p className="text-gray-500 mt-2">Ringkasan operasional dan pemantauan stok seluruh cabang (Mode Read-Only)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Cabang</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCabang}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bahan Baku</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalBahanBaku}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Barang Rusak (Bulan Ini)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalBarangRusak}</h3>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Table Section: Pemantauan Stok Global */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Pemantauan Stok Global</h2>
            <p className="text-sm text-gray-500">Daftar stok bahan baku beserta status peringatan berdasarkan Par Stock.</p>
          </div>
          <Button color="success" onClick={handleDownload} className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Download Laporan Bulanan (Excel)
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Bahan Baku</Table.HeadCell>
              <Table.HeadCell>Cabang</Table.HeadCell>
              <Table.HeadCell>Stok Saat Ini</Table.HeadCell>
              <Table.HeadCell>Par Stock</Table.HeadCell>
              <Table.HeadCell>Status Peringatan</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y">
              {stokGlobal.map((item) => {
                // Logika status peringatan
                const isKritis = item.stok_saat_ini <= item.par_stock * 0.5;
                const isKurang = item.stok_saat_ini <= item.par_stock && !isKritis;
                const isAman = item.stok_saat_ini > item.par_stock;

                return (
                  <Table.Row key={item.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                    <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {item.bahan_baku}
                    </Table.Cell>
                    <Table.Cell>{item.cabang}</Table.Cell>
                    <Table.Cell className="font-semibold">{item.stok_saat_ini}</Table.Cell>
                    <Table.Cell>{item.par_stock}</Table.Cell>
                    <Table.Cell>
                      {isKritis && <Badge color="failure" className="w-fit">Kritis</Badge>}
                      {isKurang && <Badge color="warning" className="w-fit">Kurang (Di Bawah Par)</Badge>}
                      {isAman && <Badge color="success" className="w-fit">Aman</Badge>}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOwner;
