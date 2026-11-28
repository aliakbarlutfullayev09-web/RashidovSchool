const env = globalThis.process?.env || {};

export const CONFIG = {
  SUPABASE_URL: env.SUPABASE_URL || '',
  SUPABASE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '',
  STUDENT_WEBAPP_URL: env.STUDENT_WEBAPP_URL || 'https://rashidov-school.vercel.app',
  SUPPORT_USERNAME: env.SUPPORT_USERNAME || 'mynus_x',
  BOT_USERNAME: env.BOT_USERNAME || 'RashidovSchool_bot',
};

export const STARS_PRICES = {
  5: 1250,
  100: 25000,
  400: 100000,
  600: 150000,
  1000: 250000,
  3500: 1000000,
};
