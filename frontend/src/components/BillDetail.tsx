import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getBill, uploadReceipt, deleteReceipt, updateBill } from "../api";
import PeopleManager from "./PeopleManager";
import ItemsManager from "./ItemsManager";
import PaymentsManager from "./PaymentsManager";
import Results from "./Results";

type Tab = "people" | "items" | "payments" | "results";

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("people");
  const [uploading, setUploading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => getBill(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteReceipt(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", id] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await uploadReceipt(id, file);
      qc.invalidateQueries({ queryKey: ["bill", id] });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) return <div className="text-center text-gray-400 py-12">Loading…</div>;
  if (!bill) return <div className="text-center text-red-500 py-12">Bill not found</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "people", label: "People" },
    { key: "items", label: "Items" },
    { key: "payments", label: "Payments" },
    { key: "results", label: "Results" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← All Bills
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bill.name}</h1>
            {bill.description && <p className="text-gray-500 mt-1">{bill.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {bill.receiptPath ? (
              <>
                <button
                  onClick={() => setReceiptOpen(true)}
                  className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  View Receipt
                </button>
                <button
                  onClick={() => removeMutation.mutate()}
                  className="text-sm text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              </>
            ) : (
              <label className="cursor-pointer text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                {uploading ? "Uploading…" : "📷 Upload Receipt"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptOpen && bill.receiptPath && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setReceiptOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Receipt</h3>
              <button onClick={() => setReceiptOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-4">
              {bill.receiptPath.toLowerCase().endsWith(".pdf") ? (
                <iframe src={bill.receiptPath} className="w-full h-96" title="receipt" />
              ) : (
                <img src={bill.receiptPath} alt="receipt" className="w-full rounded" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
              {key === "people" && bill.people.length > 0 && (
                <span className="ml-1.5 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                  {bill.people.length}
                </span>
              )}
              {key === "items" && bill.items.length > 0 && (
                <span className="ml-1.5 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                  {bill.items.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === "people" && <PeopleManager bill={bill} />}
      {tab === "items" && <ItemsManager bill={bill} />}
      {tab === "payments" && <PaymentsManager bill={bill} />}
      {tab === "results" && <ResultsWithTipTax bill={bill} />}
    </div>
  );
}

function ResultsWithTipTax({ bill }: { bill: ReturnType<typeof getBill> extends Promise<infer T> ? T : never }) {
  return (
    <>
      <TipTaxEditor bill={bill} />
      <Results bill={bill} />
    </>
  );
}

function TipTaxEditor({ bill }: { bill: any }) {
  const qc = useQueryClient();
  const [tipType, setTipType] = useState<string>(bill.tipType ?? "PERCENT");
  const [tipValue, setTipValue] = useState<string>(bill.tipValue?.toString() ?? "");
  const [taxType, setTaxType] = useState<string>(bill.taxType ?? "PERCENT");
  const [taxValue, setTaxValue] = useState<string>(bill.taxValue?.toString() ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateBill(bill.id, {
        tipType: tipValue ? tipType : null,
        tipValue: tipValue ? parseFloat(tipValue) : null,
        taxType: taxValue ? taxType : null,
        taxValue: taxValue ? parseFloat(taxValue) : null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill", bill.id] }),
  });

  const totalItems = bill.items.reduce((s: number, i: any) => s + i.amount, 0);

  const computedTip =
    tipValue && tipType === "PERCENT"
      ? totalItems * (parseFloat(tipValue) / 100)
      : tipValue
      ? parseFloat(tipValue)
      : 0;
  const computedTax =
    taxValue && taxType === "PERCENT"
      ? totalItems * (parseFloat(taxValue) / 100)
      : taxValue
      ? parseFloat(taxValue)
      : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Tip & Tax</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <AddOnRow
          label="Tip"
          type={tipType}
          value={tipValue}
          computed={computedTip}
          onTypeChange={setTipType}
          onValueChange={setTipValue}
        />
        <AddOnRow
          label="Tax"
          type={taxType}
          value={taxValue}
          computed={computedTax}
          onTypeChange={setTaxType}
          onValueChange={setTaxValue}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save Tip & Tax"}
        </button>
        <button
          onClick={() => {
            setTipValue("");
            setTaxValue("");
            updateBill(bill.id, { tipType: null, tipValue: null, taxType: null, taxValue: null }).then(
              () => qc.invalidateQueries({ queryKey: ["bill", bill.id] })
            );
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function AddOnRow({
  label,
  type,
  value,
  computed,
  onTypeChange,
  onValueChange,
}: {
  label: string;
  type: string;
  value: string;
  computed: number;
  onTypeChange: (v: string) => void;
  onValueChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="PERCENT">%</option>
          <option value="AMOUNT">$</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={type === "PERCENT" ? "e.g. 18" : "e.g. 12.50"}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {value && (
        <p className="text-xs text-gray-400 mt-1">
          = ${computed.toFixed(2)}
        </p>
      )}
    </div>
  );
}
