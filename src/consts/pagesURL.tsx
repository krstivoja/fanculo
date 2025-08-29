import { BlocksIcon, SettingsIcon, LicenceIcon } from '../ui/icons/Icons.jsx'

const navItems = [
    {
      path: '/editor',
      label: 'Editor',
      icon: BlocksIcon,
      description: 'Create and edit blocks'
    },
    ...(window.fanculo_ajax.user_can.manage_options ? [
      {
        path: '/settings',
        label: 'Settings',
        icon: SettingsIcon,
        description: 'Plugin configuration'
      },
      {
        path: '/license',
        label: 'License',
        icon: LicenceIcon,
        description: 'License management'
      }
    ] : [])
  ]

export default navItems