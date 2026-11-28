import { api } from 'sdk';
import { CONFIG } from '../lib/config.js';

export default async function () {
  await api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: '🚀 Учиться',
      web_app: { url: CONFIG.STUDENT_WEBAPP_URL },
    },
  });

  await api.setMyCommands({
    commands: [
      { command: 'start', description: 'Boshlash / Старт' },
      { command: 'lang', description: 'Tilni tanlash / Сменить язык' },
      { command: 'support', description: 'Aloqa va yordam / Связь и помощь' },
    ],
  });

  return { ok: true };
}
