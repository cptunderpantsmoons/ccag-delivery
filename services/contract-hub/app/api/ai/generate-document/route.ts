/**
 * AI Document Generation API
 * Generates legal documents from templates using LLM
 * Fills placeholders with user inputs and enhances with AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { templateLibrary } from '@/lib/services/template-library';
import { generateContent } from '@/lib/services/ai';
import { marked } from 'marked';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { DEFAULT_MODEL_SETTINGS } from '@/config/models';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { templateId, inputs, useAI = true } = body;

    // Validate template exists
    const template = templateLibrary.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const missingFields = template.fields
      .filter(field => field.required && !inputs[field.name])
      .map(field => field.name);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }

    // Generate document content
    let documentContent: string;

    if (useAI) {
      // Use AI to enhance and fill the template
      const prompt = `You are an expert legal document drafter. Fill in the following legal template with the provided information.

TEMPLATE:
${template.content}

USER INPUTS:
${JSON.stringify(inputs, null, 2)}

INSTRUCTIONS:
1. Replace all placeholders (format: {{placeholder_name}}) with the provided user inputs
2. Use proper legal language and formatting
3. Maintain the template structure and all clauses
4. If any field is missing that has a default value, use the default
5. Ensure the document is complete and ready for use
6. Return ONLY the filled document in Markdown format
7. Do NOT include any explanations, preamble, or commentary
8. Do NOT include markdown code block markers

Return the complete filled document:`;

      const aiResponse = await generateContent({
        prompt,
        systemPrompt: 'You are a professional legal document drafter with expertise in contract law.',
        model: process.env.AI_MODEL || DEFAULT_MODEL_SETTINGS.defaultModel,
        temperature: 0.3,
        maxTokens: 4000,
      });

      if (!aiResponse.success) {
        return NextResponse.json(
          { success: false, error: aiResponse.error },
          { status: 500 }
        );
      }

      documentContent = aiResponse.content || '';
    } else {
      // Simple template filling without AI
      documentContent = templateLibrary.fillTemplate(templateId, inputs);
    }

    // Convert Markdown to HTML for editing using marked library
    const htmlContent = marked.parse(documentContent) as string;

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        content: documentContent,
        htmlContent,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate document' 
      },
      { status: 500 }
    );
  }
}


