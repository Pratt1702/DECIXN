from .nse_service import nse_service
from datetime import datetime, timedelta

class AlphaSignalService:
    """
    Consumes real NSE data and transforms it into structured 
    'Alpha' signals for the AI Agent.
    """
    
    @staticmethod
    def get_insider_trades(symbol: str):
        symbol_clean = symbol.upper().replace(".NS", "").replace(".BO", "")
        # Remove any leading/trailing whitespace
        symbol_clean = symbol_clean.strip()
        
        res = nse_service.get_insider_trades(symbol_clean)
        
        if not res.get("success") or not res.get("data"):
            return {"success": False, "message": "No significant insider activity detected."}
        
        # Filter for recent (last 90 days) and high-impact trades
        # Focus on "Promoter" or "Director" buying/selling
        data = res["data"]
        high_impact = []
        cutoff = datetime.now() - timedelta(days=90)
        
        # Limit processing to first 50 items to handle large responses
        for trade in data[:50]: 
            try:
                # NSE dates are often like '30-Mar-2024' or ISO
                # For PIT, it's often 'dateOfAcquisitionFrom'
                trade_date_str = trade.get("dateOfAcquisitionFrom") or trade.get("dateOfAcquisitionTo")
                if trade_date_str:
                    trade_date = datetime.strptime(trade_date_str, "%d-%b-%Y")
                    if trade_date < cutoff: continue
            except: pass # fallback if date format differs

            acq_type = trade.get("acqType", "").upper() # Buy/Sell
            person = trade.get("personCategory", "").upper()
            qty = trade.get("secAcq", 0)
            
            if ("PROMOTER" in person or "DIRECTOR" in person) and qty:
                high_impact.append({
                    "type": acq_type,
                    "person": trade.get("personCategory"),
                    "shares": qty,
                    "date": trade_date_str
                })
        
        if not high_impact:
            return {"success": False, "message": "No high-impact insider trades (Promoter/Director) found in the last 90 days."}
            
        # Select the most recent one for the signal
        top = high_impact[0]
        sentiment = 0.8 if "BUY" in top["type"] or "ACQUI" in top["type"] else -0.6
        
        try:
            shares_val = float(str(top['shares']).replace(',', ''))
        except (ValueError, TypeError):
            shares_val = 0
            
        return {
            "success": True,
            "signal": f"{top['type']} signal by {top['person']}",
            "details": f"{shares_val:,.0f} shares moved on {top['date']}.",
            "sentiment_score": sentiment,
            "source": "NSE PIT Disclosures"
        }

    @staticmethod
    def get_corporate_filings(symbol: str):
        symbol_clean = symbol.upper().replace(".NS", "").replace(".BO", "")
        symbol_clean = symbol_clean.strip()
        
        res = nse_service.get_corporate_announcements(symbol_clean)
        
        if not res.get("success") or not res.get("data"):
            return {"success": False, "message": "Standard regulatory filings only."}
            
        data = res["data"]
        # Priority mapping for different announcement types
        PRIORITY = {
            "dividend": 10,
            "acquisition": 9,
            "amalgamation/merger": 9,
            "outcome of board meeting": 8,
            "buyback": 8,
            "result": 7,
            "guidance": 7,
            "appointment": 5,
            "general updates": 3,
            "esop/esos/esps": 1
        }
        
        impactful = []
        cutoff = datetime.now() - timedelta(days=60)
        
        # Limit processing to first 100 most recent items to find high-impact ones
        for ann in data[:100]:
            try:
                dt_str = ann.get("dt") or ann.get("attchmntDate")
                if dt_str:
                    ann_date = datetime.strptime(dt_str.split()[0], "%d-%b-%Y")
                    if ann_date < cutoff: continue
            except: pass

            desc = ann.get("desc", "").lower()
            text = ann.get("attchmntText", "").lower()
            
            # Calculate priority score
            score = 0
            for kw, p in PRIORITY.items():
                if kw in desc or kw in text:
                    score = max(score, p)
            
            if score > 0:
                impactful.append({
                    "score": score,
                    "title": ann.get("desc"),
                    "details": ann.get("attchmntText"),
                    "date": ann.get("sort_date") or ann.get("an_dt")
                })
        
        if not impactful:
            return {"success": False, "message": "No high-impact announcements found in the last 60 days."}
            
        # Sort by priority score then by date (most recent first)
        impactful.sort(key=lambda x: (x["score"], x["date"]), reverse=True)
        
        # Take the top 3 most impactful
        top_data = impactful[:3]
        
        return {
            "success": True,
            "signals": [
                {
                    "title": item["title"],
                    "summary": item["details"][:250] + ("..." if len(item["details"]) > 250 else ""),
                    "relevance": "High" if item["score"] >= 8 else "Medium"
                }
                for item in top_data
            ]
        }

alpha_service = AlphaSignalService()
