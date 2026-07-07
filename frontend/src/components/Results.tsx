import { useQuery } from "@tanstack/react-query";
import { calculateBill } from "../api";
import type { Bill } from "../types";

export default function Results({ bill }: { bill: Bill }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["calculate", bill.id, bill.updatedAt],
    queryFn: () => calculateBill(bill.id),
  });

  if (isLoading) return <div className="text-center text-gray-400 py-8">Calculating…</div>;
  if (error) return <div className="text-center text-red-500 py-8">Error calculating</div>;
  if (!data) return null;

  const hasTip = data.totalTip > 0;
  const hasTax = data.totalTax > 0;

  return (
    <div className="space-y-6">
      {/* Summary totals */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Bill Summary</h3>
        <div className="space-y-2">
          <SummaryRow label="Items" value={data.totalItems} />
          {hasTip && <SummaryRow label={`Tip (${tipTaxLabel(bill.tipType, bill.tipValue)})`} value={data.totalTip} />}
          {hasTax && <SummaryRow label={`Tax (${tipTaxLabel(bill.taxType, bill.taxValue)})`} value={data.totalTax} />}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <SummaryRow label="Total" value={data.totalBill} bold />
          </div>
          <SummaryRow
            label="Total Paid"
            value={data.totalPaid}
            status={
              Math.abs(data.totalPaid - data.totalBill) < 0.02
                ? "ok"
                : data.totalPaid < data.totalBill
                ? "short"
                : "over"
            }
          />
        </div>
      </div>

      {/* Per-person breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Per Person Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left font-medium text-gray-500">Person</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Items</th>
                {hasTip && <th className="px-5 py-3 text-right font-medium text-gray-500">Tip</th>}
                {hasTax && <th className="px-5 py-3 text-right font-medium text-gray-500">Tax</th>}
                <th className="px-5 py-3 text-right font-medium text-gray-500">Total Owed</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Paid</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.balances.map((b) => (
                <tr key={b.personId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {b.name[0].toUpperCase()}
                      </div>
                      {b.name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-600">${b.itemsOwed.toFixed(2)}</td>
                  {hasTip && <td className="px-5 py-3 text-right font-mono text-gray-600">${b.tipOwed.toFixed(2)}</td>}
                  {hasTax && <td className="px-5 py-3 text-right font-mono text-gray-600">${b.taxOwed.toFixed(2)}</td>}
                  <td className="px-5 py-3 text-right font-mono font-medium text-gray-800">${b.owed.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-600">${b.paid.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    <span
                      className={
                        Math.abs(b.net) < 0.02
                          ? "text-gray-400"
                          : b.net > 0
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    >
                      {b.net > 0 ? "+" : ""}${b.net.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">Balance: green = owed money back, red = owes money</p>
        </div>
      </div>

      {/* Item breakdown */}
      {data.itemBreakdowns.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Item Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.itemBreakdowns.map((item) => (
              <div key={item.itemId} className="px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{item.itemName}</span>
                  <span className="font-mono font-medium text-gray-700">${item.itemAmount.toFixed(2)}</span>
                </div>
                {item.shares.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.shares.map((s) => (
                      <span
                        key={s.personId}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {s.personName}: ${s.share.toFixed(2)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Not assigned to anyone</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">How to Settle Up</h3>
        {data.settlements.length === 0 ? (
          <p className="text-gray-400 text-sm">
            {data.balances.length === 0
              ? "Add people and payments to see settlements"
              : "Everyone is settled up! 🎉"}
          </p>
        ) : (
          <div className="space-y-2">
            {data.settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg"
              >
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {s.fromName[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{s.fromName}</span>
                <span className="text-gray-400">pays</span>
                <span className="font-bold text-blue-700">${s.amount.toFixed(2)}</span>
                <span className="text-gray-400">to</span>
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {s.toName[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{s.toName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  status,
}: {
  label: string;
  value: number;
  bold?: boolean;
  status?: "ok" | "short" | "over";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>
          ${value.toFixed(2)}
        </span>
        {status === "ok" && <span className="text-xs text-green-600">✓</span>}
        {status === "short" && <span className="text-xs text-red-500">underpaid</span>}
        {status === "over" && <span className="text-xs text-amber-500">overpaid</span>}
      </div>
    </div>
  );
}

function tipTaxLabel(type: string | null, value: number | null): string {
  if (!type || value == null) return "";
  return type === "PERCENT" ? `${value}%` : `$${value.toFixed(2)}`;
}
