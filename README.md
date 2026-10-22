# Bjartheim WhatsApp Bot — BJOHMIERR-V3

## Requirements
- Node.js 20 or newer
- Internet connection
- WhatsApp account for linking the bot

## Run on Windows
1. Extract this ZIP to a normal folder.
2. Open that folder in File Explorer.
3. Click the address bar, type `cmd`, and press Enter.
4. Run:

   ```bat
   npm install
   npm start
   ```

5. Scan the QR code printed in the terminal using WhatsApp → Linked devices → Link a device.

The first successful connection creates an `auth` folder. Keep it private and do not upload it publicly.
The bot must remain running on the computer to stay online. Group moderation commands require the bot to be a group admin, and some commands require the sender to be a group admin.

If QR login fails or Baileys changes its login flow, check the installed Baileys version's current documentation.
