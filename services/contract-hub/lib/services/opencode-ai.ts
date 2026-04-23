// Contract Hub - Corporate Carbon Group Australia
// OpenRouter AI Service - Direct API Integration
// Uses OpenRouter for multi-provider AI model access

import { getModelConfig, DEFAULT_MODEL_SETTINGS } from '@/config/models';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// PROMPT LOADING - Versioned Prompt Files
// ============================================================

const PROMPT_DIR = path.join(process.cwd(), 'prompts');

/**
 * Load prompt content from file with fallback to inline prompts
 */
function loadPrompt(filename: string): string {
  try {
    return fs.readFileSync(path.join(PROMPT_DIR, filename), 'utf-8');
  } catch (error) {
    console.warn(`Failed to load prompt file ${filename}, using fallback`, error);
    return '';
  }
}

interface PromptConfig {
  content: string;
  version: string;
}

/**
 * Load all prompts with fallback to inline templates
 */
function loadPrompts(): Record<string, PromptConfig> {
  const prompts: Record<string, PromptConfig> = {
    'contract_review': {
      content: loadPrompt('contract-review-v1.md') || getFallbackContractReviewPrompt(),
      version: 'v1',
    },
    'risk_assessment': {
      content: loadPrompt('risk-assessment-v1.md') || getFallbackRiskAssessmentPrompt(),
      version: 'v1',
    },
    'compliance': {
      content: loadPrompt('compliance-check-v1.md') || getFallbackCompliancePrompt(),
      version: 'v1',
    },
    'extraction': {
      content: loadPrompt('extraction-v1.md') || getFallbackExtractionPrompt(),
      version: 'v1',
    },
    'legal_advice': {
      content: loadPrompt('legal-advice-v1.md') || getFallbackLegalAdvicePrompt(),
      version: 'v1',
    },
    'narrative_review': {
      content: loadPrompt('contract-review-narrative-v1.md') || getFallbackContractReviewPrompt(),
      version: 'v1',
    },
  };
  return prompts;
}

// Fallback inline prompts (used if file loading fails)
function getFallbackContractReviewPrompt(): string {
  return `You are a legal contract analysis agent for Contract Hub (Corporate Carbon Group Australia). Your task is to review contracts with EXTREME rigor and precision.

## STRICT OUTPUT REQUIREMENTS

1. **STRUCTURED JSON OUTPUT ONLY**
   - Return valid JSON matching the exact schema below
   - NO prose, NO explanations outside JSON, NO conversational filler
   - If you cannot produce valid JSON, return: {"error": "Cannot produce valid analysis", "retry": true}

2. **CITATION MANDATORY**
   - Every assertion MUST include exact clause reference (Section X, Paragraph Y)
   - Every recommendation MUST reference specific contract language
   - DO NOT invent or hallucinate clauses that are not in the contract text

3. **PRECISION GATES**
   - Do NOT claim risks without explicit evidence in the contract
   - Do NOT flag terms without specific citation
   - If uncertain, mark severity as "uncertain" instead of guessing

4. **AUSTRALIAN LAW CONTEXT**
   - Consider Australian Consumer Law (ACL)
   - Consider Corporations Act 2001 (Cth)
   - Consider relevant State/Territory legislation
   - Note if any clause may be unenforceable under Australian law

## ANALYSIS FRAMEWORK

### Risk Severity Classification
- CRITICAL: Immediate legal liability, regulatory violations, illegal terms
- HIGH: Significant but non-catastrophic risks, unfair terms
- MEDIUM: Moderate risks, ambiguous language
- LOW: Minor issues, clarifications needed

### Mandatory Output Schema
\`\`\`json
{
  "safety_score": <number 0-100>,
  "risk_flags": [
    {
      "severity": "<critical|high|medium|low|uncertain>",
      "clause_reference": "Section X, Paragraph Y",
      "issue": "<specific problem statement>",
      "recommendation": "<exact replacement language>",
      "australian_law_context": "<relevant Australian legislation if applicable>"
    }
  ],
  "missing_protections": [
    {
      "protection_type": "<category>",
      "importance": "<critical|important|recommended>",
      "rationale": "<why this protection is standard>"
    }
  ],
  "obligations": [
    {
      "obligation_id": "<unique_id>",
      "description": "<what must be done>",
      "deadline": "<ISO 8601 date or null>",
      "responsible_party": "<who is responsible>",
      "consequences": "<what happens if missed>"
    }
  ],
  "compliance_flags": [
    {
      "regulation": "<Australian regulation>",
      "status": "<compliant|non-compliant|uncertain>",
      "details": "<specific compliance issue>"
    }
  ]
}
\`\`\`

## VALIDATION CHECKLIST
Before returning output, verify:
- [ ] All required fields present
- [ ] Safety score between 0-100
- [ ] All risk_flags have clause_reference
- [ ] All recommendations are specific and actionable
- [ ] No hallucinated clauses
- [ ] Australian law context applied where relevant
- [ ] All obligations have descriptions

If ANY check fails, return: {"error": "Validation failed: <specific issue>", "retry": true}`;
}

