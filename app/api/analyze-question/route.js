// app/api/analyze-question/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { question } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant that categorizes user questions. 
                    Categorize the question into one of these categories: 
                    'tax', 'budget', 'income', 'expenses', 'investments', 'other'.
                    Also determine if the question requires numerical calculations.
                    Detect mentions of specific quarters (Q1, Q2, Q3, Q4) and
                    U.S. states. Also detect if this is a follow-up to a previous question.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      functions: [
        {
          name: "categorize_question",
          description:
            "Categorize a financial question and determine if it requires calculations",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [
                  "tax",
                  "budget",
                  "income",
                  "expenses",
                  "investments",
                  "other",
                ],
                description: "The category of the financial question",
              },
              isCalculation: {
                type: "boolean",
                description:
                  "Whether the question requires numerical calculations",
              },
              isFollowUp: {
                type: "boolean",
                description:
                  "Whether this appears to be a follow-up to a previous question",
              },
              specifics: {
                type: "object",
                properties: {
                  period: {
                    type: "string",
                    description: "Fiscal period mentioned (e.g., 'Q1', 'Q2')",
                  },
                  state: {
                    type: "string",
                    description: "US state mentioned in the question, if any",
                  },
                  timeframe: {
                    type: "string",
                    description:
                      "Timeframe mentioned in the question (e.g., '2023', 'April')",
                  },
                },
              },
            },
            required: ["category", "isCalculation", "isFollowUp"],
          },
        },
      ],
      function_call: { name: "categorize_question" },
    });

    const result = JSON.parse(
      response.choices[0].message.function_call.arguments
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Question analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze question",
        message: error.message,
      },
      { status: 500 }
    );
  }
}