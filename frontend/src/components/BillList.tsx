import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getBills, createBill, deleteBill } from "../api";
import type { BillSummary } from "../types";

export default function BillList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: getBills,
  });

  const create = useMutation({
    mutationFn: () => createBill({ name: name.trim(), description: desc.trim() || undefined }),
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      nav(`/bills/${bill.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Bills</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + New Bill
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create New Bill</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              placeholder="Bill name (e.g. Tokyo Trip, Dinner at Nobu)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name.trim() || create.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setName(""); setDesc(""); }}
                className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : bills?.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-lg font-medium">No bills yet</p>
          <p className="text-sm">Create one to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bills?.map((bill: BillSummary) => (
            <BillCard key={bill.id} bill={bill} onDelete={() => remove.mutate(bill.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BillCard({ bill, onDelete }: { bill: BillSummary; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
      <Link to={`/bills/${bill.id}`} className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <h2 className="font-semibold text-gray-900 truncate">{bill.name}</h2>
          {bill.description && (
            <span className="text-sm text-gray-400 truncate hidden sm:block">{bill.description}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
          <span>{bill.peopleCount} {bill.peopleCount === 1 ? "person" : "people"}</span>
          <span>{bill.itemCount} {bill.itemCount === 1 ? "item" : "items"}</span>
          <span className="font-medium text-gray-700">${bill.total.toFixed(2)}</span>
          <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); if (confirm("Delete this bill?")) onDelete(); }}
        className="ml-4 text-gray-300 hover:text-red-500 transition-colors text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
