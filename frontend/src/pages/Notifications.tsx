import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { Bell, CheckCircle, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function Notifications() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, loading } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
    }
  }, [user, fetchNotifications]);

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    
    // Navigate if metadata has a symbol
    if (notif.metadata?.symbol) {
      navigate(`/stocks/details/${notif.metadata.symbol}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-bold tracking-tight italic">Pulse Feed</h1>
          <p className="text-text-muted mt-1 font-bold text-sm">Real-time intelligence and execution alerts.</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => user && fetchNotifications(user.id)}
             className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-text-muted hover:text-text-bold transition-all cursor-pointer"
           >
             Refresh
           </button>
        </div>
      </header>

      {loading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-xs font-black text-text-muted uppercase tracking-widest">Scanning Network...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] border border-white/5 rounded-[2rem] border-dashed">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-black text-text-bold tracking-tight">System Silent</h2>
          <p className="text-text-muted mt-2 max-w-xs mx-auto text-sm font-medium italic">
            No intelligence updates yet. Set up alerts to populate your feed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative flex items-start gap-5 p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-2xl hover:translate-x-1 ${
                  notif.is_read 
                  ? "bg-[#121212]/50 border-white/5" 
                  : "bg-accent/[0.03] border-accent/20 shadow-lg shadow-accent/5"
                }`}
              >
                {/* Indicator Strip */}
                {!notif.is_read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-accent rounded-r-full shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" />
                )}

                <div className={`p-3 rounded-xl transition-colors ${
                  notif.is_read ? "bg-white/5 text-white/20" : "bg-accent/10 text-accent border border-accent/20"
                }`}>
                  <Bell className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className={`text-base font-black truncate tracking-tight transition-colors ${
                      notif.is_read ? "text-text-muted/80" : "text-text-bold"
                    }`}>
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-black uppercase tracking-widest text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <p className={`mt-1.5 text-sm font-medium leading-relaxed ${
                    notif.is_read ? "text-text-muted/60" : "text-text-muted"
                  }`}>
                    {notif.message}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       {notif.metadata?.symbol && (
                         <span className="text-[10px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 uppercase">
                            {notif.metadata.symbol}
                         </span>
                       )}
                       <span className="text-[10px] font-black text-text-muted hover:text-text-bold transition-colors flex items-center gap-1">
                          View Analysis <ExternalLink className="w-2.5 h-2.5" />
                       </span>
                    </div>
                    {!notif.is_read && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        className="text-[10px] font-black text-accent hover:text-accent/80 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                      >
                         <CheckCircle className="w-3 h-3" /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
