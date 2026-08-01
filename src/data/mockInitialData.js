export const INITIAL_WORKSPACE = {
  id: "biz_acme_101",
  name: "Acme Logistics & Trading",
  ownerUid: "usr_owner_alex",
  currency: "USD",
  monthlyBudget: 3000,
  notifyAt80: true,
  notifyAt95: true,
  notificationChannel: "both",
  createdAt: "2026-01-10T08:00:00Z"
};

export const INITIAL_CATEGORIES = [
  {
    id: "cat_fuel",
    businessId: "biz_acme_101",
    name: "Fuel & Transport",
    budget: 650,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "cat_supplies",
    businessId: "biz_acme_101",
    name: "Office Supplies",
    budget: 300,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "cat_meals",
    businessId: "biz_acme_101",
    name: "Meals & Food",
    budget: 250,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "cat_tools",
    businessId: "biz_acme_101",
    name: "Equipment & Tools",
    budget: 500,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "cat_petty",
    businessId: "biz_acme_101",
    name: "Petty Cash Spend",
    budget: 400,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "cat_util",
    businessId: "biz_acme_101",
    name: "Utilities & Bills",
    budget: 450,
    createdAt: "2026-01-10T08:00:00Z"
  }
];

export const INITIAL_MEMBERS = [
  {
    userId: "usr_owner_alex",
    businessId: "biz_acme_101",
    role: "owner",
    displayName: "Alex Rivera (Owner)",
    email: "alex@acmetrading.com",
    phone: "+1 555-0192",
    telegramUserId: "10982341",
    telegramUsername: "@alex_acme",
    joinedAt: "2026-01-10T08:00:00Z",
    avatarColor: "#0f7a52"
  },
  {
    userId: "usr_staff_marcus",
    businessId: "biz_acme_101",
    role: "staff",
    displayName: "Marcus Vance",
    email: "marcus@acmetrading.com",
    phone: "+1 555-0821",
    telegramUserId: "22891044",
    telegramUsername: "@marcus_v",
    joinedAt: "2026-01-12T09:30:00Z",
    avatarColor: "#3b82f6"
  },
  {
    userId: "usr_staff_sarah",
    businessId: "biz_acme_101",
    role: "staff",
    displayName: "Sarah Chen",
    email: "sarah@acmetrading.com",
    phone: "+1 555-0433",
    whatsappUserId: "+15550433",
    joinedAt: "2026-01-15T10:15:00Z",
    avatarColor: "#8b5cf6"
  },
  {
    userId: "usr_staff_david",
    businessId: "biz_acme_101",
    role: "staff",
    displayName: "David Okon",
    email: "david@acmetrading.com",
    phone: "+1 555-0774",
    joinedAt: "2026-01-20T11:00:00Z",
    avatarColor: "#f59e0b"
  }
];

