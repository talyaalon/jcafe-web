// תוכן משפטי דו-לשוני (עברית/אנגלית) — תקנון שימוש + מדיניות פרטיות.
// מותאם לחוק הגנת המידע האישי של תאילנד (PDPA, B.E. 2562 / 2019).
// ⚠️ זהו נוסח בסיס/תבנית. מומלץ שעו"ד תאילנדי יעבור עליו לפני פרסום סופי.
// כדי לעדכן פרטי קשר/שם חברה — שנו את הקבועים כאן בלבד.

export const LEGAL_CONTACT = {
  company: "The Kosher Place (J Cafe)",
  companyHe: "The Kosher Place (J Cafe)",
  location: "Phuket, Thailand",
  locationHe: "פוקט, תאילנד",
  email: "info@kosher-place.com", // שנו לכתובת קשר אמיתית אם צריך
  lastUpdated: { en: "26 June 2026", he: "26 ביוני 2026" },
};

export interface LegalSection {
  h: string;
  p: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
  disclaimer: string;
}

const C = LEGAL_CONTACT;

/* ─────────────────────────  PRIVACY POLICY  ───────────────────────── */

function privacyEn(): LegalDocument {
  return {
    title: "Privacy Policy",
    lastUpdated: `Last updated: ${C.lastUpdated.en}`,
    intro: [
      `${C.company} ("we", "us", "our") operates this website and online ordering service for kosher food, groceries, delivery, take-away and catering in ${C.location}. We respect your privacy and are committed to protecting your personal data.`,
      `This Privacy Policy explains how we collect, use, disclose, store and protect your personal data, and your rights, in accordance with the Personal Data Protection Act B.E. 2562 (2019) of Thailand ("PDPA"). For the purpose of the PDPA, we act as the "Data Controller" of your personal data.`,
    ],
    sections: [
      {
        h: "1. Personal data we collect",
        p: [
          "Identity & contact data: your name, email address, telephone number and delivery address(es).",
          "Order data: items ordered, order history, pickup/delivery method, delivery instructions, branch (store) and the price you paid.",
          "Account data: your login credentials (managed securely by our authentication provider), saved addresses and saved favourites.",
          "Payment data: payments are processed by our payment provider (Stripe). We do not collect or store your full card number — we receive only a confirmation of payment and limited transaction details.",
          "Location data: when you enter a delivery address we use a mapping service to calculate distance and delivery fees; we do not continuously track your location.",
          "Technical & usage data: IP address, device and browser type, and basic analytics about how you use the site.",
          "Notification data: if you enable alerts (for staff/picker devices), we store the push-notification subscription token for that device.",
        ],
      },
      {
        h: "2. How we collect your data",
        p: [
          "Directly from you — when you create an account, place an order, enter contact or address details, contact us, or enable notifications.",
          "Automatically — through cookies and similar technologies when you use the website (see section 7).",
          "From third parties — for example our payment provider confirms the result of a transaction.",
        ],
      },
      {
        h: "3. Purposes and legal bases for processing",
        p: [
          "To create and manage your account and process and deliver your orders (necessary for performance of the contract with you).",
          "To take payment and prevent fraud (performance of contract and our legitimate interest).",
          "To contact you about your order, send order confirmations and service messages (performance of contract).",
          "To provide customer support and handle requests, complaints and refunds (performance of contract and legitimate interest).",
          "To improve and secure the website and our services (legitimate interest).",
          "To send you marketing or promotional messages — only where you have given consent, which you may withdraw at any time.",
          "To comply with legal, tax and accounting obligations under Thai law (legal obligation).",
        ],
      },
      {
        h: "4. Disclosure of your data",
        p: [
          "We do not sell your personal data. We share it only with service providers who help us run the service, and only as needed:",
          "Payment processing — Stripe.",
          "Hosting and database — our cloud hosting and database providers.",
          "Email delivery — our transactional email provider, to send order confirmations.",
          "Maps and address lookup — our mapping/geocoding provider, to calculate delivery.",
          "Order and kitchen management (ERP) — to prepare and fulfil your order at the relevant branch.",
          "Delivery partners — the courier handling your delivery receives the details needed to deliver to you.",
          "We may also disclose data where required by law, court order, or a lawful request by a competent authority, or to protect our rights.",
        ],
      },
      {
        h: "5. International data transfers",
        p: [
          "Some of our service providers may store or process data on servers located outside Thailand. Where we transfer personal data abroad, we take steps to ensure an adequate level of protection and appropriate safeguards, as required by the PDPA.",
        ],
      },
      {
        h: "6. Cookies and similar technologies",
        p: [
          "We use cookies and local storage that are strictly necessary to operate the site — for example to keep you logged in, remember your cart and your chosen branch and language.",
          "We may also use limited analytics to understand and improve how the site is used. You can control cookies through your browser settings; disabling necessary cookies may affect how the site works.",
        ],
      },
      {
        h: "7. Data retention",
        p: [
          "We keep your personal data only for as long as necessary for the purposes described above — including to provide the service, maintain your order history, and meet legal, tax and accounting requirements.",
          "When data is no longer needed, we will delete, anonymise or de-identify it. You may also ask us to delete your account (see your rights below).",
        ],
      },
      {
        h: "8. Data security",
        p: [
          "We apply appropriate technical and organisational measures to protect your personal data against loss, unauthorised access, alteration or disclosure — including encryption in transit (HTTPS), access controls, and using reputable providers for payments and hosting.",
          "No method of transmission or storage is completely secure; we cannot guarantee absolute security, but we work to protect your data and to respond promptly to any incident.",
        ],
      },
      {
        h: "9. Your rights under the PDPA",
        p: [
          "Subject to the conditions of the PDPA, you have the right to: access and obtain a copy of your personal data; request correction of inaccurate data; request erasure or de-identification; restrict or object to certain processing; request data portability; and withdraw consent at any time (without affecting processing already carried out).",
          "You also have the right to lodge a complaint with the Personal Data Protection Committee (PDPC) of Thailand if you believe your rights have been infringed.",
          `To exercise any of these rights, contact us at ${C.email}. We may need to verify your identity before acting on your request.`,
        ],
      },
      {
        h: "10. Children's privacy",
        p: [
          "Our service is intended for customers who can lawfully enter into a contract. We do not knowingly collect personal data from children without appropriate parental consent. If you believe a child has provided us data without consent, please contact us and we will take appropriate action.",
        ],
      },
      {
        h: "11. Marketing and notifications",
        p: [
          "We will only send you marketing messages where you have consented. Every marketing message will let you opt out, and you can withdraw consent at any time by contacting us. Service messages relating to your orders are not marketing and will still be sent.",
        ],
      },
      {
        h: "12. Changes to this policy",
        p: [
          "We may update this Privacy Policy from time to time. The current version, with its date, will always be available on this page. Significant changes will be highlighted where appropriate.",
        ],
      },
      {
        h: "13. Contact us",
        p: [
          `If you have any questions, requests or complaints about this Privacy Policy or your personal data, please contact us:`,
          `${C.company}, ${C.location}.`,
          `Email: ${C.email}`,
        ],
      },
    ],
    disclaimer:
      "This document is provided as a general template and does not constitute legal advice. We recommend it be reviewed by a qualified lawyer in Thailand before final publication.",
  };
}

