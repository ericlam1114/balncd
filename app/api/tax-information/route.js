import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { question } = await request.json();
    
    // Use OpenAI to get tax information
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful financial assistant specializing in tax information.
                    Provide accurate, concise answers to tax-related questions.
                    If you don't know the exact answer, acknowledge the limitation
                    and provide general information that might be helpful.`
        },
        {
          role: "user",
          content: question
        }
      ],
      functions: [{
        name: "provide_tax_information",
        description: "Provide information in response to a tax-related question",
        parameters: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "The answer to the tax question"
            },
            title: {
              type: "string",
              description: "A title for the information visualization, if applicable"
            },
            visualizationData: {
              type: "object",
              description: "Data for visualization, if applicable"
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence level in the accuracy of the answer"
            }
          },
          required: ["answer", "confidence"]
        }
      }],
      function_call: { name: "provide_tax_information" }
    });
    
    const result = JSON.parse(response.choices[0].message.function_call.arguments);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tax information error:', error);
    return NextResponse.json({ 
      error: 'Failed to get tax information',
      message: error.message
    }, { status: 500 });
  }
}