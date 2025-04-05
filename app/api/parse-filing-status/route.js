import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parse filing status from text input
 */
export async function POST(request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }
    
    // First try to extract using simple pattern matching
    let filingStatus = normalizeFilingStatus(text);
    
    // If pattern matching fails, use OpenAI
    if (!filingStatus && process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a tax filing status detection system. Extract the filing status from the user's message.
              Only respond with ONE of these exact options:
              - Single
              - Married Filing Jointly
              - Married Filing Separately
              - Head of Household
              
              If the user just says "married" without specifying, default to "Married Filing Jointly".
              If the user mentions something related to joint filing or being married, respond with "Married Filing Jointly".
              If the user mentions filing separately or living apart from spouse, respond with "Married Filing Separately".
              If you cannot confidently determine a filing status, respond with "Unknown".`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.1,
          max_tokens: 20
        });
        
        filingStatus = response.choices[0]?.message?.content?.trim();
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }
    
    const validStatuses = [
      'Single', 
      'Married Filing Jointly', 
      'Married Filing Separately', 
      'Head of Household'
    ];
    
    // Validate the filing status
    if (validStatuses.includes(filingStatus)) {
      return NextResponse.json({ filingStatus });
    } else if (filingStatus?.toLowerCase().includes('married') && !filingStatus?.toLowerCase().includes('separate')) {
      return NextResponse.json({ filingStatus: 'Married Filing Jointly' });
    }
    
    return NextResponse.json({ filingStatus: null });
  } catch (error) {
    console.error('Error parsing filing status:', error);
    return NextResponse.json({ error: 'Failed to parse filing status' }, { status: 500 });
  }
}

/**
 * Normalize filing status using pattern matching
 */
function normalizeFilingStatus(status) {
  if (!status) return null;
  
  const normalized = status.toString().trim();
  const lowerNormalized = normalized.toLowerCase();
  
  if (lowerNormalized === 'single') {
    return 'Single';
  } else if (lowerNormalized === 'married filing jointly' || 
             (lowerNormalized.includes('married') && lowerNormalized.includes('joint'))) {
    return 'Married Filing Jointly';
  } else if (lowerNormalized === 'married filing separately' || 
             (lowerNormalized.includes('married') && lowerNormalized.includes('separate'))) {
    return 'Married Filing Separately';
  } else if (lowerNormalized === 'head of household' || 
             (lowerNormalized.includes('head') && lowerNormalized.includes('household'))) {
    return 'Head of Household';
  } else if (lowerNormalized === 'married') {
    return 'Married Filing Jointly';
  }
  
  return null;
} 