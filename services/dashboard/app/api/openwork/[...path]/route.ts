// app/api/openwork/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const OPENWORK_URL = process.env.OPENWORK_SERVER_URL || 'http://localhost:3003';
const OPENWORK_TOKEN = process.env.OPENWORK_TOKEN || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${OPENWORK_URL}/api/v1/${path.join('/')}${request.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        authorization: `Bearer ${OPENWORK_TOKEN}`,
        accept: 'application/json',
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'OpenWork proxy failed', detail: String(err) }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${OPENWORK_URL}/api/v1/${path.join('/')}`;

  try {
    const body = await request.text();
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENWORK_TOKEN}`,
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
    return NextResponse.json({ error: 'OpenWork proxy failed', detail: String(err) }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${OPENWORK_URL}/api/v1/${path.join('/')}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${OPENWORK_TOKEN}`,
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'OpenWork proxy failed', detail: String(err) }, { status: 502 });
  }
}
