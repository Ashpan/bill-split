export type SplitType = "EVEN" | "PERCENT" | "AMOUNT";

export interface Person {
  id: string;
  billId: string;
  name: string;
}

export interface ItemSplit {
  id: string;
  itemId: string;
  personId: string;
  splitType: SplitType;
  value: number | null;
  person: Person;
}

export interface Item {
  id: string;
  billId: string;
  name: string;
  amount: number;
  description: string | null;
  splits: ItemSplit[];
}

export interface Payment {
  id: string;
  billId: string;
  personId: string;
  amount: number;
  note: string | null;
  person: Person;
}

export interface Bill {
  id: string;
  name: string;
  description: string | null;
  receiptPath: string | null;
  tipType: string | null;
  tipValue: number | null;
  taxType: string | null;
  taxValue: number | null;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  items: Item[];
  payments: Payment[];
}

export interface BillSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  peopleCount: number;
  itemCount: number;
  total: number;
}

export interface PersonBalance {
  personId: string;
  name: string;
  itemsOwed: number;
  tipOwed: number;
  taxOwed: number;
  owed: number;
  paid: number;
  net: number;
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface ItemBreakdown {
  itemId: string;
  itemName: string;
  itemAmount: number;
  shares: { personId: string; personName: string; share: number }[];
}

export interface CalculationResult {
  balances: PersonBalance[];
  settlements: Settlement[];
  itemBreakdowns: ItemBreakdown[];
  totalItems: number;
  totalTip: number;
  totalTax: number;
  totalBill: number;
  totalPaid: number;
}