function privacyHe(): LegalDocument {
  return {
    title: "מדיניות פרטיות",
    lastUpdated: `עודכן לאחרונה: ${C.lastUpdated.he}`,
    intro: [
      `${C.companyHe} ("אנחנו", "החברה") מפעילה אתר זה ושירות הזמנות אונליין לאוכל כשר, מצרכים, משלוחים, איסוף עצמי וקייטרינג ב${C.locationHe}. אנו מכבדים את פרטיותך ומחויבים להגן על המידע האישי שלך.`,
      `מדיניות זו מסבירה כיצד אנו אוספים, משתמשים, חושפים, שומרים ומגנים על המידע האישי שלך, ומהן זכויותיך — בהתאם לחוק הגנת המידע האישי של תאילנד B.E. 2562 (2019) ("PDPA"). לצורך החוק, אנו משמשים כ"בעל השליטה במידע" (Data Controller).`,
    ],
    sections: [
      {
        h: "1. איזה מידע אישי אנו אוספים",
        p: [
          "פרטי זיהוי וקשר: שם, כתובת אימייל, מספר טלפון וכתובת/כתובות למשלוח.",
          "פרטי הזמנה: הפריטים שהוזמנו, היסטוריית הזמנות, שיטת איסוף/משלוח, הוראות משלוח, הסניף והסכום ששולם.",
          "פרטי חשבון: פרטי ההתחברות (מנוהלים באופן מאובטח על-ידי ספק האימות שלנו), כתובות שמורות ומועדפים שמורים.",
          "פרטי תשלום: התשלומים מעובדים על-ידי ספק הסליקה שלנו (Stripe). איננו אוספים או שומרים את מספר הכרטיס המלא — אנו מקבלים רק אישור תשלום ופרטי עסקה מוגבלים.",
          "מידע מיקום: כשאתה מזין כתובת למשלוח אנו משתמשים בשירות מפות לחישוב מרחק ודמי משלוח; איננו עוקבים אחר מיקומך באופן רציף.",
          "מידע טכני ושימוש: כתובת IP, סוג מכשיר ודפדפן, ונתוני שימוש בסיסיים על אופן השימוש באתר.",
          "מידע התראות: אם הפעלת התראות (במכשירי הצוות/המלקט), אנו שומרים את מזהה המנוי לדחיפת ההתראות עבור אותו מכשיר.",
        ],
      },
      {
        h: "2. כיצד אנו אוספים את המידע",
        p: [
          "ישירות ממך — בעת יצירת חשבון, ביצוע הזמנה, הזנת פרטי קשר או כתובת, פנייה אלינו או הפעלת התראות.",
          "באופן אוטומטי — באמצעות עוגיות (cookies) וטכנולוגיות דומות בעת השימוש באתר (ראה סעיף 6).",
          "מצדדים שלישיים — למשל ספק הסליקה מאשר את תוצאת העסקה.",
        ],
      },
      {
        h: "3. מטרות העיבוד והבסיס החוקי",
        p: [
          "ליצירה וניהול של חשבונך ולעיבוד וביצוע ההזמנות שלך (נדרש לקיום ההסכם עמך).",
          "לגביית תשלום ומניעת הונאות (קיום ההסכם והאינטרס הלגיטימי שלנו).",
          "ליצירת קשר בנוגע להזמנתך, שליחת אישורי הזמנה והודעות שירות (קיום ההסכם).",
          "למתן תמיכת לקוחות וטיפול בפניות, תלונות והחזרים (קיום ההסכם ואינטרס לגיטימי).",
          "לשיפור ואבטחת האתר והשירותים (אינטרס לגיטימי).",
          "לשליחת דיוור שיווקי או מבצעים — רק אם נתת לכך הסכמה, אותה ניתן לבטל בכל עת.",
          "לעמידה בחובות חוקיות, מס וחשבונאות לפי החוק התאילנדי (חובה חוקית).",
        ],
      },
      {
        h: "4. חשיפת המידע שלך",
        p: [
          "איננו מוכרים את המידע האישי שלך. אנו משתפים אותו רק עם נותני שירות שעוזרים לנו להפעיל את השירות, ורק במידת הצורך:",
          "סליקת תשלומים — Stripe.",
          "אחסון ומסד נתונים — ספקי הענן והמסד שלנו.",
          "שליחת מיילים — ספק הדואר לשליחת אישורי הזמנה.",
          "מפות ואיתור כתובות — ספק המפות/הגיאוקודינג, לחישוב המשלוח.",
          "ניהול הזמנות ומטבח (ERP) — להכנת וביצוע ההזמנה בסניף הרלוונטי.",
          "שותפי משלוחים — השליח המבצע את המשלוח מקבל את הפרטים הדרושים למסירה אליך.",
          "ייתכן שנחשוף מידע גם כאשר הדבר נדרש לפי חוק, צו בית-משפט, או בקשה חוקית של רשות מוסמכת, או כדי להגן על זכויותינו.",
        ],
      },
      {
        h: "5. העברת מידע מחוץ לתאילנד",
        p: [
          "חלק מנותני השירות שלנו עשויים לאחסן או לעבד מידע בשרתים מחוץ לתאילנד. כאשר אנו מעבירים מידע אישי לחו\"ל, אנו נוקטים צעדים להבטחת רמת הגנה נאותה ואמצעי הגנה מתאימים, כנדרש ב-PDPA.",
        ],
      },
      {
        h: "6. עוגיות וטכנולוגיות דומות",
        p: [
          "אנו משתמשים בעוגיות ובאחסון מקומי הנחוצים להפעלת האתר — למשל כדי לשמור אותך מחובר, לזכור את העגלה ואת הסניף והשפה שבחרת.",
          "ייתכן שנשתמש גם באנליטיקה מוגבלת כדי להבין ולשפר את השימוש באתר. ניתן לשלוט בעוגיות דרך הגדרות הדפדפן; השבתת עוגיות הכרחיות עלולה לפגוע בתפקוד האתר.",
        ],
      },
      {
        h: "7. שמירת המידע",
        p: [
          "אנו שומרים את המידע האישי שלך רק למשך הזמן הדרוש למטרות שלעיל — לרבות מתן השירות, שמירת היסטוריית ההזמנות, ועמידה בדרישות חוק, מס וחשבונאות.",
          "כשהמידע אינו נחוץ עוד, נמחק, ננטרל זיהוי או נהפוך אותו לאנונימי. כמו כן תוכל לבקש מאיתנו למחוק את חשבונך (ראה זכויותיך בהמשך).",
        ],
      },
      {
        h: "8. אבטחת מידע",
        p: [
          "אנו מיישמים אמצעים טכניים וארגוניים מתאימים להגנה על המידע האישי שלך מפני אובדן, גישה לא מורשית, שינוי או חשיפה — לרבות הצפנה בתעבורה (HTTPS), בקרות גישה, ושימוש בספקים מוכרים לסליקה ולאחסון.",
          "אף שיטת העברה או אחסון אינה מאובטחת לחלוטין; איננו יכולים להבטיח אבטחה מוחלטת, אך אנו פועלים להגן על המידע ולהגיב במהירות לכל אירוע.",
        ],
      },
      {
        h: "9. זכויותיך לפי ה-PDPA",
        p: [
          "בכפוף לתנאי החוק, יש לך זכות: לעיין ולקבל עותק של המידע האישי שלך; לבקש תיקון מידע שגוי; לבקש מחיקה או ניטרול זיהוי; להגביל או להתנגד לעיבוד מסוים; לבקש ניוד מידע; ולבטל הסכמה בכל עת (מבלי לפגוע בעיבוד שכבר בוצע).",
          "כמו כן יש לך זכות להגיש תלונה לוועדה להגנת המידע האישי (PDPC) של תאילנד אם אתה סבור שזכויותיך הופרו.",
          `למימוש זכויות אלה, פנה אלינו ב-${C.email}. ייתכן שנצטרך לאמת את זהותך לפני הטיפול בבקשה.`,
        ],
      },
      {
        h: "10. פרטיות ילדים",
        p: [
          "השירות מיועד ללקוחות הרשאים להתקשר בהסכם כדין. איננו אוספים ביודעין מידע אישי מילדים ללא הסכמת הורה מתאימה. אם נודע לך שילד מסר לנו מידע ללא הסכמה, פנה אלינו ונפעל בהתאם.",
        ],
      },
      {
        h: "11. שיווק והתראות",
        p: [
          "נשלח לך דיוור שיווקי רק אם נתת לכך הסכמה. בכל הודעה שיווקית תתאפשר הסרה, וניתן לבטל הסכמה בכל עת בפנייה אלינו. הודעות שירות הנוגעות להזמנותיך אינן שיווק וימשיכו להישלח.",
        ],
      },
      {
        h: "12. שינויים במדיניות",
        p: [
          "אנו עשויים לעדכן מדיניות זו מעת לעת. הגרסה העדכנית, עם תאריכה, תהיה תמיד זמינה בעמוד זה. שינויים מהותיים יודגשו במידת הצורך.",
        ],
      },
      {
        h: "13. יצירת קשר",
        p: [
          "לשאלות, בקשות או תלונות בנוגע למדיניות זו או למידע האישי שלך, פנה אלינו:",
          `${C.companyHe}, ${C.locationHe}.`,
          `אימייל: ${C.email}`,
        ],
      },
    ],
    disclaimer:
      "מסמך זה מסופק כתבנית כללית ואינו מהווה ייעוץ משפטי. מומלץ שעורך-דין מוסמך בתאילנד יעבור עליו לפני פרסום סופי.",
  };
}

