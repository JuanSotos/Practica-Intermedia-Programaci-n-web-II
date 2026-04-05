import { EventEmitter } from 'node:events';

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.#registerListeners();
  }

  #registerListeners() {
    this.on('user:registered', (data) => {
      console.log(`[EVENT] user:registered — Email: ${data.email}, Code: ${data.verificationCode}`);
    });

    this.on('user:verified', (data) => {
      console.log(`[EVENT] user:verified — Email: ${data.email}`);
    });

    this.on('user:invited', (data) => {
      console.log(`[EVENT] user:invited — Email: ${data.email}, Company: ${data.companyId}`);
    });

    this.on('user:deleted', (data) => {
      console.log(`[EVENT] user:deleted — UserId: ${data.userId}, Soft: ${data.soft}`);
    });
  }
}

const notificationService = new NotificationService();

export default notificationService;