function getFallbackRiskAssessmentPrompt(): string {
  return `You are a legal risk assessment agent for Contract Hub (Corporate Carbon Group Australia).

## STRICT OUTPUT REQUIREMENTS
Return valid JSON only. No prose. No explanations outside JSON.

## OUTPUT SCHEMA
\`\`\`json
{
  "overall_risk_level": "<critical|high|medium|low>",
  "overall_risk_score": <number 0-100>,
  "risks": [
    {
      "id": "<unique_id>",
      "category": "<financial|legal|operational|reputational|regulatory>",
      "severity": "<critical|high|medium|low>",
      "likelihood": "<certain|likely|possible|unlikely|rare>",
      "description": "<specific risk description>",
      "impact": "<what happens if this risk materialises>",
      "mitigation": "<specific steps to reduce risk>",
      "australian_context": "<relevant Australian legislation or standard>"
    }
  ],
  "recommendations": [
    {
      "priority": "<immediate|short_term|medium_term|long_term>",
      "action": "<specific action to take>",
      "rationale": "<why this action is recommended>"
    }
  ]
}
\`\`\`

All risks must be based on EVIDENCE in the document. Do not invent risks. If uncertain, mark likelihood as "possible" or "unlikely".`;
}

function getFallbackCompliancePrompt(): string {
  return `You are a legal compliance analysis agent for Contract Hub (Corporate Carbon Group Australia).

## STRICT OUTPUT REQUIREMENTS
Return valid JSON only. No prose outside JSON.

## COMPLIANCE FRAMEWORK
Check against Australian regulations:
- Corporations Act 2001 (Cth)
- Australian Consumer Law (Schedule 2 to Competition and Consumer Act 2010)
- Privacy Act 1988 (Cth)
- Anti-Money Laundering and Counter-Terrorism Financing Act 2006
- ASIC regulatory guides
- State/Territory-specific legislation as applicable

## OUTPUT SCHEMA
\`\`\`json
{
  "overall_compliance_status": "<compliant|partially_compliant|non_compliant|uncertain>",
  "compliance_flags": [
    {
      "regulation": "<specific Australian regulation>",
      "section": "<specific section if applicable>",
      "status": "<compliant|non_compliant|uncertain>",
      "details": "<specific compliance issue>",
      "remediation": "<steps to achieve compliance>",
      "severity": "<critical|high|medium|low>"
    }
  ],
  "compliance_score": <number 0-100>,
  "required_actions": [
    {
      "action": "<specific action>",
      "deadline": "<suggested deadline>",
      "responsible_party": "<suggested responsible party>",
      "priority": "<immediate|short_term|ongoing>"
    }
  ]
}
\`\`\`

All compliance findings must cite specific legislation. Do not invent regulations.`;
}

function getFallbackExtractionPrompt(): string {
  return `You are a legal document extraction agent for Contract Hub (Corporate Carbon Group Australia).

## STRICT OUTPUT REQUIREMENTS
Return valid JSON only. No prose outside JSON.

## EXTRACTION SCHEMA
\`\`\`json
{
  "document_type": "<contract|agreement|policy|correspondence|other>",
  "parties": [
    {
      "name": "<party name>",
      "role": "<buyer|seller|licensor|licensee|employer|employee|other>",
      "abn": "<Australian Business Number if found>",
      "address": "<address if found>"
    }
  ],
  "key_terms": [
    {
      "term": "<term name>",
      "value": "<term value>",
      "clause_reference": "Section X, Paragraph Y",
      "expiry_date": "<ISO 8601 date or null>"
    }
  ],
  "financial_terms": [
    {
      "type": "<payment|fee|penalty|deposit|other>",
      "amount": "<amount with currency>",
      "frequency": "<one_time|monthly|quarterly|annual|other>",
      "clause_reference": "Section X"
    }
  ],
  "dates": [
    {
      "type": "<effective|expiry|termination|review|other>",
      "date": "<ISO 8601 date>",
      "clause_reference": "Section X"
    }
  ],
  "summary": "<2-3 sentence summary of the document>"
}
\`\`\`

Extract ONLY what is explicitly stated in the document. Do not infer or assume.`;
}

