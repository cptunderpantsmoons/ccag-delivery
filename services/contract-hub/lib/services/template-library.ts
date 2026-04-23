/**
 * Template Library Service
 * Manages legal document templates from awesome-legal repository
 * Provides template parsing, field extraction, and categorization
 */

import matter from 'gray-matter';

export interface TemplateField {
  name: string;
  type: 'text' | 'date' | 'party_name' | 'address' | 'amount' | 'percentage' | 'duration' | 'select' | 'email' | 'phone';
  required: boolean;
  placeholder: string;
  description?: string;
  defaultValue?: string;
}

export interface LegalTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  source: string;
  description: string;
  plainLanguage: boolean;
  fields: TemplateField[];
  content: string; // Markdown content
  tags: string[];
  estimatedPages: number;
}

export type TemplateCategory = 
  | 'nda'
  | 'msa'
  | 'employment'
  | 'consulting'
  | 'advisor'
  | 'investor'
  | 'founder'
  | 'site_policies'
  | 'customer_agreements';

// Pre-built template library from awesome-legal
const TEMPLATE_LIBRARY: LegalTemplate[] = [
  {
    id: 'nda-mutual-cooley',
    name: 'Mutual NDA (Cooley)',
    category: 'nda',
    source: 'https://github.com/ankane/awesome-legal#non-disclosure-agreements',
    description: 'Standard mutual non-disclosure agreement for bilateral confidentiality protection',
    plainLanguage: false,
    tags: ['confidentiality', 'mutual', 'bilateral'],
    estimatedPages: 3,
    fields: [
      { name: 'party1_name', type: 'party_name', required: true, placeholder: 'Company A Legal Name', description: 'First party disclosing information' },
      { name: 'party1_address', type: 'address', required: true, placeholder: 'Full Address' },
      { name: 'party2_name', type: 'party_name', required: true, placeholder: 'Company B Legal Name', description: 'Second party disclosing information' },
      { name: 'party2_address', type: 'address', required: true, placeholder: 'Full Address' },
      { name: 'effective_date', type: 'date', required: true, placeholder: 'YYYY-MM-DD', description: 'Date agreement becomes effective' },
      { name: 'confidentiality_period', type: 'duration', required: true, placeholder: 'e.g., 2 years', defaultValue: '2 years', description: 'Duration of confidentiality obligations' },
      { name: 'governing_law', type: 'select', required: true, placeholder: 'Select jurisdiction', defaultValue: 'New South Wales', description: 'Governing law jurisdiction' },
    ],
    content: `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

**{{party1_name}}**, located at {{party1_address}} ("Party 1")

and

**{{party2_name}}**, located at {{party2_address}} ("Party 2")

## 1. Purpose
The parties wish to explore a business opportunity and may disclose to each other certain confidential information.

## 2. Definition of Confidential Information
"Confidential Information" means any information disclosed by either party that is marked as confidential or would reasonably be understood to be confidential.

## 3. Obligations
Each party agrees to:
- Hold confidential information in strict confidence
- Not disclose confidential information to third parties without prior written consent
- Use confidential information solely for the Purpose
- Protect confidential information using the same degree of care used to protect its own confidential information

## 4. Term
This Agreement shall remain in effect for {{confidentiality_period}} from the effective date.

## 5. Governing Law
This Agreement shall be governed by the laws of {{governing_law}}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
  },
  {
    id: 'nda-oneway-fiveminutelaw',
    name: 'One-Way NDA (Five Minute Law)',
    category: 'nda',
    source: 'https://github.com/ankane/awesome-legal#non-disclosure-agreements',
    description: 'Simple one-way NDA using plain language for easy understanding',
    plainLanguage: true,
    tags: ['confidentiality', 'one-way', 'simple', 'plain-language'],
    estimatedPages: 2,
    fields: [
      { name: 'disclosing_party', type: 'party_name', required: true, placeholder: 'Disclosing Party Name' },
      { name: 'receiving_party', type: 'party_name', required: true, placeholder: 'Receiving Party Name' },
      { name: 'effective_date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'purpose', type: 'text', required: true, placeholder: 'Purpose of disclosure (e.g., evaluating business relationship)' },
      { name: 'duration', type: 'duration', required: true, placeholder: 'e.g., 3 years', defaultValue: '3 years' },
    ],
    content: `# ONE-WAY NON-DISCLOSURE AGREEMENT

This agreement is made on {{effective_date}} between:

**{{disclosing_party}}** (the "Disclosing Party")

and

**{{receiving_party}}** (the "Receiving Party")

## What's happening?
The Disclosing Party wants to share confidential information with the Receiving Party for the purpose of: {{purpose}}.

## What counts as confidential?
Anything the Disclosing Party shares that isn't public knowledge, including but not limited to:
- Business plans and strategies
- Financial information
- Technical data and trade secrets
- Customer lists and supplier information

## What must the Receiving Party do?
1. Keep the information confidential
2. Only use it for the Purpose stated above
3. Not share it with anyone else without permission
4. Return or destroy it when asked

## How long does this last?
{{duration}} from the effective date.

## Questions?
Contact the Disclosing Party directly.`,
  },
  {
    id: 'consulting-orrick',
    name: 'Consulting Agreement (Orrick)',
    category: 'consulting',
    source: 'https://github.com/ankane/awesome-legal#consulting-agreements',
    description: 'Professional consulting services agreement with standard terms',
    plainLanguage: false,
    tags: ['consulting', 'services', 'contractor'],
    estimatedPages: 5,
    fields: [
      { name: 'client_name', type: 'party_name', required: true, placeholder: 'Client Company Name' },
      { name: 'consultant_name', type: 'party_name', required: true, placeholder: 'Consultant Name/Company' },
      { name: 'effective_date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'services_description', type: 'text', required: true, placeholder: 'Detailed description of consulting services' },
      { name: 'compensation_amount', type: 'amount', required: true, placeholder: 'e.g., $5,000' },
      { name: 'payment_terms', type: 'select', required: true, placeholder: 'Payment schedule', defaultValue: 'Net 30' },
      { name: 'term_duration', type: 'duration', required: true, placeholder: 'e.g., 6 months', defaultValue: '6 months' },
    ],
    content: `# CONSULTING SERVICES AGREEMENT

This Consulting Services Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

**{{client_name}}** ("Client")

and

**{{consultant_name}}** ("Consultant")

## 1. Services
Consultant agrees to provide the following services: {{services_description}}

## 2. Compensation
Client agrees to pay Consultant {{compensation_amount}} for services rendered.

Payment Terms: {{payment_terms}}

## 3. Term
This Agreement shall commence on {{effective_date}} and continue for {{term_duration}}, unless terminated earlier.

## 4. Independent Contractor
Consultant is an independent contractor, not an employee of Client.

## 5. Intellectual Property
All work product created by Consultant shall be the exclusive property of Client.

## 6. Confidentiality
Consultant agrees to keep confidential all proprietary information of Client.

IN WITNESS WHEREOF, the parties have executed this Agreement.`,
  },
  {
    id: 'msa-commonpaper',
    name: 'Cloud Service MSA (Common Paper)',
    category: 'msa',
    source: 'https://github.com/ankane/awesome-legal#customer-agreements',
    description: 'Master Services Agreement for cloud services with enterprise terms',
    plainLanguage: false,
    tags: ['msa', 'cloud', 'enterprise', 'saas'],
    estimatedPages: 8,
    fields: [
      { name: 'provider_name', type: 'party_name', required: true, placeholder: 'Service Provider Name' },
      { name: 'customer_name', type: 'party_name', required: true, placeholder: 'Customer Company Name' },
      { name: 'effective_date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'service_description', type: 'text', required: true, placeholder: 'Description of cloud services' },
      { name: 'annual_fee', type: 'amount', required: true, placeholder: 'e.g., $50,000/year' },
      { name: 'sla_uptime', type: 'percentage', required: true, placeholder: 'e.g., 99.9%', defaultValue: '99.9%' },
    ],
    content: `# MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

**{{provider_name}}** ("Provider")

and

**{{customer_name}}** ("Customer")

## 1. Services
Provider shall make available to Customer the following cloud services: {{service_description}}

## 2. Fees
Customer shall pay Provider an annual fee of {{annual_fee}}.

## 3. Service Level Agreement
Provider guarantees {{sla_uptime}} uptime for all services.

## 4. Data Protection
Provider shall implement appropriate security measures to protect Customer data.

## 5. Term and Termination
This Agreement commences on {{effective_date}} and continues for an initial term of one (1) year.

IN WITNESS WHEREOF, the parties have executed this Agreement.`,
  },
];

class TemplateLibraryService {
  /**
   * Get all templates filtered by category
   */
  getAllTemplates(category?: TemplateCategory): LegalTemplate[] {
    if (!category) return TEMPLATE_LIBRARY;
    return TEMPLATE_LIBRARY.filter(t => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): LegalTemplate | undefined {
    return TEMPLATE_LIBRARY.find(t => t.id === templateId);
  }

  /**
   * Search templates by name, description, or tags
   */
  searchTemplates(query: string): LegalTemplate[] {
    const lowerQuery = query.toLowerCase();
    return TEMPLATE_LIBRARY.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all available categories
   */
  getCategories(): Array<{ id: TemplateCategory; label: string; count: number }> {
    const categories: TemplateCategory[] = ['nda', 'msa', 'employment', 'consulting', 'advisor', 'investor', 'founder', 'site_policies', 'customer_agreements'];
    const labels: Record<TemplateCategory, string> = {
      nda: 'Non-Disclosure Agreements',
      msa: 'Master Services Agreements',
      employment: 'Employee Agreements',
      consulting: 'Consulting Agreements',
      advisor: 'Advisor Agreements',
      investor: 'Investor Agreements',
      founder: 'Founder Agreements',
      site_policies: 'Site Policies',
      customer_agreements: 'Customer Agreements',
    };

    return categories.map(cat => ({
      id: cat,
      label: labels[cat],
      count: TEMPLATE_LIBRARY.filter(t => t.category === cat).length,
    })).filter(c => c.count > 0);
  }

  /**
   * Fill template with user inputs
   */
  fillTemplate(templateId: string, inputs: Record<string, string>): string {
    const template = this.getTemplate(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    let content = template.content;
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, value);
    }

    return content;
  }

  /**
   * Parse raw Markdown template with frontmatter
   * Extracts metadata and fields automatically
   */
  parseTemplate(markdown: string, id: string): LegalTemplate {
    const { data, content } = matter(markdown);

    // Extract fields from frontmatter or content placeholders
    const fields = this.extractFields(content, data.fields || []);

    return {
      id,
      name: data.name || data.title || 'Untitled Template',
      category: data.category || 'other',
      source: data.source || '',
      description: data.description || '',
      plainLanguage: data.plainLanguage || false,
      fields,
      content,
      tags: data.tags || [],
      estimatedPages: data.estimatedPages || Math.ceil(content.length / 3000),
    };
  }

  /**
   * Extract template fields from content placeholders
   */
  private extractFields(content: string, frontmatterFields: Record<string, unknown>[]): TemplateField[] {
    // Find all {{placeholder}} patterns in content
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders = new Set<string>();
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      placeholders.add(match[1]);
    }

    // Convert placeholders to field definitions
    return Array.from(placeholders).map(name => {
      // Check if field is defined in frontmatter
      const frontmatterField = frontmatterFields.find((f: Record<string, unknown>) => f.name === name);

      return {
        name,
        type: (frontmatterField?.type as TemplateField['type']) || 'text',
        required: (frontmatterField?.required as boolean) ?? true,
        placeholder: (frontmatterField?.placeholder as string) || `Enter ${name.replace(/_/g, ' ')}`,
        description: frontmatterField?.description as string | undefined,
        defaultValue: frontmatterField?.default as string | undefined,
      };
    });
  }
}

export const templateLibrary = new TemplateLibraryService();
