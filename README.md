# WordWise – Your AI-Powered Writing Companion

**Helping students craft clear, compelling documents with real-time, AI-driven guidance.**

## 🌟 Why WordWise?
Class essays, research papers, scholarship applications – students write a *lot*, yet most free tools only catch basic typos.  WordWise gives you a personal writing coach who:

1. Spots mistakes **while you type** (not after you hit *submit*).
2. Explains *why* a change helps, so every edit is a mini-lesson.
3. Stays in one tidy dashboard where you can create, organise, and revisit every document you craft.

The result?  More confident writers and better grades – without the pricey subscriptions.

---

## ✨ Core Features

| ⚙️  Feature | ✍️  What it Does | 🤩  Why You'll Love It |
|------------|-----------------|-----------------------|
| **Style-Assisted Corrections** | AI suggests tone-perfect rewrites (casual, professional, persuasive) and highlights wordy phrasing. | Instantly adapt your voice to any assignment without second-guessing your wording. |
| **Readability Score** | One-click grade-level & clarity score (Flesch-Kincaid inspired) with colour-coded bars. | See at a glance if your paper is easily understood by your target audience. |
| **AI-Powered Feedback** | Press *Generate Feedback* to receive paragraph-level praise & actionable tips. | Like having a teacher's margin notes – minus the waiting. |
| **Live Spelling, Grammar & Punctuation Checks** | Combines LanguageTool with GPT hints to find even tricky errors as you type. | Fix issues *before* they snowball into lost marks. |
| **Document Manager** | Create, rename, filter, archive or delete docs in seconds. | Keep essays, lab reports and notes neatly organised instead of buried in 'final_final.docx'. |
| **Secure Account Auth** | Email-based sign-up/login backed by Firebase. | Your work stays private and synced – edit anywhere, any time. |

---

## 🎯 Project Goal
> **To provide a powerful AI writing tool for students who struggle to find advanced, guided assistance for focused writing tasks.**  
> WordWise makes expert-level coaching accessible, turning every assignment into an opportunity to *learn* as well as *score higher*.

---

## 🚀 Getting Started

```bash
pnpm install     # or yarn / npm
pnpm dev         # local development at http://localhost:3000
```

Environment variables you'll need (see `.env.example`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- *(others for Firestore & Storage)*

---

## 🗺️  Tech Stack
- **Next.js 14 / React 18**
- **TypeScript & TailwindCSS**
- **TipTap** rich-text editor
- **Firebase** (Auth + Firestore)
- **OpenAI GPT-4o** for advanced analysis
- **LanguageTool** for rule-based grammar spotting

---

## 💡 Contributing
Pull requests are welcome!  Please open an issue first to discuss major changes.  Make sure your code passes `pnpm lint` and `pnpm test`.

---

## 📜 License
MIT © 2024 Abhijith Balagurusamy
