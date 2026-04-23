import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/inngest',
]);

export default clerkMiddleware(async (auth, request) => {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://intelligencehub.cloud',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Allow service-to-service requests from the dashboard
  const isServiceRequest = request.headers.get('x-internal-token') === process.env.INTERNAL_API_TOKEN;
  if (isServiceRequest) {
    return;
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, {
  afterSignInUrl: '/dashboard',
  afterSignUpUrl: '/dashboard',
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
