import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Login } from "./pages/Login";
import { Holdings } from "./pages/Holdings";
import { Explore } from "./pages/Explore";
import { Insights } from "./pages/Insights";
import { StockDetails } from "./pages/StockDetails";
import { Terminal } from "./pages/Terminal";
import { Watchlist } from "./pages/Watchlist";
import { PortfolioInfo } from "./pages/PortfolioInfo";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/holdings" replace />} />
          <Route path="explore" element={<Explore />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="insights" element={<Insights />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="stock/:ticker" element={<StockDetails />} />
        </Route>
        <Route path="/terminal/:ticker" element={<Terminal />} />
      </Route>

      <Route path="/info/portfolio" element={<PortfolioInfo />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
