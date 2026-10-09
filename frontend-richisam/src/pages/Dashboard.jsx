import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { 
  TrendingDown, 
  AlertCircle, 
  Package, 
  Store,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  FileWarning
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [lowStocks, setLowStocks] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, lowRes, reqRes] = await Promise.all([
          axiosClient.get('/reports/dashboard'),
          axiosClient.get('/stocks/low'),
          axiosClient.get('/requests?limit=5')
        ]);
        
        setStats(statsRes.data);
        setLowStocks(lowRes.data?.slice(0, 4) || []);
        setRecentRequests(reqRes.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-richisam-orange"></div>
          <span className="text-sm font-medium text-muted">Memuat data...</span>
        </div>
      </div>
    );
  }

  const roleDisplay = user?.role === 'ADMIN_PUSAT' ? 'Pusat' : user?.role === 'STAF_CABANG' ? 'Cabang' : 'Owner';

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl tracking-tight">Ikhtisar {roleDisplay}</h1>
          <p className="mt-1 text-sm text-muted">Pantau pergerakan stok, peringatan sistem, dan aktivitas terbaru.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium text-ink">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          </span>
          Sistem Online
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Produk" 
          value={stats?.total_produk || 0} 
          icon={Package} 
          trend="+3 bulan ini"
        />
        {user?.role !== 'STAF_CABANG' && (
          <MetricCard 
            title="Cabang Aktif" 
            value={stats?.total_cabang || 0} 
            icon={Store} 
            trend="Stabil"
          />
        )}
        <MetricCard 
          title="Stok Menipis" 
          value={stats?.total_stok_menipis || 0} 
          icon={TrendingDown} 
          valueColor={stats?.total_stok_menipis > 0 ? "text-richisam-red" : "text-ink"}
          alert={stats?.total_stok_menipis > 0}
        />
        <MetricCard 
          title="Defect (Bulan Ini)" 
          value={stats?.total_defect_bulan_ini || 0} 
          icon={AlertCircle}
          valueColor={stats?.total_defect_bulan_ini > 0 ? "text-richisam-orange" : "text-ink"}
        />
      </div>

      {/* Two Column Layout for Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-line px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-richisam-red" />
              Peringatan Stok Menipis
            </h2>
            <Link to="/stocks" className="text-sm font-medium text-richisam-orange hover:text-richisam-red transition-colors flex items-center gap-1">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {lowStocks.length > 0 ? (
              <ul className="divide-y divide-line">
                {lowStocks.map((item, idx) => (
                  <li key={`${item.outlet_id}-${item.product_id}-${idx}`} className="p-4 hover:bg-cream/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                        <Package className="h-4 w-4 text-richisam-red" />
                      </div>
                      <div>
                        <p className="font-medium text-ink group-hover:text-richisam-red transition-colors">{item.product_name}</p>
                        <p className="text-xs text-muted mt-0.5">{item.outlet_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-ink">{item.qty_current}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-richisam-red">Sisa Stok</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState 
                icon={CheckCircle2} 
                title="Stok Aman" 
                desc="Tidak ada produk yang berada di bawah batas minimum." 
              />
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-line px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted" />
              Permintaan Terakhir
            </h2>
            <Link to="/requests" className="text-sm font-medium text-richisam-orange hover:text-richisam-red transition-colors flex items-center gap-1">
              Lihat Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {recentRequests.length > 0 ? (
              <ul className="divide-y divide-line">
                {recentRequests.map((req) => (
                  <li key={req.id} className="p-4 hover:bg-cream/50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink flex items-center gap-2">
                        {req.product_name}
                        <StatusBadge status={req.status} />
                      </p>
                      <p className="text-xs text-muted mt-1">Oleh {req.creator_name} • {req.outlet_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{req.qty_requested} unit</p>
                      <p className="text-xs text-muted">{new Date(req.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState 
                icon={FileWarning} 
                title="Belum Ada Permintaan" 
                desc="Tidak ada tiket restock yang masuk saat ini." 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// UI Components

const MetricCard = ({ title, value, icon: Icon, trend, valueColor = "text-ink", alert = false }) => (
  <div className={`relative overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:shadow-sm ${alert ? 'border-richisam-red/30' : 'border-line'}`}>
    {alert && <div className="absolute top-0 left-0 h-1 w-full bg-richisam-red" />}
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-muted">{title}</p>
      <div className={`rounded-full p-2 ${alert ? 'bg-red-50 text-richisam-red' : 'bg-cream text-ink'}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className="mt-4">
      <h3 className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</h3>
      {trend && <p className="mt-1 text-xs font-medium text-muted">{trend}</p>}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, desc }) => (
  <div className="flex h-full flex-col items-center justify-center p-8 text-center min-h-[240px]">
    <div className="mb-4 rounded-full bg-cream p-3 text-muted">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1 max-w-xs text-xs text-muted">{desc}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'DIAJUKAN': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'DIPROSES': 'bg-blue-50 text-blue-700 border-blue-200',
    'DIKIRIM': 'bg-purple-50 text-purple-700 border-purple-200',
    'SELESAI': 'bg-green-50 text-green-700 border-green-200',
  };
  
  const className = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase ${className}`}>
      {status}
    </span>
  );
};

export default Dashboard;
