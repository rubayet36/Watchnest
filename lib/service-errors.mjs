export function databaseFailure(error) {
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error?.code)) {
    return { code: 'DATABASE_SETUP_REQUIRED', error: 'Episode and reporting features need a database update. The site administrator must apply the Watch Experience migration.' }
  }
  if (error?.code === '42501') {
    return { code: 'DATABASE_PERMISSION_DENIED', error: 'This feature could not access its database. The site administrator must check database grants and access policies.' }
  }
  if (error?.code === 'SERVER_CONFIG_MISSING') {
    return { code: 'SERVER_CONFIG_MISSING', error: 'Episode following is not configured on this server. Please contact the site administrator.' }
  }
  return { code: 'DATABASE_UNAVAILABLE', error: 'This feature is temporarily unavailable. Please try again later.' }
}
