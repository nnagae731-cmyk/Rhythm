import { DeparturePlan, SharedActionStatus, SharedAttendanceStatus, SharedEvent, SharedParticipant, SharedParticipantPrefs } from '../../types';
import { dateKey } from '../tasks/taskUtils';

export const sharedActionStatuses: SharedActionStatus[] = ['未準備', '準備中', '今から出る', '移動中', '少し遅れそう', '到着した', '参加できない'];
export const sharedAttendanceStatuses: SharedAttendanceStatus[] = ['参加', '不参加'];
export const sharedDeparturePoints = [
  { id: 'current' as const, label: '現在地' },
  { id: 'home' as const, label: '自宅' },
  { id: 'custom' as const, label: '指定した場所' },
];

export function createSharedEventToken(seed: string) {
  return `share-${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSharedParticipantId(token: string) {
  return `participant-${token}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSharedEventPacket(plan: DeparturePlan, token: string, ownerDisplayName: string, existingParticipants: SharedParticipant[] = []): SharedEvent {
  const createdAt = new Date().toISOString();
  const ownerParticipantId = existingParticipants.find((item) => item.participantId.startsWith('owner:'))?.participantId ?? `owner:${token}`;
  const ownerParticipant: SharedParticipant = {
    participantId: ownerParticipantId,
    sharedEventId: plan.id ?? token,
    displayName: ownerDisplayName || 'あなた',
    attendanceStatus: '参加',
    actionStatus: '未準備',
    estimatedArrivalAt: undefined,
    lastUpdatedAt: createdAt,
  };
  const others = existingParticipants.filter((item) => item.participantId !== ownerParticipant.participantId);
  return {
    shareToken: token,
    eventId: plan.id ?? token,
    ownerDisplayName: ownerParticipant.displayName,
    sharingEnabled: true,
    createdAt,
    updatedAt: createdAt,
    title: plan.title,
    date: plan.date,
    destination: plan.destination,
    arrival: plan.arrival,
    travelMinutes: plan.travelMinutes,
    preparationMinutes: plan.preparationMinutes,
    bufferMinutes: plan.bufferMinutes,
    participants: [ownerParticipant, ...others],
  };
}

export function normalizeSharedEvent(packet: Partial<SharedEvent>): SharedEvent {
  const token = packet.shareToken ?? createSharedEventToken(packet.eventId ?? 'event');
  const participants: SharedParticipant[] = (packet.participants ?? []).filter(Boolean).map((participant) => ({
    participantId: participant.participantId ?? `participant-${token}`,
    sharedEventId: participant.sharedEventId ?? packet.eventId ?? token,
    displayName: participant.displayName ?? '参加者',
    attendanceStatus: participant.attendanceStatus === '不参加' ? '不参加' : '参加',
    actionStatus: sharedActionStatuses.includes(participant.actionStatus as SharedActionStatus) ? (participant.actionStatus as SharedActionStatus) : '未準備',
    estimatedArrivalAt: participant.estimatedArrivalAt,
    lastUpdatedAt: participant.lastUpdatedAt ?? new Date().toISOString(),
  }));
  return {
    shareToken: token,
    eventId: packet.eventId ?? token,
    ownerDisplayName: packet.ownerDisplayName ?? 'あなた',
    sharingEnabled: packet.sharingEnabled ?? true,
    createdAt: packet.createdAt ?? new Date().toISOString(),
    updatedAt: packet.updatedAt ?? new Date().toISOString(),
    title: packet.title ?? '予定',
    date: packet.date ?? dateKey(),
    destination: packet.destination,
    arrival: packet.arrival ?? '10:00',
    travelMinutes: packet.travelMinutes ?? 30,
    preparationMinutes: packet.preparationMinutes ?? 30,
    bufferMinutes: packet.bufferMinutes ?? 10,
    participants,
  };
}

export function mergeSharedEvent(base: SharedEvent, incoming: SharedEvent): SharedEvent {
  const participants = [...base.participants];
  incoming.participants.forEach((participant) => {
    const index = participants.findIndex((item) => item.participantId === participant.participantId);
    if (index === -1) participants.push(participant);
    else participants[index] = participant;
  });
  return {
    ...base,
    ...incoming,
    participants,
    updatedAt: incoming.updatedAt ?? new Date().toISOString(),
  };
}

export function upsertSharedEvent(current: SharedEvent[], incoming: SharedEvent) {
  const next = normalizeSharedEvent(incoming);
  const index = current.findIndex((item) => item.shareToken === next.shareToken);
  if (index === -1) return [next, ...current];
  return current.map((item) => item.shareToken === next.shareToken ? mergeSharedEvent(item, next) : item);
}

export function encodeSharedEventLink(shareToken: string, baseUrl?: string) {
  const base = baseUrl ?? 'rhythm://';
  if (base.endsWith('://')) return `${base}shared-event/${shareToken}`;
  if (base.endsWith('/')) return `${base}shared-event/${shareToken}`;
  return `${base}/shared-event/${shareToken}`;
}

export function parseSharedEventLink(url: string) {
  const match = url.match(/shared-event\/([^/?#]+)/);
  if (!match?.[1]) return null;
  const payloadMatch = url.match(/[?&]payload=([^&#]+)/);
  const packet = payloadMatch?.[1] ? normalizeSharedEvent(JSON.parse(decodeURIComponent(payloadMatch[1])) as Partial<SharedEvent>) : undefined;
  return { shareToken: match[1], packet };
}

export function getOrCreateParticipantId(map: Record<string, string>, token: string) {
  return map[token] ?? createSharedParticipantId(token);
}

export function ensureParticipantPrefs(map: Record<string, SharedParticipantPrefs>, token: string): SharedParticipantPrefs {
  return map[token] ?? { departurePoint: 'current' };
}
