import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ChatLayout } from "./components/layout/ChatLayout";
import { Login } from "./pages/Login";
import { Holdings } from "./pages/Holdings";
import { Explore } from "./pages/Explore";
import { Insights } from "./pages/Insights";
import { StockDetails } from "./pages/StockDetails";
import { Terminal } from "./pages/Terminal";
import { Watchlist } from "./pages/Watchlist";
import { PortfolioInfo } from "./pages/PortfolioInfo";
import { Chat } from "./pages/Chat";
import { MFHoldings } from "./pages/MFHoldings";
import { MFDetails } from "./pages/MFDetails";
import { MFInsights } from "./pages/MFInsights";
import { MFCompare } from "./pages/MFCompare";
import { AlertsManagement } from "./pages/AlertsManagement";
import { Notifications } from "./pages/Notifications";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/stocks/holdings" replace />} />
          
          {/* Stocks Section */}
          <Route path="stocks">
            <Route index element={<Navigate to="holdings" replace />} />
            <Route path="explore" element={<Explore />} />
            <Route path="holdings" element={<Holdings />} />
            <Route path="insights" element={<Insights />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="alerts" element={<AlertsManagement />} />
            <Route path="details/:ticker" element={<StockDetails />} />
          </Route>

          <Route path="notifications" element={<Notifications />} />

          {/* Mutual Funds Section */}
          <Route path="mutual-funds">
            <Route index element={<Navigate to="holdings" replace />} />
            <Route path="explore" element={<div className="text-center py-20 text-text-muted">MF Explore Coming Soon</div>} />
            <Route path="holdings" element={<MFHoldings />} />
            <Route path="insights" element={<MFInsights />} />
            <Route path="compare" element={<MFCompare />} />
            <Route path="watchlist" element={<div className="text-center py-20 text-text-muted">MF Watchlist Coming Soon</div>} />
            <Route path="details/:id" element={<MFDetails />} />
          </Route>

          {/* Root Redirects */}
          <Route path="mutual-fund/:id" element={<Navigate to="/mutual-funds/details/:id" replace />} />

          {/* Legacy Redirects */}
          <Route path="explore" element={<Navigate to="/stocks/explore" replace />} />
          <Route path="holdings" element={<Navigate to="/stocks/holdings" replace />} />
          <Route path="insights" element={<Navigate to="/stocks/insights" replace />} />
          <Route path="watchlist" element={<Navigate to="/stocks/watchlist" replace />} />
          <Route path="stock/:ticker" element={<Navigate to="/stocks/details/:ticker" replace />} />
        </Route>

        <Route element={<ChatLayout />}>
          <Route path="/chat" element={<Chat />} />
        </Route>

        <Route path="/terminal/:ticker" element={<Terminal />} />
      </Route>

      <Route path="/info/portfolio" element={<PortfolioInfo />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
