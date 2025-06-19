"use client"

import { useState } from "react"
import { FileText, Trash2, User, HelpCircle, Settings, Home, BookOpen, LogIn, UserPlus } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import DocumentManager from "@/components/document-manager"
import TrashManager from "@/components/trash-manager"
import ProfileManager from "@/components/profile-manager"
import FAQSection from "@/components/faq-section"
import Dashboard from "@/components/dashboard"
import LoginPage from "@/components/login-page"
import SignupPage from "@/components/signup-page"
import WelcomePage from "@/components/welcome-page"

type TabType = "welcome" | "login" | "signup" | "dashboard" | "documents" | "trash" | "profile" | "faq"

interface UserType {
  id: string
  name: string
  email: string
  avatar?: string
}

const loggedInNavigationItems = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "dashboard",
        icon: Home,
        description: "Overview and recent activity",
      },
      {
        title: "Documents",
        url: "documents",
        icon: FileText,
        description: "Manage your documents",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Trash",
        url: "trash",
        icon: Trash2,
        description: "Deleted documents",
      },
      {
        title: "Profile",
        url: "profile",
        icon: User,
        description: "Account settings",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "FAQ",
        url: "faq",
        icon: HelpCircle,
        description: "Frequently asked questions",
      },
    ],
  },
]

const loggedOutNavigationItems = [
  {
    title: "Get Started",
    items: [
      {
        title: "Welcome",
        url: "welcome",
        icon: Home,
        description: "Learn about Wordwise",
      },
      {
        title: "Sign In",
        url: "login",
        icon: LogIn,
        description: "Access your account",
      },
      {
        title: "Sign Up",
        url: "signup",
        icon: UserPlus,
        description: "Create new account",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "FAQ",
        url: "faq",
        icon: HelpCircle,
        description: "Frequently asked questions",
      },
    ],
  },
]

export default function WordwiseApp() {
  const [activeTab, setActiveTab] = useState<TabType>("welcome")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any | null>(null)

  const handleLogin = (email: string, password: string) => {
    // Simulate login - in real app, this would call an API
    const mockUser: UserType = {
      id: "1",
      name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
      email: email,
      avatar: undefined,
    }
    setUser(mockUser)
    setIsLoggedIn(true)
    setActiveTab("dashboard")
  }

  const handleSignup = (name: string, email: string, password: string) => {
    // Simulate signup - in real app, this would call an API
    const mockUser: UserType = {
      id: "1",
      name: name,
      email: email,
      avatar: undefined,
    }
    setUser(mockUser)
    setIsLoggedIn(true)
    setActiveTab("dashboard")
  }

  const handleLogout = async () => {
    setUser(null)
    setIsLoggedIn(false)
    setActiveTab("welcome")
  }

  const navigationItems = isLoggedIn ? loggedInNavigationItems : loggedOutNavigationItems

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case "welcome":
        return "Welcome"
      case "login":
        return "Sign In"
      case "signup":
        return "Sign Up"
      case "dashboard":
        return "Dashboard"
      case "documents":
        return "Documents"
      case "trash":
        return "Trash"
      case "profile":
        return "Profile"
      case "faq":
        return "FAQ"
      default:
        return "Wordwise"
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "welcome":
        return <WelcomePage onGetStarted={() => setActiveTab("signup")} />
      case "login":
        return <LoginPage onSwitchToSignup={() => setActiveTab("signup")} />
      case "signup":
        return <SignupPage onSwitchToLogin={() => setActiveTab("login")} />
      case "dashboard":
        return isLoggedIn ? <Dashboard user={user} /> : <WelcomePage onGetStarted={() => setActiveTab("signup")} />
      case "documents":
        return isLoggedIn ? <DocumentManager /> : <WelcomePage onGetStarted={() => setActiveTab("signup")} />
      case "trash":
        return isLoggedIn ? <TrashManager /> : <WelcomePage onGetStarted={() => setActiveTab("signup")} />
      case "profile":
        return isLoggedIn ? (
          <ProfileManager user={user} onLogout={handleLogout} />
        ) : (
          <WelcomePage onGetStarted={() => setActiveTab("signup")} />
        )
      case "faq":
        return <FAQSection />
      default:
        return <WelcomePage onGetStarted={() => setActiveTab("signup")} />
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="mb-5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Wordwise</span>
                  <span className="text-xs">{isLoggedIn ? `Welcome, ${user?.name}` : "Document Management"}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {navigationItems.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={activeTab === item.url} tooltip={item.description}>
                        <button onClick={() => setActiveTab(item.url as TabType)} className="w-full">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        {isLoggedIn && (
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" onClick={() => setActiveTab(isLoggedIn ? "dashboard" : "welcome")}>
                  Wordwise
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{getTabTitle(activeTab)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col">{renderTabContent()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
