'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

const EMOJI_DATA: Record<string, { icon: string; emojis: string[] }> = {
  'Smileys': {
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡',
      '🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
      '😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐',
      '😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢',
      '😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀',
    ],
  },
  'Gestures': {
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟',
      '🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏',
      '🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻',
      '👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦','👶','🧒','👦','👧','🧑',
    ],
  },
  'Animals': {
    icon: '🐱',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
      '🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗',
      '🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂',
      '🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋',
    ],
  },
  'Food': {
    icon: '🍔',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
      '🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠',
      '🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴',
      '🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🍝','🍜',
    ],
  },
  'Activities': {
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍',
      '🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌',
      '🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽',
      '🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🎭',
    ],
  },
  'Travel': {
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵',
      '🚲','🛴','🛺','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅',
      '🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶',
      '⛵','🚤','🛥️','🛳️','⛴️','🚢','🗼','🏰','🏯','🗽','🏟️','🎡','🎢','🎠','⛲','🏖️',
    ],
  },
  'Objects': {
    icon: '💡',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼',
      '📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭',
      '⏱️','⏲️','⏰','🕰️','⌛','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰',
      '🪙','💴','💵','💶','💷','🪪','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️',
    ],
  },
  'Symbols': {
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
      '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈',
      '♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️',
      '📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹',
      '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','💯','✅','❌','❓','❗',
      '⭐','🌟','💫','✨','🔥','💥','💢','💦','💨','🕳️','🎉','🎊','🎈','🎆','🎇','🧨',
    ],
  },
}

interface EmojiKeyboardProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiKeyboard({ onSelect, onClose }: EmojiKeyboardProps) {
  const [activeCategory, setActiveCategory] = useState('Smileys')
  const categories = Object.keys(EMOJI_DATA)
  const emojis = EMOJI_DATA[activeCategory]?.emojis || []

  return (
    <div
      className="absolute bottom-14 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 w-[340px] overflow-hidden"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.preventDefault()}  // ← prevents form from receiving focus/submit
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Emojis</p>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onClose() }}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 pb-2 border-b border-gray-100">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveCategory(cat) }}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-base transition-all ${
              activeCategory === cat ? 'bg-indigo-50 scale-110' : 'hover:bg-gray-100'
            }`}
            title={cat}
          >
            {EMOJI_DATA[cat].icon}
          </button>
        ))}
      </div>

      {/* Category label */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{activeCategory}</p>
      </div>

      {/* Emoji grid */}
      <div className="h-[220px] overflow-y-auto px-2 pb-2">
        <div className="grid grid-cols-8 gap-0.5">
          {emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"                              // ← prevents form submit
              onMouseDown={e => e.preventDefault()}     // ← prevents input blur
              onClick={e => {
                e.preventDefault()                      // ← belt-and-suspenders
                e.stopPropagation()
                onSelect(emoji)
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-xl transition-all hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}