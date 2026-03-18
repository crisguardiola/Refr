<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme.js';

	let { children } = $props();

	onMount(() => {
		const unsub = theme.subscribe(() => {});
		return unsub;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
		(function() {
			if (typeof document === 'undefined') return;
			const stored = localStorage.getItem('refr-theme');
			const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const isDark = stored === 'dark' || (stored !== 'light' && systemDark);
			document.documentElement.classList.toggle('dark', isDark);
		})();
	</script>
</svelte:head>
{@render children()}
