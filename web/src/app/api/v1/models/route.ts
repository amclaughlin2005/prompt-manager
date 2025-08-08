import { NextResponse } from 'next/server';
import { listModels } from '@/lib/providers';

export async function GET() {
  // This route should not require provider env vars at build time
  return NextResponse.json({ models: listModels() });
}
