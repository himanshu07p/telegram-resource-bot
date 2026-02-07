# 📚 Study Bot AI

A Telegram bot to organize, manage, and search your study materials (Books, Notes, PYQs, Test Papers).

## 🚀 Features

### 1. File Upload & Organization
Upload any document (PDF, Word, etc.) to the bot. It will ask you to provide details to index it correctly.

**How to usage:**
1. Send a file to the bot.
2. The bot will save it and ask for metadata.
3. Reply with the details in this format:
   ```yaml
   name: Concepts of Physics
   author: HC Verma
   subject: Physics
   year: 2024
   ```
   *(See [METADATA_FORMAT.md](./METADATA_FORMAT.md) for more templates)*

### 2. Powerful Search
Find your files instantly using keywords.

**How to usage:**
- **Direct Search:** Just type `Physics JEE` or `Math Notes`.
- **Command:** Type `/search <query>` (e.g., `/search thermodynamics`).

The bot searches across Title, Subject/Genre, Author, and Exam fields.

### 3. Global Search (Inline Mode)
Search and share files in **any chat** (even groups or with other friends).

**How to usage:**
1. Type `@your_bot_username` followed by a keyword in any chat.
   *Example:* `@studybotai physics`
2. A list of matching files will appear.
3. Tap on a file to send it immediately.

You can also access this via the **"🔍 Search All Files"** button after a regular search.

### 4. Edit Metadata
Made a mistake? You can update file details anytime.

**How to usage:**
1. **Reply** to any file message sent by the bot (or yourself).
2. The bot will enter **Edit Mode**.
3. Send the corrected details.
   *Example: To just change the year, send:*
   ```yaml
   year: 2025
   ```
4. Only the fields you send will be updated.

### 5. Cancel Operation
Stuck in a loop?
- Send `/cancel` to stop any active operation (like uploading or editing).

---

## 🛠 Commands

| Command | Description |
|---------|-------------|
| `/start` | specific welcome message |
| `/search [query]` | Search for files |
| `/formats` | Get copy-paste metadata templates |
| `/cancel` | Cancel current action |

---

## 📋 Metadata Format
The bot understands these fields (case-insensitive):
- `name` / `title`
- `author`
- `genre` / `subject` / `topic`
- `exam`
- `year`
- `edition`
- `semester`

For detailed examples for Books, PYQs, and Notes, see **[METADATA_FORMAT.md](./METADATA_FORMAT.md)**.
# telegram-resource-bot
