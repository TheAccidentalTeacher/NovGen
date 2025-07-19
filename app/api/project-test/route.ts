import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    message: 'Project POST route is working',
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Project GET route is working',
    timestamp: new Date().toISOString()
  });
}