/* ─────────────────────────  TERMS OF SERVICE  ───────────────────────── */

function termsEn(): LegalDocument {
  return {
    title: "Terms & Conditions",
    lastUpdated: `Last updated: ${C.lastUpdated.en}`,
    intro: [
      `These Terms & Conditions ("Terms") govern your use of the ${C.company} website and your purchase of food, groceries and related services from us in ${C.location}.`,
      "By using the website or placing an order, you agree to these Terms. Please read them carefully. If you do not agree, please do not use the service.",
    ],
    sections: [
      {
        h: "1. About us",
        p: [
          `The service is operated by ${C.company}, ${C.location}. You can contact us at ${C.email}.`,
        ],
      },
      {
        h: "2. Accounts",
        p: [
          "You may need an account to place orders. You are responsible for keeping your login details confidential and for all activity under your account.",
          "You agree to provide accurate, current and complete information (including a correct phone number and delivery address) and to keep it up to date.",
        ],
      },
      {
        h: "3. Orders and acceptance",
        p: [
          "When you place an order you make an offer to buy the selected items. A contract is formed only when we confirm and accept your order.",
          "We may refuse or cancel an order — for example if an item is unavailable, the price was clearly incorrect, the delivery address is outside our area, or we suspect fraud or abuse.",
        ],
      },
      {
        h: "4. Prices and payment",
        p: [
          "Prices are shown on the website and may include or add applicable taxes, delivery fees and service charges as indicated at checkout.",
          "Payment is processed securely by our payment provider (Stripe). By paying you authorise the charge for your order total. We do not store your full card details.",
          "We make reasonable efforts to ensure prices and product details are accurate, but errors may occur; if an error affects your order we will contact you before proceeding.",
        ],
      },
      {
        h: "5. Delivery and pickup",
        p: [
          "Delivery is available to addresses within our serviceable area for the chosen branch; delivery fees and times are estimates and may vary with distance, demand and conditions.",
          "For pickup/take-away orders, please collect your order at the chosen branch at the agreed time.",
          "You are responsible for providing accurate delivery details and for being available to receive the order.",
        ],
      },
      {
        h: "6. Cancellations, changes and refunds",
        p: [
          "Because food is prepared fresh, orders may not be cancellable once preparation has begun. If you need to change or cancel an order, contact us as soon as possible.",
          "If an order is incorrect, missing items, or not of acceptable quality, contact us promptly and we will make it right — by re-delivery, replacement or refund as appropriate, in line with applicable Thai consumer law.",
        ],
      },
      {
        h: "7. Food, kashrut and allergens",
        p: [
          "We aim to provide kosher products and accurate descriptions. While we take care with sourcing and preparation, kashrut certification details are as stated and you should contact us if you have specific requirements.",
          "If you have a food allergy or intolerance, please check with us before ordering. We cannot guarantee that any item is completely free from allergens or traces of them.",
        ],
      },
      {
        h: "8. Availability and accuracy",
        p: [
          "Products and prices are subject to availability and may change without notice. Images are for illustration; actual items may vary.",
          "We try to keep stock levels accurate, but if an item becomes unavailable after you order, we will contact you to offer a replacement or refund.",
        ],
      },
      {
        h: "9. Intellectual property",
        p: [
          "All content on the website — including text, logos, branding, images and design — is owned by us or our licensors and is protected by law. You may not copy, reproduce or use it without our permission.",
        ],
      },
      {
        h: "10. Acceptable use",
        p: [
          "You agree to use the website lawfully and not to misuse it, interfere with its operation, attempt unauthorised access, or use it to place fraudulent orders.",
        ],
      },
      {
        h: "11. Limitation of liability",
        p: [
          "To the maximum extent permitted by law, we are not liable for indirect or consequential loss arising from your use of the service. Nothing in these Terms excludes liability that cannot be excluded under applicable Thai law, including your statutory consumer rights.",
        ],
      },
      {
        h: "12. Privacy",
        p: [
          "Your use of the service is also governed by our Privacy Policy, which explains how we handle your personal data in accordance with Thailand's PDPA.",
        ],
      },
      {
        h: "13. Governing law and jurisdiction",
        p: [
          "These Terms are governed by the laws of the Kingdom of Thailand, and any dispute will be subject to the jurisdiction of the competent courts of Thailand.",
        ],
      },
      {
        h: "14. Changes to these Terms",
        p: [
          "We may update these Terms from time to time. The current version, with its date, will always be available on this page. Continued use of the service after changes means you accept the updated Terms.",
        ],
      },
      {
        h: "15. Contact us",
        p: [
          `For any questions about these Terms, contact us at ${C.email}.`,
          `${C.company}, ${C.location}.`,
        ],
      },
    ],
    disclaimer:
      "This document is provided as a general template and does not constitute legal advice. We recommend it be reviewed by a qualified lawyer in Thailand before final publication.",
  };
}

