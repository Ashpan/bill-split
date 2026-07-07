import { Bill, Item, ItemSplit, Payment, Person, SplitType } from "@prisma/client";

type FullBill = Bill & {
  people: Person[];
  items: (Item & { splits: (ItemSplit & { person: Person })[] })[];
  payments: (Payment & { person: Person })[];
};

export interface PersonBalance {
  personId: string;
  name: string;
  itemsOwed: number;
  tipOwed: number;
  taxOwed: number;
  owed: number;
  paid: number;
  net: number; // positive = others owe them, negative = they owe others
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

function computeItemShare(
  item: Item & { splits: ItemSplit[] },
  split: ItemSplit
): number {
  if (split.splitType === SplitType.AMOUNT) {
    return split.value ?? 0;
  }
  if (split.splitType === SplitType.PERCENT) {
    return item.amount * ((split.value ?? 0) / 100);
  }
  // EVEN
  const evenSplits = item.splits.filter((s) => s.splitType === SplitType.EVEN);
  return evenSplits.length > 0 ? item.amount / evenSplits.length : 0;
}

export function calculate(bill: FullBill): CalculationResult {
  const itemsOwedMap = new Map<string, number>();
  const paidMap = new Map<string, number>();

  for (const person of bill.people) {
    itemsOwedMap.set(person.id, 0);
    paidMap.set(person.id, 0);
  }

  const itemBreakdowns: ItemBreakdown[] = [];
  let totalItems = 0;

  for (const item of bill.items) {
    totalItems += item.amount;
    const shares: { personId: string; personName: string; share: number }[] = [];

    for (const split of item.splits) {
      const share = computeItemShare(item, split);
      itemsOwedMap.set(split.personId, (itemsOwedMap.get(split.personId) ?? 0) + share);
      shares.push({
        personId: split.personId,
        personName: split.person.name,
        share,
      });
    }

    itemBreakdowns.push({
      itemId: item.id,
      itemName: item.name,
      itemAmount: item.amount,
      shares,
    });
  }

  // Tax on items, tip on post-tax total
  const totalTax = computeAddOn(bill.taxType, bill.taxValue, totalItems);
  const totalTip = computeAddOn(bill.tipType, bill.tipValue, totalItems + totalTax);
  const totalBill = totalItems + totalTax + totalTip;

  // Distribute tax proportionally based on item share; tip on post-tax share
  const tipTaxOwedMap = new Map<string, { tip: number; tax: number }>();
  for (const person of bill.people) {
    tipTaxOwedMap.set(person.id, { tip: 0, tax: 0 });
  }

  if (totalItems > 0) {
    for (const [personId, itemsOwed] of itemsOwedMap.entries()) {
      const itemFraction = itemsOwed / totalItems;
      const personTax = totalTax * itemFraction;
      const postTaxShare = itemsOwed + personTax;
      const postTaxTotal = totalItems + totalTax;
      const tipFraction = postTaxTotal > 0 ? postTaxShare / postTaxTotal : 0;
      const personTip = totalTip * tipFraction;
      tipTaxOwedMap.set(personId, { tip: personTip, tax: personTax });
    }
  }

  for (const payment of bill.payments) {
    paidMap.set(payment.personId, (paidMap.get(payment.personId) ?? 0) + payment.amount);
  }

  const balances: PersonBalance[] = bill.people.map((person) => {
    const itemsOwed = itemsOwedMap.get(person.id) ?? 0;
    const { tip: tipOwed, tax: taxOwed } = tipTaxOwedMap.get(person.id) ?? { tip: 0, tax: 0 };
    const owed = itemsOwed + tipOwed + taxOwed;
    const paid = paidMap.get(person.id) ?? 0;
    return {
      personId: person.id,
      name: person.name,
      itemsOwed: round2(itemsOwed),
      tipOwed: round2(tipOwed),
      taxOwed: round2(taxOwed),
      owed: round2(owed),
      paid: round2(paid),
      net: round2(paid - owed),
    };
  });

  const settlements = settleDebts(balances);

  return {
    balances,
    settlements,
    itemBreakdowns,
    totalItems: round2(totalItems),
    totalTip: round2(totalTip),
    totalTax: round2(totalTax),
    totalBill: round2(totalBill),
    totalPaid: round2(bill.payments.reduce((sum, p) => sum + p.amount, 0)),
  };
}

function computeAddOn(type: string | null, value: number | null, base: number): number {
  if (!type || value == null || value <= 0) return 0;
  if (type === "PERCENT") return base * (value / 100);
  return value; // AMOUNT
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function settleDebts(balances: PersonBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ id: b.personId, name: b.name, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ id: b.personId, name: b.name, remaining: -b.net }))
    .sort((a, b) => b.remaining - a.remaining);

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.remaining, debtor.remaining);

    if (amount > 0.01) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: round2(amount),
      });
    }

    creditor.remaining = round2(creditor.remaining - amount);
    debtor.remaining = round2(debtor.remaining - amount);

    if (creditor.remaining <= 0.01) i++;
    if (debtor.remaining <= 0.01) j++;
  }

  return settlements;
}
