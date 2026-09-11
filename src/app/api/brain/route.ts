import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import prisma from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, rgb } from 'pdf-lib';

const execAsync = promisify(exec);

// Initialize the Google Gen AI SDK
// It automatically picks up the GEMINI_API_KEY from your .env file
const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const { command, tutorLanguage, attachedFile } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "No command provided." }, { status: 400 });
    }

    // Get current time to inject into the brain
    const currentTime = new Date().toLocaleString();

    // This is the core identity of Yomi.
    let systemPrompt = `You are Yomi, a highly advanced, autonomous desktop AI assistant.
CURRENT SYSTEM TIME: ${currentTime}

Your job is to manage the user's local operating system, organize their life, and execute tasks.
Personality: You are highly intelligent, razor-sharp, and extremely capable. You have a dry, slightly sarcastic wit (think JARVIS or TARS), and you fully understand sarcasm when spoken to. You do not suffer fools gladly, but you are ultimately deeply loyal and helpful to the user.
Keep your responses concise, conversational, and actionable. Do not use overly robotic language.`;

    if (tutorLanguage) {
      systemPrompt = `You are Yomi, but your core persona has been overridden. You are now acting as a strict but highly encouraging ${tutorLanguage} Language Tutor. 
CURRENT SYSTEM TIME: ${currentTime}

Your singular goal is to help the user practice and master ${tutorLanguage}.
- MATCH THE USER'S LEVEL: If the user speaks in basic terms, simple phrases, or romanized text (like 'konnichiwa'), you MUST respond using very basic vocabulary, short sentences, and ALWAYS provide English translations.
- For Japanese specifically: If the user seems like a beginner, always provide Romaji, basic Hiragana/Katakana, and the English translation alongside your Japanese responses. Avoid complex Kanji.
- When the user makes grammatical or vocabulary mistakes, correct them gently.
- Use English ONLY when explaining complex grammar rules or translating phrases the user does not understand.
- Maintain a fraction of your dry wit, but adapt your personality to be a helpful Sensei/Tutor.
- You still have access to all your OS tools (tasks, projects, PDFs, etc.), but default to conversational tutoring unless specifically asked to perform a system action.`;
    }

    const createTaskTool = {
      name: "create_task",
      description: "Creates a new actionable task in the user's database. Use this when the user asks you to remember to do something, add a task, or create a to-do item.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "The clear, actionable title of the task."
          },
          domainName: {
            type: Type.STRING,
            description: "The name of the Life Domain this task belongs to. If the user doesn't specify, guess based on context (e.g., 'Work', 'Personal')."
          },
          priority: {
            type: Type.STRING,
            description: "Priority level: 'P1' (Urgent), 'P2' (High), 'P3' (Normal), 'P4' (Low). Default to 'P3'."
          }
        },
        required: ["title"]
      }
    };

    const searchPcTool = {
      name: "search_pc",
      description: "Searches the user's local Windows PC (specifically Desktop, Documents, and Downloads) for a specific file or folder by name.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The name of the file or folder to search for (e.g., 'resume.pdf', 'marketing')."
          }
        },
        required: ["query"]
      }
    };

    const exportPdfTool = {
      name: "export_pdf",
      description: "Generates a PDF document from text provided by the user and saves it directly to their PC's Downloads folder. Use this when the user asks you to create a list, write a note, or export something to PDF.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "The title of the PDF document."
          },
          content: {
            type: Type.STRING,
            description: "The full text content to write into the PDF. Can be a bulleted list or paragraphs."
          }
        },
        required: ["title", "content"]
      }
    };

    const logFeatureRequestTool = {
      name: "log_feature_request",
      description: "Logs a feature request or idea from the user to the Antigravity Bridge file so the AI builder can implement it later. Use this when the user asks you to 'build X', 'add Y', or 'I want a new feature'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          feature: {
            type: Type.STRING,
            description: "The specific feature or capability the user wants built."
          }
        },
        required: ["feature"]
      }
    };

    const controlUiTool = {
      name: "control_ui",
      description: "Controls the Yomi Holographic interface, mounting or hiding floating windows based on the user's voice command. Use this when the user says 'open courses', 'hide the chat', 'show my music', etc.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The action to perform: 'show' (mount a widget), 'hide' (unmount a widget), or 'clear' (hide all widgets)."
          },
          widget: {
            type: Type.STRING,
            description: "The name of the widget to target. Allowed values: 'projects', 'tasks', 'agents', 'archives', 'settings', 'activity', 'courses', 'create_domain'."
          }
        },
        required: ["action", "widget"]
      }
    };

    const runDebriefTool = {
      name: "run_debrief",
      description: "Fetches all of the user's current projects, open tasks, and recent activity logs, and generates a comprehensive, highly detailed verbal debrief report. Use this when the user asks for a debrief, a status update, or wants to know how they are doing.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    };

    const captureDataTool = {
      name: "capture_data",
      description: "Captures a thought, note, voice memo, or URL and saves it to the user's Inbox for background processing. Use this when the user says 'remember this', 'take a note', or drops raw information without a specific project.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          rawInput: {
            type: Type.STRING,
            description: "The raw text or transcript to capture."
          }
        },
        required: ["rawInput"]
      }
    };

    let apiContents: any = command;
    if (attachedFile) {
      apiContents = [
        {
          role: 'user',
          parts: [
            { text: command },
            { inlineData: { data: attachedFile.base64, mimeType: attachedFile.mimeType } }
          ]
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: apiContents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: [createTaskTool, searchPcTool, exportPdfTool, logFeatureRequestTool, controlUiTool, runDebriefTool, captureDataTool] }]
      }
    });

    let replyText = "";
    try {
      replyText = response.text || "";
    } catch (e) {
      // The @google/genai SDK throws an error if we access .text and the model only returned a function call.
    }

    // Handle Tool Calls (Autonomous Execution)
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === "create_task") {
          const args = call.args as any;
          
          // Phase 2: Instead of executing, we PROPOSE the action to the Human Gate.
          return NextResponse.json({
            success: true,
            reply: `I have drafted the task "${args.title}". Shall I proceed with creation?`,
            action: "PROPOSE",
            payload: { tool: "create_task", args }
          });
        }
        
        if (call.name === "search_pc") {
          const args = call.args as any;
          
          try {
            // Fast search in common Windows directories using PowerShell
            const psCommand = `Get-ChildItem -Path "$HOME\\Desktop", "$HOME\\Documents", "$HOME\\Downloads" -Recurse -Filter "*${args.query}*" -ErrorAction SilentlyContinue | Select-Object -First 5 FullName | ConvertTo-Json -Compress`;
            const { stdout } = await execAsync(`powershell.exe -Command "${psCommand}"`);
            
            let resultString = "No files found.";
            if (stdout && stdout.trim()) {
              const files = JSON.parse(stdout);
              if (Array.isArray(files)) {
                resultString = files.map((f: any) => f.FullName).join("\n- ");
                resultString = "- " + resultString;
              } else if (files.FullName) {
                resultString = "- " + files.FullName;
              }
            }

            await prisma.activityLog.create({
              data: {
                title: "Local PC Search",
                description: `Searched for: ${args.query}`,
                category: "System",
                icon: "search",
                colorClass: "text-primary"
              }
            });

            replyText = `I scanned your PC for "${args.query}". Here is what I found:\n\n${resultString}`;
          } catch (e) {
            console.error("Search Error:", e);
            replyText = `I tried scanning your PC for "${args.query}", but I couldn't find anything matching that or ran into a system error.`;
          }
        }

        if (call.name === "export_pdf") {
          const args = call.args as any;
          
          // Phase 2: PROPOSE the PDF generation
          return NextResponse.json({
            success: true,
            reply: `I have drafted the document "${args.title}". Shall I generate the PDF?`,
            action: "PROPOSE",
            payload: { tool: "export_pdf", args }
          });
        }

        if (call.name === "log_feature_request") {
          const args = call.args as any;
          try {
            const bridgePath = path.join(process.cwd(), "antigravity_bridge.md");
            fs.appendFileSync(bridgePath, `\n- **Feature Request:** ${args.feature}\n  - *Logged at:* ${new Date().toLocaleString()}\n`);
            replyText = `I've logged your request for "${args.feature}" to the Antigravity Bridge. Antigravity will build it for you when you are ready.`;
          } catch (e) {
            console.error("Bridge Error:", e);
            replyText = `I tried logging your feature request, but ran into an error.`;
          }
        }

        if (call.name === "control_ui") {
          const { action, widget } = call.args as { action: string, widget: string };
          const replyTextLocal = action === 'clear' ? "Clearing the Void Canvas." :
                        action === 'hide' ? `Hiding the ${widget} interface.` :
                        `Summoning the ${widget} interface.`;
          return NextResponse.json({
            success: true,
            reply: replyTextLocal,
            action: "UI_COMMAND",
            payload: { action, widget }
          });
        }

        if (call.name === "run_debrief") {
          const activeProjects = await prisma.project.findMany({ where: { status: 'Active' }});
          const openTasks = await prisma.task.findMany({ where: { status: { in: ['Not Started', 'In Progress'] } }});
          const recentLogs = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });

          const dataString = `
ACTIVE PROJECTS: ${activeProjects.map((p: any) => p.title).join(", ") || "None"}
OPEN TASKS: ${openTasks.map((t: any) => t.title).join(", ") || "None"}
RECENT ACTIVITY: ${recentLogs.map((l: any) => l.title).join(", ") || "None"}
          `;

          const debriefPrompt = `Using the following raw data about the user's current system state, generate a highly detailed, professional, and slightly sarcastic verbal debrief. Speak to them as if they are a CEO getting a morning briefing from their AI. Read off the stats smoothly. Do not use markdown, just write the script for TTS to speak out loud. 
DATA: ${dataString}`;

          const debriefResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: debriefPrompt,
            config: { systemInstruction: systemPrompt }
          });

          replyText = debriefResponse.text || "I was unable to compile the debrief.";
        }

        if (call.name === "capture_data") {
          const args = call.args as any;
          await prisma.inboxItem.create({
            data: {
              rawInput: args.rawInput,
              source: "voice",
              status: "pending"
            }
          });
          replyText = "I've captured that to your Inbox for processing.";
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      reply: replyText,
      tutorLanguage: tutorLanguage || null
    });

  } catch (error: any) {
    console.error("Brain API Error:", error);
    try {
      fs.writeFileSync(path.join(process.cwd(), "brain_error.log"), String(error?.stack || error));
    } catch (e) {}
    return NextResponse.json({ error: "Failed to process command." }, { status: 500 });
  }
}
