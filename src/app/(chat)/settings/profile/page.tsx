'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Check, Users, Ban, Archive, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useUpload } from '@/hooks/use-upload';
import type { User } from '@/types/user';

interface UserProfile extends User {
  bio: string | null;
  customStatus: string | null;
  customStatusEmoji: string | null;
  activityVisibility: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [customStatusEmoji, setCustomStatusEmoji] = useState('');
  const [activityVisibility, setActivityVisibility] = useState('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load full profile on mount
  if (!isLoaded && user) {
    api
      .get<{ user: UserProfile }>('/auth/me')
      .then((res) => {
        const p = res.data.user;
        setUsername(p.username);
        setDisplayName(p.displayName);
        setBio(p.bio ?? '');
        setCustomStatus(p.customStatus ?? '');
        setCustomStatusEmoji(p.customStatusEmoji ?? '');
        setActivityVisibility(p.activityVisibility ?? 'ALL');
        setIsLoaded(true);
      })
      .catch(() => {});
  }

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const result = await uploadFile(file, 'avatars');
      if (result) {
        await api.patch<{ user: User }>('/users/me', {
          avatarUrl: result.fileUrl,
        });
        setUser({ ...user!, avatarUrl: result.fileUrl });
        toast.success('Avatar updated');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch<{ user: User }>('/users/me', {
        username: username !== user?.username ? username : undefined,
        displayName,
        bio: bio || undefined,
        customStatus: customStatus || undefined,
        customStatusEmoji: customStatusEmoji || undefined,
        activityVisibility,
      });
      setUser({ ...user!, ...res.data.user });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => router.push('/')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Edit Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-8 space-y-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to change photo</p>
          </div>

          <Separator />

          {/* Profile fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                placeholder="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-11"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Tell something about yourself..."
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
            </div>
          </div>

          <Separator />

          {/* Custom status */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Custom Status</h3>
            <div className="flex gap-3">
              <Input
                value={customStatusEmoji}
                onChange={(e) => setCustomStatusEmoji(e.target.value)}
                className="h-11 w-16 text-center text-xl"
                placeholder="😊"
                maxLength={2}
              />
              <Input
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="h-11 flex-1"
                placeholder="What's on your mind?"
                maxLength={100}
              />
            </div>
          </div>

          <Separator />

          {/* Activity status visibility (RF-05) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Activity status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Who can see when you&apos;re online and your last seen.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'ALL', label: 'Everyone' },
                { value: 'CONTACTS_ONLY', label: 'Contacts' },
                { value: 'NONE', label: 'Nobody' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActivityVisibility(opt.value)}
                  className={`h-10 rounded-xl border text-sm transition-colors ${
                    activityVisibility === opt.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick links */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium mb-2">Manage</h3>
            {[
              { href: '/settings/contacts', label: 'Contacts', icon: Users },
              { href: '/settings/blocked', label: 'Blocked users', icon: Ban },
              { href: '/settings/archived', label: 'Archived chats', icon: Archive },
            ].map(({ href, label, icon: Icon }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 hover:bg-accent transition-colors"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <Separator />

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-11"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Check className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
