import express, { Request, Response, Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { calculate } from "../lib/calculate";

const router: Router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads";
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// GET /api/bills
router.get("/", async (_req: Request, res: Response) => {
  const bills = await prisma.bill.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { people: true, items: true } },
      items: { select: { amount: true } },
    },
  });

  const result = bills.map((bill) => ({
    id: bill.id,
    name: bill.name,
    description: bill.description,
    createdAt: bill.createdAt,
    peopleCount: bill._count.people,
    itemCount: bill._count.items,
    total: bill.items.reduce((sum, i) => sum + i.amount, 0),
  }));

  res.json(result);
});

// POST /api/bills
router.post("/", async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const bill = await prisma.bill.create({
    data: { name: name.trim(), description: description?.trim() ?? null },
  });
  res.status(201).json(bill);
});

// GET /api/bills/:id
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      people: { orderBy: { name: "asc" } },
      items: {
        orderBy: { name: "asc" },
        include: { splits: { include: { person: true } } },
      },
      payments: {
        orderBy: { amount: "desc" },
        include: { person: true },
      },
    },
  });

  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json(bill);
});

// PATCH /api/bills/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const { name, description, tipType, tipValue, taxType, taxValue } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description?.trim() ?? null;
  if (tipType !== undefined) data.tipType = tipType ?? null;
  if (tipValue !== undefined) data.tipValue = tipValue != null ? parseFloat(tipValue) : null;
  if (taxType !== undefined) data.taxType = taxType ?? null;
  if (taxValue !== undefined) data.taxValue = taxValue != null ? parseFloat(taxValue) : null;

  const bill = await prisma.bill.update({ where: { id }, data });
  res.json(bill);
});

// DELETE /api/bills/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  await prisma.bill.delete({ where: { id } });
  res.status(204).send();
});

// POST /api/bills/:id/receipt
router.post("/:id/receipt", upload.single("receipt"), async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  if (bill.receiptPath) {
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads";
    const oldPath = path.join(uploadDir, path.basename(bill.receiptPath));
    fs.rm(oldPath, () => {});
  }

  const receiptPath = `/uploads/${req.file.filename}`;
  const updated = await prisma.bill.update({ where: { id }, data: { receiptPath } });
  res.json({ receiptPath: updated.receiptPath });
});

// DELETE /api/bills/:id/receipt
router.delete("/:id/receipt", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  if (bill.receiptPath) {
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads";
    const oldPath = path.join(uploadDir, path.basename(bill.receiptPath));
    fs.rm(oldPath, () => {});
  }
  const updated = await prisma.bill.update({ where: { id }, data: { receiptPath: null } });
  res.json(updated);
});

// GET /api/bills/:id/calculate
router.get("/:id/calculate", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      people: true,
      items: { include: { splits: { include: { person: true } } } },
      payments: { include: { person: true } },
    },
  });

  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  res.json(calculate(bill));
});

// POST /api/bills/:id/people
router.post("/:id/people", async (req: Request, res: Response) => {
  const billId = req.params["id"] as string;
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const person = await prisma.person.create({ data: { billId, name: name.trim() } });
  res.status(201).json(person);
});

// DELETE /api/bills/:billId/people/:personId
router.delete("/:billId/people/:personId", async (req: Request, res: Response) => {
  const personId = req.params["personId"] as string;
  await prisma.person.delete({ where: { id: personId } });
  res.status(204).send();
});

// POST /api/bills/:id/items
router.post("/:id/items", async (req: Request, res: Response) => {
  const billId = req.params["id"] as string;
  const { name, amount, description } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }
  const item = await prisma.item.create({
    data: { billId, name: name.trim(), amount: parsedAmount, description: description?.trim() ?? null },
    include: { splits: { include: { person: true } } },
  });
  res.status(201).json(item);
});

// PATCH /api/bills/:billId/items/:itemId
router.patch("/:billId/items/:itemId", async (req: Request, res: Response) => {
  const itemId = req.params["itemId"] as string;
  const { name, amount, description } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (amount !== undefined) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({ error: "Valid amount is required" });
      return;
    }
    data.amount = parsedAmount;
  }
  if (description !== undefined) data.description = description?.trim() ?? null;

  const item = await prisma.item.update({
    where: { id: itemId },
    data,
    include: { splits: { include: { person: true } } },
  });
  res.json(item);
});

// DELETE /api/bills/:billId/items/:itemId
router.delete("/:billId/items/:itemId", async (req: Request, res: Response) => {
  const itemId = req.params["itemId"] as string;
  await prisma.item.delete({ where: { id: itemId } });
  res.status(204).send();
});

// PUT /api/bills/:billId/items/:itemId/splits
router.put("/:billId/items/:itemId/splits", async (req: Request, res: Response) => {
  const itemId = req.params["itemId"] as string;
  const { splits } = req.body as {
    splits: Array<{ personId: string; splitType: "EVEN" | "PERCENT" | "AMOUNT"; value?: number }>;
  };

  if (!Array.isArray(splits)) {
    res.status(400).json({ error: "splits must be an array" });
    return;
  }

  await prisma.$transaction([
    prisma.itemSplit.deleteMany({ where: { itemId } }),
    prisma.itemSplit.createMany({
      data: splits.map((s) => ({
        itemId,
        personId: s.personId,
        splitType: s.splitType,
        value: s.value ?? null,
      })),
    }),
  ]);

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { splits: { include: { person: true } } },
  });
  res.json(item);
});

// POST /api/bills/:id/payments
router.post("/:id/payments", async (req: Request, res: Response) => {
  const billId = req.params["id"] as string;
  const { personId, amount, note } = req.body;
  if (!personId) {
    res.status(400).json({ error: "personId is required" });
    return;
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }
  const payment = await prisma.payment.create({
    data: { billId, personId, amount: parsedAmount, note: note?.trim() ?? null },
    include: { person: true },
  });
  res.status(201).json(payment);
});

// DELETE /api/bills/:billId/payments/:paymentId
router.delete("/:billId/payments/:paymentId", async (req: Request, res: Response) => {
  const paymentId = req.params["paymentId"] as string;
  await prisma.payment.delete({ where: { id: paymentId } });
  res.status(204).send();
});

export default router;
