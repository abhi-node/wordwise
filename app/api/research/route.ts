import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Helper: build MLA citation from data
function buildMlaCitation(paper: any): string {
  const { title, authors = [], year, venue } = paper

  const authorPart = authors.length
    ? `${authors[0].name}${authors.length > 1 ? ", et al." : ""}`
    : "Unknown Author"

  const titlePart = `"${title}."`
  const venuePart = venue ? `${venue},` : ""
  const yearPart = year ? `${year}.` : "n.d."

  return `${authorPart}. ${titlePart} ${venuePart} ${yearPart}`
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || ""

  if (!query.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    // Search Semantic Scholar
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      query
    )}&limit=24&fields=title,abstract,url,authors,year,venue` as const

    const resp = await fetch(apiUrl, { next: { revalidate: 60 } })
    if (!resp.ok) throw new Error("Semantic Scholar request failed")

    const { data = [] } = (await resp.json()) as { data: any[] }

    // Prepare OpenAI if available
    let openai: OpenAI | null = null
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }

    // Keep only papers with an abstract we can summarise or display.
    const papersWithAbstract = data.filter(
      (p) => typeof p.abstract === "string" && p.abstract.trim().length > 0
    )

    // Take the first 8 suitable papers.
    const selectedPapers = papersWithAbstract.slice(0, 8)

    const results = await Promise.all(
      selectedPapers.map(async (paper) => {
        let description = ""

        if (openai) {
          try {
            description = await generateDescription(openai, paper.abstract)
          } catch (_) {
            // fallthrough to fallback
          }
        }

        if (!description) {
          const abstractText = paper.abstract as string
          description = abstractText.slice(0, 200)
          if (abstractText.length > 200) description += "…"
        }

        const domain = paper.url ? new URL(paper.url).hostname : ""
        const iconUrl = domain
          ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
          : ""

        return {
          id: paper.paperId || paper.externalIds?.CorpusId || paper.url,
          title: paper.title,
          iconUrl,
          citation: buildMlaCitation(paper),
          description,
          url: paper.url,
        }
      })
    )

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Research search error", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

async function generateDescription(openai: OpenAI, abstract: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_GPT_MODEL || "gpt-3.5-turbo-1106",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes academic abstracts into concise plain-English overviews.",
        },
        {
          role: "user",
          content: `Provide a two-sentence summary (max 60 words) of the following research paper abstract and avoid jargon.\n\nAbstract: """${abstract}"""`,
        },
      ],
    })
    return completion.choices[0].message.content?.trim() || ""
  } catch (e) {
    console.error("OpenAI summarization failed", e)
    return ""
  }
} 