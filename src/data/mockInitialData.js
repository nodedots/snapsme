export const INITIAL_WORKSPACE = {
  id: "biz_acme_101",
  name: "My Workspace",
  ownerUid: "usr_owner_default",
  currency: "USD",
  monthlyBudget: 2500,
  notifyAt80: true,
  notifyAt95: true,
  notificationChannel: "both",
  createdAt: new Date().toISOString()
};

export const INITIAL_CATEGORIES = [
  {
    id: "cat_fuel",
    businessId: "biz_acme_101",
    name: "Fuel & Transport",
    budget: 500,
    createdAt: new Date().toISOString()
  },
  {
    id: "cat_supplies",
    businessId: "biz_acme_101",
    name: "Office Supplies",
    budget: 300,
    createdAt: new Date().toISOString()
  },
  {
    id: "cat_meals",
    businessId: "biz_acme_101",
    name: "Meals & Food",
    budget: 250,
    createdAt: new Date().toISOString()
  },
  {
    id: "cat_tools",
    businessId: "biz_acme_101",
    name: "Equipment & Tools",
    budget: 500,
    createdAt: new Date().toISOString()
  },
  {
    id: "cat_petty",
    businessId: "biz_acme_101",
    name: "Petty Cash Spend",
    budget: 400,
    createdAt: new Date().toISOString()
  },
  {
    id: "cat_util",
    businessId: "biz_acme_101",
    name: "Utilities & Bills",
    budget: 450,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_MEMBERS = [
  {
    userId: "usr_owner_default",
    businessId: "biz_acme_101",
    role: "owner",
    displayName: "Workspace Owner",
    email: "owner@workspace.com",
    phone: "",
    joinedAt: new Date().toISOString(),
    avatarColor: "#0075de"
  }
];

export const INITIAL_EXPENSES = [];

export const INITIAL_ACTIVITY_LOGS = [];