function getFallbackLegalAdvicePrompt(): string {
  return `You are a legal research agent for Contract Hub (Corporate Carbon Group Australia).

## STRICT OUTPUT REQUIREMENTS
Return valid JSON only. No prose outside JSON.

## MANDATORY DISCLAIMER
Every output MUST include: "disclaimer": "This is AI-generated information and does NOT constitute legal advice. Consult with a qualified Australian legal practitioner for legal guidance."

## OUTPUT SCHEMA
\`\`\`json
{
  "advice_id": "<unique_id>",
  "topic": "<specific legal topic>",
  "content": "<structured content explaining the legal concept>",
  "disclaimer": "This is AI-generated information and does NOT constitute legal advice. Consult with a qualified Australian legal practitioner for legal guidance.",
  "confidence": "<high|medium|low>",
  "authorities": [
    {
      "type": "<legislation|case|regulation|guide>",
      "citation": "<full Australian legal citation>",
      "relevance": "<how this authority relates to the topic>"
    }
  ],
  "recommendations": [
    {
      "action": "<specific action>",
      "urgency": "<immediate|short_term|long_term>",
      "rationale": "<why this action is recommended>"
    }
  ]
}
\`\`\`

Cite ONLY real Australian legislation and case law. If you cannot confirm an authority, mark confidence as "low".`;
}

// Load prompts at module initialization
const PROMPTS = loadPrompts();

interface AIAnalysisRequest {
  entityType: 'contract' | 'document' | 'matter';
  entityId: string;
  analysisType: 'contract_review' | 'risk_assessment' | 'compliance' | 'extraction' | 'legal_advice' | 'narrative_review';
  content: string;
  modelOverride?: string;
  userId: string;
  tenantId: string;
}

interface AIAnalysisResult {
  success: boolean;
  result?: Record<string, unknown>;
  safetyScore?: number;
  error?: string;
  model: string;
  provider: string;
  tokensUsed?: number;
  duration?: number;
  promptVersion?: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Get model ID for a given tier based on user settings
   */
  private getModelForTier(
    tier: 'extraction' | 'review' | 'analysis',
    modelOverride?: string
  ): { provider: string; model: string } {
    if (modelOverride) {
      const config = getModelConfig(modelOverride);
      if (config) {
        return { provider: config.provider, model: config.model };
      }
    }

    switch (tier) {
      case 'extraction':
        return { provider: DEFAULT_MODEL_SETTINGS.extractionProvider, model: DEFAULT_MODEL_SETTINGS.extractionModel };
      case 'review':
        return { provider: DEFAULT_MODEL_SETTINGS.reviewProvider, model: DEFAULT_MODEL_SETTINGS.reviewModel };
      case 'analysis':
        return { provider: DEFAULT_MODEL_SETTINGS.analysisProvider, model: DEFAULT_MODEL_SETTINGS.analysisModel };
      default:
        return { provider: DEFAULT_MODEL_SETTINGS.defaultProvider, model: DEFAULT_MODEL_SETTINGS.defaultModel };
    }
  }

  /**
   * Run AI analysis with strict prompt templates and validation gates
   */
  async runAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      const tierMap: Record<string, 'extraction' | 'review' | 'analysis'> = {
        contract_review: 'review',
        risk_assessment: 'review',
        compliance: 'analysis',
        extraction: 'extraction',
        legal_advice: 'analysis',
        narrative_review: 'review',
      };
      const tier = tierMap[request.analysisType] || 'review';
      const { provider, model } = this.getModelForTier(tier, request.modelOverride);
      const promptVersion = this.getPromptVersion(request.analysisType);
      const isNarrative = request.analysisType === 'narrative_review';

