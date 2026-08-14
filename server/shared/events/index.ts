import type { Direction, PlayerState, Conversation, ZoneState, InviteState, RecadoMessage, ZoneMusic } from "../types";

// ──────────────────────────────────────────────
// Events sent FROM client TO server
// ──────────────────────────────────────────────

export interface ClientPlayerJoin {
  type: "PLAYER_JOIN";
  playerId: string;
  name: string;
  roomId: string;
}

export interface ClientPlayerMove {
  type: "PLAYER_MOVE";
  playerId: string;
  x: number;
  y: number;
  direction: Direction;
  animation: string;
}

export interface ClientFocusToggle {
  type: "FOCUS_TOGGLE";
  enable: boolean;
}

export interface ClientZoneEnter {
  type: "ZONE_ENTER";
  zoneId: string;
}

export interface ClientZoneLeave {
  type: "ZONE_LEAVE";
  zoneId: string;
}

export interface ClientZoneJoinConfirm {
  type: "ZONE_JOIN_CONFIRM";
  zoneId: string;
}

export interface ClientZoneJoinCancel {
  type: "ZONE_JOIN_CANCEL";
  zoneId: string;
}

export interface ClientInviteSend {
  type: "INVITE_SEND";
  toPlayerId: string;
}

export interface ClientInviteRespond {
  type: "INVITE_RESPOND";
  inviteId: string;
  accept: boolean;
}

export interface ClientConversationLeave {
  type: "CONVERSATION_LEAVE";
}

export interface ClientRecadoSend {
  type: "RECADO_SEND";
  toPlayerId: string;
  content: string;
}

export interface ClientRecadosSeen {
  type: "RECADOS_SEEN";
}

export interface ClientSpotifySetTrack {
  type:       "SPOTIFY_SET_TRACK";
  zoneId:     string;
  trackUri:   string;
  trackName:  string;
  artistName: string;
}

export interface ClientSpotifyToggle {
  type:      "SPOTIFY_TOGGLE";
  zoneId:    string;
  isPlaying: boolean;
}

export interface ClientChatSend {
  type:    "CHAT_SEND";
  content: string;
}

export type ClientEvent =
  | ClientPlayerJoin
  | ClientPlayerMove
  | ClientFocusToggle
  | ClientZoneEnter
  | ClientZoneLeave
  | ClientZoneJoinConfirm
  | ClientZoneJoinCancel
  | ClientInviteSend
  | ClientInviteRespond
  | ClientConversationLeave
  | ClientRecadoSend
  | ClientRecadosSeen
  | ClientSpotifySetTrack
  | ClientSpotifyToggle
  | ClientChatSend;

// ──────────────────────────────────────────────
// Events sent FROM server TO client
// ──────────────────────────────────────────────

export interface ServerPlayersSnapshot {
  type: "PLAYERS_SNAPSHOT";
  players: PlayerState[];
  zones: ZoneState[];
}

export interface ServerPlayerJoin {
  type: "PLAYER_JOIN";
  player: PlayerState;
}

export interface ServerPlayerLeave {
  type: "PLAYER_LEAVE";
  playerId: string;
}

export interface ServerPlayerMove {
  type: "PLAYER_MOVE";
  playerId: string;
  x: number;
  y: number;
  direction: Direction;
  animation: string;
}

export interface ServerPlayerStatus {
  type: "PLAYER_STATUS";
  playerId: string;
  status: PlayerState["status"];
}

export interface ServerInviteIncoming {
  type: "INVITE_INCOMING";
  invite: InviteState;
}

export interface ServerInviteResult {
  type: "INVITE_RESULT";
  inviteId: string;
  accepted: boolean;
  conversation?: Conversation;
}

export interface ServerInviteExpired {
  type: "INVITE_EXPIRED";
  inviteId: string;
}

export interface ServerConversationJoin {
  type: "CONVERSATION_JOIN";
  conversation: Conversation;
}

export interface ServerConversationUpdate {
  type: "CONVERSATION_UPDATE";
  conversation: Conversation;
}

export interface ServerConversationEnd {
  type: "CONVERSATION_END";
  conversationId: string;
}

export interface ServerZoneJoinPrompt {
  type: "ZONE_JOIN_PROMPT";
  zoneId: string;
  zoneName: string;
  participants: string[];
  meetUrl?: string;
  countdownMs: number;
}

export interface ServerZoneState {
  type: "ZONE_STATE";
  zone: ZoneState;
}

export interface ServerRecadosPending {
  type: "RECADOS_PENDING";
  messages: RecadoMessage[];
}

export interface ServerZoneMusic {
  type:   "ZONE_MUSIC";
  zoneId: string;
  music:  ZoneMusic | null;
}

export interface ServerChatMessage {
  type:       "CHAT_MESSAGE";
  playerId:   string;
  playerName: string;
  content:    string;
  sentAt:     string;
}

export interface ServerError {
  type: "ERROR";
  message: string;
}

export type ServerEvent =
  | ServerPlayersSnapshot
  | ServerPlayerJoin
  | ServerPlayerLeave
  | ServerPlayerMove
  | ServerPlayerStatus
  | ServerInviteIncoming
  | ServerInviteResult
  | ServerInviteExpired
  | ServerConversationJoin
  | ServerConversationUpdate
  | ServerConversationEnd
  | ServerZoneJoinPrompt
  | ServerZoneState
  | ServerRecadosPending
  | ServerZoneMusic
  | ServerChatMessage
  | ServerError;
