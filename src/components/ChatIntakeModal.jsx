import React, { useState } from "react";
import { Send, Bot, MessageSquare, ExternalLink, Check, Copy, Camera, ShieldCheck, Sparkles } from "lucide-react";

export const ChatIntakeModal = ({
  currentUser,
  categories,
  onSaveExpense,
  currency
}) => {
  const [activeChannel, setActiveChannel] = useState("telegram");
  const [linkCode, setLinkCode] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Simulated Chat Inbox
  const [messages, setMessages] = useState([
    {
      id: "m1",
      sender: "bot",
      text: "Welcome to SnapSME Chat Bot! Send a receipt photo, a voice note, or text message here to test instant expense logging.",
      time: "10:00 AM"
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");

  const handleGenerateLink = async () => {
    try {
      const res = await fetch("/api/chat/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.userId,
          channel: activeChannel
        })
      });
      const data = await res.json();
      if (data.success) {
        setLinkCode(data.linkCode);
      }
    } catch (err) {
      console.error("Error generating chat link code:", err);
      setLinkCode("849201");
    }
  };

  const handleCopyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(`/link ${linkCode}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    const userText = inputMessage;
    setInputMessage("");

    // Simulate Bot response & automatic expense capture
    setTimeout(() => {
      let vendor = "Merchant";
      let amount = 35.0;

      const amtMatch = userText.match(/(\d+(?:\.\d{1,2})?)/);
      if (amtMatch) amount = parseFloat(amtMatch[1]);

      if (userText.toLowerCase().includes("fuel") || userText.toLowerCase().includes("gas")) {
        vendor = "Shell Station";
      } else if (userText.toLowerCase().includes("lunch") || userText.toLowerCase().includes("food")) {
        vendor = "City Diner";
      } else if (userText.toLowerCase().includes("paper") || userText.toLowerCase().includes("office")) {
        vendor = "Staples Supplies";
      }

      const conversion = convertCurrency(amount, currency, workspaceCurrency || "USD");

      const botReply = {
        id: `b_${Date.now()}`,
        sender: "bot",
        text: `✅ Expense Captured!\n• Vendor: ${vendor}\n• Original: ${getCurrencySymbol(currency)}${amount.toFixed(2)} ${currency}\n• Accounting Ledger: ${getCurrencySymbol(workspaceCurrency || "USD")}${conversion.convertedAmount.toFixed(2)} ${workspaceCurrency || "USD"}\n• Source: ${activeChannel === "telegram" ? "Telegram" : "WhatsApp"}\nSaved to workspace feed instantly!`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botReply]);

      // Automatically save converted amount to main expense feed
      onSaveExpense({
        businessId: currentUser?.businessId || "biz_default",
        submittedBy: currentUser?.userId || "usr_guest",
        submittedByName: currentUser?.displayName || "Guest User",
        submittedByRole: currentUser?.role || "owner",
        amount: conversion.convertedAmount,
        currency: workspaceCurrency || "USD",
        originalAmount: amount,
        originalCurrency: currency,
        exchangeRate: conversion.exchangeRate,
        isConverted: conversion.isConverted,
        vendor,
        categoryId: categories[0]?.id || "cat_general",
        categoryName: categories[0]?.name || "General",
        moneyMovement: "personal_reimbursement",
        date: new Date().toISOString().split("T")[0],
        source: activeChannel,
        aiConfidence: { vendor: 0.88, amount: 0.95, date: 0.80, category: 0.85 },
        correctedFields: [],
        syncStatus: "synced",
        notes: `Logged via ${activeChannel === "telegram" ? "Telegram" : "WhatsApp"} chat bot`
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[#1c1b19] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#0f7a52]" />
            Telegram & WhatsApp Expense Intake Bot
          </h2>
          <p className="text-xs text-[#6b665c]">
            Log expenses without downloading an app. Staff can simply snap photos or text the chat bot on Telegram or WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveChannel("telegram")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeChannel === "telegram"
                ? "bg-sky-500 text-white shadow-2xs"
                : "bg-[#f7f3ea] text-[#6b665c] border border-[#d9d4c8]"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Telegram Bot
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeChannel === "whatsapp"
                ? "bg-green-600 text-white shadow-2xs"
                : "bg-[#f7f3ea] text-[#6b665c] border border-[#d9d4c8]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Bot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Setup & Pairing Box */}
        <div className="bg-white p-5 rounded-xl border border-[#d9d4c8] shadow-sm space-y-4">
          <h3 className="font-display font-bold text-sm text-[#1c1b19] uppercase tracking-wider">
            1. Connect Your Account
          </h3>

          <p className="text-xs text-[#6b665c]">
            Generate a 6-digit pairing code to link your phone number to <strong>{currentUser?.displayName || currentUser?.email || "Guest User"}</strong>.
          </p>

          {!linkCode ? (
            <button
              type="button"
              onClick={handleGenerateLink}
              className="w-full bg-[#0f7a52] hover:bg-[#0b5f40] text-white font-display font-bold text-xs py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" /> Generate 6-Digit Link Code
            </button>
          ) : (
            <div className="bg-[#f7f3ea] p-4 rounded-xl border border-[#d9d4c8] space-y-3 text-center">
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#6b665c] block">
                Pairing Command Code
              </span>
              <div className="font-mono text-2xl font-bold tracking-widest text-[#0f7a52]">
                /link {linkCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="bg-white hover:bg-gray-50 border border-[#d9d4c8] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "Copied!" : "Copy Command"}</span>
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-[#d9d4c8] space-y-2 text-xs text-[#6b665c]">
            <p className="font-semibold text-[#1c1b19]">How staff uses the bot:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>Open @snapsme_bot on Telegram / WhatsApp.</li>
              <li>Send the command code above once.</li>
              <li>Snap receipt photos or type notes anytime.</li>
            </ol>
          </div>
        </div>

        {/* Interactive Simulated Bot Chat Console */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#d9d4c8] shadow-sm flex flex-col h-[450px] overflow-hidden">
          {/* Chat Header */}
          <div className="bg-[#f7f3ea] px-4 py-3 border-b border-[#d9d4c8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0f7a52] text-white flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="font-display font-bold text-xs text-[#1c1b19]">
                  SnapSME {activeChannel === "telegram" ? "Telegram" : "WhatsApp"} Bot Playground
                </p>
                <p className="text-[10px] text-[#0f7a52] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0f7a52] animate-pulse" /> Online & Listening
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#d9d4c8] text-[#6b665c]">
              Interactive Simulation
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f7f3ea]/30">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${
                  m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#0f7a52] text-white rounded-br-xs"
                      : "bg-white text-[#1c1b19] border border-[#d9d4c8] rounded-bl-xs shadow-2xs whitespace-pre-wrap"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-[#6b665c] font-mono mt-0.5 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#f7f3ea] border-t border-[#d9d4c8] flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type e.g. 'Paid $45 for fuel at Shell'..."
              className="flex-1 bg-white border border-[#d9d4c8] text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#0f7a52]"
            />
            <button
              type="submit"
              className="bg-[#0f7a52] hover:bg-[#0b5f40] text-white p-2 rounded-xl shadow-2xs cursor-pointer transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
