import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env so DATABASE_URL is available when running drizzle-kit migrate
try {
	const envPath = join(process.cwd(), '.env');
	const envContent = readFileSync(envPath, 'utf8');
	for (const line of envContent.split('\n')) {
		const m = line.match(/^([^#=]+)=(.*)$/);
		if (m) {
			const key = m[1].trim();
			const val = m[2].trim().replace(/^["']|["']$/g, '');
			if (!(key in process.env)) process.env[key] = val;
		}
	}
} catch {
	// .env not found; rely on existing process.env
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
