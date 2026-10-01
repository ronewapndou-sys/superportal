import type { Role } from './roles'

export interface HelpTopic {
  roles: Role[]
  /** extra steps only XDS staff see */
  staffSteps?: string[]
  id: string
  question: string
  steps: string[]
  to: string
  cta: string
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'find',
    roles: ['super','clientAdmin'],
    question: 'How do I find a user?',
    steps: [
      'Open Search / Update Users.',
      'Type a name, username or email. You can also filter by status.',
      'Click Search. Results show 25 per page.',
    ],
    to: '/admin/users/search',
    cta: 'Search users',
  },
  {
    id: 'edit',
    roles: ['super','clientAdmin'],
    question: 'How do I change a user’s details?',
    steps: [
      'Find the user, then click Edit on their row.',
      'Update the fields in the Review System User window.',
      'Click OK to save.',
    ],
    staffSteps: ['XDS staff: leave “Sync changes” ticked to push the update to the other web services.'],
    to: '/admin/users/search',
    cta: 'Search users',
  },
  {
    id: 'add',
    roles: ['super','clientAdmin'],
    question: 'How do I add a new user?',
    steps: [
      'Open Add User and fill in the name, username, email, institution and access level.',
      'Click Create user.',
      'If the welcome email doesn’t arrive, use Resend Mail.',
    ],
    to: '/admin/users/add',
    cta: 'Add a user',
  },
  {
    id: 'deactivate',
    roles: ['super','clientAdmin'],
    question: 'How do I remove someone’s access without deleting them?',
    steps: [
      'Open Deactivate User and search for the user.',
      'Click Select, check the details, then click Deactivate user.',
      'To undo this later, use Activate User.',
    ],
    to: '/admin/users/deactivate',
    cta: 'Deactivate a user',
  },
  {
    id: 'activate',
    roles: ['super','clientAdmin'],
    question: 'How do I restore a disabled account?',
    steps: [
      'Open Activate User. Only disabled users are listed.',
      'Search for the user, click Select, then click Activate user.',
    ],
    to: '/admin/users/activate',
    cta: 'Activate a user',
  },
  {
    id: 'password',
    roles: ['super','clientAdmin'],
    question: 'How do I reset a password?',
    steps: [
      'Open Reset Password and search for the user.',
      'Click Select, then click Reset password.',
    ],
    to: '/admin/users/reset-password',
    cta: 'Reset a password',
  },
  {
    id: 'delete',
    roles: ['super'],
    question: 'How do I permanently delete a user?',
    steps: [
      'Deleting cannot be undone. If you only need to block access, deactivate the user instead.',
      'Open Delete User, search for the user, click Select, then click Permanently delete user.',
    ],
    to: '/admin/users/delete',
    cta: 'Delete a user',
  },
  {
    id: 'manual',
    roles: ['super','clientAdmin','user'],
    question: 'Where is the user manual?',
    steps: ['The full PDF guide is on the User Manual page.'],
    to: '/admin/user-manual',
    cta: 'Open User Manual',
  },
  {
    id: 'profile',
    roles: ['clientAdmin', 'user'],
    question: 'How do I update my contact details?',
    steps: ['Open My Profile.', 'Change your name, email or cellular number.', 'Click Save changes.'],
    to: '/admin/account/profile',
    cta: 'My Profile',
  },
  {
    id: 'mypassword',
    roles: ['clientAdmin', 'user'],
    question: 'How do I change my own password?',
    steps: ['Open Change Password.', 'Enter your current password, then your new one twice.', 'Click Update password.'],
    to: '/admin/account/password',
    cta: 'Change Password',
  },
]
