import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../config/supabaseClient";
import { useSupabaseAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Login.css";

const TICKERS = [
  "TATAPOWER",
  "TCS",
  "RELIANCE",
  "INFY",
  "HDFCBANK",
  "COALINDIA",
  "TATASTEEL",
  "KOTAKBANK",
  "SBIN",
  "ICICIBANK",
  "WIPRO",
  "BHARTIARTL",
  "LT",
  "ITC",
  "AXISBANK",
];

export function Login() {
  const { user, loading } = useSupabaseAuth();

  if (loading) return null;
  if (user) return <Navigate to="/holdings" replace />;

  const redirectUrl = window.location.origin;

  return (
    <div className="signup-background">
      <div className="signup-component">
        <div className="auth-card">
          <div className="auth-card-content">
            <div className="brand-header">
              <img src={logo} alt="DECIXN Logo" className="login-logo" />
              <span className="brand-name italic">DECIXN</span>
              <p className="brand-tagline">Your Personal Market Intelligence</p>
            </div>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
              }}
              providers={[]}
              theme="dark"
              redirectTo={redirectUrl}
            />
          </div>
        </div>
      </div>

      {/* Floating Tickers */}
      <div className="floating-tickers">
        {TICKERS.map((symbol, index) => (
          <div
            key={index}
            className="floating-ticker"
            style={{
              animationDuration: `${Math.random() * 10 + 20}s`,
              top: `${(index * 7) % 100}vh`,
              animationDelay: `-${Math.random() * 20}s`,
            }}
          >
            {symbol}
          </div>
        ))}
      </div>

      <div className="floating-lines">
        {Array.from({ length: 40 }).map((_, index) => (
          <div
            key={index}
            className="floating-line"
            style={{
              animationDuration: `${Math.random() * 10 + 15}s`,
              top: `${Math.random() * 100}vh`,
              left: `${Math.random() * 100}vw`,
              opacity: Math.random() * 0.3,
              animationDelay: `-${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
