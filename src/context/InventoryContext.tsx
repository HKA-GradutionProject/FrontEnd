import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Item, Reader, RFIDEvent, Zone, Alert, Order, RpiDevice, ZoneSummary, RfidLiveSocketEvent } from '../types';
import { mockItems, mockReaders, mockEvents, mockZones, mockAlerts, mockOrders, mockRpiDevices } from '../data/mockData';
import { toast } from 'sonner';
import { fetchApiResource } from '@/lib/api';
import { getWebSocketUrl } from '../config';

type InventoryResourceKey = 'items' | 'readers' | 'events' | 'zones' | 'zoneSummary' | 'rpiDevices';
type InventoryResourceFlags = Record<InventoryResourceKey, boolean>;
type LiveConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface InventoryContextType {
  items: Item[];
  readers: Reader[];
  events: RFIDEvent[];
  zones: Zone[];
  zoneSummary: ZoneSummary | null;
  alerts: Alert[];
  orders: Order[];
  rpiDevices: RpiDevice[];
  loading: InventoryResourceFlags;
  loaded: InventoryResourceFlags;
  liveConnectionStatus: LiveConnectionStatus;
  simulateMovement: (itemId: number, targetZoneId: number) => void;
  simulateExit: (itemId: number) => void;
  resolveAlert: (alertId: string, status: Alert['status']) => void;
  fetchItems: () => Promise<void>;
  fetchReaders: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchZones: () => Promise<void>;
  fetchZoneSummary: () => Promise<void>;
  fetchRpiDevices: () => Promise<void>;
  connectLiveEvents: () => void;
  disconnectLiveEvents: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const initialResourceFlags: InventoryResourceFlags = {
  items: false,
  readers: false,
  events: false,
  zones: false,
  zoneSummary: false,
  rpiDevices: false,
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [events, setEvents] = useState<RFIDEvent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneSummary, setZoneSummary] = useState<ZoneSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [rpiDevices, setRpiDevices] = useState<RpiDevice[]>([]);
  const [loading, setLoading] = useState<InventoryResourceFlags>(initialResourceFlags);
  const [loaded, setLoaded] = useState<InventoryResourceFlags>(initialResourceFlags);
  const [liveConnectionStatus, setLiveConnectionStatus] = useState<LiveConnectionStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const maintainLiveConnectionRef = useRef(false);

  const fetchItems = useCallback(async () => {
    setLoading(prev => ({ ...prev, items: true }));
    try {
      const data = await fetchApiResource<Item[]>('/items');
      setItems(data);
    } catch (e) {
      console.error("Failed to fetch items", e);
      setItems(mockItems);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
      setLoaded(prev => ({ ...prev, items: true }));
    }
  }, []);

  const fetchReaders = useCallback(async () => {
    setLoading(prev => ({ ...prev, readers: true }));
    try {
      const data = await fetchApiResource<Reader[]>('/rfid-readers');
      setReaders(data);
    } catch (e) {
      console.error("Failed to fetch readers", e);
      setReaders(mockReaders);
    } finally {
      setLoading(prev => ({ ...prev, readers: false }));
      setLoaded(prev => ({ ...prev, readers: true }));
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(prev => ({ ...prev, events: true }));
    try {
      const data = await fetchApiResource<RFIDEvent[]>('/rfid/detections');
      setEvents(data);
    } catch (e) {
      console.error("Failed to fetch events", e);
      setEvents(mockEvents);
    } finally {
      setLoading(prev => ({ ...prev, events: false }));
      setLoaded(prev => ({ ...prev, events: true }));
    }
  }, []);

  const fetchZones = useCallback(async () => {
    setLoading(prev => ({ ...prev, zones: true }));
    try {
      const data = await fetchApiResource<Zone[]>('/zones');
      setZones(data);
    } catch (e) {
      console.error("Failed to fetch zones", e);
      setZones(mockZones);
    } finally {
      setLoading(prev => ({ ...prev, zones: false }));
      setLoaded(prev => ({ ...prev, zones: true }));
    }
  }, []);

  const fetchZoneSummary = useCallback(async () => {
    setLoading(prev => ({ ...prev, zoneSummary: true }));
    try {
      const data = await fetchApiResource<ZoneSummary>('/zones/summary');
      setZoneSummary(data);
    } catch (e) {
      console.error("Failed to fetch zone summary", e);
      setZoneSummary(null);
    } finally {
      setLoading(prev => ({ ...prev, zoneSummary: false }));
      setLoaded(prev => ({ ...prev, zoneSummary: true }));
    }
  }, []);

  const fetchRpiDevices = useCallback(async () => {
    setLoading(prev => ({ ...prev, rpiDevices: true }));
    try {
      const data = await fetchApiResource<RpiDevice[]>('/rpi-devices');
      setRpiDevices(data);
    } catch (e) {
      console.error("Failed to fetch rpi devices", e);
      setRpiDevices(mockRpiDevices);
    } finally {
      setLoading(prev => ({ ...prev, rpiDevices: false }));
      setLoaded(prev => ({ ...prev, rpiDevices: true }));
    }
  }, []);

  const applyLiveEvent = useCallback((liveEvent: RfidLiveSocketEvent) => {
    const timestamp = liveEvent.received_at || liveEvent.detected_at || new Date().toISOString();

    setEvents(prev => {
      const nextEvent: RFIDEvent = {
        id: liveEvent.event_id,
        rpi_device_id: liveEvent.rpi?.id || 0,
        reader_id: liveEvent.reader?.id || 0,
        zone_id: liveEvent.to_zone?.id || liveEvent.item?.current_zone_id || 0,
        item_id: liveEvent.item?.id || 0,
        rpi_device_code: liveEvent.rpi?.device_id || '',
        reader_name: liveEvent.reader?.name || '',
        reader_device_code: liveEvent.reader?.reader_device_id || '',
        reader_id_unique: Boolean(liveEvent.reader?.reader_id_unique),
        label: liveEvent.label || liveEvent.item?.name || 'Unknown item',
        tag: liveEvent.tag,
        rssi: liveEvent.rssi,
        distance: liveEvent.distance,
        movement_detected: liveEvent.movement_detected,
        detected_at: liveEvent.detected_at || timestamp,
        received_at: timestamp,
        raw_payload: liveEvent,
      };

      return [nextEvent, ...prev.filter(event => event.id !== nextEvent.id)].slice(0, 50);
    });

    if (liveEvent.item) {
      setItems(prev => prev.map(item => {
        if (item.id !== liveEvent.item?.id) {
          return item;
        }

        return {
          ...item,
          name: liveEvent.item.name || item.name,
          current_zone_id: liveEvent.item.current_zone_id,
        };
      }));
    }

    if (liveEvent.item && liveEvent.to_zone) {
      setZoneSummary(prev => {
        if (!prev) {
          return prev;
        }

        const nextZones = prev.zones.map(zone => ({
          ...zone,
          items: [...zone.items],
        }));

        const liveItem = {
          id: liveEvent.item.id,
          name: liveEvent.item.name,
        };

        nextZones.forEach(zone => {
          if (zone.id === liveEvent.to_zone?.id) {
            zone.items = zone.items.filter(item => item.id !== liveItem.id);
            zone.items.unshift(liveItem);
            zone.items_count = zone.items.length;
            return;
          }

          const hadItem = zone.items.some(item => item.id === liveItem.id);
          if (hadItem) {
            zone.items = zone.items.filter(item => item.id !== liveItem.id);
            zone.items_count = zone.items.length;
          }
        });

        if (!nextZones.some(zone => zone.id === liveEvent.to_zone?.id)) {
          nextZones.push({
            id: liveEvent.to_zone.id,
            name: liveEvent.to_zone.name,
            items_count: 1,
            items: [liveItem],
          });
        }

        return {
          ...prev,
          zones: nextZones,
        };
      });
    }
  }, []);

  const openLiveSocket = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const socket = new WebSocket(getWebSocketUrl('/ws/rfid-events'));
    socketRef.current = socket;
    setLiveConnectionStatus('connecting');

    socket.onopen = () => {
      console.log('[Inventory] WebSocket connected');
      setLiveConnectionStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RfidLiveSocketEvent;
        console.log('[Inventory] WebSocket message', data);

        if (data.type === 'rfid_detection_event') {
          applyLiveEvent(data);
        }
      } catch (error) {
        console.error('[Inventory] Failed to parse WebSocket message', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[Inventory] WebSocket error', error);
    };

    socket.onclose = () => {
      console.log('[Inventory] WebSocket disconnected');

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setLiveConnectionStatus('disconnected');

      if (maintainLiveConnectionRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          openLiveSocket();
        }, 2000);
      }
    };
  }, [applyLiveEvent]);

  const connectLiveEvents = useCallback(() => {
    maintainLiveConnectionRef.current = true;
    openLiveSocket();
  }, [openLiveSocket]);

  const disconnectLiveEvents = useCallback(() => {
    maintainLiveConnectionRef.current = false;

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const activeSocket = socketRef.current;
    socketRef.current = null;

    if (activeSocket && activeSocket.readyState !== WebSocket.CLOSED) {
      activeSocket.close();
    }

    setLiveConnectionStatus('disconnected');
  }, []);

  const addEvent = useCallback((event: Partial<RFIDEvent>) => {
    // Note: in a real application this would post to backend. For simulation:
    const newEvent = {
      ...event,
      id: Date.now(),
      received_at: new Date().toISOString(),
    } as RFIDEvent;
    
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  }, []);

  const simulateMovement = useCallback((itemId: number, targetZoneId: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const reader = readers.find(r => r.zone_id === targetZoneId);
        if (reader && item.rfid_tag_code) {
          addEvent({
            rpi_device_id: reader.rpi_device_id,
            reader_name: reader.name,
            reader_id: reader.id,
            reader_id_unique: reader.reader_id_unique,
            label: item.label || 'Unknown',
            tag: item.rfid_tag_code,
            rssi: Math.floor(Math.random() * 50) + 150,
            distance: 'CLOSE',
          });
        }
        return { ...item, current_zone_id: targetZoneId };
      }
      return item;
    }));
    toast("Item Moved", { description: `Item has been moved to ${zones.find(z => z.id === targetZoneId)?.name}` });
  }, [readers, addEvent, zones]);

  const simulateExit = useCallback((itemId: number) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;

      const isOrdered = item.status === 'ordered';
      const exitReader = readers.find(r => r.reader_type === 'exit_reader');
      const exitZoneId = zones.find(z => z.zone_type?.includes('exit'))?.id || 999;
      
      if (exitReader && item.rfid_tag_code) {
         addEvent({
            rpi_device_id: exitReader.rpi_device_id,
            reader_name: exitReader.name,
            reader_id: exitReader.id,
            reader_id_unique: exitReader.reader_id_unique,
            label: item.label || 'Unknown',
            tag: item.rfid_tag_code,
            rssi: Math.floor(Math.random() * 30) + 200,
            distance: 'CLOSE',
          });
      }

      if (!isOrdered) {
        setAlerts(prevAlerts => [{
          id: `alt-${Date.now()}`,
          type: 'Unauthorized Exit',
          itemId: item.id,
          itemName: item.name,
          rfidTag: item.rfid_tag_code || undefined,
          readerName: exitReader?.name,
          zoneId: exitZoneId.toString(),
          time: new Date().toISOString(),
          status: 'new'
        }, ...prevAlerts]);
        
        toast.error("Unauthorized Exit Detected!", {
          description: `${item.name} passed the exit gate without a valid order.`
        });
        
        return prev.map(i => i.id === itemId ? { ...i, current_zone_id: exitZoneId, status: 'alert' } : i);
      } else {
        toast.success("Valid Order Exit", {
          description: `${item.name} has successfully left the warehouse.`
        });
        // Remove from order, set as sold
        return prev.map(i => i.id === itemId ? { ...i, current_zone_id: exitZoneId, status: 'sold' } : i);
      }
    });
  }, [readers, addEvent, zones]);

  const resolveAlert = useCallback((alertId: string, status: Alert['status']) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
  }, []);

  useEffect(() => {
    return () => {
      maintainLiveConnectionRef.current = false;

      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <InventoryContext.Provider value={{
      items,
      readers,
      events,
      zones,
      zoneSummary,
      alerts,
      orders,
      rpiDevices,
      loading,
      loaded,
      liveConnectionStatus,
      simulateMovement,
      simulateExit,
      resolveAlert,
      fetchItems,
      fetchReaders,
      fetchEvents,
      fetchZones,
      fetchZoneSummary,
      fetchRpiDevices,
      connectLiveEvents,
      disconnectLiveEvents,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
