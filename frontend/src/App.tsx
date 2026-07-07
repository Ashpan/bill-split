import { Routes, Route, Link } from "react-router-dom";
import BillList from "./components/BillList";
import BillDetail from "./components/BillDetail";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
            Bill Split
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<BillList />} />
          <Route path="/bills/:id" element={<BillDetail />} />
        </Routes>
      </main>
    </div>
  );
}
