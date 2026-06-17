import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/admin/upload  (multipart, field "file") — מעלה תמונה ל-Supabase Storage.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `banner-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const sb = supabaseAdmin();
    const { error } = await sb.storage.from("banners").upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = sb.storage.from("banners").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
