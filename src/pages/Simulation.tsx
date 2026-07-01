import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { RadioReceiver, Package2, X, Image as ImageIcon, Cpu, Link as LinkIcon, Info, Search, Loader2, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, ArrowRight, History, ShieldAlert, TriangleAlert, CheckCircle2, LogOut, RotateCcw } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Grid, RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { fetchApiResource } from '@/lib/api';
import { DEFAULT_FRONTEND_SETTINGS, loadFrontendSettings } from '@/lib/frontendSettings';
import type { Item, Reader, RfidLiveSocketEvent, RpiDevice, Zone } from '../types';

const zone3DMap: Record<number, [number, number, number]> = {
  // Map based on numeric IDs or logic (gate, shelf)
};

// We will figure out basePos functionally since IDs are dynamic.

function getReaderRange(reader: Reader) {
  if (isGateReader(reader)) {
    return 1.9;
  }

  return 1.6;
}

function getReaderType(reader?: Reader | null) {
  return reader?.reader_type?.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getZoneType(zone?: Zone | null) {
  return zone?.zone_type?.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isGateReader(reader?: Reader | null) {
  const readerType = getReaderType(reader);
  return Boolean(readerType && ['gate_reader', 'entry_reader', 'exit_reader', 'gate', 'entry', 'exit'].includes(readerType));
}

function isShelfReader(reader?: Reader | null) {
  const readerType = getReaderType(reader);
  return Boolean(readerType && ['shelf_reader', 'normal_reader', 'shelf', 'normal'].includes(readerType));
}

function isShelfZone(zone?: Zone | null) {
  const zoneType = getZoneType(zone);
  return Boolean(zoneType && ['shelf_reader', 'normal_reader', 'shelf', 'normal', 'storage'].includes(zoneType));
}

function isGateZone(zone?: Zone | null) {
  const zoneType = getZoneType(zone);
  return Boolean(zoneType && ['gate_reader', 'gate', 'entry', 'exit', 'entry_gate', 'exit_gate'].includes(zoneType));
}

function zoneHasGateReader(zone: Zone, readers: Reader[]) {
  return readers.some(reader => reader.zone_id === zone.id && isGateReader(reader));
}

function zoneHasShelfReader(zone: Zone, readers: Reader[]) {
  return readers.some(reader => reader.zone_id === zone.id && isShelfReader(reader));
}

function shouldRenderGateZone(zone: Zone, readers: Reader[]) {
  return isGateZone(zone) || zoneHasGateReader(zone, readers);
}

function shouldRenderShelfZone(zone: Zone, readers: Reader[]) {
  return (isShelfZone(zone) || zoneHasShelfReader(zone, readers)) && !shouldRenderGateZone(zone, readers);
}

function getGateZonePosition(index: number, count: number): [number, number, number] {
  const gateSpacing = 3.4;
  const startX = -((count - 1) * gateSpacing) / 2;

  return [startX + index * gateSpacing, 0, 6];
}

function getShelfZonePosition(index: number, count: number): [number, number, number] {
  const shelfSpacingX = 3.4;
  const shelfSpacingZ = 2.8;
  const columns = Math.min(4, Math.max(1, count));
  const shelfColumn = index % columns;
  const shelfRow = Math.floor(index / columns);
  const startX = -((columns - 1) * shelfSpacingX) / 2;

  return [startX + shelfColumn * shelfSpacingX, 0, -3.2 + shelfRow * shelfSpacingZ];
}

function getZoneBasePosition(zone: Zone, zones: Zone[], readers: Reader[] = []): [number, number, number] {
  const sortedZones = [...zones].sort((left, right) => left.id - right.id);

  if (shouldRenderGateZone(zone, readers)) {
    const gateZones = sortedZones.filter(candidateZone => shouldRenderGateZone(candidateZone, readers));
    const gateIndex = Math.max(0, gateZones.findIndex(candidateZone => candidateZone.id === zone.id));
    return getGateZonePosition(gateIndex, gateZones.length);
  }

  const shelfZones = sortedZones.filter(candidateZone => shouldRenderShelfZone(candidateZone, readers));
  const shelfIndex = Math.max(
    0,
    shelfZones.findIndex(candidateZone => candidateZone.id === zone.id)
  );

  if (!shouldRenderShelfZone(zone, readers)) {
    const nonGateZones = sortedZones
      .filter(candidateZone => !shouldRenderGateZone(candidateZone, readers));
    const fallbackIndex = nonGateZones
      .findIndex(candidateZone => candidateZone.id === zone.id);

    return getShelfZonePosition(Math.max(0, fallbackIndex), nonGateZones.length);
  }

  return getShelfZonePosition(shelfIndex, shelfZones.length);
}

type WarehouseZoneVisual = {
  key: string;
  zone: Zone;
  readers: Reader[];
  label: string;
  isGate: boolean;
  position: [number, number, number];
};

function getWarehouseZoneVisuals(zones: Zone[], readers: Reader[]): WarehouseZoneVisual[] {
  const sortedZones = [...zones].sort((left, right) => left.id - right.id);
  const gateNodes = sortedZones
    .filter(zone => shouldRenderGateZone(zone, readers))
    .map(zone => ({
      key: `zone-${zone.id}`,
      zone,
      readers: readers.filter(reader => reader.zone_id === zone.id),
      label: zone.name,
      isGate: true,
    }));
  const shelfNodes = sortedZones
    .filter(zone => shouldRenderShelfZone(zone, readers))
    .flatMap(zone => {
      const zoneReaders = readers.filter(reader => reader.zone_id === zone.id);
      const shelfReaders = zoneReaders.filter(reader => isShelfReader(reader));

      if (getZoneType(zone) === 'shelf_reader' && shelfReaders.length > 1) {
        return shelfReaders.map(reader => ({
          key: `zone-${zone.id}-reader-${reader.id}`,
          zone,
          readers: [reader],
          label: reader.name || zone.name,
          isGate: false,
        }));
      }

      return [{
        key: `zone-${zone.id}`,
        zone,
        readers: zoneReaders,
        label: zone.name,
        isGate: false,
      }];
    });
  const fallbackNodes = sortedZones
    .filter(zone => !shouldRenderGateZone(zone, readers) && !shouldRenderShelfZone(zone, readers))
    .map(zone => ({
      key: `zone-${zone.id}`,
      zone,
      readers: readers.filter(reader => reader.zone_id === zone.id),
      label: zone.name,
      isGate: false,
    }));

  return [
    ...gateNodes.map((node, index) => ({
      ...node,
      position: getGateZonePosition(index, gateNodes.length),
    })),
    ...shelfNodes.map((node, index) => ({
      ...node,
      position: getShelfZonePosition(index, shelfNodes.length),
    })),
    ...fallbackNodes.map((node, index) => ({
      ...node,
      position: getShelfZonePosition(index, fallbackNodes.length),
    })),
  ];
}

function getZoneSlotOffset(zone: Zone | undefined, slotIndex: number, readers: Reader[] = []): [number, number, number] {
  if (zone && shouldRenderShelfZone(zone, readers)) {
    const shelfLevels = [0.42, 0.92, 1.42, 1.92, 2.42];
    const tierLevel = slotIndex % shelfLevels.length;
    const indexInTier = Math.floor(slotIndex / shelfLevels.length);
    const row = Math.floor(indexInTier / 3);
    const col = indexInTier % 3;

    return [
      (col - 1) * 0.42,
      shelfLevels[tierLevel],
      (row - 0.5) * 0.32,
    ];
  }

  if (zone && shouldRenderGateZone(zone, readers)) {
    const row = Math.floor(slotIndex / 4);
    const col = slotIndex % 4;

    return [
      (col - 1.5) * 0.5,
      0.275,
      2.25 + row * 0.5,
    ];
  }

  const row = Math.floor(slotIndex / 5);
  const col = slotIndex % 5;

  return [
    (col - 2) * 0.45,
    0.275,
    (row - 1) * 0.45,
  ];
}

const ITEM_MOVE_LERP_SPEED = 1.2;
const ITEM_HOVER_DURATION_SECONDS = 1;
const ITEM_MOVE_HOVER_OFFSET = 1.35;
const ITEM_MOVE_MIN_HOVER_HEIGHT = 3.2;
const ITEM_RAISE_SPEED = 1.8;
const ITEM_TRAVEL_SPEED = 0.75;
const ITEM_LAND_SPEED = 0.8;

type ItemMovementPhase = 'lift' | 'hold-origin' | 'travel' | 'hold-target' | 'land';
type ItemMovementAnimation = {
  phase: ItemMovementPhase;
  fromHover: THREE.Vector3;
  toHover: THREE.Vector3;
  toGround: THREE.Vector3;
  holdRemaining: number;
};

function moveTowards(
  current: THREE.Vector3,
  target: THREE.Vector3,
  maxStep: number,
  scratch: THREE.Vector3,
) {
  scratch.copy(target).sub(current);
  const distance = scratch.length();

  if (distance <= maxStep || distance === 0) {
    current.copy(target);
    return true;
  }

  current.add(scratch.multiplyScalar(maxStep / distance));
  return false;
}


function SimulatedItem({
  item,
  targetPosition,
  movementStart,
  movementSimulationSeconds,
  isSelected,
  onMovementComplete,
  onClick,
}: {
  item: Item;
  targetPosition: THREE.Vector3;
  movementStart?: RegisteredEntryStart;
  movementSimulationSeconds: number;
  isSelected: boolean;
  onMovementComplete?: (itemId: number) => void;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const initialPositionRef = useRef(targetPosition.clone());
  const previousGroundTargetRef = useRef(targetPosition.clone());
  const activeAnimationRef = useRef<ItemMovementAnimation | null>(null);
  const movementScratchRef = useRef(new THREE.Vector3());
  const movementStartKeyRef = useRef<string | null>(null);

  const startMovement = (previousTarget: THREE.Vector3, nextTarget: THREE.Vector3) => {
    const speedScale = DEFAULT_FRONTEND_SETTINGS.movementSimulationSeconds / movementSimulationSeconds;
    const holdDuration = ITEM_HOVER_DURATION_SECONDS / speedScale;
    const hoverY = Math.max(
      ITEM_MOVE_MIN_HOVER_HEIGHT,
      previousTarget.y,
      nextTarget.y,
    ) + ITEM_MOVE_HOVER_OFFSET;

    activeAnimationRef.current = {
      phase: 'lift',
      fromHover: new THREE.Vector3(previousTarget.x, hoverY, previousTarget.z),
      toHover: new THREE.Vector3(nextTarget.x, hoverY, nextTarget.z),
      toGround: nextTarget,
      holdRemaining: holdDuration,
    };
    setIsMoving(true);
    previousGroundTargetRef.current = nextTarget;
  };

  useEffect(() => {
    if (!movementStart || movementStartKeyRef.current === movementStart.key) {
      return;
    }

    movementStartKeyRef.current = movementStart.key;
    const startPosition = movementStart.position.clone();
    const nextTarget = targetPosition.clone();

    if (meshRef.current) {
      meshRef.current.position.copy(startPosition);
    }

    previousGroundTargetRef.current = startPosition;
    startMovement(startPosition, nextTarget);
  }, [movementSimulationSeconds, movementStart, targetPosition.x, targetPosition.y, targetPosition.z]);

  useEffect(() => {
    const nextTarget = targetPosition.clone();
    const previousTarget = previousGroundTargetRef.current;

    if (previousTarget.distanceTo(nextTarget) < 0.001) {
      return;
    }

    startMovement(previousTarget, nextTarget);
  }, [movementSimulationSeconds, targetPosition.x, targetPosition.y, targetPosition.z]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const activeAnimation = activeAnimationRef.current;
      const meshPosition = meshRef.current.position;
      const movementScratch = movementScratchRef.current;

      if (activeAnimation) {
        switch (activeAnimation.phase) {
          case 'lift': {
            const speedScale = DEFAULT_FRONTEND_SETTINGS.movementSimulationSeconds / movementSimulationSeconds;
            const reached = moveTowards(meshPosition, activeAnimation.fromHover, delta * ITEM_RAISE_SPEED * speedScale, movementScratch);

            if (reached) {
              activeAnimation.phase = 'hold-origin';
              activeAnimation.holdRemaining = ITEM_HOVER_DURATION_SECONDS / speedScale;
            }
            break;
          }
          case 'hold-origin': {
            activeAnimation.holdRemaining -= delta;

            if (activeAnimation.holdRemaining <= 0) {
              activeAnimation.phase = 'travel';
            }
            break;
          }
          case 'travel': {
            const speedScale = DEFAULT_FRONTEND_SETTINGS.movementSimulationSeconds / movementSimulationSeconds;
            const reached = moveTowards(meshPosition, activeAnimation.toHover, delta * ITEM_TRAVEL_SPEED * speedScale, movementScratch);

            if (reached) {
              activeAnimation.phase = 'hold-target';
              activeAnimation.holdRemaining = ITEM_HOVER_DURATION_SECONDS / speedScale;
            }
            break;
          }
          case 'hold-target': {
            activeAnimation.holdRemaining -= delta;

            if (activeAnimation.holdRemaining <= 0) {
              activeAnimation.phase = 'land';
            }
            break;
          }
          case 'land': {
            const speedScale = DEFAULT_FRONTEND_SETTINGS.movementSimulationSeconds / movementSimulationSeconds;
            const reached = moveTowards(meshPosition, activeAnimation.toGround, delta * ITEM_LAND_SPEED * speedScale, movementScratch);

            if (reached) {
              activeAnimationRef.current = null;
              setIsMoving(false);
              onMovementComplete?.(item.id);
            }
            break;
          }
        }
      } else {
        meshPosition.lerp(previousGroundTargetRef.current, delta * ITEM_MOVE_LERP_SPEED);
      }

      const material = meshRef.current.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        if (isMoving) {
          const pulse = 0.95 + Math.sin(state.clock.elapsedTime * 10) * 0.35;
          material.emissive.set(displayColor);
          material.emissiveIntensity = pulse;
        } else if (isSelected) {
          material.emissive.set(displayColor);
          material.emissiveIntensity = 0.5;
        } else {
          material.emissive.set('#000000');
          material.emissiveIntensity = 0;
        }
      }

      const tiltX = isMoving ? Math.sin(state.clock.elapsedTime * 8) * 0.18 : 0;
      const tiltZ = isMoving ? Math.cos(state.clock.elapsedTime * 6.5) * 0.14 : 0;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, tiltX, delta * 8);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, tiltZ, delta * 8);

      if (item.status === 'alert') {
        meshRef.current.rotation.y += delta * 2;
      } else {
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, delta * 6);
      }
      
      const scaleStr = isSelected ? 1.2 : hovered ? 1.1 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(scaleStr, scaleStr, scaleStr), delta * 8);
    }
  });

  const baseColor = item.status === 'alert' ? '#ef4444' :
                    item.status === 'sold' ? '#22c55e' :
                    item.status === 'ordered' ? '#a855f7' : '#3b82f6';
  const displayColor = isMoving ? '#facc15' : baseColor;

  return (
    <mesh 
      ref={meshRef} 
      position={initialPositionRef.current} 
      castShadow 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshStandardMaterial color={displayColor} emissive={isSelected || isMoving ? displayColor : '#000000'} emissiveIntensity={isSelected ? 0.5 : 0} />
      {isMoving && <pointLight color={displayColor} intensity={1.15} distance={3.5} decay={2} />}
      {isMoving && (
        <Html position={[0, 0.72, 0]} center sprite zIndexRange={[12, 0]}>
          <div className="animate-bounce rounded-full border border-white/80 bg-slate-950/90 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-white shadow-[0_0_20px_rgba(15,23,42,0.45)] whitespace-nowrap">
            {item.name}
          </div>
        </Html>
      )}
      <Html position={[0, 0.35, 0]} center sprite zIndexRange={[10, 0]}>
        <div className={`px-1.5 py-0.5 bg-white/90 backdrop-blur-sm shadow-sm rounded text-[9px] font-mono font-bold whitespace-nowrap border ${isMoving ? 'text-amber-700 border-amber-300' : item.status === 'alert' ? 'text-red-600 border-red-300' : 'text-blue-700 border-blue-200'}`}>
          {item.label}
        </div>
      </Html>
    </mesh>
  );
}

