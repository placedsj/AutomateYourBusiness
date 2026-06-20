import csv
import re
import json
import os

CSV_PATH = r"C:\Users\op-my\Downloads\sent_folder_evidence_log - sent_folder_evidence_log.csv.csv"
OUTPUT_PATH = r"C:\Users\op-my\Downloads\allowed_contacts.json"

# Regular expression to extract email addresses
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

def extract_contacts():
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        return

    allowed_emails = set()
    total_rows = 0

    with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            # Check fields: To, Cc, Bcc
            for field in ['To', 'Cc', 'Bcc']:
                val = row.get(field)
                if val:
                    # Find all email matches in this field
                    matches = EMAIL_REGEX.findall(val)
                    for email in matches:
                        allowed_emails.add(email.lower().strip())

    print(f"Processed {total_rows} rows from sent folder evidence log.")
    print(f"Extracted {len(allowed_emails)} unique contact email addresses.")

    # Save to JSON
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as out_f:
        json.dump(sorted(list(allowed_emails)), out_f, indent=4)
        
    print(f"Allowed contacts list saved to {OUTPUT_PATH}")

if __name__ == '__main__':
    extract_contacts()
