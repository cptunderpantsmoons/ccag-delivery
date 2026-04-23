// app/api/ccag/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CCAG_SERVER_URL = process.env.CCAG_SERVER_URL || 'http://localhost:3003';
const CCAG_TOKEN = process.env.CCAG_TOKEN || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${CCAG_SERVER_URL}/api/v1/${path.join('/')}${request.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        authorization: `Bearer ${CCAG_TOKEN}`,
        accept: 'application/json',
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'CCAG proxy failed', detail: String(err) }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${CCAG_SERVER_URL}/api/v1/${path.join('/')}`;

  try {
    const body = await request.text();
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${CCAG_TOKEN}`,
        'content-type': 'application/json',
      },
      body: body || undefined,
    });

    const resBody = await res.text();
    return new NextResponse(resBody, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'CCAG proxy failed', detail: String(err) }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${CCAG_SERVER_URL}/api/v1/${path.join('/')}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${CCAG_TOKEN}`,
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'CCAG proxy failed', detail: String(err) }, { status: 502 });
  }
}
