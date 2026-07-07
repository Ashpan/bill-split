import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addItem, deleteItem, updateItem } from "../api";
import type { Bill, Item } from "../types";
import SplitEditor from "./SplitEditor";

export default function ItemsManager({ bill }: { bill: Bill }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", amount: "", description: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      addItem(bill.id, {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim() || undefined,
      }),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      setForm({ name: "", amount: "", description: "" });
      setExpandedId(item.id);
    },
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => deleteItem(bill.id, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", bill.id] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return;
    add.mutate();
  };

  const totalItems = bill.items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-4">
      {bill.people.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Add people first before splitting items.
        </div>
      )}

      {/* Add Item Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Add Item</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Item name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-28 border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!form.name.trim() || !form.amount || add.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Items List */}
      {bill.items.length === 0 ? (
        <div className="text-center text-gray-400 py-10 bg-white border border-gray-200 rounded-xl">
          No items yet — add items above
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
          {bill.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              bill={bill}
              expanded={expandedId === item.id}
              editing={editingId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
              onDelete={() => remove.mutate(item.id)}
            />
          ))}
          <div className="px-5 py-3 flex items-center justify-between bg-gray-50 rounded-b-xl">
            <span className="text-sm font-semibold text-gray-600">Total Items</span>
            <span className="font-bold text-gray-900">${totalItems.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  bill,
  expanded,
  editing,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  bill: Bill;
  expanded: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [editForm, setEditForm] = useState({ name: item.name, amount: item.amount.toString(), description: item.description ?? "" });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateItem(bill.id, item.id, {
        name: editForm.name.trim(),
        amount: parseFloat(editForm.amount),
        description: editForm.description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      onEdit();
    },
  });

  const splitSummary = () => {
    if (item.splits.length === 0) return "Not split";
    const type = item.splits[0]?.splitType;
    const names = item.splits.map((s) => s.person.name).join(", ");
    if (type === "EVEN") return `Even split (${names})`;
    if (type === "PERCENT") return `% split (${names})`;
    return `$ split (${names})`;
  };

  if (editing) {
    return (
      <div className="px-5 py-4">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              className="w-28 border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50"
          >
            Save
          </button>
          <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-5 py-3.5 flex items-center gap-3">
        <button onClick={onToggle} className="flex-1 flex items-start gap-3 text-left">
          <span className="text-gray-300 mt-0.5 text-xs">{expanded ? "▼" : "▶"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-gray-800">{item.name}</span>
              {item.description && (
                <span className="text-xs text-gray-400 truncate">{item.description}</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{splitSummary()}</div>
          </div>
          <span className="font-mono font-medium text-gray-700 flex-shrink-0">${item.amount.toFixed(2)}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-gray-300 hover:text-blue-500 transition-colors text-sm px-1"
          >
            ✎
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${item.name}"?`)) onDelete(); }}
            className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          {bill.people.length === 0 ? (
            <p className="text-sm text-gray-400">Add people to the bill to split this item.</p>
          ) : (
            <SplitEditor bill={bill} item={item} />
          )}
        </div>
      )}
    </div>
  );
}
