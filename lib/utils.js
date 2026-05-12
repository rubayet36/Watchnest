import { clsx } from 'clsx'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

export function timeAgo(dateStr) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatDate(dateStr) {
  return format(new Date(dateStr), 'MMM d, yyyy')
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const CATEGORIES = [
  { id: 'all-time-fav',   label: '🌟 All-Time Favourite',         color: 'from-yellow-500 to-amber-600' },
  { id: 'made-me-cry',    label: '😭 Made Me Cry',                 color: 'from-blue-400 to-indigo-600' },
  { id: 'best-comedy',    label: '😂 Best Comedy',                 color: 'from-green-400 to-emerald-600' },
  { id: 'mind-blowing',   label: '🧠 Mind-Blowing',                color: 'from-purple-500 to-violet-700' },
  { id: 'watch-family',   label: '👨‍👩‍👧 Watch with Family',            color: 'from-orange-400 to-red-500' },
  { id: 'best-thriller',  label: '💀 Best Thriller / Horror',      color: 'from-gray-700 to-gray-900' },
  { id: 'must-watch',     label: '🎬 Must Watch Before You Die',   color: 'from-red-500 to-rose-700' },
  { id: 'hidden-gem',     label: '💎 Hidden Gem',                  color: 'from-cyan-400 to-teal-600' },
  { id: 'best-scifi',     label: '🚀 Best Sci-Fi',                 color: 'from-sky-500 to-blue-700' },
  { id: 'date-movie',     label: '💑 Perfect Date Movie',          color: 'from-pink-400 to-rose-500' },
  { id: 'underrated',     label: '🎭 Underrated Masterpiece',      color: 'from-lime-500 to-green-700' },
  { id: 'rewatchable',    label: '🔁 Infinitely Rewatchable',      color: 'from-violet-400 to-purple-700' },
]

export const REACTIONS = [
  { emoji: '❤️',  key: 'love',    label: 'Love' },
  { emoji: '😂',  key: 'haha',    label: 'Haha' },
  { emoji: '😮',  key: 'wow',     label: 'Wow' },
  { emoji: '😢',  key: 'sad',     label: 'Sad' },
  { emoji: '🔥',  key: 'fire',    label: 'Fire' },
  { emoji: '🎬',  key: 'cinema',  label: 'Cinema' },
]

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}
