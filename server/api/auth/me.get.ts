import { getUserFromSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  return {
    authenticated: Boolean(user),
    user
  }
})
