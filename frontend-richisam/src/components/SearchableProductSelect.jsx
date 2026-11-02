import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ChevronDown, Check, Package, RotateCcw } from 'lucide-react';

const SearchableProductSelect = ({
  products = [],
  value = '',
  onChange,
  placeholder = 'Ketik nama atau kode produk... (contoh: Ayam, Beras, PRD-001)',
  required = false,
  disabled = false,
  className = '',
  showPrice = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Cari produk terpilih berdasarkan ID
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find(p => String(p.id) === String(value)) || null;
  }, [products, value]);

  // Filter daftar produk berdasarkan pencarian (nama, kode, satuan, kategori)
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter(p => {
      const matchKode = p.kode?.toLowerCase().includes(q);
      const matchNama = p.nama?.toLowerCase().includes(q);
      const matchSatuan = p.satuan?.toLowerCase().includes(q);
      const matchKategori = p.kategori?.toLowerCase().includes(q);
      return matchKode || matchNama || matchSatuan || matchKategori;
    });
  }, [products, search]);

  // Reset highlight saat hasil filter berubah
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Tutup dropdown saat klik di luar komponen
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll otomatis ke item yang di-highlight via keyboard
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product) => {
    if (onChange) {
      onChange(product ? String(product.id) : '', product);
    }
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('', null);
    }
    setSearch('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input untuk mendukung HTML5 form validation jika required */}
      <input
        type="text"
        value={value || ''}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Trigger Tampilan */}
      {selectedProduct && !isOpen ? (
        // State 1: Produk sudah terpilih
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`search-select-trigger group flex items-center justify-between gap-2 px-3.5 py-2.5 bg-cream/50 hover:bg-cream border border-line rounded-xl cursor-pointer transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#F9610D]/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="search-select-badge shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F9610D]/15 text-[#F9610D] border border-[#F9610D]/30">
              {selectedProduct.kode || 'PROD'}
            </span>
            <span className="search-select-name font-bold text-sm text-ink truncate">
              {selectedProduct.nama}
            </span>
            <span className="search-select-unit shrink-0 text-xs text-muted font-medium bg-sand/60 px-2 py-0.5 rounded border border-line">
              {selectedProduct.satuan}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                title="Ganti / Hapus pilihan produk"
                className="p-1 rounded-lg text-muted hover:text-[#EC1F27] hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
            <ChevronDown size={16} className="text-muted group-hover:text-[#F9610D] transition-colors" />
          </div>
        </div>
      ) : (
        // State 2: Mode pencarian aktif / Belum ada produk terpilih
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <Search size={16} className="text-[#F9610D]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={search}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="search-select-input w-full pl-10 pr-9 py-2.5 bg-cream border border-line rounded-xl text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#F9610D]/20 focus:border-[#F9610D] transition-all font-medium"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
                className="text-muted hover:text-ink cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            ) : (
              <ChevronDown
                size={16}
                onClick={() => {
                  setIsOpen(!isOpen);
                  inputRef.current?.focus();
                }}
                className={`text-muted cursor-pointer transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Dropdown Hasil Pencarian */}
      {isOpen && (
        <div className="search-select-dropdown absolute z-50 left-0 right-0 mt-1.5 bg-[#1C1714] border border-[#2D241E] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-fade-in">
          {/* Header info pencarian */}
          <div className="search-select-header flex items-center justify-between px-3.5 py-2 bg-[#140F0D] border-b border-[#241C18] text-[11px] text-muted">
            <span>
              {search.trim() ? (
                <>Hasil pencarian: <strong className="search-select-count text-white font-bold">{filteredProducts.length}</strong> produk</>
              ) : (
                <>Daftar Produk: <strong className="search-select-count text-white font-bold">{products.length}</strong> item tersedia</>
              )}
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[10px] text-[#F9610D] hover:underline cursor-pointer font-bold"
              >
                Reset pencarian
              </button>
            )}
          </div>

          {/* List Item */}
          <div
            ref={listRef}
            className="search-select-list max-h-60 overflow-y-auto divide-y divide-[#241C18]/60 p-1.5"
          >
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => {
                const isSelected = String(p.id) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(p)}
                    className={`search-select-item flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'is-selected bg-[#F9610D]/20 border border-[#F9610D]/40 text-white font-bold'
                        : isHighlighted
                        ? 'is-highlighted bg-white/[0.07] text-white'
                        : 'text-stone-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="search-select-badge shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFCE00]/15 border border-[#FFCE00]/30 text-[#FFCE00]">
                        {p.kode || 'PROD'}
                      </span>
                      <div className="min-w-0">
                        <p className="search-select-name font-bold text-white text-xs truncate">{p.nama}</p>
                        {p.kategori && (
                          <p className="search-select-cat text-[10px] text-stone-400 -mt-0.5">{p.kategori}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="search-select-unit px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#140F0D] border border-[#2D241E] text-stone-400">
                        {p.satuan}
                      </span>
                      {showPrice && p.harga && (
                        <span className="search-select-price text-[10px] text-stone-400 font-mono">
                          Rp {Number(p.harga).toLocaleString('id-ID')}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={14} className="text-[#F9610D] shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-muted">
                <Package size={28} className="mx-auto mb-2 opacity-40 text-stone-400" />
                <p className="text-xs font-bold text-stone-300">Produk tidak ditemukan</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Tidak ada produk dengan kata kunci "{search}". Periksa ejaan atau nama bahan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;

