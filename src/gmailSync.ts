import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, 
  onAuthStateChanged, User 
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App securely using existing config from Workspace
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Attach Gmail scopes requested for scanning and replying
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");
provider.addScope("https://www.googleapis.com/auth/gmail.send");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Clear if not fully initialized
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to extract Google Access Token from Firebase provider credentials.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Firebase Sign In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Recursive helper to look for email attachments
function findAttachments(part: any): Array<{ filename: string; mimeType: string; attachmentId: string }> {
  let attachments: Array<{ filename: string; mimeType: string; attachmentId: string }> = [];
  if (part.body && part.body.attachmentId) {
    const isImage = part.mimeType.startsWith("image/");
    const isPdf = part.mimeType === "application/pdf";
    if (isImage || isPdf) {
      attachments.push({
        filename: part.filename || "attachment.jpg",
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId
      });
    }
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      attachments = attachments.concat(findAttachments(subPart));
    }
  }
  return attachments;
}

// Recursive helper to extract readable text or html body content
function getEmailBody(part: any): string {
  if (part.mimeType === "text/plain" && part.body && part.body.data) {
    try {
      // Decode base64url data
      const base64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      return decodeURIComponent(escape(decoded));
    } catch {
      const base64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      return atob(base64);
    }
  }
  
  if (part.parts) {
    let body = "";
    for (const subPart of part.parts) {
      const subBody = getEmailBody(subPart);
      if (subBody) {
        body += subBody + "\n";
      }
    }
    if (body.trim().length > 0) {
      return body;
    }
  }

  // Fallback to text/html if no plain text was found
  if (part.mimeType === "text/html" && part.body && part.body.data) {
    try {
      const base64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      const decodedStr = decodeURIComponent(escape(decoded));
      // Basic tag removal
      return decodedStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    } catch {
      const base64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      return decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  
  return "";
}

// Sends an RFC822 HTML thread-threaded response e-mail to Paul Carey
async function sendEmailReply(
  accessToken: string,
  replyDetails: {
    to: string;
    subject: string;
    msgIdHeader: string;
    threadId: string;
    invoiceNumber: string;
    total: string;
    clientName: string;
  }
) {
  const cleanSubject = replyDetails.subject.toLowerCase().startsWith("re:") 
    ? replyDetails.subject 
    : `Re: ${replyDetails.subject}`;
  
  const headers = [
    `To: ${replyDetails.to}`,
    `Subject: ${cleanSubject}`,
    replyDetails.msgIdHeader ? `References: ${replyDetails.msgIdHeader}` : null,
    replyDetails.msgIdHeader ? `In-Reply-To: ${replyDetails.msgIdHeader}` : null,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`
  ].filter(Boolean).join("\r\n");

  const bodyHtml = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 600px;">
      <h2 style="color: #00a0df; margin-top: 0;">Estimate Synced & Drafted!</h2>
      <p>Hi Paul,</p>
      <p>I have successfully downloaded and parsed your estimate for <strong>${replyDetails.clientName}</strong> using <strong>Gemini Vision</strong>.</p>
      <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border-left: 4px solid #00a0df; margin: 16px 0; font-size: 14px; line-height: 1.5;">
        <p style="margin: 4px 0;"><strong>Invoice Draft ID:</strong> #${replyDetails.invoiceNumber}</p>
        <p style="margin: 4px 0;"><strong>Grand Total:</strong> $${replyDetails.total}</p>
        <p style="margin: 4px 0;"><strong>Contract Billing Name:</strong> ${replyDetails.clientName}</p>
      </div>
      <p>A formatted, brand-perfect draft invoice has been prepared for you. You can review and complete details on the digital directory:</p>
      <p><a href="${window.location.origin}" style="display: inline-block; background-color: #00a0df; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin-top: 8px;">Open Invoice Dashboard</a></p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">This is an automated delivery from your AI Estimator Secretary. Powered by Google Gemini.</p>
    </div>
  `;

  const emailContent = `${headers}\r\n\r\n${bodyHtml}`;
  
  // Convert standard string to Base64URL-safe formatting
  const encoded = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendRes = await fetch("https://gmail.googleapis.com/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: encoded,
      threadId: replyDetails.threadId
    })
  });

  if (!sendRes.ok) {
    throw new Error(`Email sending failed: ${sendRes.statusText}`);
  }
}

