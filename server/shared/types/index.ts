export type Direction = "up" | "down" | "left" | "right";
export type PlayerStatus = "livre" | "em_foco" | "em_reuniao" | "ausente" | "em_descanso";

export interface Position {
  x: number;
  y: number;
}

export type Accessory = "none" | "hat" | "glasses";

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  animation: string;
  avatarSkin: string;
  shirtIndex: number;
  hairColor: string;
  accessory: Accessory;
  pantsColor: string;
  status: PlayerStatus;
}

export interface Conversation {
  id: string;
  meetUrl: string;
  participants: string[];
  zoneId?: string;
  startedAt: string;
}

export interface ZoneState {
  zoneId: string;
  zoneName: string;
  autoJoin: boolean;
  occupants: string[];
  conversationId?: string;
  meetUrl?: string;
}

export interface InviteState {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  expiresAt: string;
}

export interface RecadoMessage {
  id: string;
  fromId: string;
  fromName: string;
  content: string;
  sentAt: string;
}

export interface ZoneMusic {
  trackUri:   string;
  trackName:  string;
  artistName: string;
  startedAt:  number;
  isPlaying:  boolean;
  djId:       string;
  djName:     string;
}

export interface TileLayer {
  id: number;
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
}

export interface ObjectLayer {
  id: number;
  name: string;
  type: "objectgroup";
  objects: MapObject[];
  visible: boolean;
  opacity: number;
}

export interface MapObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, string | number | boolean>;
}

export type Layer = TileLayer | ObjectLayer;

export interface Tileset {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  spacing: number;
  margin: number;
  columns: number;
  tilecount: number;
  imagewidth: number;
  imageheight: number;
  image: string;
}

export interface GameMap {
  version: string;
  tiledversion: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Layer[];
  tilesets: Tileset[];
  properties?: Record<string, string | number | boolean>;
}
