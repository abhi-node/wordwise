"use client"

import { useState, useEffect, useRef } from "react"
import { Save, Camera, LogOut, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { User } from "firebase/auth"
import { updateUserProfile, getUserProfile, uploadProfilePhoto, getProfilePhoto, type UserData } from "@/lib/user-service"

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
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          
          // Load profile photo
          if (userData.photoURL) {
            const photo = await getProfilePhoto(user.uid)
            if (photo) {
              setProfilePhoto(photo)
            }
          }
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
  // Handle profile photo upload
  // ---------------------------------------------------------------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const photoData = await uploadProfilePhoto(user.uid, file)
      setProfilePhoto(photoData)
      toast.success('Profile photo updated successfully')
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
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

      <Card className="w-full shadow-sm rounded-xl">
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
              <Avatar className="h-20 w-20 border-2 border-gray-200">
                <AvatarImage 
                  src={profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || profile.email)}`} 
                  alt={profile.name} 
                />
                <AvatarFallback className="text-lg bg-gray-100">
                  {profile.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || profile.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{profile.name || "User"}</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isUploadingPhoto ? "Uploading..." : "Change Photo"}
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

            <Separator />

            <div className="flex justify-end">
              <Button 
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
