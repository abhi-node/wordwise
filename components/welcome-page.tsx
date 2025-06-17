"use client"

import { Zap, CheckCircle2, Brain, Globe, ArrowRight, Sparkles, Target, FileText, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        "Share documents with team members, collaborate in real-time, and track changes with version control.",
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

  const stats = [
    { number: "50M+", label: "Words Checked Daily" },
    { number: "99.9%", label: "Accuracy Rate" },
    { number: "25+", label: "Languages Supported" },
    { number: "500K+", label: "Happy Writers" },
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={onGetStarted} className="text-lg px-8 py-3 bg-blue-600 hover:bg-blue-700">
              Start Writing Better
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              See Live Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Demo Section */}
      <div className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">See Wordwise in Action</h2>
          <p className="text-lg text-gray-600">
            Watch how our AI catches errors and improves your writing in real-time
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-6 shadow-lg border-2 border-blue-100">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Original Text with Errors:</h3>
                <div className="bg-white rounded border p-4 font-mono text-sm leading-relaxed">
                  <span className="bg-blue-100 text-blue-800 px-1 rounded">Their</span> are many benefits to using{" "}
                  <span className="bg-red-100 text-red-800 px-1 rounded">grammer</span> checking software.{" "}
                  <span className="bg-blue-100 text-blue-800 px-1 rounded">It help writers</span> produce high-quality
                  content and <span className="bg-red-100 text-red-800 px-1 rounded">colaborate</span> more effectively.
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Wordwise Suggestions:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Grammar:</span>
                    <span>"Their" should be "There"</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Spelling:</span>
                    <span>"grammer" should be "grammar"</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Grammar:</span>
                    <span>"It help" should be "It helps"</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Spelling:</span>
                    <span>"colaborate" should be "collaborate"</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Corrected Text:</h3>
                <div className="bg-green-50 border border-green-200 rounded p-4 font-mono text-sm leading-relaxed">
                  <CheckCircle2 className="inline w-4 h-4 text-green-600 mr-2" />
                  There are many benefits to using grammar checking software. It helps writers produce high-quality
                  content and collaborate more effectively.
                </div>
              </div>
            </div>
          </Card>
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
                  <Globe className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold">Multi-Language Support</h3>
              </div>
              <p className="text-gray-600">
                Write confidently in over 25 languages with native-level grammar and spell checking capabilities for
                global teams.
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

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="text-lg px-8 py-3 bg-white text-blue-600 hover:bg-blue-50"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-blue-200 mt-4">No credit card required • 14-day free trial • Cancel anytime</p>
          </div>
        </div>
      </div>
    </div>
  )
}
