import type { Dictionary } from "@/i18n/dictionaries";

// Footer מינימלי לדפי Checkout (כהה, Contact / Privacy / ©).
export function CheckoutFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="bg-wine-dark text-gold-soft">
      <div className="flex items-center justify-between gap-4 flex-wrap px-7 py-4 max-w-6xl mx-auto text-[12px]">
        <span className="text-white font-extrabold text-lg">{dict.brand.name}</span>
        <div className="flex items-center gap-5">
          <a className="hover:text-white cursor-pointer">{dict.footer.contactUs}</a>
          <a className="hover:text-white cursor-pointer">{dict.footer.privacy}</a>
          <span>{dict.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}
