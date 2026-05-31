import type { Member } from '@/lib/database.types'

export function MemberDot({ member, size = 8 }: { member: Member; size?: number }) {
  return (
    <span
      className="rounded-full inline-block shrink-0"
      style={{ width: size, height: size, backgroundColor: member.color }}
      title={member.name}
    />
  )
}

export function MemberAvatar({ member, className = '' }: { member: Member; className?: string }) {
  return (
    <span
      className={`rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${className}`}
      style={{ backgroundColor: member.color }}
    >
      {member.name[0].toUpperCase()}
    </span>
  )
}
