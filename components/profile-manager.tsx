"use client"

import { useState, useEffect } from "react"
import { Mail, Calendar, Save, Camera, LogOut, User as UserIcon, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { User } from "firebase/auth"
import { updateUserProfile, getUserProfile, type UserData } from "@/lib/user-service"

/* --------------------------------------------------------------------------
 * ProfileManager Component
 * --------------------------------------------------------------------------
 * Displays the current user's profile information, allows inline editing, and
 * synchronises any changes back to Firestore. It also surfaces quick actions
 * (e.g. change password, sign-out) that are passed in from the parent layout.
 * --------------------------------------------------------------------------*/
interface ProfileManagerProps {
  user: User | null
  onLogout: () => Promise<void>
}

export default function ProfileManager({ user, onLogout }: ProfileManagerProps) {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    joinDate: "",
    documentsCreated: 0,
    wordsChecked: 0,
  })

  const [originalProfile, setOriginalProfile] = useState(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // ---------------------------------------------------------------------------
  // Load profile data once we have a valid Firebase user. Runs again if the user
  // object changes (e.g. after re-auth).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const userData = await getUserProfile(user.uid)
        if (userData) {
          const newProfile = {
            name: userData.displayName || user.displayName || "",
            email: user.email || "",
            phone: userData.phone || "",
            location: userData.location || "",
            bio: userData.bio || "",
            joinDate: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
            documentsCreated: userData.documentsCreated || 0,
            wordsChecked: userData.wordsChecked || 0,
          }
          setProfile(newProfile)
          setOriginalProfile(newProfile)
        }
      } catch (error) {
        console.error("Error loading user profile:", error)
        toast.error("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  // ---------------------------------------------------------------------------
  // Persist edited profile values to Firestore then reset local editing state.
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: profile.name,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio
      })
      
      setOriginalProfile(profile)
      setIsEditing(false)
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Abandon unsaved edits and restore the last committed profile snapshot.
  // ---------------------------------------------------------------------------
  const handleDiscard = () => {
    setProfile(originalProfile)
    setIsEditing(false)
    toast.info("Changes discarded")
  }

  // ---------------------------------------------------------------------------
  // Sign the user out of the application via the callback from Auth context.
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await onLogout()
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to log out. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const stats = [
    { label: "Documents Created", value: profile.documentsCreated },
    { label: "Words Checked", value: profile.wordsChecked.toLocaleString() },
    { label: "Member Since", value: profile.joinDate },
  ]

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-8 md:p-10 bg-background">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleDiscard}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Discard Changes
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg?height=80&width=80" alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {profile.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <Button variant="outline" size="sm">
                  <Camera className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder={profile.phone || "Add your phone number"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  disabled={!isEditing}
                  placeholder={profile.location || "Add your location"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                disabled={!isEditing}
                rows={4}
                placeholder={profile.bio || "Tell us about yourself"}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8 lg:col-span-1">
          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
              <CardDescription>Your activity overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className="text-xl font-semibold text-foreground">
                    {stat.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                Change Password
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <UserIcon className="mr-2 h-4 w-4" />
                Privacy Settings
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button 
                variant="destructive"
                className="w-full justify-start" 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
