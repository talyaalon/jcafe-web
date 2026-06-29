import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin/session";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";

// POST /api/manager/category-block — חסימה/ביטול-חסימה של קטגוריה (טופס POST רגיל).
// נשמר בטבלת blocked_products עם template_id = "cat:<storeId>:<categoryId>".
// שדות: branch, ואחד מ: cat="cat:<store>:<id>|<name>" (לחסימה) | unblock_id (לביטול).
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const form = await req.formData();
  const branch = Number(form.get("branch")) || 0;
  const cat = String(form.get("cat") ?? "").trim();
  const unblockId = Number(form.get("unblock_id")) || 0;

  if (supabaseConfigured && branch) {
    try {
      if (unblockId) {
        await supabaseAdmin().from("blocked_products").delete().eq("id", unblockId);
      } else if (cat) {
        const sep = cat.indexOf("|");
        const template_id = (sep >= 0 ? cat.slice(0, sep) : cat).trim();
        const name = sep >= 0 ? cat.slice(sep + 1).trim() : null;
        if (template_id.startsWith("cat:")) {
          await supabaseAdmin()
            .from("blocked_products")
            .upsert({ branch, template_id, name }, { onConflict: "branch,template_id" });
        }
      }
      revalidatePath("/", "layout");
    } catch (e) {
      console.error("[category-block]", e);
    }
  }

  // חזרה לעמוד שממנו הגיע הטופס (או למסך המנהל כברירת מחדל)
  const ref = req.headers.get("referer");
  const dest = ref || new URL(`/he/manager?company=${branch}`, req.url).toString();
  return NextResponse.redirect(dest, 303);
}
