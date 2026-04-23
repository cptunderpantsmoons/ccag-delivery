import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// POST /api/docassemble/interview - Start a new docassemble interview session
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { interviewId, variables } = body;

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: 'interviewId is required' },
        { status: 400 }
      );
    }

    const docassembleUrl = process.env.DOCASSEMBLE_URL || 'http://localhost:8080';
    const apiKey = process.env.DOCASSEMBLE_API_KEY || '';

    // Start interview session via docassemble API
    const response = await fetch(`${docassembleUrl}/api/session/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        i: interviewId,
        variables: variables || {},
        new_session: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Docassemble error: ${response.status} ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      sessionKey: data.session,
      interviewUrl: `${docassembleUrl}/interview?i=${interviewId}&session=${data.session}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}