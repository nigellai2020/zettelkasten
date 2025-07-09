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

const corsHeaders = {
	'Access-Control-Allow-Origin': 'http://localhost:5173',
	'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
};

function handleOptions(request: Request) {
	// Handle CORS preflight
	return new Response(null, { headers: corsHeaders });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}
		const apiKey = request.headers.get("X-API-Key");
		if (apiKey !== env.SECRET_KEY) {
			return new Response("Unauthorized", { status: 401, headers: corsHeaders });
		}
		const url = new URL(request.url);
		if (url.pathname === '/api/notes' && request.method === 'GET') {
			try {
				const { results } = await env.DB.prepare('SELECT * FROM notes').all();
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
				const { id, title, content, tags, links } = await request.json() as any;
				const now = Date.now();
				await env.DB.prepare(
					'INSERT INTO notes (id, title, content, tags, created_at, updated_at, links) VALUES (?, ?, ?, ?, ?, ?, ?)'
				)
					.bind(id, title, content, JSON.stringify(tags || []), now, now, JSON.stringify(links || []))
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