import { useState } from "react";
import { useMFProfileStore } from "../../store/useMFProfileStore";
import { motion } from "framer-motion";
import { User, Target, Brain, Calendar, ArrowRight } from "lucide-react";

export function MFProfileForm({ onComplete }: { onComplete: () => void }) {
  const { profile, setProfile } = useMFProfileStore();
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface border border-border-main rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
      >
        {/* Aesthetic Background Accents */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <User size={120} />
        </div>

        <div className="p-8 space-y-6 relative z-10">
          <header className="space-y-1">
            <h2 className="text-xl font-black text-text-bold tracking-tight uppercase italic">Build Your Profile</h2>
            <p className="text-text-muted text-[11px] font-medium tracking-wide">
              Tell us a bit about yourself to personalize your Mutual Fund insights.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <User size={10} /> Age
                </label>
                <input 
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-text-bold focus:border-accent/40 outline-none transition-all"
                  placeholder="Ex: 25"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={10} /> Horizon
                </label>
                <select 
                  value={formData.horizon}
                  onChange={(e) => setFormData({...formData, horizon: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-text-bold focus:border-accent/40 outline-none transition-all appearance-none"
                >
                  <option className="bg-bg-surface">Short Term (1-3 Years)</option>
                  <option className="bg-bg-surface">Medium Term (3-7 Years)</option>
                  <option className="bg-bg-surface">Long Term (7+ Years)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Brain size={10} /> Risk Appetite
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Conservative", "Balanced", "Aggressive"].map((risk) => (
                    <button
                      key={risk}
                      type="button"
                      onClick={() => setFormData({...formData, riskAppetite: risk as any})}
                      className={`px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                        formData.riskAppetite === risk 
                        ? 'bg-accent/10 border-accent/30 text-accent' 
                        : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/10'
                      }`}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Target size={10} /> Primary Goal
                </label>
                <select 
                  value={formData.investmentGoal}
                  onChange={(e) => setFormData({...formData, investmentGoal: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-text-bold focus:border-accent/40 outline-none transition-all appearance-none"
                >
                  <option className="bg-bg-surface">Wealth Creation</option>
                  <option className="bg-bg-surface">Retirement</option>
                  <option className="bg-bg-surface">Education</option>
                  <option className="bg-bg-surface">House</option>
                  <option className="bg-bg-surface">Travel</option>
                  <option className="bg-bg-surface">Emergency Fund</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-accent text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Initialize Engine <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
