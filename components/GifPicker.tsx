'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

// Curated sticker packs (fallback when no search / no API)
const STICKER_PACKS: Record<string, string[]> = {
  '🔥 Reactions': [
    '👍','👎','🙌','🎉','🔥','💯','❤️','😂',
    '😭','🤯','😍','🥺','👀','💀','🫡','🤝',
    '✨','💪','🙏','❤️‍🔥','🤣','😤','🥳','😈',
  ],
  '😎 Vibes': [
    '💅','🤙','✌️','🫶','🤌','👋','🫰','🤞',
    '👏','🫠','🥲','😮‍💨','🤗','😏','🫣','🤭',
    '😴','🥱','🤓','😵‍💫','🫥','😶‍🌫️','🤑','😇',
  ],
  '🎓 Campus': [
    '📚','✏️','💻','📝','🎒','🏫','🔬','📖',
    '🧪','📐','🎓','🧠','💡','📊','🗓️','⏰',
    '☕','🍕','🍔','🌮','🍜','🧋','🎮','⚽',
  ],
}

interface GifPickerProps {
  onSelect: (url: string, type: 'gif' | 'sticker') => void
  onClose: () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [activeTab, setActiveTab] = useState<'stickers' | 'gif'>('stickers')
  const [search, setSearch] = useState('')
  const [gifs, setGifs] = useState<{ url: string; preview: string; width: number; height: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activePack, setActivePack] = useState(Object.keys(STICKER_PACKS)[0])
  const searchRef = useRef<HTMLInputElement>(null)

  // Tenor GIF search (using the free API)
  useEffect(() => {
    if (activeTab !== 'gif' || !search.trim()) { setGifs([]); return }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        // Using Tenor v2 free API
        const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(search)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=campus_arena&limit=20&media_filter=tinygif,gif`)
        if (res.ok) {
          const data = await res.json()
          const results = (data.results || []).map((r: any) => ({
            url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || '',
            preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || '',
            width: r.media_formats?.tinygif?.dims?.[0] || 200,
            height: r.media_formats?.tinygif?.dims?.[1] || 200,
          })).filter((g: any) => g.url)
          setGifs(results)
        }
      } catch { /* Tenor might be blocked - show empty state */ }
      finally { setIsLoading(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [search, activeTab])

  // Load trending on GIF tab open
  useEffect(() => {
    if (activeTab !== 'gif' || search.trim()) return
    const loadTrending = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=campus_arena&limit=20&media_filter=tinygif,gif`)
        if (res.ok) {
          const data = await res.json()
          const results = (data.results || []).map((r: any) => ({
            url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || '',
            preview: r.media_formats?.tinygif?.url || '',
            width: r.media_formats?.tinygif?.dims?.[0] || 200,
            height: r.media_formats?.tinygif?.dims?.[1] || 200,
          })).filter((g: any) => g.url)
          setGifs(results)
        }
      } catch {}
      finally { setIsLoading(false) }
    }
    loadTrending()
  }, [activeTab])

  return (
    <div className="absolute bottom-14 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 w-[360px] overflow-hidden"
      onClick={e => e.stopPropagation()}>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button onClick={() => setActiveTab('stickers')}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'stickers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
          Stickers
        </button>
        <button onClick={() => { setActiveTab('gif'); setTimeout(() => searchRef.current?.focus(), 100) }}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'gif' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
          GIFs
        </button>
        <button onClick={onClose} className="px-3 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'stickers' ? (
        <>
          {/* Pack tabs */}
          <div className="flex gap-1 px-2 py-2 border-b border-gray-50 overflow-x-auto">
            {Object.keys(STICKER_PACKS).map(pack => (
              <button key={pack} onClick={() => setActivePack(pack)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activePack === pack ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {pack}
              </button>
            ))}
          </div>
          {/* Sticker grid */}
          <div className="h-[240px] overflow-y-auto p-3">
            <div className="grid grid-cols-6 gap-1">
              {STICKER_PACKS[activePack]?.map((sticker, i) => (
                <button key={`${sticker}-${i}`} onClick={() => onSelect(sticker, 'sticker')}
                  className="w-full aspect-square flex items-center justify-center text-2xl rounded-xl hover:bg-indigo-50 transition-all hover:scale-110 active:scale-95">
                  {sticker}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search GIFs on Tenor..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>
          {/* GIF grid */}
          <div className="h-[240px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
            ) : gifs.length > 0 ? (
              <div className="columns-2 gap-2">
                {gifs.map((gif, i) => (
                  <button key={i} onClick={() => onSelect(gif.url, 'gif')}
                    className="block w-full mb-2 rounded-lg overflow-hidden hover:opacity-80 transition-opacity break-inside-avoid">
                    <img src={gif.preview} alt="GIF" className="w-full rounded-lg" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm font-medium">{search ? 'No GIFs found' : 'Search for a GIF'}</p>
                <p className="text-xs mt-1">Powered by Tenor</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}