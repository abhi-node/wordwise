"use client"

import { FileText, Trash2, User as UserIcon, TrendingUp, Clock, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { User as FirebaseUser } from "firebase/auth"

interface DashboardProps {
  user: FirebaseUser | null
}

export default function Dashboard({ user }: DashboardProps) {
  const stats = [
    {
      title: "Total Documents",
      value: "24",
      description: "3 created this week",
      icon: FileText,
      trend: "+12%",
    },
    {
      title: "In Trash",
      value: "5",
      description: "2 deleted today",
      icon: Trash2,
      trend: "-8%",
    },
    {
      title: "Published",
      value: "18",
      description: "75% of total documents",
      icon: TrendingUp,
      trend: "+5%",
    },
    {
      title: "Recent Activity",
      value: "7",
      description: "Actions in last 24h",
      icon: Clock,
      trend: "+15%",
    },
  ]

  const recentDocuments = [
    {
      title: "Project Requirements Document",
      updatedAt: "2 hours ago",
      author: "John Smith",
    },
    {
      title: "API Documentation",
      updatedAt: "5 hours ago",
      author: "Sarah Johnson",
    },
    {
      title: "User Interface Guidelines",
      updatedAt: "1 day ago",
      author: "Mike Davis",
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ""}! Here's what's happening with your documents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <div className="flex items-center pt-1">
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your most recently updated documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium leading-none">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">by {doc.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-muted-foreground">{doc.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Create New Document
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Star className="mr-2 h-4 w-4" />
              View Favorites
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <UserIcon className="mr-2 h-4 w-4" />
              Update Profile
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Empty Trash
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
