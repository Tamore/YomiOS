import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 1. Gather Context (Current System State)
    const domains = await prisma.lifeDomain.findMany({
      include: {
        projects: {
          where: { status: 'Active' },
          include: {
            tasks: { where: { isCompleted: false } }
          }
        },
        tasks: { where: { isCompleted: false, projectId: null } }
      }
    });

    const stateContext = JSON.stringify(domains, null, 2);

    // 2. Prepare Gemini Prompt
    const systemInstruction = `
You are Yomi, my Personal Operating System, Executive Assistant, and Knowledge Manager.
You are NOT a chatbot. Convert chaos into structure. Always prioritize organization before conversation.
Maintain a persistent "system state" that represents my current life situation.

Current System State:
${stateContext}

OPERATING MODE RULES:
Before responding:
Step 1: Determine category based on my input (Dashboard, Task Manager, Project Manager, Knowledge Vault, Learning Hub).
Step 2: Determine priority.
Step 3: Update internal understanding.
Step 4: Output the requested JSON format.

REQUIRED OUTPUT FORMAT (STRICT JSON):
You MUST return ONLY a JSON object with this exact structure:
{
  "databaseAction": "CREATE_TASK" | "UPDATE_PROJECT" | "CREATE_KNOWLEDGE_BLOCK" | "COMPLETE_TASK" | "NONE",
  "payload": {
    // fields corresponding to the action
    // For CREATE_TASK: { title, domainId, projectId (optional), priority (optional) }
    // For CREATE_KNOWLEDGE_BLOCK: { content, tags, domainId }
    // For COMPLETE_TASK: { taskId }
  },
  "assistantResponseText": "A string formatted strictly using the following markdown blocks:\\n━━━━━━━━━━━━━━━━━━\\nOBJECTIVE\\n[text]\\n━━━━━━━━━━━━━━━━━━\\nANALYSIS\\n[text]\\n━━━━━━━━━━━━━━━━━━\\nACTION PLAN\\n[text]\\n━━━━━━━━━━━━━━━━━━\\nCHECKLIST\\n□ [item]\\n━━━━━━━━━━━━━━━━━━\\nNEXT ACTION\\n[text]\\n━━━━━━━━━━━━━━━━━━"
}
Do NOT include any markdown code blocks (like \`\`\`json) around the JSON output, just the raw JSON text.
`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // 3. Execute AI Request
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', text);
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
    }

    const { databaseAction, payload, assistantResponseText } = jsonResponse;

    // 4. Perform Programmatic DB Mutations
    let mutationResult = null;
    if (databaseAction === 'CREATE_TASK' && payload) {
      mutationResult = await prisma.task.create({
        data: {
          title: payload.title,
          domainId: payload.domainId,
          projectId: payload.projectId,
          priority: payload.priority || 'P3'
        }
      });
    } else if (databaseAction === 'CREATE_KNOWLEDGE_BLOCK' && payload) {
      mutationResult = await prisma.knowledgeBlock.create({
        data: {
          content: payload.content,
          tags: payload.tags,
          domainId: payload.domainId
        }
      });
    } else if (databaseAction === 'COMPLETE_TASK' && payload) {
      mutationResult = await prisma.task.update({
        where: { id: payload.taskId },
        data: { isCompleted: true }
      });
    }

    // 5. Return Response to UI
    return NextResponse.json({
      success: true,
      actionPerformed: databaseAction,
      mutationResult,
      assistantResponseText
    });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
