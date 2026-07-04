"use client"

import {
  formatLiveAvatarCharacterLabel,
  LIVE_AVATAR_CHARACTERS,
} from "@/lib/liveavatar"

type LiveAvatarPickerProps = {
  value: string
  onChange: (value: string) => void
  inheritLabel?: string
  className?: string
}

export function LiveAvatarPicker({
  value,
  onChange,
  inheritLabel,
  className,
}: LiveAvatarPickerProps) {
  const femaleCharacters = LIVE_AVATAR_CHARACTERS.filter((c) => c.gender === "female")
  const maleCharacters = LIVE_AVATAR_CHARACTERS.filter((c) => c.gender === "male")

  return (
    <select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {inheritLabel && <option value="">{inheritLabel}</option>}
      <optgroup label="Female avatars">
        {femaleCharacters.map((character) => (
          <option key={character.id} value={character.id}>
            {formatLiveAvatarCharacterLabel(character)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Male avatars">
        {maleCharacters.map((character) => (
          <option key={character.id} value={character.id}>
            {formatLiveAvatarCharacterLabel(character)}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
