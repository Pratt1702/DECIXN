import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { Holdings } from "./pages/Holdings";
import { Nudges } from "./pages/Nudges";
import { StockDetails } from "./pages/StockDetails";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/nudges" replace />} />
        <Route path="holdings" element={<Holdings />} />
        <Route path="nudges" element={<Nudges />} />
        <Route path="stock/:ticker" element={<StockDetails />} />
      </Route>
    </Routes>
  );
}

export default App;
