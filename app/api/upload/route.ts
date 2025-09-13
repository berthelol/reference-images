import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type - exclude SVG and GIF
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (fileType.includes("svg") || fileType.includes("gif") || 
        fileName.endsWith(".svg") || fileName.endsWith(".gif")) {
      return NextResponse.json({ error: "SVG and GIF files are not allowed" }, { status: 400 });
    }

    // Generate unique filename with timestamp and original name
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
    const tempFileName = `temp/${timestamp}_${originalName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from("medias")
      .upload(tempFileName, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("medias")
      .getPublicUrl(tempFileName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: tempFileName,
    });

  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}