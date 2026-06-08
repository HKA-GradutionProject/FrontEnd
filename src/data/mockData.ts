import { Alert, Item, Order, Reader, RFIDEvent, Zone } from '../types';

export const mockZones: Zone[] = [
  { id: 1, name: 'Entry Zone', zone_type: 'entry', location_description: 'Entry Gate', created_at: '2026-05-19T00:00:00Z' },
  { id: 2, name: 'Shelf A', zone_type: 'shelf', location_description: 'Primary demo shelf for RFID reads', created_at: '2026-05-19T00:00:00Z' },
  { id: 3, name: 'Shelf B', zone_type: 'shelf', location_description: 'Secondary shelf', created_at: '2026-05-19T00:00:00Z' },
  { id: 4, name: 'Shelf C', zone_type: 'shelf', location_description: 'Tertiary shelf', created_at: '2026-05-19T00:00:00Z' },
  { id: 5, name: 'Exit Gate', zone_type: 'exit', location_description: 'Exit Gate', created_at: '2026-05-19T00:00:00Z' },
];

export const mockItems: Item[] = [
  { id: 1, name: 'Arduino Uno R3', description: 'Microcontroller', sku: 'ARD-001', nickname: 'Arduino', rfid_tag_code: 'E280689400004031F0E00001', label: 'TagA', current_zone_id: 2, status: 'in_stock', cost_price: 12, sold_price: 20, thumbnail: null, main_cat: 'Electronics', sub_cat: 'MCUs', variants: [], images: [], created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-19T00:00:00Z' },
  { id: 2, name: 'Raspberry Pi 4 4GB', description: 'Single Board Computer', sku: 'RPI4-001', nickname: 'RPI 4', rfid_tag_code: 'E280689400004031F0E00002', label: 'TagB', current_zone_id: 3, status: 'ordered', cost_price: 45, sold_price: 65, thumbnail: null, main_cat: 'Electronics', sub_cat: 'SBCs', variants: [], images: [], created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-19T00:00:00Z' },
  { id: 3, name: 'ESP32 Dev Module', description: 'Wi-Fi/BT MCU', sku: 'ESP-001', nickname: 'ESP32 Box', rfid_tag_code: 'E280689400004031F0E00003', label: 'TagC', current_zone_id: 2, status: 'in_stock', cost_price: 4, sold_price: 8, thumbnail: null, main_cat: 'Electronics', sub_cat: 'MCUs', variants: [], images: [], created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-19T00:00:00Z' },
  { id: 4, name: 'Breadboard Large', description: 'Solderless Breadboard', sku: 'BRD-001', nickname: 'Breadboard', rfid_tag_code: 'E280689400004031F0E00004', label: 'TagD', current_zone_id: 4, status: 'in_stock', cost_price: 2, sold_price: 5, thumbnail: null, main_cat: 'Components', sub_cat: 'Prototyping', variants: [], images: [], created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-19T00:00:00Z' },
  { id: 5, name: 'Jumper Wires M/M', description: 'Prototyping wires', sku: 'JMP-001', nickname: 'Wires Pack', rfid_tag_code: 'E280689400004031F0E00005', label: 'TagE', current_zone_id: 3, status: 'in_stock', cost_price: 1.5, sold_price: 4, thumbnail: null, main_cat: 'Components', sub_cat: 'Prototyping', variants: [], images: [], created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-19T00:00:00Z' },
];

export const mockRpiDevices = [
  { id: 1, device_id: 'pi:001', name: 'Main Raspberry Pi', status: 'online', last_seen_at: '2026-05-19T01:10:00+00:00', created_at: '2026-05-19T00:40:00+00:00' },
  { id: 2, device_id: 'pi:002', name: 'Secondary Raspberry Pi', status: 'online', last_seen_at: '2026-05-19T01:10:00+00:00', created_at: '2026-05-19T00:40:00+00:00' },
];

export const mockReaders: Reader[] = [
  { id: 1, name: 'Reader_Entry', reader_device_id: 'device:/dev/ttyUSB0', zone_id: 1, rpi_device_id: 1, reader_id_unique: false, reader_type: 'entry_reader', status: 'active', created_at: '2026-05-19T00:00:00Z' },
  { id: 2, name: 'Reader_ShelfAB', reader_device_id: 'device:/dev/ttyS0', zone_id: 2, rpi_device_id: 1, reader_id_unique: false, reader_type: 'shelf_reader', status: 'active', created_at: '2026-05-19T00:00:00Z' },
  { id: 3, name: 'Reader_ShelfC', reader_device_id: 'device:/dev/ttyACM0', zone_id: 4, rpi_device_id: 2, reader_id_unique: false, reader_type: 'shelf_reader', status: 'active', created_at: '2026-05-19T00:00:00Z' },
  { id: 4, name: 'Reader_ExitGate', reader_device_id: 'device:/dev/ttyS1', zone_id: 5, rpi_device_id: 2, reader_id_unique: false, reader_type: 'exit_reader', status: 'active', created_at: '2026-05-19T00:00:00Z' },
];

export const mockOrders: Order[] = [
  { id: 'ORD-1001', itemIds: [2], status: 'pending' },
];

export const mockAlerts: Alert[] = [
  {
    id: 'alt-001',
    type: 'Missing Item',
    itemId: 8,
    itemName: 'Servo Motor SG90',
    rfidTag: 'E280689400004031F0E00008',
    readerName: 'Reader_ShelfAB',
    zoneId: '2',
    time: new Date(Date.now() - 3600000).toISOString(),
    status: 'new'
  },
];

export const mockEvents: RFIDEvent[] = [
  { id: 1, rpi_device_id: 1, reader_name: 'Reader_ShelfAB', reader_id: 2, reader_id_unique: false, label: 'TagA', tag: 'E280689400004031F0E00001', rssi: 180, distance: 'CLOSE', received_at: new Date(Date.now() - 50000).toISOString(), detected_at: new Date(Date.now() - 50000).toISOString(), zone_id: 2, item_id: 1, rpi_device_code: 'pi:001', reader_device_code: 'device:/dev/ttyS0', raw_payload: {} },
];