function ReaderRangeSphere({ radius, position }: { radius: number, position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.04;
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

function SimulatedReader({ reader, position, isSelected, onClick }: { reader: Reader, position: [number, number, number], isSelected: boolean, onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = isSelected ? '#ef4444' : hovered ? '#60a5fa' : '#3b82f6'; 
  
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh 
        position={[0, 0.6, 0]} 
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={isSelected || hovered ? [0.18, 0.18, 0.1] : [0.15, 0.15, 0.08]} />
        <meshStandardMaterial color={color} emissive={isSelected ? '#1e3a8a' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
        <Html position={[0, 0.15, 0]} center sprite zIndexRange={[10, 0]}>
           <div className={`w-4 h-4 ${reader.status === 'active' ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded-full flex items-center justify-center shadow-lg border border-white ${reader.status === 'active' ? 'animate-pulse' : ''} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
              <RadioReceiver className="w-2.5 h-2.5" />
           </div>
        </Html>
      </mesh>
    </group>
  );
}

function SimulatedRPi({ rpiId, position, isSelected, onClick }: { rpiId: string, position: [number, number, number], isSelected: boolean, onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh 
      position={position}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      <boxGeometry args={[0.3, 0.15, 0.2]} />
      <meshStandardMaterial color={isSelected ? '#10b981' : hovered ? '#34d399' : '#059669'} />
      <Html position={[0, 0.15, 0]} center sprite zIndexRange={[10, 0]}>
        <div className={`px-1 py-0.5 bg-slate-900 text-emerald-400 rounded text-[8px] font-mono whitespace-nowrap border ${isSelected ? 'border-emerald-400' : 'border-slate-700 shadow-xl'}`}>
          <Cpu className="w-2 h-2 inline-block mr-1 mb-0.5" />
          {rpiId}
        </div>
      </Html>
    </mesh>
  );
}

function LaserGate({ laserColor = "#06b6d4" }: { laserColor?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const opacity = 0.3 + Math.sin(clock.elapsedTime * 8) * 0.2;
      groupRef.current.children.forEach(child => {
        if ((child as THREE.Mesh).material) {
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity;
        }
      });
    }
  });

  return (
    <group>
      {/* Base */}
      <RoundedBox args={[3, 0.1, 3]} position={[0, 0.05, 0]} radius={0.02} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </RoundedBox>
      {/* Floor border keeps the gate readable without closing the side opening */}
      <mesh position={[0, 0.13, -1.52]} receiveShadow>
        <boxGeometry args={[3.18, 0.05, 0.08]} />
        <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.13, 1.52]} receiveShadow>
        <boxGeometry args={[3.18, 0.05, 0.08]} />
        <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[-1.52, 0.13, 0]} receiveShadow>
        <boxGeometry args={[0.08, 0.05, 3.18]} />
        <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[1.52, 0.13, 0]} receiveShadow>
        <boxGeometry args={[0.08, 0.05, 3.18]} />
        <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0, 4.32, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[7.4, 0.32, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.12} roughness={0.98} />
      </mesh>
      {/* Posts */}
      <mesh position={[-1.4, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2, 0.2]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[1.4, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2, 0.2]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Lasers */}
      <group ref={groupRef}>
        {[0.5, 0.9, 1.3, 1.7].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 2.8]} />
            <meshBasicMaterial color={laserColor} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

type RfidEventTone = 'movement' | 'entry' | 'operation-warning' | 'exit-approved' | 'security-warning';

type SceneEventVisual = {
  id: string;
  tone: RfidEventTone;
  label: string;
  position: [number, number, number];
  isExit: boolean;
};

type WarningOverlayEvent = {
  id: number;
  type: string;
  tone: Extract<RfidEventTone, 'operation-warning' | 'security-warning'>;
  title: string;
  itemId: number;
  itemName: string;
  thumbnail: string | null;
  sku: string | null;
  status: string | null;
  category: string | null;
  totalQty: number | null;
  fromZoneName: string | null;
  toZoneName: string | null;
  tag: string;
  readerName: string | null;
  timestamp: string;
};

type QuantityMovementEvent = {
  id: number;
  type: 'rfid_registered_entry_approved' | 'rfid_ordered_exit_approved';
  tone: Extract<RfidEventTone, 'entry' | 'exit-approved'>;
  itemId: number;
  itemName: string;
  thumbnail: string | null;
  fromZoneName: string | null;
  toZoneName: string | null;
  tag: string;
  readerName: string | null;
  readerDeviceId: string | null;
  rpiId: string | null;
  rssi: number | null;
  distance: string | null;
  logicCase: string | null;
  gateEventId: number | null;
  entryApproved: boolean | null;
  qtyBefore: number | null;
  qtyAfter: number | null;
  timestamp: string;
};

type RegisteredEntryStart = {
  key: string;
  position: THREE.Vector3;
};

const RFID_EVENT_STYLES: Record<RfidEventTone, { color: string; bgClass: string; text: string }> = {
  movement: { color: '#38bdf8', bgClass: 'border-sky-300 bg-sky-950/90 text-sky-100', text: 'Moved' },
  entry: { color: '#22c55e', bgClass: 'border-emerald-300 bg-emerald-950/90 text-emerald-100', text: 'Entry approved' },
  'operation-warning': { color: '#f59e0b', bgClass: 'border-amber-300 bg-amber-950/90 text-amber-100', text: 'Unknown entry' },
  'exit-approved': { color: '#a855f7', bgClass: 'border-purple-300 bg-purple-950/90 text-purple-100', text: 'Exit approved' },
  'security-warning': { color: '#ef4444', bgClass: 'border-red-300 bg-red-950/90 text-red-100', text: 'Security alert' },
};

function getRfidEventTone(type?: string): RfidEventTone {
  switch (type) {
    case 'rfid_registered_entry_approved':
      return 'entry';
    case 'rfid_unregistered_entry_warning':
      return 'operation-warning';
    case 'rfid_ordered_exit_approved':
      return 'exit-approved';
    case 'rfid_security_warning':
      return 'security-warning';
    default:
      return 'movement';
  }
}

function playAlertSiren(tone: WarningOverlayEvent['tone']) {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const oscillatorTwo = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const isSecurity = tone === 'security-warning';
  const duration = isSecurity ? 1.05 : 1.35;
  const lowFrequency = isSecurity ? 430 : 620;
  const highFrequency = isSecurity ? 980 : 880;

  oscillator.type = isSecurity ? 'sawtooth' : 'square';
  oscillatorTwo.type = 'triangle';
  oscillator.frequency.setValueAtTime(lowFrequency, now);
  oscillator.frequency.linearRampToValueAtTime(highFrequency, now + duration * 0.45);
  oscillator.frequency.linearRampToValueAtTime(lowFrequency, now + duration);
  oscillatorTwo.frequency.setValueAtTime(lowFrequency * 0.5, now);
  oscillatorTwo.frequency.linearRampToValueAtTime(highFrequency * 0.5, now + duration * 0.45);
  oscillatorTwo.frequency.linearRampToValueAtTime(lowFrequency * 0.5, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(isSecurity ? 0.18 : 0.11, now + 0.08);
  gain.gain.setValueAtTime(isSecurity ? 0.18 : 0.11, now + duration - 0.12);
  gain.gain.linearRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  oscillatorTwo.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillatorTwo.start(now);
  oscillator.stop(now + duration);
  oscillatorTwo.stop(now + duration);
  oscillator.onended = () => {
    void audioContext.close();
  };
}

function WarningAlarmOverlay({ warning, onDismiss }: { warning: WarningOverlayEvent; onDismiss: () => void }) {
  const isSecurity = warning.tone === 'security-warning';
  const Icon = isSecurity ? ShieldAlert : TriangleAlert;
  const theme = isSecurity
    ? {
        label: 'SECURITY WARNING',
        message: 'Unauthorized warehouse exit detected',
        glow: 'bg-red-500/20',
        border: 'border-red-400/80',
        panel: 'border-red-300/80 bg-red-950/90 text-red-50 shadow-[0_0_60px_rgba(239,68,68,0.55)]',
        icon: 'bg-red-500 text-white shadow-[0_0_35px_rgba(239,68,68,0.8)]',
        text: 'text-red-100',
        badge: 'bg-red-500/25 text-red-100 border-red-300/70',
      }
    : {
        label: 'OPERATION WARNING',
        message: 'Unregistered RFID tag entered the warehouse',
        glow: 'bg-orange-400/20',
        border: 'border-orange-300/80',
        panel: 'border-orange-300/80 bg-orange-950/90 text-orange-50 shadow-[0_0_60px_rgba(251,146,60,0.6)]',
        icon: 'bg-orange-400 text-orange-950 shadow-[0_0_35px_rgba(251,146,60,0.9)]',
        text: 'text-orange-100',
        badge: 'bg-orange-400/25 text-orange-100 border-orange-200/70',
      };

  return (
    <div className="absolute inset-0 z-[190] overflow-hidden">
      <div className={`absolute inset-0 ${theme.glow} animate-pulse`} />
      <div className={`absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full ${theme.glow} blur-2xl animate-ping`} />
      <div className={`absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full ${theme.glow} blur-2xl animate-ping`} />
      <div className={`absolute inset-4 rounded-2xl border-4 ${theme.border} animate-pulse`} />
      <div className="absolute inset-x-0 top-0 h-3 bg-current opacity-70 animate-pulse" style={{ color: isSecurity ? '#ef4444' : '#fb923c' }} />
      <div className="absolute inset-x-0 bottom-0 h-3 bg-current opacity-70 animate-pulse" style={{ color: isSecurity ? '#ef4444' : '#fb923c' }} />

      <div className="absolute left-1/2 top-6 w-[34rem] max-w-[calc(100%-3rem)] -translate-x-1/2">
        <div className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${theme.panel}`}>
          <div className="flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${theme.icon}`}>
              <Icon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${theme.badge}`}>
                  {theme.label}
                </span>
                <span className="font-mono text-[11px] opacity-75">
                  {new Date(warning.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-black">{theme.message}</h2>
              <div className="mt-3 flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10">
                  {warning.thumbnail ? (
                    <img src={warning.thumbnail} alt={warning.itemName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/55">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-[9px] font-bold uppercase">No Image</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${theme.text}`}>
                    {warning.itemName}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0 rounded-lg bg-white/10 p-2">
                      <span className="block text-[10px] font-bold uppercase opacity-60">Item ID</span>
                      <span className="block truncate font-mono font-semibold">{warning.itemId || 'N/A'}</span>
                    </div>
                    <div className="min-w-0 rounded-lg bg-white/10 p-2">
                      <span className="block text-[10px] font-bold uppercase opacity-60">SKU</span>
                      <span className="block truncate font-mono font-semibold">{warning.sku || 'N/A'}</span>
                    </div>
                    <div className="min-w-0 rounded-lg bg-white/10 p-2">
                      <span className="block text-[10px] font-bold uppercase opacity-60">Status</span>
                      <span className="block truncate font-semibold">{warning.status?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div className="min-w-0 rounded-lg bg-white/10 p-2">
                      <span className="block text-[10px] font-bold uppercase opacity-60">Qty</span>
                      <span className="block truncate font-mono font-semibold">{warning.totalQty ?? 'N/A'}</span>
                    </div>
                  </div>
                  {warning.category && (
                    <p className="mt-2 truncate text-xs text-white/70">{warning.category}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="min-w-0 rounded-lg bg-white/10 p-2">
                  <span className="block text-[10px] font-bold uppercase opacity-60">From</span>
                  <span className="block truncate font-semibold">{warning.fromZoneName || (isSecurity ? 'Warehouse' : 'Unknown tag')}</span>
                </div>
                <div className="min-w-0 rounded-lg bg-white/10 p-2">
                  <span className="block text-[10px] font-bold uppercase opacity-60">To</span>
                  <span className="block truncate font-semibold">{warning.toZoneName || (isSecurity ? 'Outside gate' : 'Unknown zone')}</span>
                </div>
                <div className="min-w-0 rounded-lg bg-white/10 p-2">
                  <span className="block text-[10px] font-bold uppercase opacity-60">Reader</span>
                  <span className="block truncate font-semibold">{warning.readerName || 'Unknown reader'}</span>
                </div>
                <div className="min-w-0 rounded-lg bg-white/10 p-2">
                  <span className="block text-[10px] font-bold uppercase opacity-60">RFID Tag</span>
                  <span className="block truncate font-mono text-[10px] font-semibold">{warning.tag || 'N/A'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="pointer-events-auto mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-black uppercase text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveMovementCard({ event }: { event: QuantityMovementEvent }) {
  const isEntry = event.type === 'rfid_registered_entry_approved';
  const Icon = isEntry ? CheckCircle2 : LogOut;
  const theme = isEntry
    ? {
        title: 'Registered Entry',
        message: 'Item inserted into warehouse inventory',
        qtyText: 'Qty increased',
        route: `${event.fromZoneName || 'Gate reader'} to ${event.toZoneName || 'destination shelf'}`,
        panel: 'border-emerald-200 bg-white/95',
        iconWrap: 'bg-emerald-100 text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700',
        qty: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    : {
        title: 'Ordered Exit',
        message: 'Item removed from warehouse inventory',
        qtyText: 'Qty decreased',
        route: `${event.fromZoneName || 'Shelf'} to ${event.toZoneName || 'exit gate'}`,
        panel: 'border-purple-200 bg-white/95',
        iconWrap: 'bg-purple-100 text-purple-700',
        badge: 'bg-purple-100 text-purple-700',
        qty: 'bg-purple-50 text-purple-700 border-purple-200',
      };

  return (
    <div className="absolute bottom-6 right-6 z-[210] w-[24rem] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md">
      <div className={`border ${theme.panel}`}>
        <div className="flex gap-3 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {event.thumbnail ? (
              <img src={event.thumbnail} alt={event.itemName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[9px] font-bold uppercase">No Image</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${theme.iconWrap}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${theme.badge}`}>
                {theme.qtyText}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <h3 className="mt-2 text-sm font-black text-slate-900">{theme.title}</h3>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{event.itemName}</p>
            <p className="mt-1 text-xs text-slate-500">{theme.message}</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-600">{theme.route}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-3 text-xs">
          <div className={`rounded-lg border px-2 py-1.5 ${theme.qty}`}>
            <span className="block text-[9px] font-bold uppercase opacity-70">Before</span>
            <span className="font-mono font-black">{event.qtyBefore ?? 'N/A'}</span>
          </div>
          <div className={`rounded-lg border px-2 py-1.5 ${theme.qty}`}>
            <span className="block text-[9px] font-bold uppercase opacity-70">After</span>
            <span className="font-mono font-black">{event.qtyAfter ?? 'N/A'}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600">
            <span className="block text-[9px] font-bold uppercase opacity-70">RSSI</span>
            <span className="font-mono font-black">{event.rssi ?? 'N/A'}</span>
          </div>
        </div>

        <div className="space-y-1 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
          <p className="truncate"><span className="font-bold text-slate-600">Reader:</span> {event.readerName || 'Unknown reader'}</p>
          <p className="truncate"><span className="font-bold text-slate-600">Tag:</span> <span className="font-mono">{event.tag || 'N/A'}</span></p>
        </div>
      </div>
    </div>
  );
}

function SceneEventPulse({ visual }: { visual: SceneEventVisual }) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const style = RFID_EVENT_STYLES[visual.tone];

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;

    if (groupRef.current) {
      const scale = 1 + (Math.sin(elapsed * 5.5) + 1) * 0.16;
      groupRef.current.scale.set(scale, 1, scale);
    }

    if (trailRef.current) {
      const cycle = (elapsed * 0.55) % 1;
      trailRef.current.position.set(0, 1.05 + Math.sin(elapsed * 7) * 0.05, cycle * 3.6);
      const material = trailRef.current.material;

      if (material instanceof THREE.MeshStandardMaterial) {
        material.opacity = 1 - cycle * 0.75;
        material.emissiveIntensity = 0.8 + Math.sin(elapsed * 8) * 0.35;
      }
    }
  });

  return (
    <group position={visual.position}>
      <group ref={groupRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.45, 0.025, 8, 96]} />
          <meshBasicMaterial color={style.color} transparent opacity={0.72} depthWrite={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.92, 0.018, 8, 96]} />
          <meshBasicMaterial color={style.color} transparent opacity={0.38} depthWrite={false} />
        </mesh>
      </group>

      <pointLight color={style.color} intensity={1.4} distance={4.2} />

      {visual.tone === 'entry' && (
        <group ref={trailRef} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.72, 16]} />
            <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.15} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.18, 0.34, 24]} />
            <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.25} transparent opacity={0.96} />
          </mesh>
        </group>
      )}

      {visual.tone === 'exit-approved' && (
        <group ref={trailRef} position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.72, 16]} />
            <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.15} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.18, 0.34, 24]} />
            <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1.25} transparent opacity={0.96} />
          </mesh>
        </group>
      )}

      {visual.tone === 'security-warning' && (
        <mesh ref={trailRef} position={[0, 1.05, 0]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <meshStandardMaterial color={style.color} emissive={style.color} emissiveIntensity={1} transparent opacity={0.95} />
        </mesh>
      )}

      <Html position={[0, 3.24, 0]} center sprite zIndexRange={[18, 0]}>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.08em] shadow-2xl whitespace-nowrap ${style.bgClass}`}>
          {visual.label}
        </div>
      </Html>
    </group>
  );
}

function WarehouseEnvironment() {
  return (
    <group>
      {/* Concrete Floor */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[20, 0.1, 15]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Outside staging apron beyond the gate */}
      <mesh position={[0, -0.055, 9.25]} receiveShadow>
        <boxGeometry args={[9, 0.08, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.86} />
      </mesh>
      
      {/* Back Wall */}
      <mesh position={[0, 4, -7.5]} receiveShadow>
        <boxGeometry args={[20, 8, 0.2]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      
      {/* Left Wall */}
      <mesh position={[-10, 4, 0]} receiveShadow>
        <boxGeometry args={[0.2, 8, 15]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      
      {/* Right Wall */}
      <mesh position={[10, 4, 0]} receiveShadow>
        <boxGeometry args={[0.2, 8, 15]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>

      {/* Industrial Beams & Ceiling Lights */}
      {[...Array(5)].map((_, i) => (
        <group key={`beam-${i}`} position={[-8 + i * 4, 7.8, 0]}>
          {/* Transverse Beam */}
          <mesh receiveShadow castShadow>
            <boxGeometry args={[0.2, 0.4, 15]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Light fixtures */}
          <mesh position={[0, -0.2, -4]}>
            <boxGeometry args={[0.6, 0.1, 2]} />
            <meshStandardMaterial emissive="#ffffff" emissiveIntensity={1} color="#ffffff" />
            <pointLight intensity={0.4} distance={15} color="#f8fafc" />
          </mesh>
          <mesh position={[0, -0.2, 4]}>
            <boxGeometry args={[0.6, 0.1, 2]} />
            <meshStandardMaterial emissive="#ffffff" emissiveIntensity={1} color="#ffffff" />
            <pointLight intensity={0.4} distance={15} color="#f8fafc" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CameraFocusController({
  focusPoint,
  controlsRef,
}: {
  focusPoint: THREE.Vector3 | null;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const desiredTargetRef = useRef(new THREE.Vector3(0, 1.2, 0));
  const desiredPositionRef = useRef(new THREE.Vector3(0, 8, 14));
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!focusPoint) {
      isAnimatingRef.current = false;
      return;
    }

    desiredTargetRef.current.copy(focusPoint).add(new THREE.Vector3(0, 0.45, 0));
    desiredPositionRef.current.set(
      focusPoint.x + 3.4,
      Math.max(3.4, focusPoint.y + 2.4),
      focusPoint.z + 4.2,
    );
    isAnimatingRef.current = true;
  }, [focusPoint]);

  useFrame((_, delta) => {
    if (!isAnimatingRef.current) {
      return;
    }

    const smoothing = 1 - Math.exp(-delta * 4);

    camera.position.lerp(desiredPositionRef.current, smoothing);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTargetRef.current, smoothing);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(desiredPositionRef.current) < 0.08 &&
        controlsRef.current.target.distanceTo(desiredTargetRef.current) < 0.08
      ) {
        camera.position.copy(desiredPositionRef.current);
        controlsRef.current.target.copy(desiredTargetRef.current);
        controlsRef.current.update();
        isAnimatingRef.current = false;
      }
    }
  });

  return null;
}

export default function Simulation() {
  const navigate = useNavigate();
  const { items, zones, zoneSummary, readers, events, loading, loaded, liveConnectionStatus } = useInventory();
  const [selectedType, setSelectedType] = useState<'item' | 'reader' | 'rpi' | null>(null);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<Item | null>(null);
  const [selectedRpiDetails, setSelectedRpiDetails] = useState<RpiDevice | null>(null);
  const [itemDetailsLoading, setItemDetailsLoading] = useState(false);
  const [rpiDetailsLoading, setRpiDetailsLoading] = useState(false);
  const [cameraFocusPoint, setCameraFocusPoint] = useState<THREE.Vector3 | null>(null);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [activeWarning, setActiveWarning] = useState<WarningOverlayEvent | null>(null);
  const [activeQuantityMovement, setActiveQuantityMovement] = useState<QuantityMovementEvent | null>(null);
  const [dismissedWarningKeys, setDismissedWarningKeys] = useState<Set<string>>(() => new Set());
  const [frontendSettings, setFrontendSettings] = useState(() => loadFrontendSettings());
  const [resetAnimationVersion, setResetAnimationVersion] = useState(0);
  const controlsRef = useRef<any>(null);
  const itemZoneAssignmentRef = useRef(new Map<number, number>());
  const itemSlotAssignmentRef = useRef(new Map<number, number>());
  const isSimulationLoading = !loaded.items || !loaded.zones || !loaded.readers || loading.items || loading.zones || loading.readers || loading.zoneSummary;
  const warehouseZoneVisuals = useMemo(() => getWarehouseZoneVisuals(zones, readers), [zones, readers]);
  const primaryZoneVisualPositions = useMemo(() => {
    const positions = new Map<number, [number, number, number]>();

    warehouseZoneVisuals.forEach(visual => {
      if (!positions.has(visual.zone.id)) {
        positions.set(visual.zone.id, visual.position);
      }
    });

    return positions;
  }, [warehouseZoneVisuals]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) || 
      (item.label && item.label.toLowerCase().includes(query)) ||
      (item.rfid_tag_code && item.rfid_tag_code.toLowerCase().includes(query)) ||
      (item.sku && item.sku.toLowerCase().includes(query)) ||
      (item.nickname && item.nickname.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  useEffect(() => {
    const refreshFrontendSettings = () => {
      setFrontendSettings(loadFrontendSettings());
    };

    window.addEventListener('smart-rfid-frontend-settings-change', refreshFrontendSettings);
    window.addEventListener('storage', refreshFrontendSettings);

    return () => {
      window.removeEventListener('smart-rfid-frontend-settings-change', refreshFrontendSettings);
      window.removeEventListener('storage', refreshFrontendSettings);
    };
  }, []);

  const eventActivity = useMemo(() => {
    return events
      .map(event => {
        const payload = event.raw_payload as Partial<{
          type: RfidLiveSocketEvent['type'];
          item: { id: number; name: string };
          from_zone: { name: string };
          to_zone: { name: string };
          reader: { name?: string };
          raw_payload: {
            rpi_id?: string;
            reader?: string;
            reader_id?: string;
            label?: string;
            tag?: string;
            rssi?: number;
            distance?: string;
            timestamp?: string;
            _rfid_logic?: {
              case?: string;
              gate_event_id?: number;
              entry_approved?: boolean;
              qty_before?: number;
              qty_after?: number;
            };
          };
          movement_detected: boolean;
          received_at: string;
          detected_at: string;
        }> | null;
        const rawPayload = payload?.raw_payload;
        const rawLogic = rawPayload?._rfid_logic;
        const inventoryItem = items.find(item => (
          item.id === event.item_id ||
          item.id === payload?.item?.id ||
          (rawPayload?.tag && item.rfid_tag_code === rawPayload.tag) ||
          (event.tag && item.rfid_tag_code === event.tag) ||
          (rawPayload?.label && item.label === rawPayload.label) ||
          (event.label && item.label === event.label)
        ));

        const itemName =
          payload?.item?.name ||
          rawPayload?.label ||
          inventoryItem?.name ||
          event.label ||
          `Item ${event.item_id}`;
        const fromZoneName = payload?.from_zone?.name || null;
        const toZoneName =
          payload?.to_zone?.name ||
          zones.find(zone => zone.id === event.zone_id)?.name ||
          null;
        const movementDetected = Boolean(
          payload?.movement_detected ??
          event.movement_detected ??
          (fromZoneName && toZoneName && fromZoneName !== toZoneName)
        );
        const tone = getRfidEventTone(payload?.type);
        const style = RFID_EVENT_STYLES[tone];
        const title =
          tone === 'movement'
            ? 'Zone movement'
            : style.text;

        return {
          id: event.id,
          type: payload?.type || 'rfid_detection_event',
          tone,
          title,
          itemName,
          itemId: payload?.item?.id || inventoryItem?.id || event.item_id,
          thumbnail: inventoryItem?.thumbnail || null,
          sku: inventoryItem?.sku || null,
          status: inventoryItem?.status || null,
          category: inventoryItem ? `${inventoryItem.main_cat} / ${inventoryItem.sub_cat}` : null,
          totalQty: inventoryItem?.total_qty ?? null,
          fromZoneName,
          toZoneName,
          movementDetected,
          tag: rawPayload?.tag || event.tag,
          readerName: payload?.reader?.name || rawPayload?.reader || event.reader_name || null,
          readerDeviceId: rawPayload?.reader_id || event.reader_device_code || null,
          rpiId: rawPayload?.rpi_id || event.rpi_device_code || null,
          rssi: rawPayload?.rssi ?? event.rssi ?? null,
          distance: rawPayload?.distance || event.distance || null,
          logicCase: rawLogic?.case || null,
          gateEventId: rawLogic?.gate_event_id ?? null,
          entryApproved: rawLogic?.entry_approved ?? null,
          qtyBefore: rawLogic?.qty_before ?? null,
          qtyAfter: rawLogic?.qty_after ?? null,
          timestamp: payload?.received_at || payload?.detected_at || rawPayload?.timestamp || event.received_at || event.detected_at,
        };
      })
      .slice(0, 8);
  }, [events, items, zones]);

  const sceneEventVisuals = useMemo<SceneEventVisual[]>(() => {
    const now = Date.now();

    return events
      .map(event => {
        const payload = event.raw_payload as Partial<RfidLiveSocketEvent> | null;
        const tone = getRfidEventTone(payload?.type);
        const visualKey = `${event.id}-${payload?.type || 'rfid_detection_event'}`;

        if (
          (tone === 'security-warning' || tone === 'operation-warning') &&
          dismissedWarningKeys.has(visualKey)
        ) {
          return null;
        }

        const zoneId =
          payload?.to_zone?.id ??
          payload?.from_zone?.id ??
          event.zone_id;
        const zone = zones.find(candidateZone => candidateZone.id === zoneId);

        if (!zone) {
          return null;
        }

        const timestamp = payload?.received_at || payload?.detected_at || event.received_at || event.detected_at;
        const ageMs = now - new Date(timestamp).getTime();

        if (!Number.isFinite(ageMs) || ageMs > 30000) {
          return null;
        }

        const [x, y, z] = primaryZoneVisualPositions.get(zone.id) ?? getZoneBasePosition(zone, zones, readers);
        const style = RFID_EVENT_STYLES[tone];
        const itemName = payload?.item?.name || event.label || payload?.tag || event.tag;

        return {
          id: visualKey,
          tone,
          label: `${style.text}: ${itemName}`,
          position: [x, y, z] as [number, number, number],
          isExit: tone === 'exit-approved' || tone === 'security-warning',
        };
      })
      .filter((visual): visual is SceneEventVisual => Boolean(visual))
      .slice(0, 6);
  }, [dismissedWarningKeys, events, primaryZoneVisualPositions, readers, zones]);

  useEffect(() => {
    const latestWarningEntry = eventActivity.find(entry => (
      entry.tone === 'security-warning' || entry.tone === 'operation-warning'
    ));

    if (!latestWarningEntry) {
      return;
    }

    const warningTone = latestWarningEntry.tone;

    if (warningTone !== 'security-warning' && warningTone !== 'operation-warning') {
      return;
    }

    const ageMs = Date.now() - new Date(latestWarningEntry.timestamp).getTime();

    if (!Number.isFinite(ageMs) || ageMs > 30000) {
      return;
    }

    const latestWarning: WarningOverlayEvent = {
      ...latestWarningEntry,
      tone: warningTone,
    };

    if (dismissedWarningKeys.has(`${latestWarning.id}-${latestWarning.type}`)) {
      return;
    }

    setActiveWarning(latestWarning);
  }, [dismissedWarningKeys, eventActivity]);

  useEffect(() => {
    if (!activeWarning) {
      return;
    }

    playAlertSiren(activeWarning.tone);
    const intervalId = window.setInterval(() => {
      playAlertSiren(activeWarning.tone);
    }, activeWarning.tone === 'security-warning' ? 1100 : 1450);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeWarning]);

  useEffect(() => {
    const latestMovementEntry = eventActivity.find(entry => (
      entry.type === 'rfid_registered_entry_approved' || entry.type === 'rfid_ordered_exit_approved'
    ));

    if (!latestMovementEntry) {
      return;
    }

    const movementType = latestMovementEntry.type;

    if (movementType !== 'rfid_registered_entry_approved' && movementType !== 'rfid_ordered_exit_approved') {
      return;
    }

    const movementTone = latestMovementEntry.tone;

    if (movementTone !== 'entry' && movementTone !== 'exit-approved') {
      return;
    }

    const ageMs = Date.now() - new Date(latestMovementEntry.timestamp).getTime();

    if (!Number.isFinite(ageMs) || ageMs > 30000) {
      return;
    }

    const latestMovement: QuantityMovementEvent = {
      id: latestMovementEntry.id,
      type: movementType,
      tone: movementTone,
      itemId: latestMovementEntry.itemId,
      itemName: latestMovementEntry.itemName,
      thumbnail: latestMovementEntry.thumbnail,
      fromZoneName: latestMovementEntry.fromZoneName,
      toZoneName: latestMovementEntry.toZoneName,
      tag: latestMovementEntry.tag,
      readerName: latestMovementEntry.readerName,
      readerDeviceId: latestMovementEntry.readerDeviceId,
      rpiId: latestMovementEntry.rpiId,
      rssi: latestMovementEntry.rssi,
      distance: latestMovementEntry.distance,
      logicCase: latestMovementEntry.logicCase,
      gateEventId: latestMovementEntry.gateEventId,
      entryApproved: latestMovementEntry.entryApproved,
      qtyBefore: latestMovementEntry.qtyBefore,
      qtyAfter: latestMovementEntry.qtyAfter,
      timestamp: latestMovementEntry.timestamp,
    };

    setActiveQuantityMovement(latestMovement);
  }, [eventActivity]);

  const handlePointerMissed = () => {
    setSelectedType(null);
    setSelectedId(null);
  };

  useEffect(() => {
    if (selectedType !== 'item' || typeof selectedId !== 'number') {
      setSelectedItemDetails(null);
      setItemDetailsLoading(false);
      return;
    }

    let active = true;

    const loadItemDetails = async () => {
      setItemDetailsLoading(true);

      try {
        const data = await fetchApiResource<Item>(`/items/${selectedId}`);
        if (active) {
          setSelectedItemDetails(data);
        }
      } catch (error) {
        console.error(`Failed to fetch item ${selectedId}`, error);
        if (active) {
          setSelectedItemDetails(null);
        }
      } finally {
        if (active) {
          setItemDetailsLoading(false);
        }
      }
    };

    void loadItemDetails();

    return () => {
      active = false;
    };
  }, [selectedId, selectedType]);

  useEffect(() => {
    if (selectedType !== 'rpi' || typeof selectedId !== 'number') {
      setSelectedRpiDetails(null);
      setRpiDetailsLoading(false);
      return;
    }

    let active = true;

    const loadRpiDetails = async () => {
      setRpiDetailsLoading(true);

      try {
        const data = await fetchApiResource<RpiDevice>(`/rpi-devices/${selectedId}`);
        if (active) {
          setSelectedRpiDetails(data);
        }
      } catch (error) {
        console.error(`Failed to fetch RPi device ${selectedId}`, error);
        if (active) {
          setSelectedRpiDetails(null);
        }
      } finally {
        if (active) {
          setRpiDetailsLoading(false);
        }
      }
    };

    void loadRpiDetails();

    return () => {
      active = false;
    };
  }, [selectedId, selectedType]);

  useEffect(() => {
    setIsSidePanelCollapsed(false);
  }, [selectedId, selectedType]);

  const itemsWithTargets = useMemo(() => {
    const zonesById = new Map(zones.map(zone => [zone.id, zone]));
    const itemsByZone = new Map<number, Item[]>();
    const occupiedSlotsByZone = new Map<number, Set<number>>();
    const nextItemZoneAssignments = new Map<number, number>();
    const nextItemSlotAssignments = new Map<number, number>();
    const targetPositionByItemId = new Map<number, THREE.Vector3>();

    items.forEach(item => {
      if (!zonesById.has(item.current_zone_id)) {
        return;
      }

      const zoneItems = itemsByZone.get(item.current_zone_id) ?? [];
      zoneItems.push(item);
      itemsByZone.set(item.current_zone_id, zoneItems);
    });

    const reserveSlot = (zoneId: number, preferredSlot?: number) => {
      const occupiedSlots = occupiedSlotsByZone.get(zoneId) ?? new Set<number>();
      occupiedSlotsByZone.set(zoneId, occupiedSlots);

      if (preferredSlot !== undefined && !occupiedSlots.has(preferredSlot)) {
        occupiedSlots.add(preferredSlot);
        return preferredSlot;
      }

      let nextFreeSlot = 0;
      while (occupiedSlots.has(nextFreeSlot)) {
        nextFreeSlot += 1;
      }

      occupiedSlots.add(nextFreeSlot);
      return nextFreeSlot;
    };

    itemsByZone.forEach((zoneItems, zoneId) => {
      const zone = zonesById.get(zoneId);

      if (!zone) {
        return;
      }

      const residentItems = zoneItems
        .filter(item => itemZoneAssignmentRef.current.get(item.id) === zoneId)
        .sort((leftItem, rightItem) => {
          const leftSlot = itemSlotAssignmentRef.current.get(leftItem.id) ?? Number.MAX_SAFE_INTEGER;
          const rightSlot = itemSlotAssignmentRef.current.get(rightItem.id) ?? Number.MAX_SAFE_INTEGER;
          return leftSlot - rightSlot;
        });
      const incomingItems = zoneItems.filter(item => itemZoneAssignmentRef.current.get(item.id) !== zoneId);

      [...residentItems, ...incomingItems].forEach(item => {
        const previousZoneId = itemZoneAssignmentRef.current.get(item.id);
        const previousSlot = itemSlotAssignmentRef.current.get(item.id);
        const slotIndex = reserveSlot(
          zone.id,
          previousZoneId === zone.id ? previousSlot : undefined,
        );
        const basePos = primaryZoneVisualPositions.get(zone.id) ?? getZoneBasePosition(zone, zones, readers);
        const [offsetX, offsetY, offsetZ] = getZoneSlotOffset(zone, slotIndex, readers);

        nextItemZoneAssignments.set(item.id, zone.id);
        nextItemSlotAssignments.set(item.id, slotIndex);
        targetPositionByItemId.set(
          item.id,
          new THREE.Vector3(basePos[0] + offsetX, offsetY, basePos[2] + offsetZ),
        );
      });
    });

    const nextItemsWithTargets = items.map(item => {
      const targetPosition = targetPositionByItemId.get(item.id);

      return {
        ...item,
        targetPosition: targetPosition ?? new THREE.Vector3(0, 0, 0),
      };
    });

    itemZoneAssignmentRef.current = nextItemZoneAssignments;
    itemSlotAssignmentRef.current = nextItemSlotAssignments;

    return nextItemsWithTargets;
  }, [items, zones, readers, primaryZoneVisualPositions]);

  const registeredEntryStarts = useMemo(() => {
    const entryStarts = new Map<number, RegisteredEntryStart>();

    if (activeQuantityMovement?.type !== 'rfid_registered_entry_approved' || !activeQuantityMovement.itemId) {
      return entryStarts;
    }

    const gateZone = zones.find(zone => (
      shouldRenderGateZone(zone, readers) &&
      readers.some(reader => reader.zone_id === zone.id && isGateReader(reader))
    )) || zones.find(zone => shouldRenderGateZone(zone, readers));

    if (!gateZone) {
      return entryStarts;
    }

    const [baseX, baseY, baseZ] = primaryZoneVisualPositions.get(gateZone.id) ?? getZoneBasePosition(gateZone, zones, readers);
    const [offsetX, offsetY, offsetZ] = getZoneSlotOffset(gateZone, 0, readers);
    const startPosition = new THREE.Vector3(baseX + offsetX, Math.max(baseY + offsetY, 0.275), baseZ + offsetZ);

    entryStarts.set(activeQuantityMovement.itemId, {
      key: `${activeQuantityMovement.id}-${activeQuantityMovement.timestamp}`,
      position: startPosition,
    });

    return entryStarts;
  }, [activeQuantityMovement, readers, zones, primaryZoneVisualPositions]);

  const resetAnimationStarts = useMemo(() => {
    const resetStarts = new Map<number, RegisteredEntryStart>();

    if (resetAnimationVersion === 0) {
      return resetStarts;
    }

    itemsWithTargets.forEach((item, index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      const laneOffset = ((index % 3) - 1) * 0.6;
      const startPosition = item.targetPosition.clone().add(
        new THREE.Vector3(direction * 2.2, 0, laneOffset),
      );

      startPosition.y = Math.max(0.275, item.targetPosition.y);
      resetStarts.set(item.id, {
        key: `reset-${resetAnimationVersion}-${item.id}`,
        position: startPosition,
      });
    });

    return resetStarts;
  }, [itemsWithTargets, resetAnimationVersion]);

  const selectedItem = selectedType === 'item' ? items.find(i => i.id === selectedId) : null;
  const activeItem = selectedItemDetails?.id === selectedId ? selectedItemDetails : selectedItem;
  const selectedItemZone = activeItem ? zones.find(z => z.id === activeItem.current_zone_id) : null;
  const activeItemTimelineVariant = activeItem?.variants?.find(variant => (
    variant.rfid_tag_code &&
    activeItem.rfid_tag_code &&
    variant.rfid_tag_code === activeItem.rfid_tag_code
  )) || activeItem?.variants?.find(variant => variant.current_zone_id === activeItem.current_zone_id) || activeItem?.variants?.[0] || null;

  const focusSceneOnItem = (itemId: number) => {
    const targetItem = itemsWithTargets.find(item => item.id === itemId);
    if (!targetItem) {
      return;
    }

    setCameraFocusPoint(targetItem.targetPosition.clone());
  };

  const handleResetAnimation = () => {
    setActiveQuantityMovement(null);
    setResetAnimationVersion(version => version + 1);
  };

  const handleOpenMovementTimeline = () => {
    if (!activeItemTimelineVariant) {
      return;
    }

    navigate(`/movement-timeline?variant_id=${activeItemTimelineVariant.id}`);
  };

  const handleItemMovementComplete = (itemId: number) => {
    setActiveQuantityMovement(currentMovement => (
      currentMovement?.itemId === itemId
        ? null
        : currentMovement
    ));
  };

  const dismissActiveWarning = () => {
    setActiveWarning(currentWarning => {
      if (currentWarning) {
        setDismissedWarningKeys(currentKeys => {
          const nextKeys = new Set(currentKeys);
          nextKeys.add(`${currentWarning.id}-${currentWarning.type}`);
          return nextKeys;
        });
      }

      return null;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F3F4F6]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-8">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>Main Warehouse</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          <span className="text-slate-900 font-bold">Wharehouse</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetAnimation}
            disabled={isSimulationLoading || itemsWithTargets.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Reset warehouse animation"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Animation
          </button>
          {isSimulationLoading && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}
        </div>
      </div>

      <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#EBEEF2] shadow-inner">
        {!loaded.items || !loaded.zones || !loaded.readers ? (
          <div className="absolute inset-0 z-[150] flex items-center justify-center bg-[#EBEEF2]/95">
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Loading warehouse map data...</p>
            </div>
          </div>
        ) : null}
        {activeWarning && <WarningAlarmOverlay warning={activeWarning} onDismiss={dismissActiveWarning} />}
        {!activeWarning && activeQuantityMovement && <ActiveMovementCard event={activeQuantityMovement} />}
        {/* Search Bar */}
        <div className="absolute top-6 left-6 z-[110] w-72">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search items by name, epc, brand..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white/90 backdrop-blur-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-20">
              <ul className="py-1">
                {searchResults.map((item) => (
                  <li 
                    key={item.id}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                    onClick={() => {
                      setSelectedType('item');
                      setSelectedId(item.id);
                      focusSceneOnItem(item.id);
                      setSearchQuery("");
                      setShowSearchResults(false);
                    }}
                  >
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-500 font-mono mt-0.5">{item.rfid_tag_code || item.sku}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-20 text-center">
              <p className="text-sm text-gray-500">No items found.</p>
            </div>
          )}
        </div>

        {isSidePanelCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidePanelCollapsed(false)}
            className="absolute top-6 right-6 z-[200] inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xl backdrop-blur-md hover:bg-white"
          >
            <ChevronsRight className="h-4 w-4" />
            Open Panel
          </button>
        )}

        {isHistoryCollapsed ? (
          <button
            type="button"
            onClick={() => setIsHistoryCollapsed(false)}
            className="absolute bottom-6 left-6 z-[200] inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-800 shadow-2xl backdrop-blur-md hover:bg-white/70"
          >
            <ChevronUp className="h-4 w-4" />
            Open History
          </button>
        ) : (
          <div className="absolute bottom-6 left-6 z-[200] w-[30rem] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-sky-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">RFID Event Activity</h3>
                  <p className="text-[11px] text-slate-500">Live detections, entries, exits, and warnings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={
                    liveConnectionStatus === 'connected'
                      ? 'bg-emerald-100/90 text-emerald-700'
                      : liveConnectionStatus === 'connecting'
                        ? 'bg-amber-100/90 text-amber-700'
                        : 'bg-slate-200/90 text-slate-600'
                  }
                >
                  {liveConnectionStatus}
                </Badge>
                <button
                  type="button"
                  onClick={() => setIsHistoryCollapsed(true)}
                  className="rounded-full p-1 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
                  aria-label="Collapse history"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[16.5rem] space-y-2 overflow-y-auto p-3">
              {eventActivity.length > 0 ? (
                eventActivity.map(entry => {
                  const Icon =
                    entry.tone === 'security-warning'
                      ? ShieldAlert
                      : entry.tone === 'operation-warning'
                        ? TriangleAlert
                        : entry.tone === 'exit-approved'
                          ? LogOut
                          : entry.tone === 'entry'
                            ? CheckCircle2
                            : ArrowRight;
                  const toneClass =
                    entry.tone === 'security-warning'
                      ? 'bg-red-100 text-red-700'
                      : entry.tone === 'operation-warning'
                        ? 'bg-amber-100 text-amber-700'
                        : entry.tone === 'exit-approved'
                          ? 'bg-purple-100 text-purple-700'
                          : entry.tone === 'entry'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700';

                  return (
                  <div key={`${entry.id}-${entry.timestamp}`} className="rounded-xl border border-slate-200/80 bg-white/55 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-2">
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${toneClass}`}>
                          {entry.thumbnail ? (
                            <img src={entry.thumbnail} alt={entry.itemName} className="h-full w-full object-cover" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{entry.itemName}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${toneClass}`}>
                              {entry.title}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="truncate font-medium text-slate-700">{entry.fromZoneName || (entry.tone === 'operation-warning' ? 'Unknown tag' : 'Warehouse')}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate font-medium text-slate-900">{entry.toZoneName || (entry.tone === 'exit-approved' ? 'Collected' : entry.tone === 'security-warning' ? 'Outside gate' : 'Unknown zone')}</span>
                          </p>
                          {entry.tag && (
                            <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{entry.tag}</p>
                          )}
                          {entry.qtyBefore !== null && entry.qtyAfter !== null && (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                              Qty {entry.qtyBefore} -&gt; {entry.qtyAfter}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200/80 bg-white/30 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-slate-700">No RFID activity yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item Sidebar Card */}
        {!isSidePanelCollapsed && selectedType === 'item' && activeItem && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-[200] overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package2 className="w-4 h-4 text-blue-500" /> Item Details
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSidePanelCollapsed(true)}
                  className="text-gray-400 hover:text-gray-700 transition"
                  aria-label="Collapse panel"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handlePointerMissed}
                  className="text-gray-400 hover:text-gray-700 transition"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              {itemDetailsLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading item details...
                </div>
              )}
              {/* Image Placeholder */}
              <div className="w-full h-32 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                {activeItem.thumbnail ? (
                  <img src={activeItem.thumbnail} alt={activeItem.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{activeItem.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-slate-500">{activeItem.sku}</span>
                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">{activeItem.nickname}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</span>
                  <Badge className={`mt-1 text-xs ${
                    activeItem.status === 'in_stock' ? 'bg-blue-100/50 text-blue-700' :
                    activeItem.status === 'alert' ? 'bg-red-100/50 text-red-700' :
                    activeItem.status === 'sold' ? 'bg-green-100/50 text-green-700' :
                    'bg-purple-100/50 text-purple-700'
                  }`} variant="outline">
                    {activeItem.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Location</span>
                  <span className="block mt-1 font-medium text-sm text-slate-800">{selectedItemZone?.name || 'Unknown'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenMovementTimeline}
                  disabled={!activeItemTimelineVariant}
                  className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <History className="h-4 w-4" />
                  Movement Timeline
                  {activeItemTimelineVariant && (
                    <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-blue-600">
                      Variant {activeItemTimelineVariant.id}
                    </span>
                  )}
                </button>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs font-medium">Item ID:</span>
                  <span className="font-mono text-[10px] text-slate-600">{activeItem.id}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs font-medium">RFID Label:</span>
                  <span className="font-mono font-bold text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded text-xs border border-blue-100">{activeItem.label || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs font-medium">EPC / TAG:</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]">{activeItem.rfid_tag_code}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs font-medium">Category:</span>
                  <span className="text-[11px] text-slate-700 text-right">{activeItem.main_cat} / {activeItem.sub_cat}</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-gray-100">
                  {activeItem.description || 'No description available.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reader Sidebar Card */}
        {!isSidePanelCollapsed && selectedType === 'reader' && selectedId && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-[200] overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue-50/50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <RadioReceiver className="w-4 h-4 text-blue-600" /> RFID Reader
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSidePanelCollapsed(true)}
                  className="text-gray-400 hover:text-gray-700 transition"
                  aria-label="Collapse panel"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={handlePointerMissed} className="text-gray-400 hover:text-gray-700 transition" aria-label="Close panel">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {(() => {
              const reader = readers.find(r => r.id === selectedId);
              if (!reader) return null;
              const zoneName = zones.find(z => z.id === reader.zone_id)?.name;
              return (
                <div className="p-4 flex flex-col gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{reader.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-slate-500">{reader.reader_device_id}</span>
                      <Badge variant="secondary" className={`text-[10px] ${reader.status === 'active' ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'}`}>{reader.status.toUpperCase()}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Zone</span>
                      <span className="block mt-1 font-medium text-sm text-slate-800">{zoneName || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</span>
                      <span className="block mt-1 font-medium text-sm text-slate-800 uppercase text-[11px]">{reader.reader_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 text-xs font-medium flex items-center gap-1"><Cpu className="w-3 h-3" /> Host Node (RPi)</span>
                      <span className="font-mono font-bold text-slate-700 px-1.5 py-0.5 bg-slate-100 rounded text-xs">{reader.rpi_device_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 text-xs font-medium">Detection Range</span>
                      <span className="font-mono font-bold text-sky-700 px-1.5 py-0.5 bg-sky-50 rounded text-xs border border-sky-100">{getReaderRange(reader).toFixed(2)}m</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 text-xs font-medium flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Connection</span>
                      <span className="text-slate-600 text-[11px] font-mono">USB Serial</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* RPi Sidebar Card */}
        {!isSidePanelCollapsed && selectedType === 'rpi' && selectedId && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-[200] overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-emerald-50/50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" /> Raspberry Pi Node
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSidePanelCollapsed(true)}
                  className="text-gray-400 hover:text-gray-700 transition"
                  aria-label="Collapse panel"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={handlePointerMissed} className="text-gray-400 hover:text-gray-700 transition" aria-label="Close panel">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {(() => {
              const rpiReaders = readers.filter(r => r.rpi_device_id === selectedId);
              const activeRpi = selectedRpiDetails?.id === selectedId ? selectedRpiDetails : null;
              return (
                <div className="p-4 flex flex-col gap-4">
                  {rpiDetailsLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading Raspberry Pi details...
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{activeRpi?.name || `Node: ${selectedId}`}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-slate-500">{activeRpi?.device_id || `ID ${selectedId}`}</span>
                      <Badge variant="secondary" className={`text-[10px] ${activeRpi?.status === 'active' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                        {(activeRpi?.status || 'unknown').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Device ID</span>
                      <span className="block mt-1 font-mono text-sm text-slate-800">{selectedId}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Last Seen</span>
                      <span className="block mt-1 text-xs text-slate-800">
                        {activeRpi?.last_seen_at ? new Date(activeRpi.last_seen_at).toLocaleString() : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Connected Readers ({rpiReaders.length})</span>
                    {rpiReaders.map(r => (
                      <div key={r.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-slate-700 font-medium text-xs">{r.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${r.status === 'active' ? 'bg-blue-100 text-blue-700 border-none' : 'bg-gray-200 text-gray-700 border-none'}`}>{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Global Summary Sidebar */}
        {!isSidePanelCollapsed && selectedType === null && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 z-[200] overflow-hidden transition-all duration-300 flex flex-col max-h-[calc(100%-3rem)]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" /> Warehouse Overview
              </h3>
              <button
                type="button"
                onClick={() => setIsSidePanelCollapsed(true)}
                className="text-gray-400 hover:text-gray-700 transition"
                aria-label="Collapse panel"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-600">Total Zones</span>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  {zoneSummary?.zones_count || zones.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {zoneSummary ? (
                  zoneSummary.zones.map(zs => (
                    <div key={zs.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-800 text-sm">{zs.name}</span>
                        <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">{zs.items_count} items</Badge>
                      </div>
                      {zs.items.length > 0 ? (
                        <ul className="space-y-1">
                          {zs.items.map(item => (
                            <li key={item.id} className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                              {item.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Empty</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Loading summary...</p>
                )}
              </div>
            </div>
          </div>
        )}

        <Canvas camera={{ position: [0, 8, 14], fov: 45 }} shadows onPointerMissed={handlePointerMissed}>
          <color attach="background" args={['#0f172a']} />

          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.0}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
            shadow-bias={-0.0001}
          />

          <WarehouseEnvironment />

          <Grid infiniteGrid={false} args={[20, 15]} fadeDistance={50} fadeStrength={5} cellColor="#94A3B8" sectionColor="#475569" position={[0, 0.01, 0]} />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={5}
            maxDistance={25}
            onStart={() => setCameraFocusPoint(null)}
          />
          <CameraFocusController focusPoint={cameraFocusPoint} controlsRef={controlsRef} />

          {/* Render Zones */}
          {warehouseZoneVisuals.map(zoneVisual => {
            const { zone, readers: zoneReaders, isGate, position: pos, label } = zoneVisual;
            const selectedZoneReader = zoneReaders.find(r => selectedType === 'reader' && selectedId === r.id);
            const rangeSpherePosition: [number, number, number] = isGate ? [0, 1.05, 0] : [0, 1.25, 0];

            return (
              <group key={zoneVisual.key} position={pos}>
                {selectedZoneReader && (
                  <ReaderRangeSphere
                    radius={getReaderRange(selectedZoneReader)}
                    position={rangeSpherePosition}
                  />
                )}
                {/* Zone Base Platform */}
                {isGate ? (
                  <LaserGate laserColor="#f59e0b" />
                ) : (
                  <group position={[0, 0, 0]}>
                    {/* Vertical Posts */}
                    {[-0.8, 0.8].map(x => (
                      [-0.6, 0.6].map(z => (
                        <mesh key={`post-${x}-${z}`} position={[x, 1.25, z]} castShadow receiveShadow>
                          <boxGeometry args={[0.06, 2.5, 0.06]} />
                          <meshStandardMaterial color="#1e3a8a" />
                        </mesh>
                      ))
                    ))}

                    {/* 5 Shelf Levels */}
                    {[0.2, 0.7, 1.2, 1.7, 2.2].map(y => (
                      <mesh key={`tier-${y}`} position={[0, y, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.7, 0.04, 1.3]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.2} roughness={0.7} />
                      </mesh>
                    ))}
                  </group>
                )}

                {/* Zone Label */}
                {isGate ? (
                  <Text
                    position={[0, 2.3, 1.3]}
                    fontSize={0.25}
                    color="#f59e0b"
                    anchorX="center"
                    anchorY="bottom"
                    fontWeight="bold"
                    rotation={[-Math.PI / 6, 0, 0]}
                  >
                    {label.toUpperCase()}
                  </Text>
                ) : (
                  <Html position={[0, 2.82, 1.42]} center transform sprite zIndexRange={[10, 0]}>
                    <div className="rounded-full border border-cyan-300/80 bg-slate-950/65 px-3 py-1 text-xs font-black tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.9),0_0_34px_rgba(14,165,233,0.45)]">
                      {label.toUpperCase()}
                    </div>
                  </Html>
                )}

                {/* Zone Readers */}
                {zoneReaders.map((r, i) => (
                  <SimulatedReader 
                    key={r.id}
                    reader={r}
                    position={[0.9, isGate ? 0.1 : 2.5, -0.6 + i * 1.2]} 
                    isSelected={selectedType === 'reader' && selectedId === r.id}
                    onClick={() => { setSelectedType('reader'); setSelectedId(r.id); }}
                  />
                ))}

                {/* Zone RPis */}
                {Array.from(new Set(zoneReaders.map(r => r.rpi_device_id))).map((rpiId, i) => (
                   <SimulatedRPi 
                     key={rpiId} 
                     rpiId={rpiId.toString()} 
                     position={[-0.9, 0.05, -0.6 + i * 0.5]} 
                     isSelected={selectedType === 'rpi' && selectedId === rpiId}
                     onClick={() => { setSelectedType('rpi'); setSelectedId(rpiId); }}
                   />
                ))}
              </group>
            );
          })}

          {sceneEventVisuals.map(visual => (
            <SceneEventPulse key={visual.id} visual={visual} />
          ))}

          {/* Render Animated Items */}
          {loaded.items && loaded.zones && itemsWithTargets.map(item => (
            <SimulatedItem 
              key={item.id} 
              item={item} 
              targetPosition={item.targetPosition} 
              movementStart={resetAnimationStarts.get(item.id) ?? registeredEntryStarts.get(item.id)}
              movementSimulationSeconds={frontendSettings.movementSimulationSeconds}
              isSelected={selectedType === 'item' && selectedId === item.id}
              onMovementComplete={handleItemMovementComplete}
              onClick={() => { setSelectedType('item'); setSelectedId(item.id); }}
            />
          ))}
        </Canvas>
      </div>
    </div>
  );
}
