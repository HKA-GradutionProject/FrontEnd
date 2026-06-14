import { useEffect, useMemo, useState } from 'react';
import { Clock, RadioTower, RotateCcw, Save, ShieldAlert, SlidersHorizontal, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInventory } from '../context/InventoryContext';
import { SystemSettings } from '../types';

type SettingField = {
  key: keyof SystemSettings;
  label: string;
  unit: string;
  min: number;
  max: number;
  icon: typeof Clock;
};

const settingFields: SettingField[] = [
  {
    key: 'readerPollIntervalSeconds',
    label: 'Reader poll interval',
    unit: 'seconds',
    min: 1,
    max: 300,
    icon: RadioTower,
  },
  {
    key: 'gateDetectionWindowMinutes',
    label: 'Gate detection window',
    unit: 'minutes',
    min: 1,
    max: 120,
    icon: Clock,
  },
  {
    key: 'missingItemThresholdMinutes',
    label: 'Missing item threshold',
    unit: 'minutes',
    min: 1,
    max: 1440,
    icon: ShieldAlert,
  },
  {
    key: 'stolenItemThresholdMinutes',
    label: 'Stolen item threshold',
    unit: 'minutes',
    min: 1,
    max: 1440,
    icon: ShieldAlert,
  },
  {
    key: 'staleReaderThresholdMinutes',
    label: 'Reader stale threshold',
    unit: 'minutes',
    min: 1,
    max: 180,
    icon: RadioTower,
  },
  {
    key: 'liveReconnectDelaySeconds',
    label: 'Live reconnect delay',
    unit: 'seconds',
    min: 1,
    max: 120,
    icon: Wifi,
  },
];

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useInventory();
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const validationErrors = useMemo(() => {
    return settingFields.filter((field) => {
      const value = draft[field.key];
      return !Number.isFinite(value) || value < field.min || value > field.max;
    });
  }, [draft]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);
  const canSave = hasChanges && validationErrors.length === 0;

  const updateField = (field: SettingField, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field.key]: Number(value),
    }));
  };

  const onSave = async () => {
    if (validationErrors.length > 0) {
      toast.error('Check setting limits before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(draft);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Save settings failed', error);
      toast.error(error instanceof Error ? error.message : 'Save settings failed');
    } finally {
      setIsSaving(false);
    }
  };

  const onReset = async () => {
    setIsResetting(true);
    try {
      await resetSettings();
      toast.success('Settings reset');
    } catch (error) {
      console.error('Reset settings failed', error);
      toast.error(error instanceof Error ? error.message : 'Reset settings failed');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">System timing and detection configuration.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} disabled={isResetting || isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {isResetting ? 'Resetting' : 'Reset'}
          </Button>
          <Button onClick={onSave} disabled={!canSave || isSaving || isResetting}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationErrors.map((field) => `${field.label} must be ${field.min}-${field.max} ${field.unit}.`).join(' ')}
        </div>
      )}

      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-blue-600" />
            RFID Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settingFields.map((field) => {
              const Icon = field.icon;
              const value = draft[field.key];
              const isInvalid = !Number.isFinite(value) || value < field.min || value > field.max;

              return (
                <div key={field.key} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <label htmlFor={field.key} className="block text-sm font-semibold text-slate-900">
                          {field.label}
                        </label>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {field.min}-{field.max} {field.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Input
                      id={field.key}
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={Number.isNaN(value) ? '' : value}
                      onChange={(event) => updateField(field, event.target.value)}
                      className={isInvalid ? 'border-red-300 bg-red-50 focus-visible:ring-red-200' : ''}
                    />
                    <span className="w-20 text-sm text-slate-500">{field.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
