// REST and socket payloads share one ceiling so a board that saves over REST also saves over the socket.
export const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
