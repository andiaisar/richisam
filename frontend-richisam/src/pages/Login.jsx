import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Kredensial tidak valid.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#FBF7F4',              /* warm off-white — tidak mencolok */
      fontFamily: 'var(--sans)',
    }}>
      {/* Panel kiri — branding */}
      <div style={{
        width: '44%',
        background: 'linear-gradient(160deg, #1A0F08 0%, #2D1810 60%, #3D2215 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        gap: '28px',
      }} className="hidden md:flex">
        {/* Logo besar */}
        <img
          src="/logo.png"
          alt="Logo Richisam"
          style={{ width: '88px', height: '88px', objectFit: 'contain', borderRadius: '16px' }}
        />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
            Richisam
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
            Sistem Manajemen Inventaris<br />& Permintaan Stok Cabang
          </p>
        </div>
        {/* Strip warna dekoratif */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {['#F9610D','#FFCE00','#EC1F27'].map(c => (
            <div key={c} style={{ width: '32px', height: '4px', borderRadius: '2px', background: c, opacity: 0.7 }} />
          ))}
        </div>
      </div>

      {/* Panel kanan — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Mobile logo */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img src="/logo.png" alt="Logo Richisam"
              style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '8px' }} />
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1A0F08' }}>Richisam</div>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1A0F08', letterSpacing: '-0.5px' }}>
            Selamat datang
          </h1>
          <p style={{ margin: '0 0 32px', fontSize: '14px', color: '#9A8F89' }}>
            Masuk untuk mengakses sistem inventaris
          </p>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(237,3,3,0.06)', border: '1px solid rgba(237,3,3,0.15)',
              fontSize: '13px', color: '#C0392B',
            }}>⚠️ {error}</div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {[
              { id: 'username', label: 'Username', type: 'text', placeholder: 'Masukkan username', val: username, set: setUsername },
              { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', val: password, set: setPassword },
            ].map(({ id, label, type, placeholder, val, set }) => (
              <div key={id}>
                <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A3F39', marginBottom: '6px' }}>
                  {label}
                </label>
                <input id={id} type={type} value={val} onChange={e => set(e.target.value)}
                  required autoFocus={id === 'username'} placeholder={placeholder}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px', boxSizing: 'border-box',
                    border: '1.5px solid #E8E0DB', background: '#fff', color: '#1A0F08',
                    fontSize: '15px', outline: 'none', fontFamily: 'var(--sans)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-richisam-orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(249,97,13,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#E8E0DB'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              marginTop: '6px', padding: '13px', borderRadius: '10px', border: 'none',
              background: 'var(--color-richisam-orange)', color: '#fff',
              fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(249,97,13,0.25)', fontFamily: 'var(--sans)',
            }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#D94E08'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--color-richisam-orange)'; }}
            >
              {loading ? 'Memproses...' : 'Masuk →'}
            </button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#9A8F89' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--color-richisam-orange)', fontWeight: '600', textDecoration: 'none' }}>
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}