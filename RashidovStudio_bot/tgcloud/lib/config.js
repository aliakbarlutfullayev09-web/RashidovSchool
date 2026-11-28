const env = globalThis.process?.env || {};

export const CONFIG = {
  SUPABASE_URL: env.SUPABASE_URL || '',
  SUPABASE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '',
  ADMIN_WEBAPP_URL: env.ADMIN_WEBAPP_URL || 'https://lms-admin-app.vercel.app',
  STUDENT_BOT_TOKEN: env.STUDENT_BOT_TOKEN || env.BOT_TOKEN || '',
};
