# 📄 Metadata Format Guide

When you upload a file to the Study Bot, you will be asked to provide information about it. This guide shows you the best format to use for different types of documents.

You can copy and paste these templates and fill in the details.

## ✅ General Format
You can use any of these keys. Keys are **case-insensitive**.

```
name: [Document Name]
author: [Author/Professor]
subject: [Subject/Topic]
exam: [Exam Name]
year: [Year]
edition: [Edition]
semester: [Semester]
```

---

## 🍵 Books
For textbooks and reference books.

**Template:**
```
name: Concepts of Physics Vol 1
author: HC Verma
subject: Physics
year: 2024
edition: 5th Edition
```

**Key Fields:**
- `name`: Book title
- `author`: Writer name
- `edition`: (Optional) e.g., 2nd Ed, Revised

---

## 🎓 Test Papers / Mock Tests / PYQs
For coaching test papers or practice exams.

**Template:**
```
name: Full Syllabus Mock Test 1
subject: Mathematics
exam: JEE Advanced
year: 2025
author: Allen Career Institute
```

**Key Fields:**
- `exam`: The target exam (JEE, NEET, UPSC, etc.)
- `author`: The coaching institute or source

---

## ✨ Notes / Handwritten Notes
For personal or shared notes.

**Template:**
```
name: Fluid Mechanics Handwritten Notes
subject: Physics
semester: 2nd Semester
author: Topper Notes
```

**Key Fields:**
- `semester`: Useful for college students
- `subject`: The specific topic covered

---

## 🌙 Novels / General Books
For fiction, non-fiction, biographies, etc.

**Template:**
```
name: Atomic Habits
author: James Clear
genre: Self-Help
year: 2018
```

**Key Fields:**
- `genre`: The category (Sci-Fi, Biography, Thriller, etc.)
- `name`: Book title

---

## 💡 Tips
1. **Shortcuts:** You don't need to type the full key name.
   - `name` can be `title`, `doc`
   - `exam` can be `test`
   - `year` can be `yr`
   - `semester` can be `sem`
   
2. **Order doesn't matter:** You can write the lines in any order.
3. **Skip checks:** If you don't have info for a field (like edition), just leave it out.
