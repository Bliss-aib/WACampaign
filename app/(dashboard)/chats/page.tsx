"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Send, MoreVertical, MessageCircle, Link2, X, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  // Delivery state for outbound messages: 'sent' | 'delivered' | 'read' | 'failed'.
  status?: string;
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
}

export default function ChatsPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  // Real conversations loaded from /api/messages (replaces the old mock list).
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setConnected(d.connected);
        const list: ChatContact[] = d.conversations || [];
        setChats(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {
        setConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedChat = chats.find((c) => c.id === selectedId);

  const filtered = chats.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "unread" && c.unread > 0) ||
      (statusFilter === "read" && c.unread === 0);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        <Skeleton className="h-full w-80 rounded-lg" />
        <Skeleton className="h-full flex-1 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Banner when not connected */}
      {!connected && showBanner && (
        <Card className="border-zinc-200 bg-zinc-50">
          <CardContent className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm font-medium text-black">Connect WhatsApp to sync real chats</p>
                <p className="text-xs text-zinc-500">
                  Link your WhatsApp Business account in Settings to start receiving and managing live chats here.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button size="sm" className="bg-black text-white hover:bg-zinc-800">
                  Go to Settings
                </Button>
              </Link>
              <button
                onClick={() => setShowBanner(false)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-1 gap-4">
        {/* Left: Chat list */}
        <Card className="flex w-80 flex-col border-zinc-200">
          <div className="border-b border-zinc-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Chats</h2>
              {connected && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Live
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Search chats..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-zinc-200 text-black text-sm focus-visible:ring-black"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[110px] h-9 text-xs border-zinc-200 text-black focus:ring-black">
                  <Filter className="h-3.5 w-3.5 text-zinc-500" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="min-w-[110px]">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={`flex w-full items-start gap-3 border-b border-zinc-50 px-4 py-3 text-left transition-colors ${
                  selectedId === chat.id ? "bg-zinc-50" : "hover:bg-zinc-50/50"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                  {chat.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-black">{chat.name}</p>
                    <span className="shrink-0 text-[11px] text-zinc-400">{chat.lastTime}</span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-medium text-white">
                    {chat.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Right: Chat thread */}
        <Card className="flex flex-1 flex-col border-zinc-200">
          {!selectedChat ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-zinc-400">
                {chats.length === 0 ? "No conversations yet" : "Select a conversation"}
              </p>
            </div>
          ) : (
          <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                {selectedChat.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-black">{selectedChat.name}</p>
                <p className="text-xs text-zinc-500">{selectedChat.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-black">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 bg-[#f8f9fa] px-5 py-4">
            {selectedChat.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === "me"
                      ? "rounded-tr-sm bg-black text-white"
                      : "rounded-tl-sm bg-white text-black shadow-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className="mt-1 text-right text-[10px] text-zinc-400">
                    {msg.time}
                    {/* Read/delivery status for outbound messages */}
                    {msg.sender === "me" && msg.status && (
                      <span className={msg.status === "read" ? "ml-1 text-sky-400" : "ml-1"}>
                        {msg.status === "failed"
                          ? "failed"
                          : msg.status === "sent"
                          ? "✓"
                          : "✓✓"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border-zinc-200 text-black text-sm focus-visible:ring-black"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && reply.trim()) {
                    setReply("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (reply.trim()) setReply("");
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          </>
          )}
        </Card>
      </div>
    </div>
  );
}
