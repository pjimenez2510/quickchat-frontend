import { io, Socket } from 'socket.io-client';
import {
  qcipherEncrypt,
  qcipherDecrypt,
  isEncryptedPayload,
} from './crypto/qcipher';

const SOCKET_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3002';

/**
 * Eventos internos de socket.io que NO se cifran (control de conexión).
 */
const RESERVED_EVENTS = new Set([
  'connect',
  'disconnect',
  'connect_error',
  'reconnect',
  'reconnect_attempt',
  'reconnect_error',
  'reconnect_failed',
  'error',
  'newListener',
  'removeListener',
  'ping',
  'pong',
]);

function encryptArg(arg: unknown): unknown {
  if (arg === undefined || arg === null) return arg;
  if (typeof arg === 'function') return arg;
  return qcipherEncrypt(JSON.stringify(arg));
}

function decryptArg(arg: unknown): unknown {
  if (arg === undefined || arg === null) return arg;
  if (isEncryptedPayload(arg)) {
    try {
      return JSON.parse(qcipherDecrypt(arg));
    } catch {
      return arg;
    }
  }
  return arg;
}

/**
 * Mapa de handler original → handler envuelto, para que socket.off encuentre
 * el wrapper cuando se llama con la referencia original.
 */
const handlerMap = new WeakMap<object, (...args: unknown[]) => void>();

/**
 * Reemplaza emit/on/off del socket para que cifren/descifren TODO el
 * payload de eventos no reservados de forma transparente.
 */
function patchSocket(s: Socket): Socket {
  const originalEmit = s.emit.bind(s) as (
    event: string,
    ...args: unknown[]
  ) => Socket;
  const originalOn = s.on.bind(s) as (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => Socket;
  const originalOff = s.off.bind(s) as (
    event?: string,
    listener?: (...args: unknown[]) => void,
  ) => Socket;

  s.emit = function (event: string, ...args: unknown[]): Socket {
    if (RESERVED_EVENTS.has(event)) {
      return originalEmit(event, ...args);
    }
    // Si el último arg es función → callback ack: lo dejamos sin cifrar y
    // envolvemos su invocación para descifrar lo que devuelva el servidor.
    let ackCb: ((...a: unknown[]) => void) | undefined;
    let dataArgs = args;
    if (args.length > 0 && typeof args[args.length - 1] === 'function') {
      ackCb = args[args.length - 1] as (...a: unknown[]) => void;
      dataArgs = args.slice(0, -1);
    }
    const encryptedArgs = dataArgs.map(encryptArg);

    if (ackCb) {
      const cbRef = ackCb;
      const wrappedAck = (...ackArgs: unknown[]): void => {
        cbRef(...ackArgs.map(decryptArg));
      };
      return originalEmit(event, ...encryptedArgs, wrappedAck);
    }
    return originalEmit(event, ...encryptedArgs);
  } as typeof s.emit;

  s.on = function (
    event: string,
    listener: (...args: unknown[]) => void,
  ): Socket {
    if (RESERVED_EVENTS.has(event)) {
      return originalOn(event, listener);
    }
    const wrapped = (...args: unknown[]): void => {
      listener(...args.map(decryptArg));
    };
    handlerMap.set(listener, wrapped);
    return originalOn(event, wrapped);
  } as typeof s.on;

  s.off = function (
    event?: string,
    listener?: (...args: unknown[]) => void,
  ): Socket {
    if (listener && handlerMap.has(listener)) {
      return originalOff(event, handlerMap.get(listener));
    }
    return originalOff(event, listener);
  } as typeof s.off;

  return s;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
    patchSocket(socket);
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  const s = getSocket();

  if (token) {
    s.auth = { token };
  }

  if (!s.connected) {
    s.connect();
  }

  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
