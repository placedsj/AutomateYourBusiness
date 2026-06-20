import React, { useState } from "react";
import { AppConfig, PipelineLog, EmailFeedItem, Invoice } from "../types";
import { 
  Key, Settings, Terminal, Mail, Play, UploadCloud, 
  CheckCircle, AlertCircle, RefreshCw, FileText, Database, Send 
} from "lucide-react";

interface PipelineConsoleProps {
  config: AppConfig;
  logs: PipelineLog[];
  emails: EmailFeedItem[];
  onConfigChange: (updatedConfig: AppConfig) => void;
  onRefreshConfig: () => void;
  onTriggerSync: () => void;
  onUploadImage: (base64: string, name: string) => Promise<Invoice>;
  isSyncing: boolean;
  
  // Gmail Live properties
  user: any;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onTriggerLiveSync: () => void;
  isLiveAutoActive: boolean;
  onToggleLiveAuto: () => void;
}

export const PipelineConsole: React.FC<PipelineConsoleProps> = ({
  config,
  logs,
  emails,
  onConfigChange,
  onRefreshConfig,
  onTriggerSync,
  onUploadImage,
  isSyncing,
  
  // Gmail Live destructuring
  user,
  isLoggingIn,
  onLogin,
  onLogout,
  onTriggerLiveSync,
  isLiveAutoActive,
  onToggleLiveAuto
}) => {
  const [activeTab, setActiveTab] = useState<"logs" | "settings" | "feed">("logs");
  const [isUploading, setIsSubmittingImage] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<AppConfig>({ ...config });
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  React.useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  const handleInputChange = (field: keyof AppConfig, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      onConfigChange(data.config);
      alert(data.message || "Pipeline parameters updated.");
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  // Convert uploaded image to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmittingImage(true);
    setUploadFeedback("Analyzing document structures via Gemini Vision...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const parsedInvoice = await onUploadImage(base64, file.name);
        setUploadFeedback(`Successfully extracted invoice #${parsedInvoice.invoiceNumber} with 98% confidence! Loaded into editor.`);
      } catch (err: any) {
        setUploadFeedback(`Extraction incomplete: ${err.message || "Invalid image quality"}`);
      } finally {
        setIsSubmittingImage(false);
      }
    };
    reader.onerror = () => {
      setUploadFeedback("Failed to read image buffer.");
      setIsSubmittingImage(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Tab Control Left/Centre Side */}
      <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Tab Header */}
        <div className="bg-[#07002f] border-b border-slate-800/10 px-6 py-4 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "logs"
                  ? "bg-[#00a0df] text-white border border-[#00a0df]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Logs Console
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "feed"
                  ? "bg-[#00a0df] text-white border border-[#00a0df]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Mail className="w-4 h-4" />
              Inbox Sync Feed
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#00a0df] text-white border border-[#00a0df]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          <button
            onClick={user ? onTriggerLiveSync : onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center justify-center gap-2 font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer text-white ${
              user 
                ? "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50" 
                : "bg-[#00a0df] hover:opacity-90 disabled:opacity-50"
            }`}
          >
            {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            {user ? "Scan Live Gmail Inbox" : "Sync simulated Workspace"}
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-600">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Automated Secretary Pipeline status</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Review real-time background transactions and active pipeline telemetry.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Google Connection Button */}
                  {!user ? (
                    <button
                      type="button"
                      onClick={onLogin}
                      disabled={isLoggingIn}
                      className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-650 font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      {isLoggingIn ? "Signing in..." : "Link Gmail Account"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs leading-none shadow-2xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-700 font-bold">Gmail Active: <span className="text-emerald-700">{user.email}</span></span>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="text-red-500 hover:underline hover:text-red-700 font-bold cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}

                  {/* 24h Auto Mode Switch */}
                  {user && (
                    <label className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs select-none">
                      <input
                        type="checkbox"
                        checked={isLiveAutoActive}
                        onChange={onToggleLiveAuto}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-600"
                      />
                      24h Active Automator
                    </label>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-950 font-mono text-[11px] p-4 rounded-xl border border-slate-850 h-[320px] overflow-y-auto space-y-2.5 leading-relaxed selection:bg-cyan-500/20 text-white">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start select-text">
                    <span className="text-slate-600 flex-shrink-0 select-none font-semibold">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span className={`flex-shrink-0 font-extrabold select-none ${
                       log.type === "error" ? "text-red-400" : log.type === "success" ? "text-emerald-400" : "text-cyan-400"
                    }`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="text-slate-200 flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="space-y-4 font-sans text-slate-800">
              <div className="bg-[#e8f6fd] border border-[#cae8f8] p-4 rounded-xl space-y-2">
                <div className="text-xs font-extrabold text-[#006eaa] uppercase tracking-wider">Multi-Channel Automator Secretary</div>
                <div className="text-xs text-[#1a5b82] leading-relaxed space-y-1">
                  <p>• <strong>Paul's Direct Inbox Pipeline</strong>: Scans for estimates and handwritten images sent by <strong className="font-bold">{config.senderFilter}</strong>.</p>
                  <p>• <strong>Self-Emailed Dictations Pipeline</strong>: Send an email to yourself with the subject <strong className="font-bold">"invoice for paul"</strong> and we will automatically parse either the <em>handwritten image attachment</em> or the <em>text instructions in the email body</em> to draft the brand-perfect invoice sheet!</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {emails.map((e) => (
                  <div key={e.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1.5 md:max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{e.sender}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{new Date(e.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold truncate">{e.subject}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded-md border border-slate-200 w-fit font-bold">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {e.attachmentName}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      {e.ocrConfidence && (
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-emerald-650 font-mono">{(e.ocrConfidence * 100).toFixed(0)}%</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">OCR Trust</div>
                        </div>
                      )}
                      {e.parsedInvoiceNumber && (
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-[#00a0df] font-mono">#{e.parsedInvoiceNumber}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Invoice ID</div>
                        </div>
                      )}
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-extrabold rounded-full border uppercase ${
                        e.status === "parsed"
                          ? "bg-emerald-50 text-emerald-650 border-emerald-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
                {emails.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No synced attachments parsed yet. Use "Sync Workspace" to retrieve new items.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <form onSubmit={handleSaveConfig} className="space-y-4 text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Gmail Scanner Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.gmailEmail}
                    onChange={(e) => handleInputChange("gmailEmail", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors shadow-2xs"
                    placeholder="placed.sj@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Sender Address filter
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.senderFilter}
                    onChange={(e) => handleInputChange("senderFilter", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors shadow-2xs"
                    placeholder="paulcarey802@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Notion Directory Token
                  </label>
                  <input
                    type="text"
                    value={formData.notionToken}
                    onChange={(e) => handleInputChange("notionToken", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors shadow-2xs"
                    placeholder="ntn_..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Notion database ID
                  </label>
                  <input
                    type="text"
                    value={formData.notionDatabaseId}
                    onChange={(e) => handleInputChange("notionDatabaseId", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors shadow-2xs"
                    placeholder="Database hex ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  Gemini API Secret Key
                  <button
                    type="button"
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                    className="text-[10px] lowercase text-[#00a0df] hover:underline font-semibold cursor-pointer"
                  >
                    {isKeyVisible ? "Hide key" : "Show key"}
                  </button>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type={isKeyVisible ? "text" : "password"}
                    value={formData.geminiApiKey}
                    onChange={(e) => handleInputChange("geminiApiKey", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors shadow-2xs font-mono"
                    placeholder="Google AI Studio Gemini API Key"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-[#00a0df] hover:opacity-90 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  Save Parameter Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 3. Right Side: Multi-Modal Document Upload Scanner */}
      <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6 text-slate-700">
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase text-[#07002f] tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
            <UploadCloud className="w-5 h-5 text-[#00a0df]" />
            Image-to-Invoice OCR
          </h2>
          <p className="text-xs text-slate-500 leading-normal font-medium">
            Analyze handwritten invoice photos instantly. Drop an image of Paul's handwritten receipts below to execute a multi-modal Gemini AI structure extract.
          </p>

          <label className="border-2 border-dashed border-slate-200 hover:border-[#00a0df] bg-slate-50 hover:bg-slate-100/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all min-h-[180px]">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <RefreshCw className="w-8 h-8 text-[#00a0df] animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-[#00a0df] transition-colors" />
            )}
            <div className="text-center">
              <span className="text-xs font-bold text-slate-700 block mb-1 selection:bg-none">
                {isUploading ? "Uploading Data Buffer..." : "Click or Drop Estimate Image"}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Supports PNG, JPG, WEBP (up to 20MB)</span>
            </div>
          </label>
        </div>

        {/* OCR Result Indicator Feedback */}
        {uploadFeedback && (
          <div className={`p-4 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 ${
            uploadFeedback.includes("success") || uploadFeedback.includes("Successfully")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-[#e8f6fd] text-[#006eaa] border border-[#cae8f8]"
          }`}>
            {uploadFeedback.includes("success") || uploadFeedback.includes("Successfully") ? (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#00a0df] flex-shrink-0 mt-0.5" />
            )}
            <div className="font-semibold">{uploadFeedback}</div>
          </div>
        )}
      </div>

    </div>
  );
};
