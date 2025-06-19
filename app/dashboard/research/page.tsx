"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search as SearchIcon, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface PaperResult {
  id: string
  title: string
  iconUrl: string
  citation: string
  description: string
  url: string
}

export default function ResearchSearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PaperResult[]>([])
  // Track whether the user has initiated at least one search so we can
  // decide when to show the introductory "how it works" section.
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    try {
      setLoading(true)
      setHasSearched(true)
      const res = await fetch(`/api/research?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Failed to fetch results")
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Copy a citation string to the user's clipboard and show a toast.
  const copyCitation = async (citation: string) => {
    try {
      await navigator.clipboard.writeText(citation)
      toast.success("Citation copied to clipboard")
    } catch (err) {
      console.error("Clipboard copy failed", err)
      toast.error("Failed to copy citation")
    }
  }

  return (
    <div className="pt-20 flex flex-col items-center gap-6 w-full">
      {/* Fixed, centred search bar */}
      <div
        className="fixed top-10 w-full max-w-xl px-4 flex gap-2 z-50 bg-background"
        style={{ left: "calc(50% + var(--sidebar-width) / 2)", transform: "translateX(-50%)" }}
      >
        <Input
          placeholder="Search research papers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-10"
        />
        <Button
          size="icon"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="h-10 w-10"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Introductory information displayed before the first search */}
      {!hasSearched && (
        <div
          className="fixed top-36 w-full max-w-2xl px-4 text-center space-y-4 text-muted-foreground"
          style={{ left: "calc(50% + var(--sidebar-width) / 2)", transform: "translateX(-50%)" }}
        >
          <h2 className="text-2xl font-semibold text-foreground">
            Search academic papers effortlessly
          </h2>
          <p>
            Enter keywords, topics, or paper titles in the box above and we'll
            fetch the most relevant scholarly articles from multiple sources
            in real-time.
          </p>
          <ul className="list-disc list-inside text-left mx-auto max-w-md">
            <li>Powered by Semantic Scholar and other public APIs.</li>
            <li>Results include the paper title, short description, and a citation snippet.</li>
            <li>Click a title to open the full article in a new tab.</li>
          </ul>
          <p className="italic">Start by typing a search term above.</p>
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
          {results.map((paper) => (
            <div
              key={paper.id}
              className="relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                {paper.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={paper.iconUrl} alt="icon" className="h-5 w-5" />
                )}
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {paper.title}
                </a>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              {paper.description && (
                <p className="text-sm text-muted-foreground">
                  {paper.description}
                </p>
              )}
              <p
                onClick={() => copyCitation(paper.citation)}
                className="mt-auto text-xs italic text-muted-foreground cursor-pointer hover:underline"
                title="Click to copy citation"
              >
                {paper.citation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 