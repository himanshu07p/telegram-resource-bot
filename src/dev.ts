import { bot } from './bot';

console.log('Starting bot in development mode...');

bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} is up and running!`);
  },
});
