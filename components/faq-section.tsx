"use client"

import { useState } from "react"
import { ChevronDown, Search, HelpCircle, MessageCircle, Mail, Phone, Zap, FileText, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  popular?: boolean
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "How does Wordwise's style-assisted correction improve my writing?",
    answer:
      "When you select a tone (casual, professional, persuasive, etc.) Wordwise rewrites highlighted sentences to match. The AI keeps your intent but tweaks wording and structure so the text flows naturally in the chosen style.",
    category: "Writing Assistant",
    popular: true,
  },
  {
    id: "2",
    question: "What is the Readability Score and how is it calculated?",
    answer:
      "The Readability Score uses a Flesch-Kincaid inspired formula to grade your document. A coloured bar lets you see at a glance whether your writing is easy, medium, or hard to read for the target audience.",
    category: "Feedback & Readability",
    popular: true,
  },
  {
    id: "3",
    question: "How do I generate AI-powered feedback for a paragraph?",
    answer:
      "Inside the editor click the 'Generate Feedback' button. Wordwise analyses the current document and returns paragraph-level praise plus actionable tips you can apply immediately.",
    category: "Feedback & Readability",
    popular: true,
  },
  {
    id: "4",
    question: "Does Wordwise fix spelling, grammar and punctuation as I type?",
    answer:
      "Yes. Wordwise combines rule-based checks from LanguageTool with GPT suggestions, catching even tricky mistakes in real-time so you can keep writing without interruption.",
    category: "Writing Assistant",
  },
  {
    id: "5",
    question: "How do I create, tag and organise my documents?",
    answer:
      "Open the Documents tab then click 'Create Document'. Add a title, description and optional tags. You can later filter or search by title, description, author or tag to stay organised.",
    category: "Document Management",
  },
  {
    id: "6",
    question: "Can I access my documents from multiple devices?",
    answer:
      "Absolutely. Documents are stored in Firebase Cloud Firestore. Log in on any device and your latest edits will sync instantly.",
    category: "Document Management",
  },
  {
    id: "7",
    question: "Is my writing data secure and private?",
    answer:
      "Documents are encrypted in transit and at rest. We never permanently store your content or share it with third-parties. You can export or delete your data at any time.",
    category: "Privacy & Security",
    popular: true,
  },
  {
    id: "8",
    question: "How do I run Wordwise locally for development?",
    answer:
      "Clone the repository, run 'pnpm install', then 'pnpm dev'. The app will be available at http://localhost:3000.",
    category: "Technical",
  },
  {
    id: "9",
    question: "Which environment variables are required?",
    answer:
      "At minimum you need NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN. See the .env.example file for the full list.",
    category: "Technical",
  },
  {
    id: "10",
    question: "What happens to my account if I cancel my subscription?",
    answer:
      "You will retain full access until the end of the current billing cycle. Your documents remain available afterwards and can be exported at any time.",
    category: "Account & Billing",
  },
]

export default function FAQSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const filteredFAQs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const categories = Array.from(new Set(filteredFAQs.map((faq) => faq.category)))
  const popularFAQs = faqData.filter((faq) => faq.popular)

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Writing Assistant":
        return <Zap className="h-4 w-4" />
      case "Document Management":
        return <FileText className="h-4 w-4" />
      case "Collaboration":
        return <Users className="h-4 w-4" />
      default:
        return <HelpCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Find answers to common questions about Wordwise's writing assistance and document management features.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search FAQ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {!searchQuery && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Popular Questions
            </CardTitle>
            <CardDescription>Most frequently asked questions by our users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {popularFAQs.map((faq) => (
                <Collapsible key={faq.id} open={openItems.includes(faq.id)} onOpenChange={() => toggleItem(faq.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-3 h-auto text-left">
                      <span className="font-medium">{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${openItems.includes(faq.id) ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                {getCategoryIcon(category)}
                <h2 className="text-xl font-semibold">{category}</h2>
                <Badge variant="secondary" className="ml-auto">
                  {filteredFAQs.filter((faq) => faq.category === category).length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredFAQs
                  .filter((faq) => faq.category === category)
                  .map((faq) => (
                    <Collapsible key={faq.id} open={openItems.includes(faq.id)} onOpenChange={() => toggleItem(faq.id)}>
                      <CollapsibleTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                {faq.question}
                                {faq.popular && (
                                  <Badge variant="secondary" className="text-xs">
                                    Popular
                                  </Badge>
                                )}
                              </CardTitle>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  openItems.includes(faq.id) ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </CardHeader>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Card className="mt-2 border-t-0">
                          <CardContent className="pt-4">
                            <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
              </div>
            </div>
          ))}

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse the categories in the sidebar.
              </p>
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>Can't find what you're looking for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="mr-2 h-4 w-4" />
              Live Chat
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone className="mr-2 h-4 w-4" />
              Call Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
