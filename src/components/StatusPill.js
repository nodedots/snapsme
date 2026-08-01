import React from "react";
import { CreditCard, User, Wallet, Building, Camera, Mic, Send, MessageSquare, Edit3 } from "lucide-react";

export const StatusPill = ({
  type,
  value,
  labelOverride,
  showIcon = true,
  size = "md"
}) => {
  if (type === "moneyMovement") {
    const labels = {
      personal_reimbursement: "Personal Reimbursement",
      company_card: "Company Card",
      petty_cash: "Petty Cash",
      supplier_payment: "Supplier Direct"
    };

    const colors = {
      personal_reimbursement: "bg-amber-50 text-amber-800 border-amber-300",
      company_card: "bg-blue-50 text-blue-800 border-blue-300",
      petty_cash: "bg-emerald-50 text-emerald-800 border-emerald-300",
      supplier_payment: "bg-purple-50 text-purple-800 border-purple-300"
    };

    const icons = {
      personal_reimbursement: <User className="w-3 h-3" />,
      company_card: <CreditCard className="w-3 h-3" />,
      petty_cash: <Wallet className="w-3 h-3" />,
      supplier_payment: <Building className="w-3 h-3" />
    };

    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border ${
          size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
        } ${colors[value] || "bg-gray-100 text-gray-800 border-gray-300"}`}
      >
        {showIcon && (icons[value] || <CreditCard className="w-3 h-3" />)}
        <span>{labelOverride || labels[value] || value}</span>
      </span>
    );
  }

  if (type === "source") {
    const labels = {
      manual: "Manual Entry",
      photo: "Photo Receipt",
      voice: "Voice Note",
      telegram: "Telegram Bot",
      whatsapp: "WhatsApp Bot"
    };

    const icons = {
      manual: <Edit3 className="w-3 h-3 text-[#1c1b19]" />,
      photo: <Camera className="w-3 h-3 text-emerald-600" />,
      voice: <Mic className="w-3 h-3 text-purple-600" />,
      telegram: <Send className="w-3 h-3 text-sky-600" />,
      whatsapp: <MessageSquare className="w-3 h-3 text-green-600" />
    };

    return (
      <span
        className={`inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#1c1b19] bg-[#f7f3ea] border border-[#d9d4c8] rounded-md px-2 py-0.5`}
      >
        {showIcon && icons[value]}
        <span>{labelOverride || labels[value] || value}</span>
      </span>
    );
  }

  if (type === "sync") {
    const isSynced = value === "synced";
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 border ${
          isSynced
            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
            : "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isSynced ? "bg-emerald-600" : "bg-amber-500"}`} />
        <span>{isSynced ? "Synced" : "Pending Sync"}</span>
      </span>
    );
  }

  return null;
};