export const INITIAL_EXPENSES = [
  {
    id: "exp_101",
    businessId: "biz_acme_101",
    submittedBy: "usr_staff_marcus",
    submittedByName: "Marcus Vance",
    submittedByRole: "staff",
    amount: 88.50,
    currency: "USD",
    vendor: "Shell Petroleum",
    categoryId: "cat_fuel",
    categoryName: "Fuel & Transport",
    moneyMovement: "company_card",
    date: "2026-08-01",
    source: "photo",
    receiptImageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60",
    aiConfidence: {
      vendor: 0.96,
      amount: 0.98,
      date: 0.92,
      category: 0.94
    },
    correctedFields: [],
    syncStatus: "synced",
    notes: "Diesel refuel for delivery truck #4",
    createdAt: "2026-08-01T08:15:00Z"
  },
  {
    id: "exp_102",
    businessId: "biz_acme_101",
    submittedBy: "usr_staff_sarah",
    submittedByName: "Sarah Chen",
    submittedByRole: "staff",
    amount: 145.20,
    currency: "USD",
    vendor: "Staples Business Center",
    categoryId: "cat_supplies",
    categoryName: "Office Supplies",
    moneyMovement: "personal_reimbursement",
    date: "2026-07-31",
    source: "photo",
    receiptImageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60",
    aiConfidence: {
      vendor: 0.91,
      amount: 0.95,
      date: 0.88,
      category: 0.90
    },
    correctedFields: [],
    syncStatus: "synced",
    notes: "Printer toner, paper reams, and shipping tags",
    createdAt: "2026-07-31T14:22:00Z"
  },
  {
    id: "exp_103",
    businessId: "biz_acme_101",
    submittedBy: "usr_staff_david",
    submittedByName: "David Okon",
    submittedByRole: "staff",
    amount: 42.00,
    currency: "USD",
    vendor: "Corner Market Buka",
    categoryId: "cat_petty",
    categoryName: "Petty Cash Spend",
    moneyMovement: "petty_cash",
    date: "2026-07-31",
    source: "voice",
    voiceTranscript: "Paid 42 dollars cash at Corner Market for team water bottles and ice block for the outdoor job site",
    aiConfidence: {
      vendor: 0.72,
      amount: 0.94,
      date: 0.85,
      category: 0.68
    },
    correctedFields: ["category"],
    syncStatus: "synced",
    notes: "Market vendor had no paper receipt. Voice submission confirmed.",
    createdAt: "2026-07-31T16:05:00Z"
  },
  {
    id: "exp_104",
    businessId: "biz_acme_101",
    submittedBy: "usr_staff_marcus",
    submittedByName: "Marcus Vance",
    submittedByRole: "staff",
    amount: 65.00,
    currency: "USD",
    vendor: "City Transport Express",
    categoryId: "cat_fuel",
    categoryName: "Fuel & Transport",
    moneyMovement: "company_card",
    date: "2026-07-30",
    source: "telegram",
    aiConfidence: {
      vendor: 0.88,
      amount: 0.92,
      date: 0.90,
      category: 0.89
    },
    correctedFields: [],
    syncStatus: "synced",
    notes: "Submitted via Telegram @snapsme_bot photo message",
    createdAt: "2026-07-30T11:40:00Z"
  },
  {
    id: "exp_105",
    businessId: "biz_acme_101",
    submittedBy: "usr_owner_alex",
    submittedByName: "Alex Rivera (Owner)",
    submittedByRole: "owner",
    amount: 210.00,
    currency: "USD",
    vendor: "Industrial Parts Co",
    categoryId: "cat_tools",
    categoryName: "Equipment & Tools",
    moneyMovement: "supplier_payment",
    date: "2026-07-29",
    source: "manual",
    aiConfidence: null,
    correctedFields: [],
    syncStatus: "synced",
    notes: "Replacement hydraulic pump valve",
    createdAt: "2026-07-29T09:10:00Z"
  },
  {
    id: "exp_106",
    businessId: "biz_acme_101",
    submittedBy: "usr_staff_sarah",
    submittedByName: "Sarah Chen",
    submittedByRole: "staff",
    amount: 54.35,
    currency: "USD",
    originalAmount: 50.00,
    originalCurrency: "EUR",
    exchangeRate: 1.087,
    isConverted: true,
    vendor: "Brasserie Le Parisien",
    categoryId: "cat_meals",
    categoryName: "Meals & Food",
    moneyMovement: "company_card",
    date: "2026-07-28",
    source: "photo",
    receiptImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60",
    aiConfidence: { vendor: 0.94, amount: 0.96, date: 0.91, category: 0.90 },
    correctedFields: [],
    syncStatus: "synced",
    notes: "Client dinner - receipt in €50.00 EUR auto-converted to $54.35 USD Default Accounting Currency",
    createdAt: "2026-07-28T13:00:00Z"
  }
];

export const INITIAL_ACTIVITY_LOGS = [
  {
    id: "act_105",
    actorId: "usr_owner_alex",
    actorName: "Alex Rivera",
    actorRole: "owner",
    actionType: "EXPENSE_APPROVED",
    description: "Approved $88.50 Shell Petroleum expense submitted by Marcus Vance",
    timestamp: "2026-08-01T08:20:00Z",
    tag: "Expense Approval"
  },
  {
    id: "act_104",
    actorId: "usr_staff_marcus",
    actorName: "Marcus Vance",
    actorRole: "staff",
    actionType: "EXPENSE_SUBMITTED",
    description: "Submitted $88.50 fuel receipt at Shell Petroleum",
    timestamp: "2026-08-01T08:15:00Z",
    tag: "Expense Captured"
  },
  {
    id: "act_103",
    actorId: "usr_owner_alex",
    actorName: "Alex Rivera",
    actorRole: "owner",
    actionType: "CATEGORY_UPDATED",
    description: "Updated Fuel & Transport category monthly budget to $650",
    timestamp: "2026-07-31T15:10:00Z",
    tag: "Category Change"
  },
  {
    id: "act_102",
    actorId: "usr_owner_alex",
    actorName: "Alex Rivera",
    actorRole: "owner",
    actionType: "MEMBER_INVITED",
    description: "Invited David Okon (david@acmetrading.com) to the workspace as Staff",
    timestamp: "2026-07-20T11:00:00Z",
    tag: "Member Invitation"
  },
  {
    id: "act_101",
    actorId: "usr_owner_alex",
    actorName: "Alex Rivera",
    actorRole: "owner",
    actionType: "WORKSPACE_UPDATED",
    description: "Configured workspace default currency to USD ($)",
    timestamp: "2026-07-10T08:00:00Z",
    tag: "Workspace Config"
  }
];

