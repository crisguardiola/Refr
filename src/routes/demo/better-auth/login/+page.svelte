<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ImageIcon, KeyRound, X } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isSignUp = $state($page.url.searchParams.get('signup') === 'true');
</script>

<div class="relative flex min-h-svh flex-col items-center justify-center bg-background px-6 py-12">
	<a
		href="/"
		class="absolute right-4 top-4 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		aria-label="Close and return to landing"
	>
		<X class="size-5" />
	</a>
	<div class="mx-auto w-full max-w-sm space-y-8">
		<!-- Logo -->
		<div class="flex flex-col items-center gap-6">
			<a href="/" class="flex items-center gap-2">
				<div
					class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					aria-hidden="true"
				>
					<ImageIcon class="size-6" />
				</div>
				<span class="text-xl font-bold tracking-tight text-foreground">Refr</span>
			</a>

			<h1 class="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
		</div>

		<!-- Email form -->
		<form
			id="email-form"
			method="post"
			action={isSignUp ? '?/signUpEmail' : '?/signInEmail'}
			use:enhance
			class="space-y-4"
		>
			<div class="relative">
				<Input
					type="email"
					name="email"
					placeholder="Enter email address"
					required
					class="h-11 pr-10"
				/>
				<KeyRound
					class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
			</div>

			<Input
				type="password"
				name="password"
				placeholder="Password"
				required
				class="h-11"
			/>

			{#if isSignUp}
				<Input
					name="name"
					placeholder="Name"
					required
					class="h-11"
				/>
			{/if}

			<Button type="submit" class="h-11 w-full">
				{isSignUp ? 'Create account' : 'Continue'}
			</Button>
		</form>

		<p class="text-center text-sm text-muted-foreground">
			{isSignUp ? 'Already have an account?' : "Don't have an account?"}
			<button
				type="button"
				class="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
				onclick={() => (isSignUp = !isSignUp)}
			>
				{isSignUp ? 'Log in' : 'Create account'}
			</button>
		</p>

		{#if form?.message}
			<p class="text-center text-sm text-destructive">{form.message}</p>
		{/if}

		<!-- Legal text -->
		<p class="text-center text-xs text-muted-foreground">
			By continuing, you agree to Refr's
			<a href="/terms" class="text-foreground/80 hover:underline">Terms of Service</a>
			and
			<a href="/privacy" class="text-foreground/80 hover:underline">Privacy Policy</a>.
		</p>
	</div>
</div>
