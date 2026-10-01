/** super = XDS staff; clientAdmin = a client's institution administrator; user = a normal client user */
export type Role = 'super' | 'clientAdmin' | 'user'

export const roleLabels: Record<Role, string> = {
  super: 'XDS Super User',
  clientAdmin: 'Client Admin',
  user: 'Normal User',
}
