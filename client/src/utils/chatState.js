/**
 * Which chat conversation is on screen right now, so notifications skip messages the
 * person is already looking at. Set by the chat page; read by ChatNotifier.
 */
let activeRoomId = null;

export const setActiveChatRoom = (id) => { activeRoomId = id ? Number(id) : null; };
export const getActiveChatRoom = () => activeRoomId;
