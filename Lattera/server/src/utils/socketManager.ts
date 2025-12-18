/**
 * Socket.io Manager
 * Global instance of SocketHandler for use throughout the application
 */

import SocketHandler from '../websocket/socketHandler';

let socketHandler: SocketHandler | null = null;

export const setSocketHandler = (handler: SocketHandler): void => {
  socketHandler = handler;
};

export const getSocketHandler = (): SocketHandler | null => {
  return socketHandler;
};

export default {
  setSocketHandler,
  getSocketHandler,
};