      const systemPrompt = this.getPromptTemplate(request.analysisType);
      const userPrompt = this.buildUserPrompt(request);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_NAME || 'Contract Hub',
          'X-Title': 'Contract Hub - CCG Australia',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: tier === 'extraction' ? 0.1 : tier === 'review' ? 0.2 : 0.3,
          max_tokens: tier === 'extraction' ? 4096 : tier === 'review' ? 8192 : 16384,
          ...(isNarrative ? {} : { response_format: { type: 'json_object' } }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `OpenRouter API error: ${response.status} - ${error}`,
          model,
          provider,
          promptVersion,
        };
      }

      const data: OpenRouterResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: 'No content in AI response',
          model,
          provider,
          duration: Date.now() - startTime,
          promptVersion,
        };
      }

      // Narrative review returns raw Markdown — skip JSON parsing/validation.
      if (isNarrative) {
        return {
          success: true,
          result: { narrative: content, format: 'markdown' },
          model,
          provider,
          tokensUsed: data.usage?.total_tokens,
          duration: Date.now() - startTime,
          promptVersion,
        };
      }

      // Parse JSON response
      let parsedResult: Record<string, unknown>;
      try {
        parsedResult = JSON.parse(content);
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[1].trim());
          } catch {
            return {
              success: false,
              error: 'AI returned invalid JSON that could not be parsed',
              model,
              provider,
              duration: Date.now() - startTime,
              promptVersion,
            };
          }
        } else {
          return {
            success: false,
            error: 'AI returned invalid JSON that could not be parsed',
            model,
            provider,
            duration: Date.now() - startTime,
            promptVersion,
          };
        }
      }

      // Validate structured output against expected schema
      const validatedResult = this.validateAnalysisOutput(request.analysisType, parsedResult);

      return {
        success: true,
        result: validatedResult ?? undefined,
        safetyScore: typeof validatedResult?.safety_score === 'number' ? validatedResult.safety_score as number : undefined,
        model,
        provider,
        tokensUsed: data.usage?.total_tokens,
        duration: Date.now() - startTime,
        promptVersion,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: request.modelOverride || DEFAULT_MODEL_SETTINGS.defaultModel,
        provider: DEFAULT_MODEL_SETTINGS.defaultProvider,
        duration: Date.now() - startTime,
        promptVersion: this.getPromptVersion(request.analysisType),
      };
    }
  }

  /**
   * Test connection to OpenRouter
   */
  async testConnection(provider: string, model: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        return { success: true, message: `Connected to OpenRouter. Model: ${provider}/${model}` };
      } else {
        return { success: false, message: `OpenRouter returned status ${response.status}` };
      }
    } catch (error) {
      return {
        success: false,
        message: `Cannot connect to OpenRouter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate AI output against expected schema
   * GATE: Invalid outputs are REJECTED, never saved
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateAnalysisOutput(analysisType: string, data: any): Record<string, unknown> | null {
    if (!data) return null;

    switch (analysisType) {
      case 'contract_review':
        if (typeof data.safety_score !== 'number' || data.safety_score < 0 || data.safety_score > 100) {
          return null;
        }
        if (!Array.isArray(data.risk_flags)) return null;
        for (const flag of data.risk_flags) {
          if (!flag.severity || !flag.clause_reference || !flag.issue || !flag.recommendation) {
            return null;
          }
        }
        break;

      case 'risk_assessment':
        if (typeof data.overall_risk_level !== 'string') return null;
        if (!Array.isArray(data.risks)) return null;
        break;

      case 'compliance':
        if (!Array.isArray(data.compliance_flags)) return null;
        break;

      case 'extraction':
        if (typeof data.entities !== 'object' && typeof data.document_type !== 'string') return null;
        break;

      case 'legal_advice':
        if (!data.disclaimer || typeof data.disclaimer !== 'string') return null;
        break;
    }

    return data;
  }

  /**
   * Get prompt template for analysis type
   * Uses versioned prompt files loaded at module initialization
   */
  private getPromptTemplate(analysisType: string): string {
    const promptConfig = PROMPTS[analysisType];
    if (promptConfig && promptConfig.content) {
      return promptConfig.content;
    }
    // Fallback to contract_review if analysis type not found
    return PROMPTS['contract_review']?.content || '';
  }

  /**
   * Get prompt version for tracking/analysis
   */
  private getPromptVersion(analysisType: string): string {
    return PROMPTS[analysisType]?.version || 'unknown';
  }

  /**
   * Build user prompt from request
   */
  private buildUserPrompt(request: AIAnalysisRequest): string {
    return `Analyze the following ${request.entityType} (ID: ${request.entityId}):\n\n${request.content}`;
  }
}

// Singleton instance
let aiService: OpenRouterAIService | null = null;

export function getAIService(): OpenRouterAIService {
  if (!aiService) {
    aiService = new OpenRouterAIService();
  }
  return aiService;
}

export { OpenRouterAIService };
export type { AIAnalysisRequest, AIAnalysisResult };