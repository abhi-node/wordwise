"use client"

import { Zap, CheckCircle2, Brain, MessageSquare, ArrowRight, Sparkles, Target, FileText, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"

// Dynamically import a lightweight preview of the full editor UI (client-side only)
const TextEditorPreview = dynamic(() => import("./text-editor-preview"), { ssr: false })

interface WelcomePageProps {
  onGetStarted: () => void
}

export default function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const features = [
    {
      icon: Zap,
      title: "Real-Time Grammar Check",
      description:
        "Advanced AI-powered grammar checking that catches errors as you type, with contextual suggestions for perfect writing.",
    },
    {
      icon: Brain,
      title: "Intelligent Spell Check",
      description:
        "Smart spell checking that understands context, proper nouns, and technical terms to provide accurate corrections.",
    },
    {
      icon: FileText,
      title: "Document Management",
      description:
        "Organize, search, and manage all your documents in one place with powerful tagging and categorization features.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Share documents with team members and see comments in real time.",
    },
  ]

  const benefits = [
    "Real-time grammar and spell checking",
    "Advanced AI writing suggestions",
    "Document organization and management",
    "Real-time team collaboration",
    "Writing style and tone optimization",
    "Personal writing analytics and insights",
    "Secure document storage and backup",
    "Cross-platform accessibility",
  ]

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Writing Assistant
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Write with Confidence using <span className="text-blue-600">Wordwise</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The most advanced grammar and spell checking service that helps you write flawlessly. Get real-time
            suggestions, style improvements, and error corrections as you type - powered by cutting-edge AI technology.
          </p>
        </div>
      </div>

      {/* Live Demo Section – pulls the actual editor UI */}
      <div className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">See Wordwise in Action</h2>
          <p className="text-lg text-gray-600">
            Below is a live preview of the Wordwise editor interface you'll use every day.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <TextEditorPreview />
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Writing & Collaboration Features</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to write perfectly and collaborate seamlessly, from AI-powered checking to document
              management.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Writing & Document Management</h2>
            <p className="text-lg text-gray-600">
              Go beyond basic checking with intelligent writing enhancement and powerful document organization
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Contextual Understanding</h3>
              </div>
              <p className="text-gray-600">
                Our AI understands the context of your writing to provide more accurate suggestions and catch subtle
                errors that traditional checkers miss.
              </p>
            </Card>

            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Style & Tone Analysis</h3>
              </div>
              <p className="text-gray-600">
                Get suggestions to improve your writing style, tone, and clarity for different audiences and purposes,
                from formal reports to casual emails.
              </p>
            </Card>

            <Card className="p-6 border-0 shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold">AI Writing Coach</h3>
              </div>
              <p className="text-gray-600">
                Get AI-powered feedback with real-time comments to elevate your writing instantly.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-blue-600 text-white px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Wordwise?</h2>
            <p className="text-xl text-blue-100">
              Join millions of writers who trust Wordwise for perfect writing and seamless collaboration.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-blue-200 flex-shrink-0" />
                <span className="text-blue-50">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
