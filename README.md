# 🛠️ Paul's Roofing Management Suite & Invoice Pipeline

An integrated digital workspace, crew time clock, and multi-modal AI invoice parsing pipeline designed to automate administrative tasks for Paul's Roofing.

---

## 🏗️ Architecture Overview

The application consists of two core components working in unison:

1. **React Dashboard Backend & Frontend (`/`)**:
   * A React app running on Express that serves a drag-and-drop invoice editor, a high-fidelity print preview, crew clock-in metrics, and sync options.
   * Leverages a local storage engine synced dynamically with the Python pipeline's state.

2. **Python OCR & Email Automation Daemon (`/Roofing Work/invoice_generator/`)**:
   * Connects to Gmail via IMAP/SMTP to search for estimate emails.
   * Calls Gemini to parse handwritten images or text dictations.
   * Automatically increments invoice numbers and writes details to the shared database.
   * Uses headless Google Chrome to print a beautifully formatted HTML page to a branded PDF.
   * Saves the generated PDF as a draft reply inside your Gmail folder.

---

## ⚡ Quick Start Instructions

### Prerequisites
* **Node.js** (portable version loaded at `C:\Users\op-my\node-portable\node-v20.15.1-win-x64`)
* **Python 3.x**
* **Google Chrome** (installed on local Windows system)

### Run the Dashboard Locally
To start the React + Express Dashboard locally:
1. Open PowerShell and navigate to the project root:
   ```powershell
   cd "C:\Users\op-my\Desktop\AutomateYourBusiness-main"
   ```
2. Build the production bundle:
   ```powershell
   $env:PATH = "C:\Users\op-my\node-portable\node-v20.15.1-win-x64;" + $env:PATH
   npm run build
   ```
3. Start the server:
   ```powershell
   npm run start
   ```
4. Access the suite at: **`http://localhost:3000`**

---

## ✉️ Testing the Email Pipeline

The email sync looks for **unread** messages in the inbox matching either of these parameters:
1. **From Contractor**: Sent by the designated Sender Address Filter (`paulcarey802@gmail.com`).
2. **Generic Keyword**: Any unread email containing the word **"invoice"** (case-insensitive) in the subject line.

### Steps to Run a Live Test:
1. Send an email to the scanner email (`placed.sj@gmail.com`) with the subject **`Invoice`** and attach a photo of a handwritten estimate or a text prompt.
2. Go to **Automation Settings** on the dashboard.
3. Click **"Sync Workspace"**.
4. The dashboard will trigger the Python pipeline, stream transaction logs to the console, and add the newly drafted invoice to your list.
5. Check your **Gmail Drafts folder**—the draft reply with the branded PDF invoice will be waiting for your review!
