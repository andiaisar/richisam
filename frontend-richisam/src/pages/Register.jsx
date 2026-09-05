import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const ROLES = ['Pegawai', 'Manajer', 'Superadmin'];

export default function Register() {
  const [form, setForm] = useState({
    nama_lengkap: '',
    username: '',
    password: '',
    konfirmasi_password: '',
    role: 'Pegawai',
    id_cabang: '',
  });
  const [cabangList, setCabangList] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Ambil daftar cabang untuk dropdown
    api.get('/cabang').catch(() => {
      // Jika belum login, fetch tanpa token
      fetch('http://localhost:5000/api/cabang', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(r => r.json())
        .then(data => Array.isArray(data) && setCabangList(data))
        .catch(() => {});
    }).then(res => {
      if (res?.data && Array.isArray(res.data)) setCabangList(res.data);
    });
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.konfirmasi_password) {
      return setError('Password dan konfirmasi password tidak cocok.');
    }
    if (form.password.length < 6) {
      return setError('Password minimal 6 karakter.');
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        nama_lengkap: form.nama_lengkap,
        username: form.username,
        password: form.password,
        role: form.role,
        id_cabang: form.id_cabang || null,
      });

      setSuccess('Akun berhasil dibuat! Mengalihkan ke halaman login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Gagal membuat akun. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1.5px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-h)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'var(--sans)',
    boxSizing: 'border-box',
  };

  const focusIn = e => {
    e.target.style.borderColor = 'var(--color-richisam-orange)';
    e.target.style.boxShadow = '0 0 0 3px rgba(249,97,13,0.12)';
  };
  const focusOut = e => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-richisam-merah-tua) 0%, #8B0000 100%)',
      fontFamily: 'var(--sans)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--bg)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
        border: '1px solid var(--border)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'var(--color-richisam-orange)',
            boxShadow: '0 8px 20px rgba(249,97,13,0.35)',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>R</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: 'var(--text-h)', letterSpacing: '-0.5px' }}>
            Buat Akun
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
            Daftarkan akun baru untuk sistem Richisam
          </p>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '11px 14px', borderRadius: '10px', background: 'rgba(237,3,3,0.08)', border: '1px solid rgba(237,3,3,0.25)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-richisam-merah-tua)', fontWeight: '500' }}>⚠️ {error}</p>
          </div>
        )}
        {success && (
          <div style={{ marginBottom: '16px', padding: '11px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: '500' }}>✅ {success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {[
            { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', placeholder: 'cth. Budi Santoso' },
            { name: 'username', label: 'Username', type: 'text', placeholder: 'cth. budi123' },
            { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
            { name: 'konfirmasi_password', label: 'Konfirmasi Password', type: 'password', placeholder: 'Ulangi password' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '5px', letterSpacing: '0.02em' }}>
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                required
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>
          ))}

          {/* Role */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '5px' }}>
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Cabang */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-h)', marginBottom: '5px' }}>
              Cabang <span style={{ color: 'var(--text)', fontWeight: '400' }}>(opsional)</span>
            </label>
            <select
              name="id_cabang"
              value={form.id_cabang}
              onChange={handleChange}
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            >
              <option value="">— Tidak ditugaskan —</option>
              {cabangList.map(c => (
                <option key={c.id_cabang} value={c.id_cabang}>{c.nama_cabang}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--color-richisam-orange)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(249,97,13,0.35)',
              fontFamily: 'var(--sans)',
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--color-richisam-merah-muda)'; }}
            onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--color-richisam-orange)'; }}
          >
            {loading ? 'Mendaftarkan...' : 'Buat Akun →'}
          </button>
        </form>

        {/* Link ke Login */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text)' }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: 'var(--color-richisam-orange)', fontWeight: '600', textDecoration: 'none' }}>
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