function termsHe(): LegalDocument {
  return {
    title: "תקנון שימוש",
    lastUpdated: `עודכן לאחרונה: ${C.lastUpdated.he}`,
    intro: [
      `תקנון זה ("התקנון") חל על השימוש שלך באתר ${C.companyHe} ועל רכישת אוכל, מצרכים ושירותים נלווים מאיתנו ב${C.locationHe}.`,
      "השימוש באתר או ביצוע הזמנה מהווים הסכמה לתקנון זה. אנא קרא אותו בעיון. אם אינך מסכים — אנא הימנע משימוש בשירות.",
    ],
    sections: [
      {
        h: "1. עלינו",
        p: [
          `השירות מופעל על-ידי ${C.companyHe}, ${C.locationHe}. ניתן ליצור קשר ב-${C.email}.`,
        ],
      },
      {
        h: "2. חשבונות",
        p: [
          "ייתכן שתידרש לחשבון כדי לבצע הזמנות. אתה אחראי לשמור על סודיות פרטי ההתחברות ועל כל פעילות שתתבצע בחשבונך.",
          "אתה מתחייב למסור מידע מדויק, עדכני ומלא (לרבות מספר טלפון וכתובת משלוח נכונים) ולשמור אותו מעודכן.",
        ],
      },
      {
        h: "3. הזמנות ואישורן",
        p: [
          "בעת ביצוע הזמנה אתה מציע לרכוש את הפריטים שנבחרו. ההסכם נכרת רק כאשר אנו מאשרים ומקבלים את הזמנתך.",
          "אנו רשאים לסרב או לבטל הזמנה — למשל אם פריט אינו זמין, המחיר היה שגוי באופן ברור, כתובת המשלוח מחוץ לאזור השירות, או שקיים חשד להונאה או שימוש לרעה.",
        ],
      },
      {
        h: "4. מחירים ותשלום",
        p: [
          "המחירים מוצגים באתר ועשויים לכלול או להוסיף מסים, דמי משלוח ודמי שירות החלים, כפי שמצוין בקופה.",
          "התשלום מעובד באופן מאובטח על-ידי ספק הסליקה שלנו (Stripe). בתשלום אתה מאשר את חיוב סכום ההזמנה. איננו שומרים את פרטי הכרטיס המלאים.",
          "אנו עושים מאמץ סביר להבטיח שהמחירים ופרטי המוצרים מדויקים, אך עלולות לקרות טעויות; אם טעות משפיעה על הזמנתך ניצור עמך קשר לפני המשך הטיפול.",
        ],
      },
      {
        h: "5. משלוח ואיסוף",
        p: [
          "משלוח זמין לכתובות בתחום אזור השירות של הסניף שנבחר; דמי וזמני המשלוח הם הערכה ועשויים להשתנות לפי מרחק, ביקוש ותנאים.",
          "בהזמנות לאיסוף עצמי, אנא אסוף את ההזמנה בסניף שנבחר בזמן המוסכם.",
          "אתה אחראי למסור פרטי משלוח מדויקים ולהיות זמין לקבלת ההזמנה.",
        ],
      },
      {
        h: "6. ביטולים, שינויים והחזרים",
        p: [
          "מאחר שהאוכל מוכן טרי, ייתכן שלא ניתן לבטל הזמנה לאחר שתחילת ההכנה. אם עליך לשנות או לבטל הזמנה, צור קשר בהקדם האפשרי.",
          "אם הזמנה שגויה, חסרים בה פריטים, או אינה באיכות סבירה — צור קשר במהירות ואנו נתקן זאת באמצעות משלוח חוזר, החלפה או החזר לפי העניין, בהתאם לדיני הגנת הצרכן בתאילנד.",
        ],
      },
      {
        h: "7. אוכל, כשרות ואלרגנים",
        p: [
          "אנו שואפים לספק מוצרים כשרים ותיאורים מדויקים. אף שאנו מקפידים על המקור וההכנה, פרטי תעודות הכשרות הם כמצוין, ועליך לפנות אלינו אם יש לך דרישות מיוחדות.",
          "אם יש לך אלרגיה או רגישות למזון, אנא בדוק איתנו לפני ההזמנה. איננו יכולים להבטיח שפריט כלשהו נקי לחלוטין מאלרגנים או משאריות שלהם.",
        ],
      },
      {
        h: "8. זמינות ודיוק",
        p: [
          "המוצרים והמחירים כפופים לזמינות ועשויים להשתנות ללא הודעה. התמונות להמחשה בלבד; הפריט בפועל עשוי להיות שונה.",
          "אנו משתדלים לשמור על מלאי מדויק, אך אם פריט הופך ללא-זמין לאחר ההזמנה ניצור עמך קשר להצעת חלופה או החזר.",
        ],
      },
      {
        h: "9. קניין רוחני",
        p: [
          "כל התוכן באתר — לרבות טקסט, לוגואים, מיתוג, תמונות ועיצוב — הוא בבעלותנו או בבעלות מעניקי הרישיון שלנו ומוגן בחוק. אין להעתיק, לשכפל או לעשות בו שימוש ללא רשותנו.",
        ],
      },
      {
        h: "10. שימוש מותר",
        p: [
          "אתה מתחייב להשתמש באתר כדין, לא לעשות בו שימוש לרעה, לא לשבש את פעולתו, לא לנסות גישה לא מורשית, ולא לבצע באמצעותו הזמנות במרמה.",
        ],
      },
      {
        h: "11. הגבלת אחריות",
        p: [
          "במידה המרבית המותרת בחוק, איננו אחראים לנזק עקיף או תוצאתי הנובע משימושך בשירות. אין בתקנון זה כדי לשלול אחריות שלא ניתן לשלול לפי הדין התאילנדי החל, לרבות זכויותיך הצרכניות על-פי דין.",
        ],
      },
      {
        h: "12. פרטיות",
        p: [
          "השימוש בשירות כפוף גם למדיניות הפרטיות שלנו, המסבירה כיצד אנו מטפלים במידע האישי שלך בהתאם ל-PDPA של תאילנד.",
        ],
      },
      {
        h: "13. דין וסמכות שיפוט",
        p: [
          "תקנון זה כפוף לחוקי ממלכת תאילנד, וכל מחלוקת תהיה בסמכות בתי-המשפט המוסמכים בתאילנד.",
        ],
      },
      {
        h: "14. שינויים בתקנון",
        p: [
          "אנו עשויים לעדכן תקנון זה מעת לעת. הגרסה העדכנית, עם תאריכה, תהיה תמיד זמינה בעמוד זה. המשך השימוש בשירות לאחר שינויים מהווה הסכמה לתקנון המעודכן.",
        ],
      },
      {
        h: "15. יצירת קשר",
        p: [
          `לשאלות בנוגע לתקנון זה, פנה אלינו ב-${C.email}.`,
          `${C.companyHe}, ${C.locationHe}.`,
        ],
      },
    ],
    disclaimer:
      "מסמך זה מסופק כתבנית כללית ואינו מהווה ייעוץ משפטי. מומלץ שעורך-דין מוסמך בתאילנד יעבור עליו לפני פרסום סופי.",
  };
}

export function getPrivacy(he: boolean): LegalDocument {
  return he ? privacyHe() : privacyEn();
}

export function getTerms(he: boolean): LegalDocument {
  return he ? termsHe() : termsEn();
}
