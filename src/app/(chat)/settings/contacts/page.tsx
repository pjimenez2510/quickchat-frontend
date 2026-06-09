'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Search, Trash2, UserPlus, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chat-store';
import type { Conversation } from '@/types/conversation';

interface Contact {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toRemove, setToRemove] = useState<Contact | null>(null);
  const [toBlock, setToBlock] = useState<Contact | null>(null);

  // Add-contact dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const reload = () => {
    setIsLoading(true);
    api
      .get<Contact[]>('/contacts')
      .then((res) => setContacts(res.data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to load contacts'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(reload, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => {
      api
        .get<SearchUser[]>(`/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => setSearchResults(res.data))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return contacts;
    const q = filter.toLowerCase();
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q),
    );
  }, [contacts, filter]);

  const contactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);

  const handleAdd = async (user: SearchUser) => {
    setAddingId(user.id);
    try {
      const res = await api.post<null>('/contacts', { contactId: user.id });
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    try {
      const res = await api.delete<null>(`/contacts/${toRemove.id}`);
      toast.success(res.message);
      setContacts((prev) => prev.filter((c) => c.id !== toRemove.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove contact');
    } finally {
      setToRemove(null);
    }
  };

  const handleBlock = async () => {
    if (!toBlock) return;
    try {
      const res = await api.post<null>('/blocked-users', { blockedUserId: toBlock.id });
      toast.success(res.message);
      setContacts((prev) => prev.filter((c) => c.id !== toBlock.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to block user');
    } finally {
      setToBlock(null);
    }
  };

  const handleOpenChat = async (contact: Contact) => {
    try {
      const res = await api.post<Conversation>('/conversations', { otherUserId: contact.id });
      useChatStore.setState((state) => {
        const exists = state.conversations.find((c) => c.id === res.data.id);
        if (exists) return state;
        return { conversations: [res.data, ...state.conversations] };
      });
      router.push(`/chat/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open chat');
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => router.push('/settings/profile')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Contacts</h1>
        <Button size="sm" onClick={() => { setSearchQuery(''); setSearchResults([]); setAddOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter contacts..."
            className="h-9 pl-9 bg-accent/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading contacts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {contacts.length === 0
              ? 'You have no contacts yet. Tap “Add” to find people.'
              : 'No contacts match that filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {initialsOf(c.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {c.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-[var(--qc-online)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{c.username}</p>
                </div>
                <button
                  onClick={() => handleOpenChat(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors"
                  title="Open chat"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToBlock(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
                  title="Block user"
                >
                  <Ban className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToRemove(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remove contact"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add contact dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a contact</DialogTitle>
            <DialogDescription>Search by username to find someone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9"
                placeholder="Username..."
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {isSearching ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Searching...
                </p>
              ) : searchQuery.trim() === '' ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Type a username to search.
                </p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No users found.
                </p>
              ) : (
                <ul className="space-y-1">
                  {searchResults.map((u) => {
                    const already = contactIds.has(u.id);
                    return (
                      <li
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initialsOf(u.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={already ? 'secondary' : 'default'}
                          disabled={already || addingId === u.id}
                          onClick={() => handleAdd(u)}
                        >
                          {addingId === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : already ? (
                            'Added'
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" /> Add
                            </>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm remove */}
      <Dialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove contact?</DialogTitle>
            <DialogDescription>
              {toRemove
                ? `${toRemove.displayName} won’t be notified. You can add them back any time.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm block */}
      <Dialog open={!!toBlock} onOpenChange={(o) => !o && setToBlock(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Block this user?</DialogTitle>
            <DialogDescription>
              {toBlock
                ? `${toBlock.displayName} won’t be able to message you, see your profile or activity. They will also be removed from your contacts.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToBlock(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlock}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
