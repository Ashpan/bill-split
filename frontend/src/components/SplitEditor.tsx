import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setItemSplits } from "../api";
import type { Bill, Item, SplitType } from "../types";

interface SplitState {
  personId: string;
  name: string;
  included: boolean;
  splitType: SplitType;
  value: string; // raw input string
}

export default function SplitEditor({ bill, item }: { bill: Bill; item: Item }) {
  const qc = useQueryClient();
  const [globalSplitType, setGlobalSplitType] = useState<SplitType>(
    item.splits[0]?.splitType ?? "EVEN"
  );
  const [splits, setSplits] = useState<SplitState[]>(() => initSplits(bill, item));

  // Re-init when item changes
  useEffect(() => {
    setSplits(initSplits(bill, item));
    setGlobalSplitType(item.splits[0]?.splitType ?? "EVEN");
  }, [item.id, item.splits.length]);

  const mutation = useMutation({
    mutationFn: () => {
      const included = splits.filter((s) => s.included);
      const payload = included.map((s) => ({
        personId: s.personId,
        splitType: globalSplitType,
        value:
          globalSplitType === "EVEN"
            ? undefined
            : parseFloat(s.value) || 0,
      }));
      return setItemSplits(bill.id, item.id, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", bill.id] }),
  });

  const included = splits.filter((s) => s.included);
  const evenShare = included.length > 0 ? item.amount / included.length : 0;

  const percentSum = included.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  const amountSum = included.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);

  const togglePerson = (personId: string) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.personId === personId ? { ...s, included: !s.included } : s
      )
    );
  };

  const updateValue = (personId: string, value: string) => {
    setSplits((prev) =>
      prev.map((s) => (s.personId === personId ? { ...s, value } : s))
    );
  };

  const handleTypeChange = (type: SplitType) => {
    setGlobalSplitType(type);
    if (type === "EVEN") {
      setSplits((prev) => prev.map((s) => ({ ...s, value: "" })));
    } else if (type === "PERCENT") {
      // Auto-distribute evenly
      const count = splits.filter((s) => s.included).length;
      const each = count > 0 ? (100 / count).toFixed(2) : "0";
      setSplits((prev) =>
        prev.map((s) => ({ ...s, value: s.included ? each : s.value }))
      );
    }
  };

  const distributeEvenly = () => {
    if (globalSplitType === "PERCENT") {
      const count = included.length;
      const each = count > 0 ? (100 / count).toFixed(4) : "0";
      setSplits((prev) =>
        prev.map((s) => ({ ...s, value: s.included ? each : s.value }))
      );
    } else if (globalSplitType === "AMOUNT") {
      const count = included.length;
      const each = count > 0 ? (item.amount / count).toFixed(2) : "0";
      setSplits((prev) =>
        prev.map((s) => ({ ...s, value: s.included ? each : s.value }))
      );
    }
  };

  const percentError =
    globalSplitType === "PERCENT" && included.length > 0 && Math.abs(percentSum - 100) > 0.1;

  const amountError =
    globalSplitType === "AMOUNT" && included.length > 0 && Math.abs(amountSum - item.amount) > 0.01;

  const remainder =
    globalSplitType === "AMOUNT" ? item.amount - amountSum : null;

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      {/* Split Type Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Split by</span>
        {(["EVEN", "PERCENT", "AMOUNT"] as SplitType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              globalSplitType === type
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {type === "EVEN" ? "Even" : type === "PERCENT" ? "Percent %" : "Amount $"}
          </button>
        ))}
        {globalSplitType !== "EVEN" && included.length > 1 && (
          <button
            onClick={distributeEvenly}
            className="px-3 py-1 rounded-full text-xs text-gray-400 hover:text-blue-600 underline"
          >
            distribute evenly
          </button>
        )}
      </div>

      {/* Per-person rows */}
      <div className="space-y-2">
        {splits.map((split) => (
          <div key={split.personId} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={split.included}
              onChange={() => togglePerson(split.personId)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span
              className={`flex-1 text-sm ${split.included ? "text-gray-800" : "text-gray-400"}`}
            >
              {split.name}
            </span>
            {split.included && globalSplitType === "EVEN" && (
              <span className="text-sm text-gray-500 font-mono">${evenShare.toFixed(2)}</span>
            )}
            {split.included && globalSplitType === "PERCENT" && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={split.value}
                  onChange={(e) => updateValue(split.personId, e.target.value)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400">%</span>
                <span className="text-xs text-gray-400 font-mono w-14 text-right">
                  =${((parseFloat(split.value) || 0) / 100 * item.amount).toFixed(2)}
                </span>
              </div>
            )}
            {split.included && globalSplitType === "AMOUNT" && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={split.value}
                  onChange={(e) => updateValue(split.personId, e.target.value)}
                  className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Validation feedback */}
      {globalSplitType === "PERCENT" && included.length > 0 && (
        <div className={`text-xs font-medium ${percentError ? "text-red-500" : "text-green-600"}`}>
          Total: {percentSum.toFixed(2)}%{percentError ? " (must equal 100%)" : " ✓"}
        </div>
      )}
      {globalSplitType === "AMOUNT" && included.length > 0 && (
        <div className={`text-xs font-medium ${amountError ? "text-red-500" : "text-green-600"}`}>
          Total: ${amountSum.toFixed(2)} / ${item.amount.toFixed(2)}
          {remainder !== null && Math.abs(remainder) > 0.01 && (
            <span className="ml-2 text-orange-500">
              ({remainder > 0 ? `$${remainder.toFixed(2)} unassigned` : `$${Math.abs(remainder).toFixed(2)} over`})
            </span>
          )}
          {!amountError && " ✓"}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            included.length === 0 ||
            percentError ||
            (globalSplitType === "AMOUNT" && amountError)
          }
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save Split"}
        </button>
        {mutation.isSuccess && (
          <span className="text-xs text-green-600">Saved</span>
        )}
      </div>
    </div>
  );
}

function initSplits(bill: Bill, item: Item): SplitState[] {
  const splitMap = new Map(item.splits.map((s) => [s.personId, s]));
  return bill.people.map((person) => {
    const existing = splitMap.get(person.id);
    return {
      personId: person.id,
      name: person.name,
      included: !!existing,
      splitType: existing?.splitType ?? "EVEN",
      value: existing?.value?.toString() ?? "",
    };
  });
}
