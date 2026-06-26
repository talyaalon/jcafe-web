import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/session";
import { getMaintenanceOn, setMaintenanceOn } from "@/lib/site/maintenance";

// סטטוס המתג (למסך המנהל).
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, on: await getMaintenanceOn() });
}

// הדלקה/כיבוי של "מצב בנייה" — מנהל בלבד.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  let on = false;
  try {
    const body = (await req.json()) as { on?: boolean };
    on = body?.on === true;
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_BODY" }, { status: 400 });
  }
  const okWrite = await setMaintenanceOn(on);
  if (!okWrite) {
    return NextResponse.json({ ok: false, error: "WRITE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, on });
}
