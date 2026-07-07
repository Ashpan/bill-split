import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPayment, deletePayment } from "../api";
import type { Bill } from "../types";

export default function PaymentsManager({ bill }: { bill: Bill }) {
  const qc = useQueryClient();
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const add = useMutation({
    mutationFn: () =>
      addPayment(bill.id, {
        personId,
        amount: parseFloat(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      setAmount("");
      setNote("");
    },
  });

  const remove = useMutation({
    mutationFn: (paymentId: string) => deletePayment(bill.id, paymentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", bill.id] }),
  });

  const totalItems = bill.items.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);

  // Quick-fill helpers
  const onePersonPaysAll = (pid: string) => {
    setPersonId(pid);
    setAmount(totalItems.toFixed(2));
    setNote("Paid full bill");
  };

  const splitEvenlyBetween = (pids: string[]) => {
    if (pids.length === 0) return;
    const each = totalItems / pids.length;
    // Add payments for all except the first (let user add first manually)
    // Actually let's just pre-fill for the currently selected person
    if (personId && pids.includes(personId)) {
      setAmount(each.toFixed(2));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !amount) return;
    add.mutate();
  };

  if (bill.people.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10 bg-white border border-gray-200 rounded-xl">
        Add people first to record payments
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Payment */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Record Payment</h3>

        {/* Quick actions */}
        {totalItems > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 mb-2">Quick fill</p>
            <div className="flex flex-wrap gap-2">
              {bill.people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onePersonPaysAll(p.id)}
                  className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-100"
                >
                  {p.name} pays all
                </button>
              ))}
              {bill.people.length > 1 && (
                <button
                  onClick={() => splitEvenlyBetween(bill.people.map((p) => p.id))}
                  className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-100"
                >
                  Split evenly ({bill.people.length} people = ${(totalItems / bill.people.length).toFixed(2)} each)
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select person who paid</option>
            {bill.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount paid"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!personId || !amount || add.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            Add Payment
          </button>
        </form>
      </div>

      {/* Payments List */}
      {bill.payments.length === 0 ? (
        <div className="text-center text-gray-400 py-10 bg-white border border-gray-200 rounded-xl">
          No payments recorded yet
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
          {bill.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                  {payment.person.name[0].toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-gray-800">{payment.person.name}</span>
                  {payment.note && (
                    <span className="ml-2 text-xs text-gray-400">{payment.note}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-gray-800">${payment.amount.toFixed(2)}</span>
                <button
                  onClick={() => remove.mutate(payment.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <div className="px-5 py-3 flex items-center justify-between bg-gray-50 rounded-b-xl">
            <span className="text-sm font-semibold text-gray-600">Total Paid</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900">${totalPaid.toFixed(2)}</span>
              {totalItems > 0 && Math.abs(totalPaid - totalItems) > 0.01 && (
                <span className={`text-xs font-medium ${totalPaid < totalItems ? "text-red-500" : "text-amber-500"}`}>
                  {totalPaid < totalItems
                    ? `$${(totalItems - totalPaid).toFixed(2)} short`
                    : `$${(totalPaid - totalItems).toFixed(2)} over`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
