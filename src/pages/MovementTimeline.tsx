import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock3, Loader2, MapPin, Route, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, fetchApiResource } from '@/lib/api';
import type { VariantMovementTimeline } from '../types';

function formatEventType(eventType: string) {
  return eventType
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getTimelineErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Variant not found.';
    }

    if (error.status === 422) {
      return 'Enter a valid variant ID and a limit between 1 and 200.';
    }

    return error.message;
  }

  return 'Unable to load movement timeline. Check that the backend is running and try again.';
}

function MovementPackageMarker({ progress }: { progress: number }) {
  const markerTop = 8 + progress * 84;

  return (
    <div
      className="absolute left-1/2 z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
      style={{ top: `${markerTop}%`, perspective: '520px' }}
      aria-hidden="true"
    >
      <div className="relative h-full w-full animate-[timeline-package-float_2.6s_ease-in-out_infinite] [transform-style:preserve-3d]">
        <div className="timeline-package-face timeline-package-front flex items-center justify-center font-mono text-[10px] font-black text-white">
          RFID
        </div>
        <div className="timeline-package-face timeline-package-back" />
        <div className="timeline-package-face timeline-package-right brightness-75" />
        <div className="timeline-package-face timeline-package-left brightness-90" />
        <div className="timeline-package-face timeline-package-top brightness-125" />
        <div className="timeline-package-face timeline-package-bottom brightness-50" />
      </div>
      <div className="absolute left-1/2 top-[4.7rem] h-3 w-12 -translate-x-1/2 rounded-full bg-blue-950/20 blur-sm" />
    </div>
  );
}

