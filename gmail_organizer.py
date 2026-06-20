import os
import sys
import json
import imaplib
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
import re

CONFIG_PATH = r"C:\Users\op-my\Desktop\AI_Landing_Zone\Copy of IMG_0651_Shrunk\Roofing Work\invoice_generator\config.json"
ALLOWED_CONTACTS_PATH = r"C:\Users\op-my\Downloads\allowed_contacts.json"

# Set DRY_RUN = False to execute changes on your live Gmail inbox
DRY_RUN = False

# Max emails to scan in one go
MAX_EMAILS_TO_SCAN = 500

# Boundary datetimes for sorting (timezone-aware)
DATE_JUNE_2024 = datetime(2024, 6, 1, tzinfo=timezone.utc)
DATE_DEC_9_2024 = datetime(2024, 12, 10, tzinfo=timezone.utc)
DATE_MAR_30_2026 = datetime(2026, 3, 31, tzinfo=timezone.utc)

def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_allowed_contacts():
    if os.path.exists(ALLOWED_CONTACTS_PATH):
        with open(ALLOWED_CONTACTS_PATH, 'r', encoding='utf-8') as f:
            return set(json.load(f))
    return set()

def clean_email_address(raw_header):
    if not raw_header:
        return ""
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_header)
    return match.group(0).lower().strip() if match else raw_header.lower().strip()

def decode_header_value(header_val):
    if not header_val:
        return ""
    decoded_parts = decode_header(header_val)
    header_text = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                header_text += part.decode(encoding or 'utf-8', errors='ignore')
            except Exception:
                header_text += part.decode('latin1', errors='ignore')
        else:
            header_text += part
    return header_text

