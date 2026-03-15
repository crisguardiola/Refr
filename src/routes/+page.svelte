<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ImageIcon } from '@lucide/svelte';
</script>

<main class="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16">
	<div class="mx-auto flex max-w-lg flex-col items-center gap-8 text-center">
		<div class="flex items-center gap-2">
			<div
				class="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
				aria-hidden="true"
			>
				<ImageIcon class="size-6" />
			</div>
			<h1 class="text-4xl font-bold tracking-tight">Refr</h1>
		</div>

		<p class="text-muted-foreground text-lg leading-relaxed">
			A reference management tool built for designers to organise and manage their reference
			screenshots. Keep your inspiration in one place—searchable, structured, and always at hand.
		</p>

		<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
			<Button size="lg" href="/demo/better-auth/login">Log in</Button>
			<Button variant="outline" size="lg" href="/demo/better-auth/login">Create account</Button>
		</div>

		<p class="text-muted-foreground text-sm">
			Already have an account?
			<a href="/demo/better-auth/login" class="text-primary underline-offset-4 hover:underline"
				>Sign in</a
			>
		</p>
	</div>
</main>
