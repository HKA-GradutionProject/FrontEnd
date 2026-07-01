import { FormEvent, useMemo, useState } from 'react';
import { Cpu, Loader2, Pencil, Plus, RadioReceiver, Save, X } from 'lucide-react';
import { toast } from 'sonner';

import { useInventory } from '../context/InventoryContext';
import { Reader, RpiDevice } from '../types';
import { ApiError, patchApiResource, postApiResource } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type DeviceStatus = 'online' | 'offline' | 'maintenance';
type ReaderStatus = 'active' | 'inactive' | 'offline';

const DEVICE_STATUSES: DeviceStatus[] = ['online', 'offline', 'maintenance'];
const READER_STATUSES: ReaderStatus[] = ['active', 'inactive', 'offline'];
const READER_TYPES = ['shelf_reader', 'gate_reader'];

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function formatBackendResponse(data: unknown) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'The selected device, reader, or zone was not found.';
    }

    if (error.status === 409) {
      return 'Duplicate device ID, duplicate reader identity, or the selected zone is already assigned.';
    }

    if (error.status === 500) {
      return 'Database error. Please try again after checking the backend logs.';
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function getStatusBadgeClassName(status: string) {
  if (status === 'active' || status === 'online') {
    return 'bg-green-100 text-green-800 hover:bg-green-100';
  }

  if (status === 'maintenance' || status === 'inactive') {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
  }

  return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
}

function formatDeviceOption(device: RpiDevice) {
  return device.name || device.device_id || `Device ${device.id}`;
}

function formatZoneOption(zone: { id: number; name: string; zone_type?: string }) {
  return zone.name || `Zone ${zone.id}`;
}

function normalizeReaderType(value: string) {
  const readerType = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (['gate', 'gate_reader', 'entry_reader', 'exit_reader'].includes(readerType)) {
    return 'gate_reader';
  }

  if (['shelf', 'shelf_reader', 'normal', 'normal_reader'].includes(readerType)) {
    return 'shelf_reader';
  }

  return readerType || value;
}

export default function Readers() {
  const {
    readers,
    zones,
    rpiDevices,
    loading,
    loaded,
    errors,
    fetchReaders,
    fetchRpiDevices,
  } = useInventory();
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('online');
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [readerRpiDeviceId, setReaderRpiDeviceId] = useState('');
  const [readerZoneId, setReaderZoneId] = useState('');
  const [readerName, setReaderName] = useState('');
  const [readerDeviceId, setReaderDeviceId] = useState('');
  const [readerIdUnique, setReaderIdUnique] = useState(false);
  const [readerType, setReaderType] = useState('shelf_reader');
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>('active');
  const [isCreatingReader, setIsCreatingReader] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showReaderForm, setShowReaderForm] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceStatus, setEditDeviceStatus] = useState<DeviceStatus>('online');
  const [savingDeviceId, setSavingDeviceId] = useState<number | null>(null);
  const [editingReaderId, setEditingReaderId] = useState<number | null>(null);
  const [editReaderRpiDeviceId, setEditReaderRpiDeviceId] = useState('');
  const [editReaderZoneId, setEditReaderZoneId] = useState('');
  const [editReaderName, setEditReaderName] = useState('');
  const [editReaderDeviceId, setEditReaderDeviceId] = useState('');
  const [editReaderIdUnique, setEditReaderIdUnique] = useState(false);
  const [editReaderType, setEditReaderType] = useState('shelf_reader');
  const [editReaderStatus, setEditReaderStatus] = useState<ReaderStatus>('active');
  const [savingReaderId, setSavingReaderId] = useState<number | null>(null);
  const [backendResponse, setBackendResponse] = useState<{ title: string; body: string } | null>(null);

  const isLoading =
    !loaded.readers ||
    !loaded.zones ||
    !loaded.rpiDevices ||
    loading.readers ||
    loading.zones ||
    loading.rpiDevices;
  const readerTypeOptions = useMemo(() => {
    return Array.from(new Set([
      ...READER_TYPES,
      readerType,
      editReaderType,
      ...readers.map((reader) => reader.reader_type).filter(Boolean),
    ].filter(Boolean)));
  }, [editReaderType, readerType, readers]);
  const editReaderDeviceExists = Boolean(
    editReaderRpiDeviceId && rpiDevices.some((device) => String(device.id) === editReaderRpiDeviceId),
  );
  const editReaderZoneExists = Boolean(
    editReaderZoneId && zones.some((zone) => String(zone.id) === editReaderZoneId),
  );

  const rpiGroups = useMemo(() => {
    const rpiNodeIds = Array.from(new Set([
      ...rpiDevices.map((device) => device.id),
      ...readers.map((reader) => reader.rpi_device_id),
    ]));

    return rpiNodeIds.reduce((acc, rpiId) => {
      acc[rpiId] = {
        device: rpiDevices.find((device) => device.id === rpiId),
        readers: readers.filter((reader) => reader.rpi_device_id === rpiId),
      };
      return acc;
    }, {} as Record<number, { device: RpiDevice | undefined; readers: Reader[] }>);
  }, [readers, rpiDevices]);

  const hasData = Object.keys(rpiGroups).length > 0;
  const createDeviceDisabled = isCreatingDevice || !deviceId.trim() || !deviceName.trim();
  const createReaderDisabled =
    isCreatingReader ||
    !readerRpiDeviceId ||
    !readerZoneId ||
    !readerName.trim() ||
    !readerDeviceId.trim();

  const refreshDevicesAndReaders = async () => {
    await Promise.all([fetchRpiDevices(), fetchReaders()]);
  };

  const createDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createDeviceDisabled) {
      toast.error('Device ID and name are required.');
      return;
    }

    setIsCreatingDevice(true);
    try {
      const response = await postApiResource<RpiDevice>('/rpi-devices', {
        device_id: deviceId.trim(),
        name: deviceName.trim(),
        status: deviceStatus,
        last_seen_at: null,
      });
      await refreshDevicesAndReaders();
      setBackendResponse({
        title: 'Create Raspberry Pi device response',
        body: formatBackendResponse(response),
      });
      setDeviceId('');
      setDeviceName('');
      setDeviceStatus('online');
      toast.success('Raspberry Pi device created', {
        description: response.name || response.device_id,
      });
    } catch (error) {
      console.error('Create Raspberry Pi device failed', error);
      toast.error(getRequestErrorMessage(error, 'Create Raspberry Pi device failed'));
    } finally {
      setIsCreatingDevice(false);
    }
  };

  const createReader = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createReaderDisabled) {
      toast.error('Device, zone, reader name, and reader identity are required.');
      return;
    }

    setIsCreatingReader(true);
    try {
      const response = await postApiResource<Reader>('/rfid-readers', {
        rpi_device_id: Number(readerRpiDeviceId),
        zone_id: Number(readerZoneId),
        name: readerName.trim(),
        reader_device_id: readerDeviceId.trim(),
        reader_id_unique: readerIdUnique,
        reader_type: normalizeReaderType(readerType),
        status: readerStatus,
      });
      await fetchReaders();
      setBackendResponse({
        title: 'Create RFID reader response',
        body: formatBackendResponse(response),
      });
      setReaderName('');
      setReaderDeviceId('');
      setReaderIdUnique(false);
      setReaderType('shelf_reader');
      setReaderStatus('active');
      toast.success('RFID reader created', {
        description: `${response.name} | ${response.reader_type}`,
      });
    } catch (error) {
      console.error('Create RFID reader failed', error);
      toast.error(getRequestErrorMessage(error, 'Create RFID reader failed'));
    } finally {
      setIsCreatingReader(false);
    }
  };

  const startEditingDevice = (device: RpiDevice) => {
    setEditingDeviceId(device.id);
    setEditDeviceName(device.name);
    setEditDeviceStatus((DEVICE_STATUSES.includes(device.status as DeviceStatus) ? device.status : 'offline') as DeviceStatus);
  };

  const cancelEditingDevice = () => {
    setEditingDeviceId(null);
    setEditDeviceName('');
    setEditDeviceStatus('online');
  };

  const saveDevice = async (device: RpiDevice) => {
    if (!editDeviceName.trim()) {
      toast.error('Device name is required.');
      return;
    }

    setSavingDeviceId(device.id);
    try {
      const response = await patchApiResource<RpiDevice>(`/rpi-devices/${device.id}`, {
        name: editDeviceName.trim(),
        status: editDeviceStatus,
      });
      await refreshDevicesAndReaders();
      setBackendResponse({
        title: `Update Raspberry Pi device ${device.id} response`,
        body: formatBackendResponse(response),
      });
      cancelEditingDevice();
      toast.success('Raspberry Pi device updated', {
        description: response.name || response.device_id,
      });
    } catch (error) {
      console.error('Update Raspberry Pi device failed', error);
      toast.error(getRequestErrorMessage(error, 'Update Raspberry Pi device failed'));
    } finally {
      setSavingDeviceId(null);
    }
  };

  const startEditingReader = (reader: Reader) => {
    setEditingReaderId(reader.id);
    setEditReaderRpiDeviceId(String(reader.rpi_device_id));
    setEditReaderZoneId(String(reader.zone_id));
    setEditReaderName(reader.name);
    setEditReaderDeviceId(reader.reader_device_id);
    setEditReaderIdUnique(reader.reader_id_unique);
    setEditReaderType(normalizeReaderType(reader.reader_type));
    setEditReaderStatus((READER_STATUSES.includes(reader.status as ReaderStatus) ? reader.status : 'inactive') as ReaderStatus);
  };

  const cancelEditingReader = () => {
    setEditingReaderId(null);
    setEditReaderRpiDeviceId('');
    setEditReaderZoneId('');
    setEditReaderName('');
    setEditReaderDeviceId('');
    setEditReaderIdUnique(false);
    setEditReaderType('shelf_reader');
    setEditReaderStatus('active');
  };

  const saveReader = async (reader: Reader) => {
    if (!editReaderRpiDeviceId || !editReaderZoneId || !editReaderName.trim() || !editReaderDeviceId.trim()) {
      toast.error('Device, zone, reader name, and reader identity are required.');
      return;
    }

    setSavingReaderId(reader.id);
    try {
      const response = await patchApiResource<Reader>(`/rfid-readers/${reader.id}`, {
        rpi_device_id: Number(editReaderRpiDeviceId),
        zone_id: Number(editReaderZoneId),
        name: editReaderName.trim(),
        reader_device_id: editReaderDeviceId.trim(),
        reader_id_unique: editReaderIdUnique,
        reader_type: normalizeReaderType(editReaderType),
        status: editReaderStatus,
      });
      await fetchReaders();
      setBackendResponse({
        title: `Update RFID reader ${reader.id} response`,
        body: formatBackendResponse(response),
      });
      cancelEditingReader();
      toast.success('RFID reader updated', {
        description: `${response.name} | ${response.reader_type}`,
      });
    } catch (error) {
      console.error('Update RFID reader failed', error);
      toast.error(getRequestErrorMessage(error, 'Update RFID reader failed'));
    } finally {
      setSavingReaderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Readers & Devices</h1>
          <p className="mt-1 text-gray-500">Manage Raspberry Pis and connected RFID Readers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowDeviceForm((value) => !value)}
            variant={showDeviceForm ? 'secondary' : 'outline'}
          >
            {showDeviceForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            RPi Insertion
          </Button>
          <Button
            onClick={() => setShowReaderForm((value) => !value)}
            variant={showReaderForm ? 'secondary' : 'outline'}
          >
            {showReaderForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            RFID Insertion
          </Button>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
        </div>
      </div>

      {(errors.readers || errors.rpiDevices || errors.zones) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.readers || errors.rpiDevices || errors.zones}
        </div>
      )}

      {backendResponse && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-blue-900">{backendResponse.title}</h2>
            <Button onClick={() => setBackendResponse(null)} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-md bg-white p-3 text-xs text-slate-700">{backendResponse.body}</pre>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Raspberry Pis</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{loaded.rpiDevices ? rpiDevices.length : '--'}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">RFID Readers</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{loaded.readers ? readers.length : '--'}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Zones</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{loaded.zones ? zones.length : '--'}</div>
        </div>
      </div>

      {(showDeviceForm || showReaderForm) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {showDeviceForm && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4 text-blue-500" />
              Add Raspberry Pi Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createDevice}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Device ID</span>
                <Input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="pi-serial:demo-002" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
                <Input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="Second Raspberry Pi" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select className={selectClassName} value={deviceStatus} onChange={(event) => setDeviceStatus(event.target.value as DeviceStatus)}>
                  {DEVICE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button className="h-9 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={createDeviceDisabled} type="submit">
                  {isCreatingDevice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Device
                </Button>
              </div>
            </form>
          </CardContent>
            </Card>
          )}

          {showReaderForm && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4 text-blue-500" />
              Add RFID Reader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createReader}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Raspberry Pi</span>
                <select className={selectClassName} disabled={loading.rpiDevices} value={readerRpiDeviceId} onChange={(event) => setReaderRpiDeviceId(event.target.value)}>
                  <option value="">
                    {loading.rpiDevices ? 'Loading backend devices...' : rpiDevices.length === 0 ? 'No backend devices found' : 'Select backend device'}
                  </option>
                  {rpiDevices.map((device) => (
                    <option key={device.id} value={device.id}>{formatDeviceOption(device)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Zone</span>
                <select className={selectClassName} disabled={loading.zones} value={readerZoneId} onChange={(event) => setReaderZoneId(event.target.value)}>
                  <option value="">
                    {loading.zones ? 'Loading backend zones...' : zones.length === 0 ? 'No backend zones found' : 'Select backend zone'}
                  </option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{formatZoneOption(zone)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reader Name</span>
                <Input value={readerName} onChange={(event) => setReaderName(event.target.value)} placeholder="ReaderC_USB" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reader Identity</span>
                <Input value={readerDeviceId} onChange={(event) => setReaderDeviceId(event.target.value)} placeholder="usb:demo:reader-c" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Type</span>
                <select className={selectClassName} value={readerType} onChange={(event) => setReaderType(event.target.value)}>
                  {readerTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
                <select className={selectClassName} value={readerStatus} onChange={(event) => setReaderStatus(event.target.value as ReaderStatus)}>
                  {READER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  checked={readerIdUnique}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={(event) => setReaderIdUnique(event.target.checked)}
                  type="checkbox"
                />
                Unique reader identity
              </label>
              <div className="flex items-end">
                <Button className="h-9 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={createReaderDisabled} type="submit">
                  {isCreatingReader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Reader
                </Button>
              </div>
            </form>
          </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loaded.readers || !loaded.rpiDevices ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading devices and readers...
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No reader or device data found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(rpiGroups).map(([rpiId, group]) => {
            const deviceStatus = group.device?.status || (group.readers.some((reader) => reader.status === 'active') ? 'online' : 'offline');
            const deviceName = group.device?.name || 'Raspberry Pi Node';
            const deviceCode = group.device?.device_id || `Node ${rpiId}`;
            const isEditingDevice = group.device && editingDeviceId === group.device.id;

            return (
              <Card key={rpiId}>
                <CardHeader className="border-b bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
                        <Cpu className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        {isEditingDevice ? (
                          <div className="grid gap-2 sm:grid-cols-[1fr_130px]">
                            <Input value={editDeviceName} onChange={(event) => setEditDeviceName(event.target.value)} />
                            <select className={selectClassName} value={editDeviceStatus} onChange={(event) => setEditDeviceStatus(event.target.value as DeviceStatus)}>
                              {DEVICE_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <>
                            <CardTitle className="flex items-center gap-2 text-lg">{deviceName}</CardTitle>
                            <p className="mt-0.5 font-mono text-xs text-gray-500">{deviceCode}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditingDevice && (
                        <Badge className={getStatusBadgeClassName(deviceStatus)} variant="secondary">
                          {deviceStatus.toUpperCase()}
                        </Badge>
                      )}
                      {group.device && (
                        isEditingDevice ? (
                          <>
                            <Button
                              disabled={savingDeviceId === group.device.id}
                              onClick={() => saveDevice(group.device as RpiDevice)}
                              size="icon"
                              title="Save device"
                              variant="outline"
                            >
                              {savingDeviceId === group.device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button onClick={cancelEditingDevice} size="icon" title="Cancel" variant="ghost">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => startEditingDevice(group.device as RpiDevice)} size="icon" title="Edit device" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Node ID</div>
                      <div className="mt-1 font-mono text-gray-800">{rpiId}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Last Seen</div>
                      <div className="mt-1 text-gray-800">
                        {group.device?.last_seen_at ? new Date(group.device.last_seen_at).toLocaleString() : 'Unavailable'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Connected Readers</h3>
                    {group.readers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                        No readers connected to this device.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {group.readers.map((reader) => {
                          const zone = zones.find((z) => z.id === reader.zone_id);
                          const isEditingReader = editingReaderId === reader.id;

                          if (isEditingReader) {
                            return (
                              <div key={reader.id} className="space-y-3 rounded-lg border bg-white p-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Input value={editReaderName} onChange={(event) => setEditReaderName(event.target.value)} placeholder="Reader name" />
                                  <Input value={editReaderDeviceId} onChange={(event) => setEditReaderDeviceId(event.target.value)} placeholder="Reader identity" />
                                  <select className={selectClassName} disabled={loading.rpiDevices} value={editReaderRpiDeviceId} onChange={(event) => setEditReaderRpiDeviceId(event.target.value)}>
                                    {!editReaderDeviceExists && editReaderRpiDeviceId && (
                                      <option value={editReaderRpiDeviceId}>DB device id: {editReaderRpiDeviceId} | not returned by /rpi-devices</option>
                                    )}
                                    {rpiDevices.map((device) => (
                                      <option key={device.id} value={device.id}>{formatDeviceOption(device)}</option>
                                    ))}
                                  </select>
                                  <select className={selectClassName} disabled={loading.zones} value={editReaderZoneId} onChange={(event) => setEditReaderZoneId(event.target.value)}>
                                    {!editReaderZoneExists && editReaderZoneId && (
                                      <option value={editReaderZoneId}>DB zone id: {editReaderZoneId} | not returned by /zones</option>
                                    )}
                                    {zones.map((availableZone) => (
                                      <option key={availableZone.id} value={availableZone.id}>{formatZoneOption(availableZone)}</option>
                                    ))}
                                  </select>
                                  <select className={selectClassName} value={editReaderType} onChange={(event) => setEditReaderType(event.target.value)}>
                                    {readerTypeOptions.map((type) => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                  <select className={selectClassName} value={editReaderStatus} onChange={(event) => setEditReaderStatus(event.target.value as ReaderStatus)}>
                                    {READER_STATUSES.map((status) => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      checked={editReaderIdUnique}
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      onChange={(event) => setEditReaderIdUnique(event.target.checked)}
                                      type="checkbox"
                                    />
                                    Unique reader identity
                                  </label>
                                  <div className="flex gap-2">
                                    <Button disabled={savingReaderId === reader.id} onClick={() => saveReader(reader)} size="sm" variant="outline">
                                      {savingReaderId === reader.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                      Save
                                    </Button>
                                    <Button onClick={cancelEditingReader} size="sm" variant="ghost">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={reader.id} className="flex items-center justify-between rounded-lg border bg-white p-3 transition-colors hover:border-gray-300">
                              <div className="flex items-center gap-3">
                                <RadioReceiver className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{reader.name}</p>
                                  <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-gray-500">
                                    <span>{reader.reader_device_id}</span>
                                    <span>|</span>
                                    <span>{reader.reader_type}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end gap-2">
                                  <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                                    {zone?.name || 'Unknown Zone'}
                                  </Badge>
                                  <span
                                    className={
                                      reader.status === 'active'
                                        ? 'flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                        : 'flex h-2 w-2 rounded-full bg-gray-300'
                                    }
                                    title={reader.status}
                                  />
                                </div>
                                <Button onClick={() => startEditingReader(reader)} size="icon" title="Edit reader" variant="ghost">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
