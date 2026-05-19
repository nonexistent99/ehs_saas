import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

async function test() {
  try {
    console.log("Attempting to create PT via TRPC...");
    // We cannot easily test protected procedures without a session cookie, 
    // but a "Failed to fetch" often happens before auth if the server crashes on the request itself.
    const result = await client.pt.create.mutate({
      companyId: 1,
      title: "TRPC Test PT",
      content: JSON.stringify({ test: true }),
      status: "ativo" as any,
    });
    console.log("Result:", result);
  } catch (error) {
    console.error("TRPC Error:", error);
  }
}

test();
