export interface ZoneSummary {
  zones_count: number;
  zones: {
    id: number;
    name: string;
    items_count: number;
    items: {
      id: number;
      name: string;
    }[];
  }[];
}

export interface Zone {
  id: number;
  name: string;
  zone_type: string;
  location_description: string;
  created_at: string;
}

export interface ItemVariant {
  id: number;
  item_id: number;
  current_zone_id: number | null;
  rfid_tag_code: string | null;
  qty: number;
  created_at: string;
  updated_at: string;
}

export interface ItemImage {
  id: number;
  item_id: number;
  url: string;
  spec: string | null;
  ev: string | null;
  created_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  sku: string;
  nickname: string;
  cost_price: number;
  sold_price: number;
  thumbnail: string | null;
  rfid_tag_code: string | null;
  main_cat: string;
  sub_cat: string;
  current_zone_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  variants: ItemVariant[];
  images: ItemImage[];
  label?: string | null; // mapping convenience
}

export interface Reader {
  id: number;
  rpi_device_id: number;
  zone_id: number;
  name: string;
  reader_device_id: string;
  reader_id_unique: boolean;
  reader_type: string;
  status: string;
  created_at: string;
}

export interface RpiDevice {
  id: number;
  device_id: string;
  name: string;
  status: string;
  last_seen_at: string;
  created_at: string;
}

export interface RFIDEvent {
  id: number;
  rpi_device_id: number;
  reader_id: number;
  zone_id: number;
  item_id: number;
  rpi_device_code: string;
  reader_name: string;
  reader_device_code: string;
  reader_id_unique: boolean;
  label: string;
  tag: string;
  rssi: number;
  distance: string;
  movement_detected?: boolean;
  detected_at: string;
  received_at: string;
  raw_payload: any;
}

export interface RfidLiveSocketItem {
  id: number;
  name: string;
  current_zone_id: number;
}

export interface RfidLiveSocketZone {
  id: number;
  name: string;
  zone_type: string;
}

export interface RfidLiveSocketEvent {
  type: 'rfid_detection_event';
  event_id: number;
  label: string;
  tag: string;
  rssi: number;
  distance: string;
  movement_detected: boolean;
  item?: RfidLiveSocketItem;
  from_zone?: RfidLiveSocketZone;
  to_zone?: RfidLiveSocketZone;
  reader?: Partial<Reader> & { id?: number; name?: string; reader_device_id?: string };
  rpi?: Partial<RpiDevice> & { id?: number; device_id?: string; name?: string };
  detected_at?: string;
  received_at?: string;
}

export interface Alert {
  id: string;
  type: 'Unauthorized Exit' | 'Missing Item' | 'Low Battery' | 'Reader Offline';
  itemId?: number;
  itemName?: string;
  rfidTag?: string;
  readerName?: string;
  zoneId?: string;
  time: string;
  status: 'new' | 'reviewed' | 'resolved' | 'false_alarm';
}

export interface Order {
  id: string;
  itemIds: number[];
  status: 'pending' | 'fulfilled' | 'cancelled';
}
