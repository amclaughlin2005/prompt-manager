import { NextResponse } from 'next/server';
import { getToolSpecs } from '@/lib/tools/registry';

export async function GET() {
  return NextResponse.json({ tools: getToolSpecs() });
}
