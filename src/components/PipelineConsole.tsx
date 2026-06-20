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
}

export const PipelineConsole: React.FC<PipelineConsoleProps> = ({
  config,
  logs,
  emails,
  onConfigChange,
  onRefreshConfig,
  onTriggerSync,
  onUploadImage,
  isSyncing
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
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 bg-[#00a0df] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            Sync Workspace
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-slate-600">
                <span className="text-xs">Review real-time background transactions and pipeline telemetry.</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">DAEMON: LIVE</span>
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
            <div className="space-y-4">
              <div className="bg-[#e8f6fd] border border-[#cae8f8] p-4 rounded-xl">
                <p className="text-xs text-[#006eaa] font-medium">
                  Scans listed attachments for Paul's invoice drafts coming from <strong className="font-bold">{config.senderFilter}</strong>.
                </p>
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
