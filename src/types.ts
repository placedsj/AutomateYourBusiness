export interface LineItem {
  description: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface Section {
  title: string;
  items: LineItem[];
}

export interface ClientProfile {
  name: string;
  address: string;
  jobAddress: string;
  phone: string;
  email?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  terms: string;
  client: ClientProfile;
  sections: Section[];
  extras: string[];
  warranty: string;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  balanceDue: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

export interface CheckIn {
  id: string;
  employeeName: string;
  checkInTime: string; // ISO string
  checkOutTime: string | null; // ISO string or null
  jobAddress: string;
  notes: string;
  active: boolean;
}

export interface AppConfig {
  gmailEmail: string;
  senderFilter: string;
  notionToken: string;
  notionDatabaseId: string;
  lastInvoiceNumber: number;
  geminiApiKey: string;
  clientProfiles?: { [key: string]: ClientProfile };
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error";
  message: string;
}

export interface EmailFeedItem {
  id: string;
  sender: string;
  subject: string;
  date: string;
  attachmentName: string;
  ocrConfidence?: number;
  parsedInvoiceNumber?: string;
  status: "parsed" | "pending" | "failed";
}
