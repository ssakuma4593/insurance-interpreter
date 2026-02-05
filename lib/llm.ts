import OpenAI from 'openai';
import { ExplanationLevel, Citation } from './models';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RetrievalResult {
  text: string;
  pageNumber: number;
  snippet: string;
}

export interface PlanSummary {
  deductible?: string;
  outOfPocketMax?: string;
  primaryCareCopay?: string;
  specialistCopay?: string;
  emergencyRoomCopay?: string;
  urgentCareCopay?: string;
  preventiveCare?: string;
  referralRequired?: string;
  priorAuthorization?: string;
  networkNotes?: string;
  drugTierOverview?: string;
  unknownFields: string[];
}

export async function generatePlanSummary(
  documentText: string,
  level: ExplanationLevel
): Promise<PlanSummary> {
  const levelInstructions = {
    beginner: `Explain everything in plain language. Define all insurance terms (copay, deductible, coinsurance, out-of-pocket maximum) with simple examples. Use everyday language and avoid jargon.`,
    intermediate: `Provide clear explanations with brief definitions of key terms. Be direct and informative.`,
    advanced: `Be concise and assume familiarity with insurance terminology. Focus on specific details, edge cases, and caveats.`,
  };

  const systemPrompt = `You are an expert insurance plan interpreter. Extract key information from an insurance plan document and present it in a structured summary.

${levelInstructions[level]}

Extract the following information if available:
- Deductible amount
- Out-of-pocket maximum
- Primary care copay
- Specialist copay
- Emergency room copay
- Urgent care copay
- Preventive care coverage details
- Referral requirements
- Prior authorization requirements
- Network information
- Prescription drug tier overview

For each field, if the information is found, provide a clear explanation appropriate for the user's level. If information is NOT found in the document, explicitly state "Not found in document" for that field.

Return your response as a structured summary. Be accurate and only include information that is clearly stated in the document.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the insurance plan document:\n\n${documentText.substring(0, 15000)}` },
    ],
    temperature: 0.3,
  });

  const summaryText = response.choices[0].message.content || '';
  
  // Parse the summary into structured format
  // For MVP, we'll return the text summary and parse key fields
  const summary: PlanSummary = {
    unknownFields: [],
  };

  // Simple extraction patterns (can be enhanced)
  const patterns = {
    deductible: /deductible[:\s]+([^\n]+)/i,
    outOfPocketMax: /out[-\s]of[-\s]pocket[-\s]max[imum]*[:\s]+([^\n]+)/i,
    primaryCareCopay: /primary[-\s]care[-\s]copay[:\s]+([^\n]+)/i,
    specialistCopay: /specialist[-\s]copay[:\s]+([^\n]+)/i,
    emergencyRoomCopay: /emergency[-\s]room[-\s]copay[:\s]+([^\n]+)/i,
    urgentCareCopay: /urgent[-\s]care[-\s]copay[:\s]+([^\n]+)/i,
    preventiveCare: /preventive[-\s]care[:\s]+([^\n]+)/i,
    referralRequired: /referral[-\s]required[:\s]+([^\n]+)/i,
    priorAuthorization: /prior[-\s]authorization[:\s]+([^\n]+)/i,
    networkNotes: /network[:\s]+([^\n]+)/i,
    drugTierOverview: /drug[-\s]tier[:\s]+([^\n]+)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = summaryText.match(pattern);
    if (match) {
      (summary as any)[key] = match[1].trim();
    } else {
      summary.unknownFields.push(key);
    }
  }

  // Store the full summary text as well
  (summary as any).fullText = summaryText;

  return summary;
}

export async function answerQuestion(
  question: string,
  retrievalResults: RetrievalResult[],
  level: ExplanationLevel,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ answer: string; citations: Citation[]; confidence: 'high' | 'medium' | 'low' }> {
  const levelInstructions = {
    beginner: `Explain everything in plain language. Define all insurance terms (copay, deductible, coinsurance, out-of-pocket maximum) with simple examples. Use everyday language and avoid jargon.`,
    intermediate: `Provide clear explanations with brief definitions of key terms. Be direct and informative.`,
    advanced: `Be concise and assume familiarity with insurance terminology. Focus on specific details, edge cases, and caveats.`,
  };

  if (retrievalResults.length === 0) {
    return {
      answer: "I can't find that information in your insurance plan document. Could you rephrase your question or ask about a different aspect of your plan?",
      citations: [],
      confidence: 'low',
    };
  }

  // Build context from retrieval results
  const context = retrievalResults
    .map((result, idx) => `[Source ${idx + 1}, Page ${result.pageNumber}]:\n${result.snippet}`)
    .join('\n\n');

  const systemPrompt = `You are an expert insurance plan interpreter helping users understand their insurance documents.

${levelInstructions[level]}

CRITICAL RULES:
1. ONLY answer based on the provided document excerpts. Never invent or assume information.
2. If the document doesn't contain the needed information, explicitly say "I can't find that information in your document" and suggest what the user might look for.
3. Always cite your sources by referencing the page number and including a brief snippet.
4. Never provide medical diagnosis or treatment recommendations. This is insurance navigation only.
5. If you're uncertain about the answer, indicate your confidence level.

Format citations as: [Page X: "relevant snippet"]`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Last 3 exchanges
    {
      role: 'user',
      content: `Based on the following excerpts from the insurance plan document, answer this question: "${question}"\n\nDocument excerpts:\n${context}`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages as any,
    temperature: 0.3,
  });

  const answer = response.choices[0].message.content || '';

  // Extract citations from answer and retrieval results
  const citations: Citation[] = [];
  const citationPattern = /\[Page\s+(\d+):\s*"([^"]+)"\]/g;
  let match;
  
  while ((match = citationPattern.exec(answer)) !== null) {
    citations.push({
      pageNumber: parseInt(match[1], 10),
      snippet: match[2],
    });
  }

  // If no citations found, use retrieval results
  if (citations.length === 0 && retrievalResults.length > 0) {
    citations.push(...retrievalResults.map(r => ({
      pageNumber: r.pageNumber,
      snippet: r.snippet.substring(0, 200),
    })));
  }

  // Determine confidence based on retrieval quality and answer content
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (retrievalResults.length >= 3 && answer.length > 100 && !answer.toLowerCase().includes("can't find")) {
    confidence = 'high';
  } else if (retrievalResults.length === 0 || answer.toLowerCase().includes("can't find")) {
    confidence = 'low';
  }

  return { answer, citations, confidence };
}
