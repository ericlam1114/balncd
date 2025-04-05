import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Parse request
    const { text, entityType, userId } = await request.json();
    
    if (!text) {
      return NextResponse.json({ success: false, error: 'Missing text to parse' }, { status: 400 });
    }
    
    if (!entityType) {
      return NextResponse.json({ success: false, error: 'Missing entityType' }, { status: 400 });
    }
    
    // Parse entities based on type
    let entity = null;
    
    if (entityType === 'state') {
      entity = await parseState(text);
    } else if (entityType === 'filingStatus') {
      entity = await parseFilingStatus(text);
    } else if (entityType === 'quarter') {
      entity = await parseQuarter(text);
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported entity type' 
      }, { status: 400 });
    }
    
    // Return result
    return NextResponse.json({
      success: true,
      text,
      entityType,
      entity
    });
    
  } catch (error) {
    console.error('Error parsing entity:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to parse entity' 
    }, { status: 500 });
  }
}

async function parseState(text) {
  if (!process.env.OPENAI_API_KEY) {
    // Fall back to basic parsing if no API key
    return extractStateFromText(text);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a parser that extracts US state names from user messages. Extract the state from the user's message and respond with ONLY the full state name with proper capitalization (e.g., 'California', 'New York', 'Texas'). If you cannot determine the state, respond with ONLY 'Unknown'."
        },
        {
          role: "user",
          content: `Parse this message and extract the US state: "${text}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    });
    
    const parsedState = response.choices[0].message.content.trim();
    
    // List of valid US states for validation
    const validStates = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
      'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
      'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
      'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 
      'District of Columbia'
    ];
    
    // Check if parsed state is valid
    if (validStates.includes(parsedState)) {
      return parsedState;
    }
    
    // If not valid, fall back to basic parsing
    return extractStateFromText(text);
    
  } catch (error) {
    console.error('Error using OpenAI to parse state:', error);
    return extractStateFromText(text);
  }
}

async function parseFilingStatus(text) {
  if (!process.env.OPENAI_API_KEY) {
    // Fall back to basic parsing
    return extractFilingStatusFromText(text);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a parser that extracts tax filing status from user messages. Extract the filing status and respond with ONLY one of these exact strings: 'Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'. If the person just mentions 'married' without being specific, respond with 'Married Filing Jointly'. If you cannot determine it, respond with 'Unknown'."
        },
        {
          role: "user",
          content: `Parse this message and extract the tax filing status: "${text}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 30
    });
    
    const parsedStatus = response.choices[0].message.content.trim();
    
    // Validate against known filing statuses
    const validStatuses = [
      'Single',
      'Married Filing Jointly',
      'Married Filing Separately',
      'Head of Household'
    ];
    
    if (validStatuses.includes(parsedStatus)) {
      return parsedStatus;
    }
    
    // Check if AI just said "married" and convert to full status
    if (parsedStatus.toLowerCase() === 'married') {
      return 'Married Filing Jointly';
    }
    
    // Fall back to basic parsing
    return extractFilingStatusFromText(text);
    
  } catch (error) {
    console.error('Error using OpenAI to parse filing status:', error);
    return extractFilingStatusFromText(text);
  }
}

async function parseQuarter(text) {
  if (!process.env.OPENAI_API_KEY) {
    // Fall back to basic parsing
    return extractQuarterFromText(text);
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a parser that extracts tax quarters from user messages. Extract the quarter and respond with ONLY one of: 'Q1', 'Q2', 'Q3', 'Q4'. If you cannot determine it, respond with 'Unknown'."
        },
        {
          role: "user",
          content: `Parse this message and extract the tax quarter: "${text}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 10
    });
    
    const parsedQuarter = response.choices[0].message.content.trim();
    
    // Validate
    if (['Q1', 'Q2', 'Q3', 'Q4'].includes(parsedQuarter)) {
      return parsedQuarter;
    }
    
    // Fall back to basic parsing
    return extractQuarterFromText(text);
    
  } catch (error) {
    console.error('Error using OpenAI to parse quarter:', error);
    return extractQuarterFromText(text);
  }
}

// Basic parsing functions as fallbacks

function extractStateFromText(text) {
  const lowerText = text.toLowerCase();
  
  // List of US states to match against
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
    'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 
    'District of Columbia', 'D.C.'
  ];
  
  for (const state of states) {
    if (lowerText.includes(state.toLowerCase())) {
      return state;
    }
  }
  
  return null;
}

function extractFilingStatusFromText(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('married') && lowerText.includes('separate')) {
    return 'Married Filing Separately';
  } else if (lowerText.includes('married') && lowerText.includes('joint')) {
    return 'Married Filing Jointly';
  } else if (lowerText.includes('married')) {
    return 'Married Filing Jointly'; // Default to joint if just "married" is specified
  } else if (lowerText.includes('single')) {
    return 'Single';
  } else if (lowerText.includes('head') && lowerText.includes('household')) {
    return 'Head of Household';
  }
  
  return null;
}

function extractQuarterFromText(text) {
  const lowerText = text.toLowerCase();
  
  // Extract quarters (Q1, Q2, Q3, Q4, etc.)
  const quarterRegex = /\b(q[1-4]|quarter [1-4]|first quarter|second quarter|third quarter|fourth quarter)\b/i;
  const match = lowerText.match(quarterRegex);
  
  if (match) {
    const quarterText = match[0].toLowerCase();
    
    if (quarterText.includes('q1') || quarterText.includes('first') || quarterText.includes('quarter 1')) {
      return 'Q1';
    } else if (quarterText.includes('q2') || quarterText.includes('second') || quarterText.includes('quarter 2')) {
      return 'Q2';
    } else if (quarterText.includes('q3') || quarterText.includes('third') || quarterText.includes('quarter 3')) {
      return 'Q3';
    } else if (quarterText.includes('q4') || quarterText.includes('fourth') || quarterText.includes('quarter 4')) {
      return 'Q4';
    }
  }
  
  return null;
} 