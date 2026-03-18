import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'refr-theme';

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
	if (typeof window === 'undefined') return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function applyTheme(theme: Theme) {
	if (typeof document === 'undefined') return;
	const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');
	document.documentElement.classList.toggle('dark', isDark);
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('system', (setStore) => {
		const theme = getStoredTheme();
		setStore(theme);
		applyTheme(theme);

		const mediaQuery = typeof window !== 'undefined'
			? window.matchMedia('(prefers-color-scheme: dark)')
			: null;

		const handleChange = () => {
			const stored = getStoredTheme();
			if (stored === 'system') {
				applyTheme('system');
			}
		};

		mediaQuery?.addEventListener('change', handleChange);
		return () => mediaQuery?.removeEventListener('change', handleChange);
	});

	return {
		subscribe,
		set: (theme: Theme) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, theme);
			}
			set(theme);
			applyTheme(theme);
		},
		toggle: () => {
			update((current) => {
				const effective = current === 'system' ? getSystemTheme() : current;
				const next: Theme = effective === 'dark' ? 'light' : 'dark';
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, next);
				}
				applyTheme(next);
				return next;
			});
		},
	};
}

export const theme = createThemeStore();
