"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Search, FileText, Trash2, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import TextEditor from "./text-editor"
import React from "react"
import { JSONContent } from "@tiptap/core"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface FirestoreDocument {
  id: string
  title: string
  description: string
  author: string
  createdAt: Date
  updatedAt: Date
  status: "draft" | "published" | "archived"
  tags: string[]
  content?: JSONContent
  userId: string
}

type DocumentStatus = "draft" | "published" | "archived"

// Default empty TipTap document content
const emptyContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "",
        },
      ],
    },
  ],
}

export default function DocumentManager() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<FirestoreDocument[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<FirestoreDocument | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newDocument, setNewDocument] = useState({
    title: "",
    description: "",
    status: "draft" as DocumentStatus,
    tags: [] as string[],
  })

  const loadDocuments = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const q = query(
        collection(db, "documents"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      )
      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any
        return {
          id: docSnap.id,
          ...data,
          content:
            typeof data.content === "string" && data.content.trim() === ""
              ? emptyContent
              : data.content || emptyContent,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        }
      }) as FirestoreDocument[]
      
      setDocuments(docs)
    } catch (error) {
      console.error("Error loading documents:", error)
      toast.error("Failed to load documents")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [user])

  const handleCreateDocument = async () => {
    if (!user) return

    try {
      setIsCreating(true)
      const docRef = await addDoc(collection(db, "documents"), {
        ...newDocument,
        author: user.displayName || user.email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: user.uid,
        content: emptyContent,
      })

      const newDoc: FirestoreDocument = {
        id: docRef.id,
        ...newDocument,
        author: user.displayName || user.email || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.uid,
        content: emptyContent,
      }

      setDocuments([newDoc, ...documents])
      setNewDocument({
        title: "",
        description: "",
        status: "draft",
        tags: [],
      })
      toast.success("Document created successfully")
    } catch (error) {
      console.error("Error creating document:", error)
      toast.error("Failed to create document")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDocumentClick = (document: FirestoreDocument) => {
    setSelectedDocument(document)
  }

  const handleSaveDocument = async (content: JSONContent) => {
    if (!selectedDocument) return

    try {
      const docRef = doc(db, "documents", selectedDocument.id)
      await updateDoc(docRef, {
        content,
        updatedAt: Timestamp.now(),
      })

      setDocuments(
        documents.map((doc) =>
          doc.id === selectedDocument.id
            ? { ...doc, content, updatedAt: new Date() }
            : doc
        )
      )

      toast.success("Document saved successfully")
    } catch (error) {
      console.error("Error saving document:", error)
      toast.error("Failed to save document")
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDoc(doc(db, "documents", documentId))
      setDocuments(documents.filter((doc) => doc.id !== documentId))
      toast.success("Document deleted successfully")
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Failed to delete document")
    }
  }

  // Live, performant filtering of documents by title (case-insensitive)
  const filteredDocuments = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((doc) => doc.title.toLowerCase().includes(q))
  }, [documents, searchQuery])

  if (selectedDocument) {
    return (
      <TextEditor
        document={{ ...selectedDocument, content: selectedDocument.content ?? emptyContent }}
        onClose={() => setSelectedDocument(null)}
        onSave={handleSaveDocument}
      />
    )
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Documents</h1>
          <p className="text-muted-foreground">Manage and organize your documents</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 text-base w-full"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="h-11 px-6 whitespace-nowrap">
                <Plus className="h-5 w-5 mr-2" />
                New Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create New Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">Title</Label>
                  <Input
                    id="title"
                    value={newDocument.title}
                    onChange={(e) =>
                      setNewDocument({ ...newDocument, title: e.target.value })
                    }
                    placeholder="Enter document title"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">Description</Label>
                  <Textarea
                    id="description"
                    value={newDocument.description}
                    onChange={(e) =>
                      setNewDocument({ ...newDocument, description: e.target.value })
                    }
                    placeholder="Enter document description"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-base">Status</Label>
                  <Select
                    value={newDocument.status}
                    onValueChange={(value: "draft" | "published" | "archived") =>
                      setNewDocument({ ...newDocument, status: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateDocument}
                  disabled={isCreating || !newDocument.title}
                  className="w-full h-11 text-base"
                >
                  {isCreating ? "Creating..." : "Create Document"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[400px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-16 bg-muted/50 rounded-lg">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No documents</h3>
            <p className="mt-2 text-muted-foreground">
              Get started by creating a new document.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <Card
                key={document.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => handleDocumentClick(document)}
              >
                <CardHeader className="space-y-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl leading-tight">{document.title}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDocumentClick(document)
                        }}
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      {/* Delete with confirmation */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete "{document.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDocument(document.id)
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{document.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={document.status === "published" ? "default" : "secondary"}>
                      {document.status}
                    </Badge>
                    <Badge variant="outline">
                      Updated {new Date(document.updatedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
