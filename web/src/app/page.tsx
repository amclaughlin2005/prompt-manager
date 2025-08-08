import Link from "next/link";
import prisma from "@/lib/db";

export default async function Home() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbOk = false;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Prompt Manager</h1>
      <p className="text-neutral-500 mb-8">Model Proxy • Prompt Manager • Evals • Tool Calling</p>

      <section className="space-y-2 mb-10">
        <h2 className="text-xl font-medium">Status</h2>
        <div className="text-sm text-neutral-600">
          <div>Runtime: Next.js App Router (React)</div>
          <div>Database: {dbOk ? <span className="text-green-600">OK</span> : <span className="text-red-600">Unavailable</span>}</div>
        </div>
      </section>

      <section className="space-y-2 mb-8">
        <h2 className="text-xl font-medium">Try it</h2>
        <Link href="/bench" className="text-blue-600 underline">Open Prompt Bench →</Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">API</h2>
        <ul className="list-disc pl-6 text-sm">
          <li>
            <Link href="/api/health" className="text-blue-600 underline">GET /api/health</Link>
          </li>
          <li>
            <Link href="/api/db" className="text-blue-600 underline">GET /api/db</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
