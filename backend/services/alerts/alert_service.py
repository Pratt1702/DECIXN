import pandas as pd
from datetime import datetime
from ..supabase_client import supabase
from ..data_fetcher import fetch_data
from ..technical_indicators import calculate_indicators
from ..signal_generator import generate_signals
from .notification_service import NotificationService

class AlertService:
    @staticmethod
    def evaluate_condition(indicator_value, operator, threshold):
        """
        Helper to evaluate a single condition.
        Supports both numeric and string comparisons.
        """
        try:
            # Handle string indicators (like Trend)
            if isinstance(indicator_value, str):
                target = str(threshold)
                if operator == "==": return indicator_value.lower() == target.lower()
                if operator == "!=": return indicator_value.lower() != target.lower()
                return False

            # Handle numeric indicators
            val = float(indicator_value)
            thresh = float(threshold)
            
            if operator == ">": return val > thresh
            if operator == ">=": return val >= thresh
            if operator == "<": return val < thresh
            if operator == "<=": return val <= thresh
            if operator == "==": return val == thresh
            if operator == "!=": return val != thresh
            return False
        except Exception:
            return False

    @staticmethod
    async def process_all_alerts():
        """
        Main loop to process all active and untriggered alerts.
        Batch processed by symbol.
        """
        try:
            # 1. Fetch active alerts that haven't been triggered yet
            # Note: We use is_active=True and is_triggered=False
            res = supabase.table("alerts")\
                .select("*")\
                .eq("is_active", True)\
                .eq("is_triggered", False)\
                .execute()
            
            alerts = res.data
            if not alerts:
                print("No active alerts to process.")
                return

            # 2. Group alerts by symbol
            symbol_map = {}
            for alert in alerts:
                symbol = alert["symbol"].upper()
                if symbol not in symbol_map:
                    symbol_map[symbol] = []
                symbol_map[symbol].append(alert)

            # 3. Process each symbol
            for symbol, symbol_alerts in symbol_map.items():
                print(f"DEBUG: Processing group for {symbol} ({len(symbol_alerts)} alerts)")
                
                # Check if we need .NS or .BO suffix for Yahoo Finance
                yf_symbol = symbol
                if not ("." in symbol):
                    # Try .NS first (NSE is more common for indices/stocks in this app)
                    yf_symbol = f"{symbol}.NS"

                # Fetch data for this symbol once
                df = fetch_data(yf_symbol, period="1y") 
                if df is None or df.empty:
                    print(f"DEBUG: Failed to fetch data for {yf_symbol}")
                    continue
                
                # Calculate indicators
                df_with_indicators = calculate_indicators(df)
                signals = generate_signals(df_with_indicators)
                
                current_price = signals.get("Price", df['Close'].iloc[-1])
                print(f"DEBUG: {symbol} Current Price: {current_price}")

                # Evaluation context
                context = {
                    "price": current_price,
                    "rsi": signals.get("RSI"),
                    "volume_ratio": signals.get("Volume_Ratio"),
                    "trend": signals.get("Trend"),
                    "signal": signals.get("Signal"),
                    "pattern": signals.get("Pattern"),
                    "dist_ma20": signals.get("Dist_MA20"),
                    "dist_ma50": signals.get("Dist_MA50"),
                    "macd": signals.get("MACD", {}).get("MACD_Line"),
                    "macd_signal": signals.get("MACD", {}).get("Signal_Line"),
                    "macd_hist": signals.get("MACD", {}).get("Histogram"),
                }
                print(f"DEBUG: Context for {symbol}: {context}")

                for alert in symbol_alerts:
                    conditions = alert.get("condition", [])
                    if not isinstance(conditions, list):
                        conditions = [conditions]
                    
                    if not conditions:
                        continue

                    all_satisfied = True
                    triggered_details = []

                    print(f"DEBUG: Checking Alert ID {alert['id']} for {symbol}")
                    for cond in conditions:
                        indicator = cond.get("indicator", "").lower()
                        operator = cond.get("operator")
                        threshold = cond.get("value")
                        
                        current_val = context.get(indicator)
                        
                        satisfied = AlertService.evaluate_condition(current_val, operator, threshold)
                        print(f"DEBUG:   {indicator}: {current_val} {operator} {threshold} -> {satisfied}")

                        if not satisfied:
                            all_satisfied = False
                            break
                        
                        val_display = f"{current_val:.2f}" if isinstance(current_val, (int, float, complex)) else str(current_val)
                        triggered_details.append(f"{indicator.upper()} {operator} {threshold} (Current: {val_display})")

                    if all_satisfied:
                        # TRIGGER ALERT!
                        print(f"DEBUG: !!! TRIGGERED !!! {symbol} for User {alert['user_id']}")
                        
                        # Create notification
                        msg = f"Your alert for {symbol} was triggered: " + ", ".join(triggered_details)
                        
                        # Ensure context metadata is JSON serializable (convert numpy types)
                        serializable_context = {}
                        for k, v in context.items():
                            if hasattr(v, 'item'): # numpy types
                                serializable_context[k] = v.item()
                            else:
                                serializable_context[k] = v

                        NotificationService.create_notification(
                            user_id=alert["user_id"],
                            title=f"Alert: {symbol} Conditions Met",
                            message=msg,
                            notif_type="ALERT",
                            metadata={
                                "symbol": symbol,
                                "alert_id": alert["id"],
                                "triggered_values": serializable_context
                            }
                        )

                        # Update alert state (Mark as triggered AND deactivate as per new requirement)
                        supabase.table("alerts").update({
                            "is_triggered": True,
                            "is_active": False,
                            "triggered_at": datetime.now().isoformat()
                        }).eq("id", alert["id"]).execute()

        except Exception as e:
            print(f"Error in process_all_alerts: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(AlertService.process_all_alerts())