def safe_print(text):
    try:
        print(text)
    except UnicodeEncodeError:
        try:
            print(text.encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8'))
        except Exception:
            print(text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore'))

def get_spam_label(email_date):
    if not email_date:
        return "Spam - Current"
    
    if email_date.tzinfo is None:
        email_date = email_date.replace(tzinfo=timezone.utc)
        
    if email_date < DATE_JUNE_2024:
        return "Spam - Pre June 2024"
    elif email_date < DATE_DEC_9_2024:
        return "Spam - June-Dec 9 2024"
    elif email_date < DATE_MAR_30_2026:
        return "Spam - Dec 10 2024-Mar 30 2026"
    else:
        return "Spam - Current"

def run_organizer():
    config = load_config()
    allowed_contacts = load_allowed_contacts()

    gmail_email = config.get("gmail_email")
    gmail_app_password = config.get("gmail_app_password")

    if not gmail_email or not gmail_app_password:
        safe_print("Error: Gmail credentials missing from config.")
        return

    safe_print("Connecting to Gmail IMAP...")
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(gmail_email, gmail_app_password)
    
    mail.select("INBOX")
    
    status, messages = mail.search(None, "ALL")
    if status != "OK":
        safe_print("Failed to retrieve emails from INBOX.")
        return

    mail_ids = messages[0].split()
    total_emails = len(mail_ids)
    safe_print(f"Total emails in INBOX: {total_emails}")

    mail_ids.reverse()
    emails_to_process = mail_ids[:MAX_EMAILS_TO_SCAN]
    safe_print(f"Scanning the latest {len(emails_to_process)} emails...")

    # Statistics counters
    stats = {
        "protected": 0,
        "note_to_self": 0,
        "whitelisted_contacts": 0,
        "spam_pre_june_2024": 0,
        "spam_june_dec_2024": 0,
        "spam_dec_2024_mar_2026": 0,
        "spam_current": 0
    }

    # Ensure labels exist in live mode
    if not DRY_RUN:
        try:
            mail.create("Protected Evidence")
            mail.create("Notes to Self")
            mail.create("Spam - Pre June 2024")
            mail.create("Spam - June-Dec 9 2024")
            mail.create("Spam - Dec 10 2024-Mar 30 2026")
            mail.create("Spam - Current")
        except Exception:
            pass

    safe_print("\n--- STARTING EMAIL AUDIT (WITH CORRECTED LABELS) ---" + (" [DRY RUN]" if DRY_RUN else " [LIVE EXECUTION]"))
    
    for count, msg_id in enumerate(emails_to_process, 1):
        # Fetch flags, headers, and date
        res, data = mail.fetch(msg_id, "(FLAGS BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)])")
        if res != "OK":
            continue
            
        flags_data = data[0][0]
        is_read = b'\\Seen' in flags_data
        
        msg = email.message_from_bytes(data[0][1])
        
        raw_from = msg.get("From", "")
        raw_to = msg.get("To", "")
        raw_subject = msg.get("Subject", "")
        raw_date = msg.get("Date", "")

        from_addr = clean_email_address(raw_from)
        to_addr = clean_email_address(raw_to)
        subject = decode_header_value(raw_subject)
        
        email_date = None
        if raw_date:
            try:
                email_date = parsedate_to_datetime(raw_date)
            except Exception:
                pass

        # 1. Check Protected List (Emma Ryan emails)
        is_protected = False
        for pattern in ["em.ry", "emma30ryan", "emma.ryan1995", "emmaryan1995", "emma.ryan"]:
            if pattern in from_addr or pattern in to_addr or pattern in clean_email_address(raw_to):
                is_protected = True
                break

        # 2. Check Note to Self (MUST be both from self AND to self to prevent normal inbox sorting issues)
        is_note_to_self = False
        if not is_protected:
            own_patterns = ["placed.sj", "sales.placed.life", "lunacraigcep", "placed.schulz"]
            from_own = any(p in from_addr for p in own_patterns)
            to_own = any(p in to_addr for p in own_patterns)
            if from_own and to_own:
                is_note_to_self = True

        # 3. Check if sender OR receiver is in whitelisted contacts (or matches user-specified names/domains)
        is_whitelisted = False
        if not is_protected and not is_note_to_self:
            # Check if sender is in allowed contacts list
            if from_addr in allowed_contacts:
                is_whitelisted = True
            else:
                # Check if recipient is in allowed contacts list
                for contact in allowed_contacts:
                    if contact in to_addr:
                        is_whitelisted = True
                        break
            
            # Check user-specified custom patterns (domains like @gnb.ca, names like beam, thesea, genier, fd-saintjohn-df)
            if not is_whitelisted:
                contact_patterns = ["@gnb.ca", "beam", "thesea", "genier", "fd-saintjohn-df"]
                for pattern in contact_patterns:
                    if pattern in from_addr or pattern in to_addr:
                        is_whitelisted = True
                        break

        # Apply Decision Logic
        action = ""
        read_status_str = "READ" if is_read else "UNREAD"
        log_line = f"[{count}/{len(emails_to_process)}] [{read_status_str}] From: {from_addr} | Subject: '{subject[:45]}...'"

        if is_protected:
            stats["protected"] += 1
            action = "STAR, LABEL as 'Protected Evidence', and ARCHIVE (Remove from Inbox)"
            if not DRY_RUN:
                mail.store(msg_id, '+FLAGS', '\\Flagged')
                mail.copy(msg_id, '"Protected Evidence"')
                mail.store(msg_id, '+FLAGS', '\\Deleted')
        elif is_note_to_self:
            stats["note_to_self"] += 1
            action = "ARCHIVE to 'Notes to Self' folder"
            if not DRY_RUN:
                mail.copy(msg_id, '"Notes to Self"')
                mail.store(msg_id, '+FLAGS', '\\Deleted')
        elif is_whitelisted:
            stats["whitelisted_contacts"] += 1
            action = "ARCHIVE (Whitelisted Contact)"
            if not DRY_RUN:
                mail.store(msg_id, '+FLAGS', '\\Deleted')
        else:
            # Everything else is considered spam/automated
            spam_label = get_spam_label(email_date)
            
            if "Pre June 2024" in spam_label:
                stats["spam_pre_june_2024"] += 1
            elif "June-Dec 9" in spam_label:
                stats["spam_june_dec_2024"] += 1
            elif "Dec 10 2024" in spam_label:
                stats["spam_dec_2024_mar_2026"] += 1
            else:
                stats["spam_current"] += 1
                
            action = f"ARCHIVE to '{spam_label}'"
            if not DRY_RUN:
                mail.copy(msg_id, f'"{spam_label}"')
                mail.store(msg_id, '+FLAGS', '\\Deleted')

        safe_print(f"{log_line} -> {action}")

    # Expunge all marked deletions from Inbox (this actually archives/removes them from INBOX)
    if not DRY_RUN:
        mail.expunge()

    safe_print("\n--- AUDIT COMPLETE SUMMARY ---")
    safe_print(f"Protected (Starred/Archived):             {stats['protected']}")
    safe_print(f"Notes to Self (Archived/Sorted):          {stats['note_to_self']}")
    safe_print(f"Whitelisted Contacts (Archived):           {stats['whitelisted_contacts']}")
    safe_print(f"Spam - Pre June 2024 (Archived):          {stats['spam_pre_june_2024']}")
    safe_print(f"Spam - June-Dec 9 2024 (Archived):        {stats['spam_june_dec_2024']}")
    safe_print(f"Spam - Dec 10 2024-Mar 30 2026 (Archived): {stats['spam_dec_2024_mar_2026']}")
    safe_print(f"Spam - Current (Archived):                {stats['spam_current']}")
    safe_print("------------------------------")
    if DRY_RUN:
        safe_print("NOTE: This was a DRY RUN. To execute these actions on your live inbox, edit 'gmail_organizer.py' and set DRY_RUN = False.")
    else:
        safe_print("Inbox cleaning execution completed successfully!")

    mail.close()
    mail.logout()

if __name__ == '__main__':
    run_organizer()
