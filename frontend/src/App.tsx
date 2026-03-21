import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { Holdings } from "./pages/Holdings";
import { Insights } from "./pages/Insights";
import { StockDetails } from "./pages/StockDetails";
import { Terminal } from "./pages/Terminal";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/insights" replace />} />
        <Route path="holdings" element={<Holdings />} />
        <Route path="insights" element={<Insights />} />
        <Route path="stock/:ticker" element={<StockDetails />} />
      </Route>
      <Route path="/terminal/:ticker" element={<Terminal />} />
    </Routes>
  );
}

export default App;
