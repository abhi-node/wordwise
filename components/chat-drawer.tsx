"use client"

import { useEffect, useRef, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

interface Msg {
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatDrawerProps {
  /** The element that should open the drawer when clicked. */
  children: React.ReactNode
  className?: string
}

export default function ChatDrawer({ children, className }: ChatDrawerProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const pathname = usePathname()
  const previousPath = useRef(pathname)

  // Close the chat drawer whenever the route changes.
  useEffect(() => {
    if (pathname !== previousPath.current) {
      setOpen(false)
      setMessages([]) // clear history to end the session
      previousPath.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  async function send() {
    if (!draft.trim()) return

    const nextMsgs: Msg[] = [...messages, { role: "user", content: draft }]
    setMessages(nextMsgs)
    setDraft("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages([...nextMsgs, data.reply])
      } else if (data.error) {
        setMessages([
          ...nextMsgs,
          { role: "assistant", content: "Sorry, something went wrong. Please try again later." },
        ])
      }
      setIsLoading(false)
    } catch (error) {
      setMessages([
        ...nextMsgs,
        { role: "assistant", content: "Network error. Please check your connection." },
      ])
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className={cn("flex flex-col w-full sm:max-w-md", className)}>
        <SheetHeader>
          <SheetTitle>Live Support Chat</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <span
                className={cn(
                  "inline-block max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow",
                  m.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "bg-muted text-foreground"
                )}
              >
                {m.content}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted shadow text-sm text-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Typing…
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-4 flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your question…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button onClick={send}>Send</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
} 