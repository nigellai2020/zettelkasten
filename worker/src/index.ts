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

function getAllowedOrigins(env: Env): string[] {
	const defaultOrigins = ['http://localhost:5173'];
	
	if (env.ALLOWED_ORIGINS) {
		return env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim());
	}
	
	return defaultOrigins;
}

function getCorsHeaders(request: Request, env: Env) {
	const allowedOrigins = getAllowedOrigins(env);
	const origin = request.headers.get('Origin');
	const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
	return {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
	};
}

function handleOptions(request: Request, env: Env) {
	// Handle CORS preflight
	return new Response(null, { headers: getCorsHeaders(request, env) });
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const corsHeaders = getCorsHeaders(request, env);
		const url = new URL(request.url);

		// Login endpoint
		if (url.pathname === '/api/login' && request.method === 'POST') {
			try {
				const { password } = await request.json() as { password?: string };
				if (typeof password !== 'string' || !password) {
					return new Response(JSON.stringify({ error: 'Missing password' }), { status: 400, headers: corsHeaders });
				}
				if (password !== env.SECRET_KEY) {
					return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401, headers: corsHeaders });
				}
				// Generate a session token and store it in KV
				const sessionToken = crypto.randomUUID();
				const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
				const sessionData = {
					createdAt: Date.now(),
					expiresAt,
					userId: 'user', // Simple user identifier
				};
				// Store session in KV with 24-hour expiration
				await env.SESSIONS.put(sessionToken, JSON.stringify(sessionData), {
					expirationTtl: 24 * 60 * 60, // 24 hours in seconds
				});
				return new Response(JSON.stringify({ 
					token: sessionToken, 
					expiresAt 
				}), { status: 200, headers: corsHeaders });
			} catch (error: any) {
				return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
			}
		}

		// Logout endpoint
		if (url.pathname === '/api/logout' && request.method === 'POST') {
			const authHeader = request.headers.get("Authorization");
			if (authHeader && authHeader.startsWith('Bearer ')) {
				const token = authHeader.substring(7);
				try {
					// Delete the session from KV
					await env.SESSIONS.delete(token);
					return new Response(JSON.stringify({ message: 'Logged out successfully' }), { 
						status: 200, 
						headers: { 'Content-Type': 'application/json', ...corsHeaders }
					});
				} catch (error: any) {
					return new Response(JSON.stringify({ error: 'Failed to logout' }), { 
						status: 500, 
						headers: { 'Content-Type': 'application/json', ...corsHeaders }
					});
				}
			}
			return new Response(JSON.stringify({ error: 'No valid session found' }), { 
				status: 400, 
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			});
		}

		if (request.method === 'OPTIONS') {
			return handleOptions(request, env);
		}

		// Auth for all other endpoints
		const apiKey = request.headers.get("X-API-Key");
		// Accept either X-API-Key or Authorization: Bearer <token>
		const authHeader = request.headers.get("Authorization");
		let authorized = false;
		
		// Check API key authentication
		// if (apiKey && apiKey === env.SECRET_KEY) {
		// 	authorized = true;
		// }
		
		// Check Bearer token authentication
		if (!authorized && authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.substring(7); // Remove "Bearer " prefix
			try {
				const sessionData = await env.SESSIONS.get(token);
				if (sessionData) {
					const session = JSON.parse(sessionData);
					// Check if session is still valid (not expired)
					if (session.expiresAt > Date.now()) {
						authorized = true;
					} else {
						// Clean up expired session
						await env.SESSIONS.delete(token);
					}
				}
			} catch (error) {
				console.error('Error validating session token:', error);
			}
		}
		
		if (!authorized) {
			return new Response("Unauthorized", { status: 401, headers: corsHeaders });
		}

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