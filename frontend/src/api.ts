import axios from "axios";
import type {
  Bill,
  BillSummary,
  CalculationResult,
  Item,
  Payment,
  Person,
} from "./types";

const api = axios.create({ baseURL: "/api" });

// Bills
export const getBills = () => api.get<BillSummary[]>("/bills").then((r) => r.data);

export const getBill = (id: string) =>
  api.get<Bill>(`/bills/${id}`).then((r) => r.data);

export const createBill = (data: { name: string; description?: string }) =>
  api.post<Bill>("/bills", data).then((r) => r.data);

export const updateBill = (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    tipType: string | null;
    tipValue: number | null;
    taxType: string | null;
    taxValue: number | null;
  }>
) => api.patch<Bill>(`/bills/${id}`, data).then((r) => r.data);

export const deleteBill = (id: string) => api.delete(`/bills/${id}`);

export const calculateBill = (id: string) =>
  api.get<CalculationResult>(`/bills/${id}/calculate`).then((r) => r.data);

// Receipt
export const uploadReceipt = (billId: string, file: File) => {
  const form = new FormData();
  form.append("receipt", file);
  return api.post<{ receiptPath: string }>(`/bills/${billId}/receipt`, form).then((r) => r.data);
};

export const deleteReceipt = (billId: string) =>
  api.delete<Bill>(`/bills/${billId}/receipt`).then((r) => r.data);

// People
export const addPerson = (billId: string, name: string) =>
  api.post<Person>(`/bills/${billId}/people`, { name }).then((r) => r.data);

export const deletePerson = (billId: string, personId: string) =>
  api.delete(`/bills/${billId}/people/${personId}`);

// Items
export const addItem = (
  billId: string,
  data: { name: string; amount: number; description?: string }
) => api.post<Item>(`/bills/${billId}/items`, data).then((r) => r.data);

export const updateItem = (
  billId: string,
  itemId: string,
  data: Partial<{ name: string; amount: number; description: string }>
) => api.patch<Item>(`/bills/${billId}/items/${itemId}`, data).then((r) => r.data);

export const deleteItem = (billId: string, itemId: string) =>
  api.delete(`/bills/${billId}/items/${itemId}`);

export const setItemSplits = (
  billId: string,
  itemId: string,
  splits: Array<{ personId: string; splitType: string; value?: number }>
) =>
  api
    .put<Item>(`/bills/${billId}/items/${itemId}/splits`, { splits })
    .then((r) => r.data);

// Payments
export const addPayment = (
  billId: string,
  data: { personId: string; amount: number; note?: string }
) => api.post<Payment>(`/bills/${billId}/payments`, data).then((r) => r.data);

export const deletePayment = (billId: string, paymentId: string) =>
  api.delete(`/bills/${billId}/payments/${paymentId}`);
