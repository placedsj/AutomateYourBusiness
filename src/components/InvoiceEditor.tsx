import React from "react";
import { Invoice, ClientProfile, Section, LineItem } from "../types";
import { Plus, Trash2, Save, FileText, ChevronDown, RefreshCw } from "lucide-react";

interface InvoiceEditorProps {
  invoices: Invoice[];
  invoice: Invoice;
  onChange: (updatedInvoice: Invoice) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onSelectInvoice: (id: string) => void;
  isSaving: boolean;
  clientProfiles?: { [key: string]: ClientProfile };
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoices,
  invoice,
  onChange,
  onSave,
  onDelete,
  onSelectInvoice,
  isSaving,
  clientProfiles
}) => {
  const handleClientChange = (field: keyof ClientProfile, value: string) => {
    onChange({
      ...invoice,
      client: {
        ...invoice.client,
        [field]: value
      }
    });
  };

  const handleMetadataChange = (field: keyof Invoice, value: any) => {
    onChange({
      ...invoice,
      [field]: value
    });
  };

  // Preset client mapping to easily pre-fill values
  const CLIENT_PRESETS: { [key: string]: ClientProfile } = (clientProfiles && Object.keys(clientProfiles).length > 0) ? clientProfiles : {
    roy: {
      name: "Roy Swazey's Roofing",
      address: "140 Renshaw Road, Rothesay, NB E2H 1R6",
      jobAddress: "12 Fieldcrest, Quispamsis, NB",
      phone: "(506) 273-1609",
      email: "roy.swazey@roofing.ca"
    },
    josh: {
      name: "Joshua Sterling",
      address: "41 Bayside Drive, Saint John, NB",
      jobAddress: "41 Bayside Drive, Saint John, NB",
      phone: "(506) 438-2910",
      email: "josh.sterling@gmail.com"
    }
  };

  const handleApplyPreset = (key: string) => {
    if (key && CLIENT_PRESETS[key]) {
      onChange({
        ...invoice,
        client: {
          name: CLIENT_PRESETS[key].name || "",
          address: CLIENT_PRESETS[key].address || "",
          jobAddress: CLIENT_PRESETS[key].jobAddress || CLIENT_PRESETS[key].address || "",
          phone: CLIENT_PRESETS[key].phone || "",
          email: CLIENT_PRESETS[key].email || ""
        }
      });
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...invoice.sections[0].items];
    const item = { ...updatedItems[index] };

    if (field === "qty" || field === "price") {
      const numVal = value === "" ? 0 : parseFloat(value);
      item[field] = isNaN(numVal) ? 0 : numVal;
      item.total = item.qty * item.price;
    } else {
      (item as any)[field] = value;
    }

    updatedItems[index] = item;

    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, it) => sum + (it.total || 0), 0);
    const tax = subtotal * invoice.taxRate;
    const total = subtotal + tax;

    onChange({
      ...invoice,
      sections: [{ ...invoice.sections[0], items: updatedItems }],
      subtotal,
      tax,
      total,
      balanceDue: total
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      description: "",
      qty: 1,
      unit: "sq",
      price: 0,
      total: 0
    };
    const updatedItems = [...invoice.sections[0].items, newItem];
    onChange({
      ...invoice,
      sections: [{ ...invoice.sections[0], items: updatedItems }]
    });
  };

  const deleteLineItem = (index: number) => {
    const updatedItems = invoice.sections[0].items.filter((_, i) => i !== index);
    const subtotal = updatedItems.reduce((sum, it) => sum + (it.total || 0), 0);
    const tax = subtotal * invoice.taxRate;
    const total = subtotal + tax;

    onChange({
      ...invoice,
      sections: [{ ...invoice.sections[0], items: updatedItems }],
      subtotal,
      tax,
      total,
      balanceDue: total
    });
  };

  const handleNotesChange = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    onChange({
      ...invoice,
      extras: lines
    });
  };

  return (
    <div className="flex flex-col gap-6 text-slate-700">
      
      {/* Invoice Selector */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-display">
          Select or Create Invoice
        </label>
        <div className="flex gap-2">
          <select
            id="invoice-selector"
            value={savedListIndex(invoices, invoice)}
            onChange={(e) => onSelectInvoice(e.target.value)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-colors cursor-pointer"
          >
            <option value="new">+ Create New Invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                #{inv.invoiceNumber} — {inv.client.name || "Untitled Client"} ({inv.status})
              </option>
            ))}
          </select>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-[#00a0df] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-4 rounded-lg shadow-xs transition-opacity cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
          {invoice.id && (
            <button
              onClick={() => onDelete(invoice.id)}
              className="text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 hover:bg-red-50/50 px-2.5 rounded-lg transition-colors cursor-pointer"
              title="Delete draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Profile Presets */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-display">
          Quick-Fill Client Profile
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CLIENT_PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className="flex-1 min-w-[120px] bg-[#e8f6fd] hover:bg-[#cae8f8]/55 text-xs font-bold text-[#006eaa] py-2.5 px-3 rounded-lg border border-[#cae8f8]/70 transition-colors cursor-pointer text-center truncate"
              title={CLIENT_PRESETS[key].name}
            >
              {CLIENT_PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Meta */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl text-slate-700 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#00a0df] flex items-center gap-2 font-display uppercase tracking-wide">
          <FileText className="w-4 h-4" /> Invoice Details
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoice.invoiceNumber}
              onChange={(e) => handleMetadataChange("invoiceNumber", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="e.g. 1494"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Date</label>
            <input
              type="text"
              value={invoice.date}
              onChange={(e) => handleMetadataChange("date", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="June 19, 2026"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Terms</label>
            <input
              type="text"
              value={invoice.terms}
              onChange={(e) => handleMetadataChange("terms", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="Upon Completion"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
            <select
              value={invoice.status}
              onChange={(e) => handleMetadataChange("status", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs cursor-pointer"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#07002f] font-display">Client Info</h4>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Client / Business Name</label>
            <input
              type="text"
              value={invoice.client.name}
              onChange={(e) => handleClientChange("name", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="e.g. Roy Swazey's Roofing"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Billing Address</label>
            <input
              type="text"
              value={invoice.client.address}
              onChange={(e) => handleClientChange("address", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="Rothesay, NB"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Contact Phone</label>
            <input
              type="text"
              value={invoice.client.phone}
              onChange={(e) => handleClientChange("phone", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="(506) 273-1609"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">Job / Site Address</label>
            <input
              type="text"
              value={invoice.client.jobAddress}
              onChange={(e) => handleClientChange("jobAddress", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] focus:ring-1 focus:ring-[#00a0df] transition-all shadow-2xs"
              placeholder="12 Fieldcrest"
            />
          </div>
        </div>
      </div>

      {/* Line Items Editor */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-sm font-extrabold text-[#00a0df] font-display uppercase tracking-wide">Estimate List</h3>
          <button
            onClick={addLineItem}
            className="text-[11px] bg-[#e8f6fd] hover:bg-[#cae8f8]/60 text-[#006eaa] border border-[#cae8f8] px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            + Add Row
          </button>
        </div>
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {invoice.sections[0].items.map((item, index) => (
            <div key={index} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 space-y-3 relative transition-all duration-200 hover:border-slate-300 hover:bg-slate-50">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Task Description (e.g., Metal install - 6/12 pitch)"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00a0df] transition-all shadow-2xs"
                />
                <button
                  onClick={() => deleteLineItem(index)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Qty</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={item.qty || ""}
                    onChange={(e) => updateLineItem(index, "qty", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-center text-slate-700 focus:outline-none focus:border-[#00a0df]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Unit</label>
                  <input
                    type="text"
                    placeholder="sq / ft"
                    value={item.unit}
                    onChange={(e) => updateLineItem(index, "unit", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-center text-slate-700 focus:outline-none focus:border-[#00a0df]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Price ($)</label>
                  <input
                    type="number"
                    placeholder="210"
                    value={item.price || ""}
                    onChange={(e) => updateLineItem(index, "price", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-right text-slate-700 focus:outline-none focus:border-[#00a0df]"
                  />
                </div>
              </div>
            </div>
          ))}
          {invoice.sections[0].items.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No list items defined. Click "+ Add Row" to begin.
            </p>
          )}
        </div>
      </div>

      {/* Extras and Notes */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4 font-sans text-slate-700">
        <h3 className="text-sm font-extrabold text-[#00a0df] border-b border-slate-100 pb-2 font-display uppercase tracking-wide">
          Additional Work performed
        </h3>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Add-ons list (one description per line)
          </label>
          <textarea
            value={invoice.extras.join("\n")}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
            placeholder="e.g.&#10;Cut 80' ridge vent&#10;Selkirk chimney"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] font-mono resize-none leading-relaxed shadow-2xs"
          ></textarea>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Workmanship Warranty</label>
          <input
            type="text"
            value={invoice.warranty}
            onChange={(e) => handleMetadataChange("warranty", e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] shadow-2xs"
            placeholder="10 YEAR Ltd. WARRANTY on Workmanship"
          />
        </div>
      </div>

    </div>
  );
};

// Helper to determine selector index
function savedListIndex(invoices: Invoice[], invoice: Invoice) {
  const matching = invoices.find((inv) => inv.id === invoice.id);
  return matching ? invoice.id : "new";
}
