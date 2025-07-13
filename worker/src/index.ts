/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


const allowedOrigins = [
	'http://localhost:5173',
	'https://zettelkasten-3pj.pages.dev',
	// Add more allowed origins as needed
];

function getCorsHeaders(request: Request) {
	const origin = request.headers.get('Origin');
	const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
	return {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
	};
}

function handleOptions(request: Request) {
	// Handle CORS preflight
	return new Response(null, { headers: getCorsHeaders(request) });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}
		const corsHeaders = getCorsHeaders(request);
		const apiKey = request.headers.get("X-API-Key");
		if (apiKey !== env.SECRET_KEY) {
			return new Response("Unauthorized", { status: 401, headers: corsHeaders });
		}
		const url = new URL(request.url);
		if (url.pathname === '/api/notes' && request.method === 'GET') {
			try {
				// Support incremental sync: ?updated_after=timestamp
				const updatedAfter = url.searchParams.get('updated_after');
				let query = 'SELECT * FROM notes WHERE deleted IS NULL OR deleted = 0';
				let params: any[] = [];
				if (updatedAfter) {
					query += ' AND updated_at > ?';
					params.push(Number(updatedAfter));
				}
				const { results } = await env.DB.prepare(query).bind(...params).all();
				return new Response(JSON.stringify(results), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			} catch (error: any) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			}
		}
		if (url.pathname === '/api/notes' && request.method === 'POST') {
			try {
				const { id, title, content, tags, links, deleted } = await request.json() as any;
				const now = Date.now();
				await env.DB.prepare(
					'INSERT INTO notes (id, title, content, tags, created_at, updated_at, links, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)' +
					' ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, tags=excluded.tags, updated_at=excluded.updated_at, links=excluded.links, deleted=excluded.deleted'
				)
					.bind(id, title, content, tags, now, now, links, deleted ? 1 : 0)
					.run();
				return new Response(JSON.stringify({ message: 'Note added' }), {
					status: 201,
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			} catch (error: any) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			}
		}
		return new Response("Not Found", { status: 404, headers: corsHeaders });
	},
} satisfies ExportedHandler<Env>;