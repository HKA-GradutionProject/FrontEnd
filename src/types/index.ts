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
  total_qty: number;
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
  current_zone_id?: number | null;
}

export interface RfidLiveSocketVariant {
  id: number;
  item_id?: number;
  current_zone_id?: number | null;
  rfid_tag_code?: string | null;
  qty?: number;
}

export interface RfidLiveSocketZone {
  id: number;
  name: string;
  zone_type: string;
}

export interface RfidLiveSocketEvent {
  type:
    | 'rfid_detection_event'
    | 'rfid_registered_entry_approved'
    | 'rfid_unregistered_entry_warning'
    | 'rfid_ordered_exit_approved'
    | 'rfid_security_warning';
  event_id: number;
  label: string;
  tag: string;
  rssi: number;
  distance: string;
  movement_detected: boolean;
  notification_role?: 'operation' | 'security' | string;
  item?: RfidLiveSocketItem | null;
  variant?: RfidLiveSocketVariant | null;
  from_zone?: RfidLiveSocketZone | null;
  to_zone?: RfidLiveSocketZone | null;
  reader?: Partial<Reader> & { id?: number; name?: string; reader_device_id?: string };
  rpi?: Partial<RpiDevice> & { id?: number; device_id?: string; name?: string };
  rpi_device?: Partial<RpiDevice> & { id?: number; device_id?: string; name?: string };
  detected_at?: string;
  received_at?: string;
  raw_payload?: any;
}

export interface Alert {
  id: string;
  type: 'Unauthorized Exit' | 'Unknown Entry' | 'Missing Item' | 'Low Battery' | 'Reader Offline';
  itemId?: number;
  itemName?: string;
  rfidTag?: string;
  readerName?: string;
  zoneId?: string;
  time: string;
  status: 'new' | 'reviewed' | 'resolved' | 'false_alarm';
}

export interface Employee {
  id: number;
  name: string;
  email: string | null;
  role: 'admin' | 'operation' | 'security';
  phone: string | null;
  job_title: string | null;
  department: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  readerPollIntervalSeconds: number;
  gateDetectionWindowMinutes: number;
  missingItemThresholdMinutes: number;
  stolenItemThresholdMinutes: number;
  staleReaderThresholdMinutes: number;
  liveReconnectDelaySeconds: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_id: number;
  variant_id: number | null;
  quantity: number;
  unit_price: number | null;
  approved_physically: boolean | null;
  qty_before: number;
  qty_after: number;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  total_items: number;
  total_price: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  order_items: OrderItem[];
  created_at: string;
  updated_at: string;
}
