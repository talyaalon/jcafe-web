import { notFound } from "next/navigation";

// סבב 2ב-1b — אין דף בית כללי בלי סניף. כל סניף הוא אתר נפרד (/[lang]/s/[branch]);
// לקוחות נכנסים אך ורק דרך קישור סניף ספציפי. /he ו-/en העירומים → 404.
export default function Page() {
  notFound();
}
