/**
 * Centralized nav menu config. Used by NavBar for desktop dropdowns and mobile accordions.
 * - Single item: { label, to }
 * - Group: { label, items: [{ label, to, badge?: 'notifStore.unreadCount' }] }
 * The Projects item label is overridden dynamically from project_description setting.
 */
export const baseNavGroups = [
  { label: 'Dashboard', to: '/' },
  {
    label: 'Work',
    items: [
      { label: 'Projects', to: '/projects' },
      { label: 'Tasks', to: '/tasks' },
      { label: 'Personal TODO', to: '/personal-todos' },
      { label: 'Planner', to: '/planner' },
    ],
  },
  {
    label: 'People & Time',
    items: [
      { label: 'Team Schedule', to: '/team' },
      { label: 'Team Members', to: '/team/members' },
      { label: 'Shifts', to: '/shifts' },
      { label: 'Reminders', to: '/reminders' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Notifications', to: '/notifications', badge: 'notif' },
      { label: 'Settings', to: '/settings' },
    ],
  },
]
