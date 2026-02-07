import { webhookCallback } from 'grammy';
import { bot } from './bot';

export const webhookHandler = webhookCallback(bot, "http");
