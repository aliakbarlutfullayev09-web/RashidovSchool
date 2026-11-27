import { api } from 'sdk';

export default async function () {
  await api.setMyCommands({
    commands: [
      { command: 'start', description: 'Профиль и панель управления' },
      { command: 'user', description: 'Профиль ученика (/user ID или имя)' },
      { command: 'gift', description: 'Начислить Нейроны ученику' },
      { command: 'send', description: 'Рассылка по ученикам' },
      { command: 'help', description: 'Список команд бота' },
    ],
  });

  return { ok: true };
}
