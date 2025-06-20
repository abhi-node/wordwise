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

| ⚙️ Feature | ✍️ What it Does | 🤩 Why You'll Love It |
|-----------|---------------|-----------------------|
| **Style-Assisted Corrections** | AI rewrites sentences to the selected tone (objective, professional, persuasive) and flags wordiness. | Instantly tailor your voice without rewriting from scratch. |
| **Real-Time Grammar & Spelling** | Hybrid LanguageTool + GPT engine catches tricky mistakes as you type. | Fix issues before they make it to the final draft. |
| **Readability Metrics** | One-click grade-level, clarity & conciseness bars. | Gauge how easily your text will be understood at a glance. |
| **AI Feedback Generator** | Generates paragraph-level praise and actionable improvement tips. | Learn while you edit—like having a teacher in the margin. |
| **Research Assistant** | Searches Semantic Scholar, returns citations & GPT summaries. | Find credible sources and save hours of research. |
| **Document Manager** | Create, tag, search, filter, archive or delete documents. | Keep essays, lab reports and notes perfectly organised. |
| **Live Support Chat** | In-app chat with an AI assistant for instant help. | Never get stuck again. |
| **Secure Auth & Sync** | Email or Google sign-in powered by Firebase Auth & Firestore. | Access your work from any device, worry-free. |

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
- `OPENAI_API_KEY`
- *(others for Firestore, Storage or optional OpenAI model overrides)*

---

## 🗺️  Tech Stack
- **Next.js 14 / React 18**
- **TypeScript & TailwindCSS** + **shadcn/ui** & **Radix Primitives**
- **TipTap** rich-text editor
- **Firebase** (Auth + Firestore)
- **OpenAI GPT-4o** for AI analysis
- **Semantic Scholar API** for research search
- **LanguageTool** for rule-based grammar spotting

---

## 💡 Contributing
Pull requests are welcome!  Please open an issue first to discuss major changes.  Make sure your code passes `pnpm lint` and `pnpm test`.
