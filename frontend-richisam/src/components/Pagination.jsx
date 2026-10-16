import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalItems,
  totalCount,
  pageSize = 15,
  onPageChange,
  variant = 'light', // 'light' | 'dark'
  className = '',
}) => {
  // Support both totalCount and totalItems seamlessly
  const total = Number(totalCount !== undefined ? totalCount : (totalItems !== undefined ? totalItems : 0));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fromItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(total, currentPage * pageSize);

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  // Algoritma nomor halaman dengan elipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (total <= 0) return null;

  const isDark = variant === 'dark';

  return (
    <div
      className={`px-4 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isDark
          ? 'border-[#2D241E] bg-[#140F0D]/80 text-stone-400'
          : 'border-line bg-cream/30 text-muted'
      } ${className}`}
    >
      {/* Keterangan Data */}
      <div className="font-medium select-none">
        Menampilkan{' '}
        <span className={`font-bold ${isDark ? 'text-white' : 'text-ink'}`}>
          {fromItem}
        </span>{' '}
        –{' '}
        <span className={`font-bold ${isDark ? 'text-white' : 'text-ink'}`}>
          {toItem}
        </span>{' '}
        dari{' '}
        <span className={`font-bold ${isDark ? 'text-[#FFCE00]' : 'text-richisam-orange font-extrabold'}`}>
          {total}
        </span>{' '}
        data
      </div>

      {/* Kontrol Navigasi Halaman */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 select-none">
          {/* Tombol Prev */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            aria-label="Halaman sebelumnya"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'border-[#2D241E] bg-[#1C1714] text-stone-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none'
                : 'border-line bg-white text-ink hover:bg-cream disabled:opacity-30 disabled:pointer-events-none shadow-xs'
            }`}
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Nomor Halaman */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className={`px-2 font-bold select-none ${isDark ? 'text-stone-500' : 'text-muted'}`}
                  >
                    ...
                  </span>
                );
              }
              const isActive = page === currentPage;
              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => onPageChange && onPageChange(page)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#F9610D] text-white shadow-md shadow-[#F9610D]/30 border border-[#F9610D]'
                        : 'bg-richisam-orange text-white shadow-sm border border-richisam-orange'
                      : isDark
                      ? 'border border-[#2D241E] bg-[#1C1714] text-stone-400 hover:text-white hover:bg-white/[0.06]'
                      : 'border border-line bg-white text-ink hover:bg-cream'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Tombol Next */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            aria-label="Halaman selanjutnya"
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'border-[#2D241E] bg-[#1C1714] text-stone-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none'
                : 'border-line bg-white text-ink hover:bg-cream disabled:opacity-30 disabled:pointer-events-none shadow-xs'
            }`}
          >
            <span className="hidden sm:inline">Selanjutnya</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
