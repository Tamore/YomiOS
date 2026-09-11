import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PDFDocument } from 'pdf-lib';
import fs from "node:fs";
import path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const { tool, args } = await req.json();

    if (!tool || !args) {
      return NextResponse.json({ error: "Missing tool or args." }, { status: 400 });
    }

    if (tool === "create_task") {
      let domainId = null;
      if (args.domainName) {
        const domain = await prisma.lifeDomain.findFirst({
          where: { name: { contains: args.domainName } }
        });
        if (domain) domainId = domain.id;
      }

      await prisma.task.create({
        data: {
          title: args.title,
          priority: args.priority || "P3",
          domainId: domainId,
        }
      });

      await prisma.activityLog.create({
        data: {
          title: "Task Approved",
          description: `User approved creation of: ${args.title}`,
          category: "Task",
          icon: "robot_2",
          colorClass: "text-tertiary"
        }
      });

      return NextResponse.json({ success: true, message: "Task created successfully." });
    }

    if (tool === "export_pdf") {
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${args.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      
      const exportsDir = path.join(process.cwd(), "public", "exports");
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      const filePath = path.join(exportsDir, fileName);
      const publicUrl = `/exports/${fileName}`;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { height } = page.getSize();
      
      page.drawText(args.title, { x: 50, y: height - 50, size: 20 });
      
      const lines = args.content.split('\n');
      let currentY = height - 100;
      for (const line of lines) {
        if (currentY < 50) break; 
        page.drawText(line, { x: 50, y: currentY, size: 12 });
        currentY -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, pdfBytes);

      await prisma.activityLog.create({
        data: {
          title: "PDF Approved",
          description: `User approved generation of: ${args.title}`,
          category: "System",
          icon: "picture_as_pdf",
          colorClass: "text-secondary"
        }
      });

      return NextResponse.json({ success: true, message: `PDF generated.`, url: publicUrl });
    }

    return NextResponse.json({ error: "Unknown tool." }, { status: 400 });

  } catch (error) {
    console.error("Execution API Error:", error);
    return NextResponse.json({ error: "Failed to execute approved action." }, { status: 500 });
  }
}
