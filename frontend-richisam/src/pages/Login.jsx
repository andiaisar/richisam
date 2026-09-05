import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Kredensial tidak valid. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
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

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg)',
        borderRadius: '20px',
        padding: '48px 40px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
        border: '1px solid var(--border)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'var(--color-richisam-orange)',
            boxShadow: '0 8px 24px rgba(249,97,13,0.4)',
            marginBottom: '20px',
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#fff',
              letterSpacing: '-1px',
            }}>R</span>
          </div>

          <h1 style={{
            margin: '0 0 6px',
            fontSize: '28px',
            fontWeight: '800',
            color: 'var(--text-h)',
            letterSpacing: '-0.5px',
          }}>
            Richisam
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text)',
          }}>
            Sistem Inventaris &amp; Permintaan Cabang
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(249,97,13,0.08)',
            border: '1px solid rgba(249,97,13,0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <p style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--color-richisam-merah-tua)',
              lineHeight: '1.5',
            }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="username" style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-h)',
              letterSpacing: '0.02em',
            }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'var(--sans)',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--color-richisam-orange)';
                e.target.style.boxShadow = '0 0 0 3px rgba(249,97,13,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password" style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-h)',
              letterSpacing: '0.02em',
            }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'var(--sans)',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--color-richisam-orange)';
                e.target.style.boxShadow = '0 0 0 3px rgba(249,97,13,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading
                ? 'var(--color-richisam-merah-muda)'
                : 'var(--color-richisam-orange)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(249,97,13,0.35)',
              fontFamily: 'var(--sans)',
            }}
            onMouseEnter={e => {
              if (!loading) e.target.style.background = 'var(--color-richisam-merah-muda)';
            }}
            onMouseLeave={e => {
              if (!loading) e.target.style.background = 'var(--color-richisam-orange)';
            }}
          >
            {loading ? 'Memproses...' : 'Masuk →'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: '28px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text)',
        }}>
          Belum punya akun?{' '}
          <a href="/register" style={{ color: 'var(--color-richisam-orange)', fontWeight: '600', textDecoration: 'none' }}>
            Daftar di sini
          </a>
        </p>
      </div>
    </div>
  );
}