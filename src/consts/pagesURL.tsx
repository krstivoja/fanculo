const navItems = [
    {
      path: '/editor',
      label: 'Editor',
      icon: '✏️',
      description: 'Create and edit blocks'
    },
    ...(window.fanculo_ajax.user_can.manage_options ? [
      {
        path: '/settings',
        label: 'Settings',
        icon: '⚙️',
        description: 'Plugin configuration'
      },
      {
        path: '/license',
        label: 'License',
        icon: '🔑',
        description: 'License management'
      }
    ] : [])
  ]

export default navItems