export default function MovementTimeline() {
  const [searchParams] = useSearchParams();
  const [variantId, setVariantId] = useState('');
  const [limit, setLimit] = useState('5');
  const [timeline, setTimeline] = useState<VariantMovementTimeline | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  const parsedVariantId = Number(variantId);
  const parsedLimit = Number(limit);
  const isVariantInvalid = !Number.isInteger(parsedVariantId) || parsedVariantId < 1;
  const isLimitInvalid = !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200;
  const canSubmit = !isVariantInvalid && !isLimitInvalid && !isLoading;

  async function loadTimeline(nextVariantId: number, nextLimit: number) {
    if (
      !Number.isInteger(nextVariantId) ||
      nextVariantId < 1 ||
      !Number.isInteger(nextLimit) ||
      nextLimit < 1 ||
      nextLimit > 200
    ) {
      setErrorMessage('Enter a valid variant ID and a limit between 1 and 200.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const query = new URLSearchParams({ limit: String(nextLimit) });
      const data = await fetchApiResource<VariantMovementTimeline>(
        `/rfid/variants/${nextVariantId}/movement-timeline?${query.toString()}`,
      );

      setTimeline(data);
    } catch (error) {
      setTimeline(null);
      setErrorMessage(getTimelineErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage('Enter a valid variant ID and a limit between 1 and 200.');
      return;
    }

    await loadTimeline(parsedVariantId, parsedLimit);
  }

  useEffect(() => {
    const updateScrollProgress = () => {
      const timelineTrack = timelineTrackRef.current;

      if (!timelineTrack) {
        setScrollProgress(0);
        return;
      }

      const rect = timelineTrack.getBoundingClientRect();
      const focusY = window.innerHeight * 0.42;
      const availableDistance = Math.max(1, rect.height - 160);
      const nextProgress = Math.min(1, Math.max(0, (focusY - rect.top) / availableDistance));

      setScrollProgress(nextProgress);
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, [timeline?.movements.length]);

  useEffect(() => {
    const queryVariantId = Number(searchParams.get('variant_id') || searchParams.get('variantId'));
    const queryLimit = Number(searchParams.get('limit') || '5');

    if (!Number.isInteger(queryVariantId) || queryVariantId < 1) {
      return;
    }

    const safeLimit = Number.isInteger(queryLimit) && queryLimit >= 1 && queryLimit <= 200
      ? queryLimit
      : 5;

    setVariantId(String(queryVariantId));
    setLimit(String(safeLimit));
    void loadTimeline(queryVariantId, safeLimit);
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <style>
        {`
          @keyframes timeline-package-float {
            0%, 100% { transform: rotateX(-16deg) rotateY(-26deg) translateY(0); }
            50% { transform: rotateX(-16deg) rotateY(18deg) translateY(-8px); }
          }

          .timeline-package-face {
            background: linear-gradient(145deg, #3b82f6, #1e3a8a);
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 9px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32), 0 20px 34px rgba(15, 23, 42, 0.22);
            height: 4rem;
            position: absolute;
            transform-style: preserve-3d;
            width: 4rem;
          }

          .timeline-package-front { transform: translateZ(2rem); }
          .timeline-package-back { transform: rotateY(180deg) translateZ(2rem); }
          .timeline-package-right { transform: rotateY(90deg) translateZ(2rem); }
          .timeline-package-left { transform: rotateY(-90deg) translateZ(2rem); }
          .timeline-package-top { transform: rotateX(90deg) translateZ(2rem); }
          .timeline-package-bottom { transform: rotateX(-90deg) translateZ(2rem); }
        `}
      </style>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movement Timeline</h1>
          <p className="mt-1 text-gray-500">Enter a variant ID to review its latest unique RFID zone movements.</p>
        </div>
        {isLoading && <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-500" />}
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg">Variant Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_160px_auto]" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Variant ID</span>
              <Input
                min={1}
                type="number"
                inputMode="numeric"
                placeholder="Example: 1"
                value={variantId}
                onChange={event => setVariantId(event.target.value)}
                className={isVariantInvalid && variantId ? 'border-red-300 bg-red-50 focus-visible:ring-red-200' : ''}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Limit</span>
              <Input
                min={1}
                max={200}
                type="number"
                inputMode="numeric"
                value={limit}
                onChange={event => setLimit(event.target.value)}
                className={isLimitInvalid ? 'border-red-300 bg-red-50 focus-visible:ring-red-200' : ''}
              />
            </label>

            <div className="flex items-end">
              <Button
                className="h-10 w-full gap-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 md:w-auto"
                type="submit"
                disabled={!canSubmit}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Get History
              </Button>
            </div>
          </form>

          {errorMessage && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="h-5 w-5 text-blue-600" />
              Timeline
            </CardTitle>
            {timeline && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">Variant #{timeline.variant_id}</Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">Item #{timeline.item_id}</Badge>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{timeline.movements_count} movements</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!timeline ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
              <MapPin className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No variant selected</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Search a variant ID to show its latest movement history as a timeline.</p>
            </div>
          ) : timeline.movements.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
              <Clock3 className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No movements found</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">This variant exists, but it has no unique zone movements yet.</p>
            </div>
          ) : (
            <div ref={timelineTrackRef} className="relative grid gap-6 md:grid-cols-[7rem_minmax(0,1fr)]">
              <div className="relative hidden md:block">
                <div className="sticky top-8 h-[calc(100vh-8rem)] min-h-96 rounded-full bg-slate-50">
                  <div className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-gradient-to-b from-blue-200 via-blue-500 to-emerald-300" />
                  <div
                    className="absolute left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-blue-500/10 blur-xl transition-[top] duration-150"
                    style={{ top: `${10 + scrollProgress * 76}%` }}
                    aria-hidden="true"
                  />
                  <MovementPackageMarker progress={scrollProgress} />
                </div>
              </div>

              <ol className="relative ml-3 space-y-6 border-l border-slate-200 md:ml-0">
                {timeline.movements.map((movement, index) => {
                  const previousZoneName = movement.previous_zone?.name || 'Unknown zone';
                  const currentZoneName = movement.current_zone?.name || 'Unknown zone';

                  return (
                    <li key={movement.event_id} className="relative pl-8">
                      <span className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-50">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">Movement #{timeline.movements.length - index}</span>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600">Event {movement.event_id}</Badge>
                            </div>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                              {formatEventType(movement.event_type)}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <div>{formatTimestamp(movement.timestamp)}</div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Previous Zone</p>
                            <p className="mt-1 font-semibold text-slate-900">{previousZoneName}</p>
                            {movement.previous_zone?.zone_type && (
                              <p className="text-xs text-slate-500">{movement.previous_zone.zone_type}</p>
                            )}
                          </div>
                          <ArrowRight className="hidden h-5 w-5 text-blue-500 md:block" />
                          <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-400">Current Zone</p>
                            <p className="mt-1 font-semibold text-slate-900">{currentZoneName}</p>
                            {movement.current_zone?.zone_type && (
                              <p className="text-xs text-slate-500">{movement.current_zone.zone_type}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <Badge variant="outline" className="bg-white">Reader: {movement.reader?.name || 'Unknown reader'}</Badge>
                          {movement.reader?.reader_device_code && (
                            <Badge variant="outline" className="bg-white font-mono">{movement.reader.reader_device_code}</Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