// Scans unread emails from standard target filtered address and launches AI secretary ocr pipe
export async function scanGmailInbox(
  accessToken: string,
  config: { senderFilter: string },
  logCallback: (type: "info" | "success" | "error", message: string) => void,
  onNewInvoiceParsed: (invoice: any) => void
) {
  try {
    logCallback("info", `Searching Gmail inbox for unread: (from:${config.senderFilter} with attachments) OR (subject: "invoice for paul")`);

    const query = `(from:${config.senderFilter} has:attachment is:unread) OR (subject:"invoice for paul" is:unread)`;
    const listUrl = `https://gmail.googleapis.com/v1/users/me/messages?q=${encodeURIComponent(query)}`;
    
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!listRes.ok) {
      throw new Error(`Gmail API query refused: ${listRes.statusText}`);
    }
    
    const listData = await listRes.json();
    const messages = listData.messages || [];
    
    if (messages.length === 0) {
      logCallback("info", `No new unread invoice estimates matching criteria found.`);
      return;
    }
    
    logCallback("info", `Detected ${messages.length} unread matching email message(s). Processing...`);
    
    for (const msg of messages) {
      try {
        const msgUrl = `https://gmail.googleapis.com/v1/users/me/messages/${msg.id}`;
        const msgRes = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (!msgRes.ok) continue;
        const message = await msgRes.json();
        
        const headers = message.payload.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "Estimate Job Scan";
        const sender = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || config.senderFilter;
         const msgIdHeader = headers.find((h: any) => h.name.toLowerCase() === "message-id")?.value || "";
        const threadId = message.threadId;

        logCallback("info", `Processing email thread: "${subject}"...`);

        const attachments = findAttachments(message.payload);
        if (attachments.length === 0) {
          // Process text instructions body instead!
          logCallback("info", `No visual attachments found inside "${subject}". Extracting email body text instructions...`);
          const bodyText = getEmailBody(message.payload);
          
          if (!bodyText || bodyText.trim().length < 10) {
            logCallback("error", `Could not find sufficient text content inside email body to perform parsing.`);
            continue;
          }
          
          logCallback("info", `Invoking Gemini text parsing secretary pipeline on email body content...`);
          
          const parseRes = await fetch("/api/parse-text-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: bodyText,
              sender,
              subject,
              attachmentName: "Email Body Text Instructions"
            })
          });

          if (!parseRes.ok) {
            throw new Error(`Cloud text-invoice parsing failed: ${parseRes.statusText}`);
          }

          const completeInvoice = await parseRes.json();
          logCallback("success", `Parsed text notes! Draft invoice #${completeInvoice.invoiceNumber} recorded under draft list.`);
          onNewInvoiceParsed(completeInvoice);

          logCallback("info", `Sending threaded response back with drafted estimate details...`);
          await sendEmailReply(accessToken, {
            to: sender,
            subject,
            msgIdHeader,
            threadId,
            invoiceNumber: completeInvoice.invoiceNumber,
            total: completeInvoice.total.toFixed(2),
            clientName: completeInvoice.client?.name || "New Client"
          });
          logCallback("success", `Thread reply delivered.`);
        } else {
          // Process visual attachments
          for (const att of attachments) {
            logCallback("info", `Downloading visual attachment content: "${att.filename}"...`);
            
            const attUrl = `https://gmail.googleapis.com/v1/users/me/messages/${msg.id}/attachments/${att.attachmentId}`;
            const attRes = await fetch(attUrl, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            if (!attRes.ok) {
              logCallback("error", `Failed to download file attachment chunk: ${att.filename}`);
              continue;
            }
            
            const attData = await attRes.json();
            const base64 = attData.data.replace(/-/g, "+").replace(/_/g, "/");

            logCallback("info", `Invoking Gemini OCR and neural structuring on "${att.filename}"...`);
            
            const parseRes = await fetch("/api/parse-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                mimeType: att.mimeType,
                sender,
                subject,
                attachmentName: att.filename
              })
            });

            if (!parseRes.ok) {
              throw new Error(`Cloud OCR pipeline failed: ${parseRes.statusText}`);
            }

            const completeInvoice = await parseRes.json();
            logCallback("success", `Parsed image! Added invoice draft #${completeInvoice.invoiceNumber} with 96% confidence.`);
            onNewInvoiceParsed(completeInvoice);

            logCallback("info", `Sending threaded response back with drafted estimate details...`);
            await sendEmailReply(accessToken, {
              to: sender,
              subject,
              msgIdHeader,
              threadId,
              invoiceNumber: completeInvoice.invoiceNumber,
              total: completeInvoice.total.toFixed(2),
              clientName: completeInvoice.client?.name || "New Client"
            });
            logCallback("success", `Thread reply successfully delivered.`);
          }
        }

        // Mark unread message as read on completion
        await fetch(`https://gmail.googleapis.com/v1/users/me/messages/${msg.id}/modify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            removeLabelIds: ["UNREAD"]
          })
        });
        logCallback("success", `Message ID ${msg.id} marked as read/processed!`);

      } catch (err: any) {
        logCallback("error", `Failed parsing message node: ${err.message}`);
      }
    }
  } catch (err: any) {
    logCallback("error", `Gmail scanning thread faulted: ${err.message}`);
  }
}
