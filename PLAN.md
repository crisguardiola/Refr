## Refr
A reference management tool built for designers to organise and manage their reference screenshots.


## Problem statement
Designers constantly save screenshots for inspiration, but without a dedicated space to organise them, references get lost in camera rolls with no context, making them hard to find or use when it actually matters.

## About
Refr is a reference management tool built for designers to organise and manage their reference screenshots. It automatically tags and categorises each image so the collection stays searchable and structured over time. The result is a dedicated space for references that captures not just what was saved, but why it was saved.

## Target users
Designers who collect visual references during research, including UI designers, product designers, and design students, who are frustrated by references getting lost in their camera roll with no context.

## Core features
# Screenshot import
Upload references via drag and drop on desktop or directly from the phone camera roll
# Intention prompt
A one-line note captured at import to record the reason behind saving a reference
# Project organisation
Group references into projects to keep different work streams separate
# Collection view
A visual, masonry-style grid of all saved references with notes and ta
# Search & filters
Find any reference by keyword, color, tag, UI pattern, or project
#Rating
Rate assets for efficient organisation

## Nice-to-have
# Auto-tagging
Automatic categorisation of each image by UI pattern, color palette, and interface type
# Freehand annotation
Draw and mark up directly on top of a screenshot right after importing it
#Find Duplicates
Scan and Marge duplicates to save space

## Not in Scope
# Colour Search
Swiftly find references within the same colour palette to quickly surface visually consistent inspiration
# Plugins
Extend Refr's workflow with integrations for Figma, Notion, and Slack to bring references directly into these tools
# Cloud Sync Tools
Pair with cloud sync tools to manage and access the reference collection seamlessly across devices

## User flow

1. Capture — Designer takes a screenshot naturally on their device from mobile/computer. (core)
2. Import — Screenshot is dragged in or uploaded to Refr (core)
3. Annotate — A canvas opens for optional freehand drawing on top of the image (nice-to-have)
4. Contextualise — A one-line prompt asks if the user wants to add a note when saving (core)
5. Process — AI automatically tags the image by UI type, color, and pattern (done by the user - core) (AI - nice-to-have) 
6. Organise — Reference is assigned to a project and grouped by the user (core)
7. Retrieve — Designer searches and filters the collection when they need it, they can copy or download the screenshot (core)

## Tech stack

# Frontend
SvelteKit — App framework
Tailwind CSS — Styling
Canvas API — Freehand drawing and annotation (nice-to-have)

# Backend
Neon — Serverless Postgres database
Drizzle — ORM for database queries
Better Auth — Authentication (no guest mode)
Cloudinary — Image storage and optimisation

## AI
Anthropic API — Vision model for auto-tagging, color extraction, and UI pattern recognition (nice-to-have)

## Deployment
Netlify — Hosting (free tier)

