
'use server';
/**
 * @fileOverview Analyzes the text content of a loan document for potential red flags and manipulative language.
 *
 * - analyzeLoanDocument - A function that handles the loan document analysis process.
 * - AnalyzeLoanDocumentInput - The input type for the analyzeLoanDocument function.
 * - AnalyzeLoanDocumentOutput - The return type for the analyzeLoanDocument function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Input Schema: Takes the extracted text from the PDF
const AnalyzeLoanDocumentInputSchema = z.object({
  pdfTextContent: z.string().min(100).describe('The full text content extracted from the loan document PDF.'),
  // Optional: Include other form data for context if needed by the model
  // loanAmount: z.number().optional(),
  // interestRate: z.number().optional(), // e.g., 5 for 5%
});
export type AnalyzeLoanDocumentInput = z.infer<typeof AnalyzeLoanDocumentInputSchema>;

// Output Schema: Structured analysis based on user's criteria
const AnalyzeLoanDocumentOutputSchema = z.object({
  use_of_urgent_language: z.boolean().describe('Does the text use urgency? (e.g., "limited offer", "act now")'),
  emotional_appeals: z.boolean().describe('Does the text try to evoke fear, hope, excitement to pressure decision-making?'),
  hidden_conditions_detected: z.boolean().describe('Are there indications of fine print clauses or hidden terms not clearly mentioned?'),
  complex_language_used: z.boolean().describe('Is the contract filled with hard-to-understand or technical language?'),
  aggressive_marketing_detected: z.boolean().describe('Does the text suggest repeated aggressive calls/messages/emails? (Infer based on language used)'),
  loan_app_authenticity_verified: z.boolean().optional().describe('Can the authenticity of the source (app/website mentioned) be inferred as verified? (May be hard to determine from text alone)'),
  phishing_indicators_present: z.boolean().describe('Are there textual signs suggestive of phishing (e.g., unusual links, generic greetings, requests for sensitive info upfront)?'),
  loan_disbursement_method: z.string().optional().describe('How is the loan disbursed based on the text? (e.g., Bank Transfer, Cash, Wallet)'),
  repayment_method: z.string().optional().describe('How is repayment collected based on the text? (e.g., Bank, Cash Pickup, Auto-debit)'),
  suspicious_permissions_requested: z.boolean().optional().describe('(If app-based terms mentioned) Are unnecessary device permissions potentially requested (contacts, location, SMS)?'),
  disclosure_of_total_cost: z.boolean().describe('Is the total repayment amount or a clear way to calculate it disclosed in the text?'),
  regulatory_registration_status: z.boolean().optional().describe('Does the text mention registration with a financial authority?'),
  consumer_rights_info_provided: z.boolean().describe('Are the borrower\'s rights mentioned or referenced in the text?'),
  grace_period_provided: z.boolean().describe('Is a grace period for missed payments mentioned in the text?'),
  early_repayment_penalty_present: z.boolean().describe('Does the text mention a penalty for early closure/repayment?'),
  rollover_clauses_detected: z.boolean().describe('Are there indications of automatic renewals or rollovers in the text?'),
  dynamic_interest_rate_clause: z.boolean().describe('Does the text suggest the interest rate can change dynamically after signing?'),
  user_felt_pressured_to_accept: z.boolean().optional().describe('Based on the language, could a user feel emotional/psychological pressure? (Inferred)'),
  user_understood_terms_before_accepting: z.boolean().optional().describe('Does the text seem clear enough for a typical user to understand before accepting? (Inferred)'),
  overall_summary: z.string().describe('A comprehensive summary of the findings, highlighting major red flags or positive points detected in the document text.'),
  detailed_analysis: z.array(z.object({
      flag_key: z.string().describe("The key corresponding to the check (e.g., 'use_of_urgent_language')."),
      finding: z.string().describe("A brief explanation or evidence for the boolean flag's value (e.g., 'Detected phrase: Limited time offer')."),
      is_red_flag: z.boolean().optional().describe("Indicates if this finding is generally considered a red flag.")
  })).describe("Detailed findings for each check performed.")
});
export type AnalyzeLoanDocumentOutput = z.infer<typeof AnalyzeLoanDocumentOutputSchema>;

// Wrapper function
export async function analyzeLoanDocument(input: AnalyzeLoanDocumentInput): Promise<AnalyzeLoanDocumentOutput> {
  console.log("[analyzeLoanDocument] Calling flow with text length:", input.pdfTextContent.length);
  return analyzeLoanDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLoanDocumentPrompt',
  input: {
    schema: AnalyzeLoanDocumentInputSchema,
  },
  output: {
    schema: AnalyzeLoanDocumentOutputSchema,
  },
  prompt: `You are an expert loan contract analyzer. Your task is to meticulously review the provided loan document text content and identify potential red flags, manipulative tactics, and unclear terms based on the specific criteria listed in the output schema.

Analyze the following loan document text:
--- START DOCUMENT TEXT ---
{{{pdfTextContent}}}
--- END DOCUMENT TEXT ---

Carefully evaluate the text against each field in the output schema. For each boolean field, determine if the condition is met based *only* on the provided text. If the text doesn't provide enough information for a boolean field (especially optional ones like 'regulatory_registration_status' or 'loan_app_authenticity_verified'), determine the most likely value or default to false/null if inference is not possible. For text fields like 'loan_disbursement_method', extract the relevant information if present.

For the 'detailed_analysis' array:
- For each check (corresponding to the keys in the output schema), provide a brief 'finding' explaining the reasoning or quoting relevant text snippets.
- Indicate if the finding is generally considered a 'is_red_flag' (true if it's a potential negative for the borrower, false or omit otherwise).

For the 'overall_summary', synthesize your findings into a concise paragraph highlighting the most critical red flags (e.g., hidden fees, complex language, pressure tactics) or positive aspects (e.g., clear terms, consumer rights mentioned). Focus on actionable insights for the user.

Provide your analysis strictly in the requested JSON format matching the output schema.`,
});

const analyzeLoanDocumentFlow = ai.defineFlow<
  typeof AnalyzeLoanDocumentInputSchema,
  typeof AnalyzeLoanDocumentOutputSchema
>(
  {
    name: 'analyzeLoanDocumentFlow',
    inputSchema: AnalyzeLoanDocumentInputSchema,
    outputSchema: AnalyzeLoanDocumentOutputSchema,
  },
  async (input) => {
    console.log(`[analyzeLoanDocumentFlow] Analyzing text content...`);

    try {
        const { output } = await prompt(input);

        if (!output) {
            console.error('[analyzeLoanDocumentFlow] AI did not return a valid output.');
            throw new Error('AI analysis failed to generate a response.');
        }

        console.log('[analyzeLoanDocumentFlow] Analysis successful.');
        // Optionally, perform post-processing or validation on the output here
        return output;

    } catch (error: any) {
         console.error('[analyzeLoanDocumentFlow] Error during AI analysis:', error);
         // Rethrow or handle the error appropriately
         throw new Error(`Failed to analyze loan document: ${error.message || 'Unknown AI Error'}`);
    }
  }
);
