import { create } from 'zustand';

const STORAGE_KEY = 'richistock-theme';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage tidak tersedia */
  }
  return 'dark';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
};

const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-switching');
    applyTheme(next);
    window.setTimeout(() => root.classList.remove('theme-switching'), 350);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* abaikan */
    }
    set({ theme: next });
  },
}));

// Sinkronkan atribut <html> saat modul pertama kali dimuat
applyTheme(useThemeStore.getState().theme);

export default useThemeStore;
