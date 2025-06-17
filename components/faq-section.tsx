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
    question: "How does Wordwise's grammar checking work?",
    answer:
      "Wordwise uses advanced AI technology to analyze your text in real-time. Our system understands context, grammar rules, and writing patterns to provide accurate suggestions as you type. It catches everything from basic grammar mistakes to complex sentence structure issues.",
    category: "Writing Assistant",
    popular: true,
  },
  {
    id: "2",
    question: "What types of errors can Wordwise detect?",
    answer:
      "Wordwise detects grammar errors, spelling mistakes, punctuation issues, style inconsistencies, and tone problems. It also provides suggestions for clarity, conciseness, and overall writing improvement to help you communicate more effectively.",
    category: "Writing Assistant",
    popular: true,
  },
  {
    id: "3",
    question: "How do I create and organize documents?",
    answer:
      "Navigate to the Documents tab and click 'Create Document'. Fill in the title, description, author, and tags. You can organize documents using tags and search through them using our powerful search feature that looks through titles, content, authors, and tags.",
    category: "Document Management",
  },
  {
    id: "4",
    question: "Can I collaborate with team members on documents?",
    answer:
      "Yes! Wordwise supports real-time collaboration. You can share documents with team members, work together simultaneously, and track changes with version control. All collaborators can see edits and suggestions in real-time.",
    category: "Collaboration",
    popular: true,
  },
  {
    id: "5",
    question: "How do I recover deleted documents?",
    answer:
      "Deleted documents are moved to the Trash where they remain for 30 days. Go to the Trash tab and click 'Restore' next to any document you want to recover. After 30 days, documents are permanently deleted and cannot be recovered.",
    category: "Document Management",
  },
  {
    id: "6",
    question: "Is my writing data secure and private?",
    answer:
      "Absolutely. We take privacy seriously. Your documents are encrypted in transit and at rest. We never store your content permanently on our servers, and we don't share your writing with third parties. Your data belongs to you.",
    category: "Privacy & Security",
    popular: true,
  },
  {
    id: "7",
    question: "How accurate is Wordwise's grammar checking?",
    answer:
      "Wordwise maintains a 99.9% accuracy rate for grammar and spell checking. Our AI is trained on millions of text samples and continuously improves. However, we always recommend human review for important documents.",
    category: "Writing Assistant",
  },
  {
    id: "8",
    question: "Can I use Wordwise offline?",
    answer:
      "Currently, Wordwise requires an internet connection to provide real-time grammar and spell checking. However, you can view and edit previously loaded documents offline, with full checking resuming when you reconnect.",
    category: "Technical",
  },
  {
    id: "9",
    question: "How do I search for specific documents?",
    answer:
      "Use the search bar in the Documents tab to find documents by title, description, author, or tags. The search is instant and will filter results as you type. You can also use tags to categorize and quickly find related documents.",
    category: "Document Management",
  },
  {
    id: "10",
    question: "What happens to my account if I cancel?",
    answer:
      "If you cancel your subscription, you'll retain access until the end of your billing period. After that, your account will be downgraded but your documents will remain accessible. You can export your data at any time from your profile settings.",
    category: "Account",
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
