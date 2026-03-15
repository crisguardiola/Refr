<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ImageIcon } from '@lucide/svelte';

	function scrollToSection(sectionId: string) {
		const element = document.getElementById(sectionId);
		element?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<header
	class="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<!-- Logo -->
	<a href="/" class="flex items-center gap-2">
		<div
			class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			aria-hidden="true"
		>
			<ImageIcon class="size-5" />
		</div>
		<span class="text-xl font-bold tracking-tight">Refr</span>
	</a>

	<!-- Center nav -->
	<nav class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-6 sm:gap-8">
		<button
			type="button"
			onclick={() => scrollToSection('features')}
			class="text-muted-foreground text-sm font-medium transition-colors hover:text-foreground"
		>
			Features
		</button>
		<button
			type="button"
			onclick={() => scrollToSection('how-it-works')}
			class="text-muted-foreground text-sm font-medium transition-colors hover:text-foreground"
		>
			How it Works
		</button>
		<button
			type="button"
			onclick={() => scrollToSection('about')}
			class="text-muted-foreground text-sm font-medium transition-colors hover:text-foreground"
		>
			About
		</button>
	</nav>

	<!-- Get started -->
	<Button href="/demo/better-auth/login">Get started</Button>
</header>

<main class="bg-background">
	<!-- Hero -->
	<section class="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 py-16">
		<div class="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
			<p class="text-muted-foreground text-sm font-medium uppercase tracking-wider">
				For designers who think in images
			</p>

			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				Your references,<br />finally organised.
			</h1>

			<p class="text-muted-foreground text-lg leading-relaxed">
				Stop losing inspiration in your camera roll. Refr gives every screenshot a dedicated space,
				with context, tags, and the reason you saved it.
			</p>

			<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
				<Button size="lg" href="/demo/better-auth/login">Log in</Button>
				<Button variant="outline" size="lg" href="/demo/better-auth/login">Create account</Button>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="scroll-mt-20 px-6 py-24">
		<div class="mx-auto max-w-6xl">
			<p class="mb-4 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
				Why Refr
			</p>
			<h2 class="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
				A library is only useful<br />if you can find things in it.
			</h2>

			<div class="grid gap-12 md:grid-cols-3">
				<div class="flex flex-col gap-4">
					<h3 class="text-lg font-semibold tracking-tight">Capture the why</h3>
					<p class="text-muted-foreground leading-relaxed">
						Every reference comes with a one-line note, the thought you had when you saved it. Never
						wonder why a screenshot is in your collection again.
					</p>
				</div>
				<div class="flex flex-col gap-4">
					<h3 class="text-lg font-semibold tracking-tight">Auto-tagged instantly</h3>
					<p class="text-muted-foreground leading-relaxed">
						AI reads each screenshot and tags it by UI pattern, color palette, and type, so your
						collection organises itself as you build it.
					</p>
				</div>
				<div class="flex flex-col gap-4">
					<h3 class="text-lg font-semibold tracking-tight">Sketch on top</h3>
					<p class="text-muted-foreground leading-relaxed">
						Draw directly on a reference to mark what caught your eye. A circle, an arrow, a scribble,
						your thinking stays attached to the image.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- How it Works -->
	<section id="how-it-works" class="scroll-mt-20 px-6 py-24">
		<div class="mx-auto max-w-6xl">
			<p class="mb-4 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
				How it works
			</p>
			<h2 class="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
				From screenshot to searchable in seconds.
			</h2>

			<div class="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
				<div class="flex flex-col gap-4">
					<span class="text-3xl font-bold tabular-nums text-muted-foreground">01</span>
					<h3 class="text-lg font-semibold tracking-tight">Import</h3>
					<p class="text-muted-foreground leading-relaxed">
						Drag a screenshot in or upload directly from your camera roll.
					</p>
				</div>
				<div class="flex flex-col gap-4">
					<span class="text-3xl font-bold tabular-nums text-muted-foreground">02</span>
					<h3 class="text-lg font-semibold tracking-tight">Annotate</h3>
					<p class="text-muted-foreground leading-relaxed">
						Draw on the image to mark what stood out. Takes five seconds.
					</p>
				</div>
				<div class="flex flex-col gap-4">
					<span class="text-3xl font-bold tabular-nums text-muted-foreground">03</span>
					<h3 class="text-lg font-semibold tracking-tight">Capture intent</h3>
					<p class="text-muted-foreground leading-relaxed">
						Answer one quick question, what were you thinking when you saved this?
					</p>
				</div>
				<div class="flex flex-col gap-4">
					<span class="text-3xl font-bold tabular-nums text-muted-foreground">04</span>
					<h3 class="text-lg font-semibold tracking-tight">Find it later</h3>
					<p class="text-muted-foreground leading-relaxed">
						Search by keyword, color, project, or UI pattern. Your references are always findable.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- About -->
	<section id="about" class="scroll-mt-20 px-6 py-24">
		<div class="mx-auto max-w-6xl">
			<p class="mb-4 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
				Features
			</p>
			<h2 class="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
				Everything you need.<br />Nothing you don't.
			</h2>

			<div class="grid gap-10 md:grid-cols-2 md:gap-x-16 md:gap-y-12">
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Screenshot import</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Drag and drop on desktop or upload from camera roll.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Intention prompt</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						A one-line note to capture the reason behind each save.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Collection view</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Masonry grid with tags and notes visible at a glance.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Search & filters</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Find by keyword, color, UI pattern, or project.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Project organisation</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Group references by project to keep work streams separate.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Auto-tagging</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						AI categorises each image by pattern, color, and type.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Freehand annotation</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Draw directly on screenshots right after importing.
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-semibold tracking-tight">Colour search</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						Find references within the same colour palette instantly.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border bg-muted/30 px-6 py-24">
		<div class="mx-auto max-w-2xl text-center">
			<p class="text-2xl font-bold tracking-tight sm:text-3xl">your best ideas.</p>
			<p class="mt-4 text-lg text-muted-foreground">
				Your references deserve better than a camera roll.
			</p>
		</div>
	</footer>
</main>
