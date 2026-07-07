import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPerson, deletePerson } from "../api";
import type { Bill } from "../types";

export default function PeopleManager({ bill }: { bill: Bill }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: () => addPerson(bill.id, name.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      setName("");
    },
  });

  const remove = useMutation({
    mutationFn: (personId: string) => deletePerson(bill.id, personId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", bill.id] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    add.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Add Person</h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || add.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {bill.people.length === 0 ? (
        <div className="text-center text-gray-400 py-10 bg-white border border-gray-200 rounded-xl">
          Add people to start splitting the bill
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
          {bill.people.map((person) => (
            <div key={person.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  {person.name[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-800">{person.name}</span>
              </div>
              <button
                onClick={() => remove.mutate(person.id)}
                className="text-gray-300 hover:text-red-500 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
