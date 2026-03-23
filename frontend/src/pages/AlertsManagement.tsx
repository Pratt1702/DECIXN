import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { getAlerts, deleteAlert, updateAlert } from "../services/api";
import { Bell, Trash2, Power, AlertCircle, ChevronRight, Activity, TrendingUp, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function AlertsManagement() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserAlerts();
    }
  }, [user]);

  const fetchUserAlerts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getAlerts(user.id);
      setAlerts(data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (alertId: string, currentStatus: boolean) => {
    try {
      await updateAlert(alertId, { is_active: !currentStatus });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_active: !currentStatus } : a));
    } catch (error) {
      console.error("Failed to toggle alert:", error);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };

  const getIndicatorIcon = (indicator: string) => {
    if (indicator.includes("rsi")) return <Activity className="w-4 h-4" />;
    if (indicator.includes("macd")) return <TrendingUp className="w-4 h-4" />;
    if (indicator.includes("volume")) return <BarChart2 className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-bold tracking-tight">Active Monitors</h1>
          <p className="text-text-muted mt-1 font-bold text-sm">Manage your intelligent stock alerts and conditions.</p>
        </div>
        <div className="bg-accent/10 border border-accent/20 px-4 py-2 rounded-xl flex items-center gap-3">
          <Bell className="w-5 h-5 text-accent" />
          <span className="text-accent font-black text-sm">{alerts.filter(a => a.is_active).length} Active</span>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-xs font-black text-text-muted uppercase tracking-widest">Syncing Alert Engine...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] border border-white/5 rounded-[2rem] border-dashed">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-black text-text-bold">No Alerts Configured</h2>
          <p className="text-text-muted mt-2 max-w-xs mx-auto text-sm font-medium">
            Go to any stock detail page and click the bell icon to set up intelligent monitoring.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative overflow-hidden bg-[#121212] border transition-all duration-300 rounded-[1.5rem] p-6 ${
                  alert.is_active ? "border-white/10 hover:border-accent/30 shadow-xl" : "border-white/5 opacity-60 grayscale-[0.5]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  {/* Stock Info */}
                  <div 
                    onClick={() => navigate(`/stocks/details/${alert.symbol}`)}
                    className="flex items-center gap-5 cursor-pointer group/item"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-text-bold tracking-tight uppercase group-hover/item:text-accent transition-colors">{alert.symbol}</h3>
                        {!alert.is_active && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-text-muted px-2 py-0.5 rounded-full border border-white/10">Paused</span>
                        )}
                        {alert.is_triggered && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">Triggered</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted font-bold mt-1">
                        Created {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Conditions Display */}
                  <div className="flex-1 min-w-[300px] flex flex-wrap gap-2">
                    {Array.isArray(alert.condition) && alert.condition.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                        {getIndicatorIcon(c.indicator)}
                        <span className="text-xs font-black text-text-bold uppercase tracking-tight">{c.indicator}</span>
                        <span className="text-xs font-bold text-accent">{c.operator}</span>
                        <span className="text-xs font-black text-text-bold">{c.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => !alert.is_triggered && handleToggleActive(alert.id, alert.is_active)}
                      disabled={alert.is_triggered}
                      className={`p-3 rounded-xl border transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                        alert.is_active 
                        ? "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20" 
                        : "bg-white/5 border-white/10 text-text-muted hover:text-text-bold hover:bg-white/10"
                      }`}
                      title={alert.is_triggered ? "Alert completed" : alert.is_active ? "Pause Alert" : "Resume Alert"}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-danger hover:bg-danger/10 hover:border-danger/20 transition-all cursor-pointer active:scale-95"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {alert.triggered_at && (
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                     <p className="text-[11px] font-bold text-text-muted flex items-center gap-2 italic">
                        <AlertCircle className="w-3.5 h-3.5 text-success" />
                        Last satisfied {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                     </p>
                     <button className="text-[11px] font-black text-accent flex items-center gap-1 hover:underline cursor-pointer">
                        View Details <ChevronRight className="w-3 h-3" />
                     </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
