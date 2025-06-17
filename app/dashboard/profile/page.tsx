"use client"

import { useAuth } from "@/lib/auth-context"
import ProfileManager from "@/components/profile-manager"

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return <ProfileManager user={user} onLogout={logout} />
} 