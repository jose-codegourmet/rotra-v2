import { Card } from '@rotra/ui/card'
import { Icon } from '@rotra/ui/icon'
import { ListRow } from '@rotra/ui/list-row'
import { Switch } from '@rotra/ui/switch'

export type SettingsListProps =
  | {
      section: 'account'
      onEditProfile: () => void
      onOpenPrivacy: () => void
      onOpenVerification: () => void
    }
  | {
      section: 'device'
      darkMode: boolean
      onDarkModeChange: (checked: boolean) => void
    }

const ROW_CLASS =
  'min-h-14 px-1! py-2 text-[15px] leading-normal [&>span:first-of-type]:gap-0.5 [&_b]:font-bold'
const ICON_CLASS = 'shrink-0 text-fg2'

/** One group on P-SETTINGS. The page supplies the actions and the current theme. */
export function SettingsList(props: SettingsListProps) {
  if (props.section === 'device') {
    return (
      <Card asChild>
        <section aria-label="This device" className="flex flex-col gap-1.5">
          <h2>This device</h2>
          <ListRow
            className={ROW_CLASS}
            leading={<Icon name={props.darkMode ? 'moon' : 'sun'} className={ICON_CLASS} />}
            title="Dark mode"
            subtitle="Saved on this device"
            trailing={
              <Switch
                aria-label="Dark mode"
                checked={props.darkMode}
                onChange={props.onDarkModeChange}
                className="before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] touch:before:-inset-y-1.5"
              />
            }
          />
        </section>
      </Card>
    )
  }

  const rows = [
    {
      icon: 'user',
      size: 18,
      title: 'Edit profile',
      subtitle: 'Name, photo, playing style and links',
      onClick: props.onEditProfile,
    },
    {
      icon: 'lock',
      size: 16,
      title: 'Privacy and contact',
      subtitle: 'Who sees your profile and phone, and contact changes',
      onClick: props.onOpenPrivacy,
    },
    {
      icon: 'shield',
      size: 18,
      title: 'Verification',
      subtitle: 'Google account, mobile number and email',
      onClick: props.onOpenVerification,
    },
  ] as const

  return (
    <Card asChild>
      <section
        aria-label="Account"
        className="flex flex-col gap-1.5 [&>button+button]:border-t [&>button+button]:border-border"
      >
        <h2>Account</h2>
        {rows.map(({ icon, size, title, subtitle, onClick }) => (
          <ListRow
            key={title}
            className={`${ROW_CLASS} cursor-pointer hover:bg-transparent!`}
            leading={<Icon name={icon} size={size} className={ICON_CLASS} />}
            title={title}
            subtitle={subtitle}
            trailing={<Icon name="forward" className={ICON_CLASS} />}
            onClick={onClick}
          />
        ))}
      </section>
    </Card>
  )
}
