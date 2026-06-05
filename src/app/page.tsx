'use client'

import { useCallback, useEffect, useState } from 'react'
import { ConversationList, Conversation } from '@/components/conversation-list'
import { MessagePanel, Message } from '@/components/message-panel'
import { MessageInput } from '@/components/message-input'
import { getBrowserClient } from '@/lib/supabase-browser'
import { Menu } from 'lucide-react'

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
    }
    setLoadingMessages(false)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
    }
  }, [selectedId, loadMessages])

  useEffect(() => {
    const supabase = getBrowserClient()
    const channel = supabase
      .channel('conversation-list-refresh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { loadConversations() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadConversations])

  function handleSelectConversation(id: string) {
    setSelectedId(id)
    setMessages([])
    setDrawerOpen(false)
  }

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Conversation sidebar — drawer on mobile, static column on md+ */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white shadow-xl',
          'w-72 transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0 md:z-auto md:shadow-none md:w-80 md:shrink-0 md:transition-none',
        ].join(' ')}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Main chat area — always full width on mobile, flex-1 on desktop */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedId ? (
          <>
            <div className="px-3 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center gap-2">
              <button
                className="md:hidden p-1.5 rounded hover:bg-gray-100 text-gray-600 shrink-0"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open conversations"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="font-medium text-gray-900 truncate text-sm">{selectedId}</p>
            </div>

            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Loading…
              </div>
            ) : (
              <MessagePanel
                key={selectedId}
                conversationId={selectedId}
                initialMessages={messages}
              />
            )}

            <MessageInput
              conversationId={selectedId}
              onSent={loadConversations}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 text-sm">
            <p className="hidden md:block">Select a conversation to start messaging</p>
            <div className="md:hidden flex flex-col items-center gap-3">
              <p>No conversation selected</p>
              <button
                className="px-4 py-2 bg-[#15803d] text-white rounded-lg text-sm font-medium"
                onClick={() => setDrawerOpen(true)}
              >
                Open Conversations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
