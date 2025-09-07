// This is just a placeholder API route for Trigger.dev webhook
// In v3, the actual task execution happens on Trigger.dev infrastructure
export async function POST(_request: Request) {
  return new Response("OK", { status: 200 });
}