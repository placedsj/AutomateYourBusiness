import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { Invoice } from "../types";
import Logo from '../assets/logo-white.png';
import { Phone, Mail, Award, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface InvoicePreviewProps {
  invoice: Invoice;
  mode?: "invoice" | "quote" | "template";
}

export interface InvoicePreviewHandle {
  generatePDF: () => Promise<void>;
}

export const InvoicePreview = forwardRef<InvoicePreviewHandle, InvoicePreviewProps>(({ invoice, mode = "invoice" }, ref) => {
  const { subtotal, tax, total, balanceDue } = invoice;
  const isTemplate = mode === "template";
  const isQuote = mode === "quote";
  const cardRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    generatePDF: async () => {
      if (!cardRef.current) return;
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    }
  }));

  return (
    <div ref={cardRef} className="invoice-preview-card bg-white text-slate-800 shadow-2xl rounded-2xl w-[8.5in] min-h-[11in] p-10 relative overflow-hidden transition-all duration-300 font-sans leading-snug border border-slate-200">
      
      {/* Decorative accent top/bottom bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#00a0df]" />
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#00a0df]" />

      {/* Decorative top strip */}
      <div className="w-[6.55in] h-1 bg-slate-200 mx-auto mb-6" />

      {/* Brand Header */}
      <header className="grid grid-cols-[1.1fr_0.9fr] h-[1.65in] bg-[#07002f] text-white rounded-lg overflow-hidden">
        {/* Logo Panel */}
        <div className="flex items-center justify-center border-r border-[#000000]/60 p-4">
          <div className="flex flex-col items-center">
            <img src={Logo} alt="Paul's Roofing" className="w-auto h-20 drop-shadow-md" />
            <span className="font-display text-lg font-black tracking-wider uppercase text-white mt-1">Paul's Roofing</span>
          </div>
        </div>

        {/* Invoice Title Panel */}
        <div className="flex items-center justify-end pr-8 text-right">
          {isTemplate ? (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-0.5 font-display">TEMPLATE</h1>
            </div>
          ) : isQuote ? (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-0.5 font-display">QUOTE</h1>
              <div className="text-sm font-semibold tracking-wider text-[#00a0df]/95 font-mono">#{invoice.invoiceNumber || "xxxx"}</div>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-0.5 font-display">INVOICE</h1>
              <div className="text-sm font-semibold tracking-wider text-[#00a0df]/95 font-mono">#{invoice.invoiceNumber || "xxxx"}</div>
            </div>
          )}
        </div>
      </header>

      {/* Company meta and Client stats */}
      <div className="grid grid-cols-2 gap-11 py-7 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-extrabold text-[#07002f] mb-1 font-display">Paul's Roofing</h2>
          <p className="text-sm text-slate-500 mb-0.5">Quispamsis, NB</p>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1.5 h-5">
            <Phone className="w-3.5 h-3.5 text-[#00a0df]" />
            (506) 271-4162
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 h-5">
            <Mail className="w-3.5 h-3.5 text-[#00a0df]" />
            paul@paulroofs.com
          </p>
        </div>

        <div className="grid grid-cols-[105px_1fr] row-gap-1.5 text-sm">
          <span className="text-[#07002f] font-bold">Date:</span>
          <span className="text-slate-600">{invoice.date || "..."}</span>
          
          <span className="text-[#07002f] font-bold">Due Date:</span>
          <span className="text-slate-600">{invoice.dueDate || invoice.date || "..."}</span>
          
          <span className="text-[#07002f] font-bold">Terms:</span>
          <span className="text-slate-600">{invoice.terms || "Upon Completion"}</span>

          {invoice.status && (
            <>
              <span className="text-[#07002f] font-bold">Status:</span>
              <span>
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                  invoice.status === "Paid" 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                  : "bg-amber-50 text-amber-600 border-amber-200"
                }`}>
                  {invoice.status}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Balance Bar */}
      <div className="grid grid-cols-[1fr_auto] items-center my-6 p-4 bg-[#e8f6fd] border border-[#cae8f8] rounded-xl">
        <span className="text-[#006eaa] font-extrabold text-right pr-16 text-base font-display">Balance Due</span>
        <span className="text-[#006eaa] text-2xl font-black font-mono">
          {isTemplate ? "CA$ 0.00" : `CA$${balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </span>
      </div>

      {/* Party Grid */}
      <div className="grid grid-cols-2 gap-11 mb-8">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="text-[#07002f] font-extrabold text-xs uppercase tracking-wider mb-2 font-display">Bill To:</div>
          <div className="font-bold text-slate-800 text-sm mb-1">{invoice.client.name || "Customer Name"}</div>
          <div className="text-xs text-slate-500 leading-relaxed">{invoice.client.address || "Billing address"}</div>
          {invoice.client.phone && (
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 font-mono">
              <Phone className="w-3.5 h-3.5" /> {invoice.client.phone}
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="text-[#07002f] font-extrabold text-xs uppercase tracking-wider mb-2 font-display">Job Address:</div>
          <div className="font-bold text-slate-800 text-sm mb-1">{invoice.client.jobAddress || "Site Location"}</div>
          <div className="text-xs text-slate-500">Quispamsis, NB</div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border border-slate-200 mb-6 text-sm">
        <thead>
          <tr className="bg-[#07002f] text-white">
            <th className="py-2.5 px-4 text-left font-bold border-r border-[#ffffff]/20 font-display">Item / Description</th>
            <th className="py-2.5 px-3 text-center font-bold border-r border-[#ffffff]/20 w-[15%] font-display">Qty</th>
            <th className="py-2.5 px-3 text-right font-bold border-r border-[#ffffff]/20 w-[18%] font-display">Rate</th>
            <th className="py-2.5 px-4 text-right font-bold w-[18%] font-display">Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Default list section title */}
          <tr className="bg-slate-100">
            <td colSpan={4} className="py-2 px-4 font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100/90">
              {isTemplate ? "Work Performed / Materials & Installation" : (invoice.sections[0]?.title || "Work Performed")}
            </td>
          </tr>

          {isTemplate ? (
            <>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-300 italic text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-center text-slate-300 text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-right text-slate-300 font-mono text-xs">&nbsp;</td>
                <td className="py-3 px-4 text-right font-bold text-slate-300 font-mono text-xs">&nbsp;</td>
              </tr>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                <td className="py-3 px-4 text-slate-300 italic text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-center text-slate-300 text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-right text-slate-300 font-mono text-xs">&nbsp;</td>
                <td className="py-3 px-4 text-right font-bold text-slate-300 font-mono text-xs">&nbsp;</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-300 italic text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-center text-slate-300 text-xs">&nbsp;</td>
                <td className="py-3 px-3 text-right text-slate-300 font-mono text-xs">&nbsp;</td>
                <td className="py-3 px-4 text-right font-bold text-slate-300 font-mono text-xs">&nbsp;</td>
              </tr>
            </>
          ) : (
            invoice.sections[0]?.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100 even:bg-slate-50/40">
                <td className="py-3 px-4 font-medium text-slate-800 text-xs">
                  {item.description || "Unidentified Task Item"}
                </td>
                <td className="py-3 px-3 text-center text-slate-500 font-medium text-xs">
                  {item.qty ? `${item.qty} ${item.unit || ""}` : "-"}
                </td>
                <td className="py-3 px-3 text-right text-slate-500 font-mono text-xs">
                  {item.price ? `CA$${item.price.toFixed(2)}` : "-"}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono text-xs">
                  {item.total ? `CA$${item.total.toFixed(2)}` : "-"}
                </td>
              </tr>
            ))
          )}

          {/* Spacer if empty */}
          {!isTemplate && invoice.sections[0]?.items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-slate-400 italic text-center text-xs">No items currently specified.</td>
            </tr>
          )}

          {/* Subtotals & Totals rows */}
          <tr className="border-t-2 border-slate-200">
            <td colSpan={2}></td>
            <td className="py-2 px-3 text-right font-semibold text-slate-500 text-xs border-r border-slate-100">Subtotal</td>
            <td className="py-2 px-4 text-right font-bold text-slate-800 font-mono text-xs">
              {isTemplate ? "CA$ 0.00" : `CA$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </td>
          </tr>
          <tr>
            <td colSpan={2}></td>
            <td className="py-2 px-3 text-right font-semibold text-slate-500 text-xs border-r border-slate-100">HST (15%)</td>
            <td className="py-2 px-4 text-right font-bold text-slate-800 font-mono text-xs">
              {isTemplate ? "CA$ 0.00" : `CA$${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </td>
          </tr>
          <tr className="bg-[#e8f6fd]/60">
            <td colSpan={2}></td>
            <td className="py-3 px-3 text-right font-extrabold text-[#006eaa] text-sm border-r border-[#cae8f8]">TOTAL DUE</td>
            <td className="py-3 px-4 text-right font-black text-[#006eaa] font-mono text-base bg-[#e8f6fd]">
              {isTemplate ? "CA$ 0.00" : `CA$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Extras and Terms */}
      <div className="grid grid-cols-2 gap-14 text-xs leading-relaxed pt-2">
        <div>
          <h3 className="relative font-display font-extrabold text-sm text-[#07002f] mb-4 pb-2 border-b border-cyan-500/20">
            Notes &amp; Additional Work
            <span className="absolute bottom-0 left-0 w-8 h-0.5 bg-[#00a0df]" />
          </h3>
          {isTemplate ? (
            <div className="h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 italic">
              Space for notes / additional work
            </div>
          ) : invoice.extras.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
              {invoice.extras.map((extra, idx) => (
                <li key={idx} className="marker:text-[#00a0df]">{extra}</li>
              ))}
            </ul>
          ) : (
            <p className="italic text-slate-400">No additional work recorded.</p>
          )}

          <div className="mt-6 text-slate-800 font-bold bg-[#e8f6fd]/40 p-2.5 rounded-lg border border-[#cae8f8]/60 inline-flex flex-col gap-0.5">
            <span className="text-[10px] text-[#006eaa] uppercase tracking-wider font-extrabold">E-Transfer Details:</span>
            <span className="text-slate-700 text-xs font-mono select-all">paul@paulroofs.com</span>
          </div>
        </div>

        <div>
          <h3 className="relative font-display font-extrabold text-sm text-[#07002f] mb-4 pb-2 border-b border-cyan-500/20">
            Terms &amp; Warranties
            <span className="absolute bottom-0 left-0 w-8 h-0.5 bg-[#00a0df]" />
          </h3>
          <p className="text-slate-500 mb-2 font-medium">Thank you for choosing Paul's Roofing. We appreciate your Business!</p>
          {(isTemplate || invoice.warranty) && (
            <div className="flex items-center gap-1 text-[#006eaa] font-bold mt-3">
              <Award className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{isTemplate ? "10 YEAR Ltd. WARRANTY on Workmanship" : invoice.warranty}</span>
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-4">
            HST Registration: 716443239 RT0001
          </div>
        </div>
      </div>

    </div>
  );
});
