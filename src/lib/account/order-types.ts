// טיפוס ההזמנה של הלקוח כפי שמוחזר מ-/api/account/orders. מקור-אמת יחיד —
// משותף בין ה-route, AccountView ו-OrderDetailView (מונע סטייה בין עותקים).

export interface AccountOrderItem {
  name: string;
  qty: number;
  price?: number;
  storeName: string;
  storeId: string;
  templateId?: number;
  image?: string;
}

export interface AccountOrder {
  order_name: string | null;
  created_at: string;
  company: number | null;
  method: string | null;
  total: number;
  delivery_fee?: number | null;
  address?: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  scheduled_for?: string | null;
  notes?: string | null;
  items: AccountOrderItem[];
}
