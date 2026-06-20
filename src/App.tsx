import { useState, useEffect, useRef } from "react";
import { Invoice, CheckIn, AppConfig, PipelineLog, EmailFeedItem } from "./types";
import LogoWhite from './assets/logo-white.png';
import { InvoiceEditor } from "./components/InvoiceEditor";
import { InvoicePreview, InvoicePreviewHandle } from "./components/InvoicePreview";
import { TimeClock } from "./components/TimeClock";
import { PipelineConsole } from "./components/PipelineConsole";
import { 
  Files, Clock, Settings, FileText, Landmark, UserCheck, 
  RefreshCw, CheckCircle, HelpCircle, HardHat, TrendingUp, Trash2 
} from "lucide-react";
import { initAuth, googleSignIn, logout, scanGmailInbox } from "./gmailSync";
import { User } from "firebase/auth";

export default function App() {
  const [activeTab, setActiveTab] = useState<"builder" | "clock" | "pipeline">("builder");
  const [invoiceMode, setInvoiceMode] = useState<"invoice" | "quote" | "template">("template");
  const previewRef = useRef<InvoicePreviewHandle>(null);

  // Core App states loaded from server APIs
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    gmailEmail: "",
    senderFilter: "",
    notionToken: "",
    notionDatabaseId: "",
    lastInvoiceNumber: 1508,
    geminiApiKey: ""
  });
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [emails, setEmails] = useState<EmailFeedItem[]>([]);

  // Current active working invoice in the builder
  const [activeInvoice, setActiveInvoice] = useState<Invoice>({
    id: "",
    invoiceNumber: "",
    date: "",
    dueDate: "",
    terms: "Upon Completion",
    client: { name: "", address: "", jobAddress: "", phone: "", email: "" },
    sections: [{ title: "Materials & Installation", items: [] }],
    extras: [],
    warranty: "10 YEAR Ltd. WARRANTY on Workmanship",
    taxRate: 0.15,
    subtotal: 0,
    tax: 0,
    total: 0,
    balanceDue: 0,
    status: "Draft"
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Google OAuth states
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLiveAutoActive, setIsLiveAutoActive] = useState(false);

  // Initial Load from APIs
  const loadInitialData = async (isFirstLoad = false) => {
    setIsLoading(true);
    try {
      const [invRes, chkRes, cfgRes, logRes, emlRes] = await Promise.all([
        fetch("/api/invoices").then((r) => r.json()),
        fetch("/api/checkins").then((r) => r.json()),
        fetch("/api/config").then((r) => r.json()),
        fetch("/api/logs").then((r) => r.json()),
        fetch("/api/emails").then((r) => r.json())
      ]);

      setInvoices(invRes);
      setCheckins(chkRes);
      setConfig(cfgRes);
      setLogs(logRes);
      setEmails(emlRes);

      // Default the active workspace invoice
      if (isFirstLoad) {
        createNewInvoice(cfgRes.lastInvoiceNumber);
      } else {
        setActiveInvoice((currentActive) => {
          if (currentActive.id) {
            const updated = invRes.find((x: any) => x.id === currentActive.id);
            return updated || currentActive;
          }
          const matches = invRes.find((x: any) => x.invoiceNumber === currentActive.invoiceNumber);
          if (matches) {
            return matches;
          }
          return currentActive;
        });
      }
    } catch (err) {
      console.error("Failed to sync applet with server-side database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData(true);
  }, []);

  const createNewInvoice = (lastNum: number) => {
    const nextNum = String(lastNum + 1);
    setActiveInvoice({
      id: "",
      invoiceNumber: nextNum,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      dueDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      terms: "Upon Completion",
      client: { name: "", address: "", jobAddress: "", phone: "" },
      sections: [
        {
          title: "Materials & Installation",
          items: [
            { description: "Metal roofing installation", qty: 1, unit: "job", price: 0, total: 0 }
          ]
        }
      ],
      extras: [],
      warranty: "10 YEAR Ltd. WARRANTY on Workmanship",
      taxRate: 0.15,
      subtotal: 0,
      tax: 0,
      total: 0,
      balanceDue: 0,
      status: "Draft"
    });
  };

  const handleSelectInvoice = (id: string) => {
    if (id === "new") {
      createNewInvoice(config.lastInvoiceNumber);
    } else {
      const selected = invoices.find((inv) => inv.id === id);
      if (selected) {
        setActiveInvoice(selected);
      }
    }
  };

  const handleSaveInvoice = async () => {
    setIsSavingInvoice(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeInvoice)
      });
      const data = await response.json();
      
      // Update config last invoice number if needed
      const maxInvNum = Math.max(config.lastInvoiceNumber, Number(activeInvoice.invoiceNumber));
      if (maxInvNum !== config.lastInvoiceNumber) {
        const updatedConfig = { ...config, lastInvoiceNumber: maxInvNum };
        await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig)
        });
        setConfig(updatedConfig);
      }

      await loadInitialData();
      alert(data.message || "Invoice synchronized to local database.");
    } catch (err: any) {
      alert("Error saving invoice: " + err.message);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this invoice draft?")) return;

    try {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      await loadInitialData();
      createNewInvoice(config.lastInvoiceNumber);
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  const handleClockIn = async (employeeName: string, jobAddress: string, notes: string) => {
    try {
      const res = await fetch("/api/checkins/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeName, jobAddress, notes })
      });
      const data = await res.json();
      if (res.ok) {
        // Trigger server log insertion
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "info", message: `${employeeName} checked-in at ${jobAddress}.` })
        });
        await loadInitialData();
      } else {
        alert(data.error || "Failed to clock-in.");
      }
    } catch (err: any) {
      alert("Check-in failed: " + err.message);
    }
  };

  const handleClockOut = async (id: string) => {
    try {
      const res = await fetch("/api/checkins/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        // Log transaction
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "info", message: `${data.checkIn.employeeName} clocked-out securely.` })
        });
        await loadInitialData();
      } else {
        alert(data.error || "Failed to clock-out.");
      }
    } catch (err: any) {
      alert("Clock out failed: " + err.message);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setUser(authResult.user);
        setAccessToken(authResult.accessToken);
        
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            type: "success",
            message: `Google Workspace identity linked successfully: ${authResult.user.email}. Live inbox scanner enabled.`
          })
        });
        await loadInitialData();
      }
    } catch (err: any) {
      alert("Authentication failed: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setIsLiveAutoActive(false);
      
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: "info",
          message: "Linked Google account disconnected. Reverting workspace back to simulated offline sandbox mode."
        })
      });
      await loadInitialData();
    } catch (err: any) {
      alert("Disconnect failed: " + err.message);
    }
  };

  const handleTriggerLiveSync = async () => {
    if (!accessToken) return;
    setIsSyncing(true);
    try {
      await scanGmailInbox(
        accessToken,
        { senderFilter: config.senderFilter },
        async (type, msg) => {
          await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              type,
              message: msg
            })
          });
        },
        async (newInv) => {
          setActiveInvoice(newInv);
        }
      );
      await loadInitialData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auth initializer hook
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLiveAutoActive(false);
      }
    );
  }, []);

  // 1-minute background polling for active daily automated pipeline
  useEffect(() => {
    if (!isLiveAutoActive || !accessToken) return;

    // Tick instantly first, then schedule
    handleTriggerLiveSync();

    const interval = setInterval(() => {
      handleTriggerLiveSync();
    }, 60000);

    return () => clearInterval(interval);
  }, [isLiveAutoActive, accessToken, config.senderFilter]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/pipeline/run", { method: "POST" });
      // Add visual processing timer
      setTimeout(async () => {
        await loadInitialData();
        setIsSyncing(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const handleUploadImageOCR = async (imageBase64: string, name: string): Promise<Invoice> => {
    try {
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" })
      });
      const parsedInvoice = await res.json();
      if (res.ok) {
        setActiveInvoice(parsedInvoice);
        await loadInitialData();
        return parsedInvoice;
      } else {
        throw new Error(parsedInvoice.error || "Gemini Parsing Error");
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Metrics calculators
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const outstandingBal = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  const onDutyCount = checkins.filter((c) => c.active).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-center items-center gap-4">
        <RefreshCw className="w-8 h-8 text-[#00a0df] animate-spin" />
        <div className="font-display font-semibold text-xs tracking-widest uppercase text-slate-500">
          Syncing Local Database...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] text-slate-800 min-h-screen flex flex-col antialiased selection:bg-[#00a0df]/10">
      
      {/* 1. Header (Invisible when printing) */}
      <header className="no-print bg-[#07002f] border-b border-[#00a0df] sticky top-0 z-50 px-6 h-16 shrink-0 flex items-center justify-between gap-4 shadow-md">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded">
            <img src={LogoWhite} alt="Paul's Roofing" className="w-auto h-12" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-white leading-none">
              Paul's Roofing
            </h1>
            <p className="text-[10px] text-[#00a0df] uppercase tracking-wider font-extrabold mt-1 font-sans">Management Suite v2.0</p>
          </div>
        </div>

        {/* Tab selection */}
        <nav className="flex gap-8 text-sm font-medium h-full">
          <button
            onClick={() => setActiveTab("builder")}
            className={`relative h-full flex items-center px-1 font-bold text-xs uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === "builder"
                ? "text-[#00a0df] border-[#00a0df]"
                : "text-slate-300 hover:text-[#00a0df] border-transparent"
            }`}
          >
            Invoice Builder
          </button>
          <button
            onClick={() => setActiveTab("clock")}
            className={`relative h-full flex items-center px-1 font-bold text-xs uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === "clock"
                ? "text-[#00a0df] border-[#00a0df]"
                : "text-slate-300 hover:text-[#00a0df] border-transparent"
            }`}
          >
            Crew Time Clock
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`relative h-full flex items-center px-1 font-bold text-xs uppercase tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === "pipeline"
                ? "text-[#00a0df] border-[#00a0df]"
                : "text-slate-300 hover:text-[#00a0df] border-transparent"
            }`}
          >
            Automation Settings
          </button>
        </nav>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live Sync Active</span>
          </div>
        </div>
      </header>
 
      {/* 2. Business metrics ribbon (Invisible when printing) */}
      <section className="no-print bg-white border-b border-slate-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xs">
        
        <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-2xs">
          <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-100 text-[#00a0df]">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Revenue Generated</div>
            <div className="text-[15px] font-black text-[#07002f] font-mono mt-0.5">
              CA${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-2xs">
          <div className="bg-orange-50/80 p-3 rounded-lg border border-orange-100 text-orange-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Outstanding Balances</div>
            <div className="text-[15px] font-black text-[#07002f] font-mono mt-0.5">
              CA${outstandingBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-2xs">
          <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-100 text-emerald-500">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Crew Members</div>
            <div className="text-[15px] font-black text-[#07002f] font-mono mt-0.5 flex items-center gap-1.5">
              {onDutyCount} online
              {onDutyCount > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />}
            </div>
          </div>
        </div>

      </section>

      {/* 3. Primary Workspace Area */}
      <main className="flex-1 p-6">
        {activeTab === "builder" ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
            
            {/* Left side: Invoice Parameters details (Invisible when printing) */}
            <div className="no-print xl:col-span-2 overflow-y-auto space-y-4 max-h-[82vh] pr-1">
              <InvoiceEditor
                invoices={invoices}
                invoice={activeInvoice}
                onChange={setActiveInvoice}
                onSave={handleSaveInvoice}
                onDelete={handleDeleteInvoice}
                onSelectInvoice={handleSelectInvoice}
                isSaving={isSavingInvoice}
              />
            </div>

            {/* Right side: Print Preview Frame */}
            <div className="xl:col-span-3 bg-slate-200 border border-slate-300 p-6 rounded-2xl flex flex-col items-center gap-4 overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300">
              
              <div className="no-print w-full flex justify-between items-center text-slate-600 mb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setInvoiceMode(invoiceMode === 'template' ? 'invoice' : 'template')}
                    className={`px-4 py-2.5 rounded-lg shadow-xs text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                      invoiceMode === 'template' ? "bg-[#00a0df] text-white" : "bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Mode: {invoiceMode.toUpperCase()}
                  </button>
                  <button
                    onClick={() => {
                      if (activeInvoice.id) {
                        handleDeleteInvoice(activeInvoice.id);
                      } else {
                        alert("This is an unsaved draft. Create or load an invoice to delete.");
                      }
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg shadow-xs text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors text-slate-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" /> Remove Draft
                  </button>
                  <button
                    onClick={() => previewRef.current?.generatePDF()}
                    className="bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-lg shadow-xs text-xs font-bold flex items-center gap-2 text-[#00a0df] cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Download PDF
                  </button>
                  <button
                    onClick={() => setInvoiceMode("quote")}
                    className={`px-4 py-2.5 rounded-lg shadow-xs text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                      invoiceMode === "quote" ? "bg-[#00a0df] text-white" : "bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Quote
                  </button>
                </div>
                
                <span className="text-[10px] font-mono uppercase tracking-widest bg-white/50 border border-white/20 px-3 py-1.5 rounded-full font-bold">
                  Preview: {invoiceMode.toUpperCase()} #{activeInvoice.invoiceNumber || "xxxx"}
                </span>
              </div>

              {/* High-Fidelity Invoice container */}
              <div className="w-full overflow-x-auto flex justify-center py-2">
                <InvoicePreview ref={previewRef} invoice={activeInvoice} mode={invoiceMode} />
              </div>
            </div>

          </div>
        ) : activeTab === "clock" ? (
          <TimeClock
            checkins={checkins}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            isLoading={isLoading}
          />
        ) : (
          <PipelineConsole
            config={config}
            logs={logs}
            emails={emails}
            onConfigChange={setConfig}
            onRefreshConfig={loadInitialData}
            onTriggerSync={handleTriggerSync}
            onUploadImage={handleUploadImageOCR}
            isSyncing={isSyncing}
            
            // Gmail Live prop passing
            user={user}
            isLoggingIn={isLoggingIn}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onTriggerLiveSync={handleTriggerLiveSync}
            isLiveAutoActive={isLiveAutoActive}
            onToggleLiveAuto={() => setIsLiveAutoActive(!isLiveAutoActive)}
          />
        )}
      </main>

    </div>
  );
}
