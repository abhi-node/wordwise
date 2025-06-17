"use client"

import { useState } from "react"
import { Trash2, RotateCcw, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeletedDocument {
  id: string
  title: string
  description: string
  author: string
  deletedAt: string
  originalStatus: "draft" | "published" | "archived"
}

const mockDeletedDocuments: DeletedDocument[] = [
  {
    id: "1",
    title: "Old Marketing Plan",
    description: "Outdated marketing strategy document from last quarter.",
    author: "Jane Doe",
    deletedAt: "2024-01-18",
    originalStatus: "archived",
  },
  {
    id: "2",
    title: "Draft Meeting Notes",
    description: "Incomplete meeting notes that were accidentally deleted.",
    author: "Bob Wilson",
    deletedAt: "2024-01-17",
    originalStatus: "draft",
  },
  {
    id: "3",
    title: "Deprecated API Docs",
    description: "Documentation for the old API version that's no longer supported.",
    author: "Alice Brown",
    deletedAt: "2024-01-15",
    originalStatus: "published",
  },
]

export default function TrashManager() {
  const [deletedDocuments, setDeletedDocuments] = useState<DeletedDocument[]>(mockDeletedDocuments)

  const handleRestore = (id: string) => {
    setDeletedDocuments(deletedDocuments.filter((doc) => doc.id !== id))
  }

  const handlePermanentDelete = (id: string) => {
    setDeletedDocuments(deletedDocuments.filter((doc) => doc.id !== id))
  }

  const handleEmptyTrash = () => {
    setDeletedDocuments([])
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
          <p className="text-muted-foreground">
            Manage deleted documents. Items in trash are automatically deleted after 30 days.
          </p>
        </div>
        {deletedDocuments.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Empty Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all documents in the trash.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEmptyTrash}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Empty Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {deletedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Trash is empty</h3>
          <p className="text-muted-foreground">No deleted documents to show.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deletedDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg leading-tight">{document.title}</CardTitle>
                <CardDescription className="line-clamp-2">{document.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>Author: {document.author}</p>
                    <p>Deleted: {document.deletedAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(document.id)} className="flex-1">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{document.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handlePermanentDelete(document.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
