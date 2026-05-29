import { ClipboardList, CreditCard, Users, Zap, Trash2, Archive, CreditCard as CardIcon } from "lucide-react";
import { motion } from "framer-motion";

type Tab = "pedidos" | "pagamentos" | "operadores" | "arquivados" | "gateways" | "lixeira" | "cartoes";

interface BottomNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  isAdmin: boolean;
  pedidosCount?: number;
}

const BottomNav = ({ activeTab, onChange, isAdmin, pedidosCount = 0 }: BottomNavProps) => {
  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "pedidos", icon: ClipboardList, label: "Pedidos" },
    { id: "pagamentos", icon: CreditCard, label: "Pagamentos" },
    ...(isAdmin ? [{ id: "operadores" as Tab, icon: Users, label: "Operadores" }] : []),
    { id: "gateways", icon: Zap, label: "Gateway" },
    { id: "lixeira", icon: Trash2, label: "Lixeira" },
    ...(isAdmin ? [{ id: "arquivados" as Tab, icon: Archive, label: "Restaurar" }] : []),
    ...(isAdmin ? [{ id: "cartoes" as Tab, icon: CardIcon, label: "Cartões" }] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      <div
        className="flex justify-center px-3 pb-5 pointer-events-auto"
        style={{ paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))` }}
      >
        <div
          className="flex items-center w-full max-w-[420px] rounded-2xl px-1.5 py-1.5 overflow-x-auto scrollbar-hide"
          style={{
            background: "rgba(15, 15, 15, 0.82)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.08) inset",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="relative flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 py-1.5 px-3 min-w-[56px]"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      boxShadow: "0 0 12px rgba(255,255,255,0.05)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon
                    className={`h-5 w-5 transition-all duration-200 ${
                      isActive ? "text-white" : "text-white/40"
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.6}
                  />
                  {tab.id === "pedidos" && pedidosCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white px-0.5 shadow-sm">
                      {pedidosCount}
                    </span>
                  )}
                </div>
                <span
                  className={`relative z-10 text-[9px] font-medium tracking-wide transition-all duration-200 ${
                    isActive ? "text-white" : "text-white/35"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
