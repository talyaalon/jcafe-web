import { ImageResponse } from "next/og";

// אייקון PWA למסך המלקט — נוצר דינמית כ-PNG (תואם אנדרואיד + iOS).
// גודל לפי ?s= (ברירת מחדל 512). משמש גם ל-manifest וגם ל-apple-touch-icon.
export async function GET(request: Request) {
  const s = Number(new URL(request.url).searchParams.get("s")) || 512;
  const size = Math.max(48, Math.min(512, s));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#861e74",
          color: "#ffffff",
          fontSize: size * 0.6,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        J
      </div>
    ),
    { width: size, height: size },
  );
}
