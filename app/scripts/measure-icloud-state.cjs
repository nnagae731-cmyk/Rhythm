// Synthetic, deterministic workload. Never reads a person's device data.
// JSON.stringify matches rhythmStorage's serialization; sizes are UTF-8 bytes.
const profiles = {
  light: { tasks: 30, plans: 10, days: 30, memo: 100, events: 60, focus: 20 },
  representative: { tasks: 100, plans: 40, days: 90, memo: 280, events: 180, focus: 60 },
  heavy: { tasks: 1000, plans: 400, days: 365, memo: 1000, events: 2000, focus: 730 },
};
const uri = name => `file:///var/mobile/Containers/Data/Application/DEMO/Documents/rhythm-photos/${name}-1795737600000-abc123.jpg`;
const text = length => '今日のことを少しずつ記録する。🌸'.repeat(Math.ceil(length / 18)).slice(0, length);
function createState(profile) {
  const stamp = '2026-11-27T09:00:00.000Z';
  const plan = { title: '', planMode: 'calendar_only', date: '2026-11-27', arrival: '10:00', travelMinutes: 40, preparationMinutes: 30, bufferMinutes: 10 };
  const wishMonths = {};
  for (let index = 0; index < profile.days; index++) {
    const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    const entry = wishMonths[month] ??= { wishes: [{ id: `wish-${month}`, title: '自分のペースで進める', completed: false, createdAt: stamp }], actions: [], review: {}, reviews: [], monthlyGoal: '暮らしを整える' };
    const review = { id: `journal-${date}`, date, shortNote: text(40), memo: text(profile.memo), photos: index % 7 === 0 ? [uri(`journal-${date}`)] : [] };
    entry.reviews.push(review); entry.review = review;
  }
  return {
    tasks: Array.from({ length: profile.tasks }, (_, i) => ({ id: `task-${i}`, title: text(24), done: i % 3 === 0, category: 'その他', priority: '中', bucket: 'now', scheduledDate: '2026-11-27', scheduledTime: '10:00', listItems: [{ id: `list-${i}`, text: text(80), checked: false, order: 0 }], subtasks: [{ id: `sub-${i}`, title: text(12), done: false, order: 0 }], ...(i % 8 === 0 ? { isRoutine: true, routineId: `routine-${i}`, repeatRule: 'daily' } : {}) })),
    plan, departurePlans: Array.from({ length: profile.plans }, (_, i) => ({ ...plan, id: `plan-${i}`, title: '外出や通院などの予定', destination: '東京都内' })),
    widgetSize: 'medium', widgetSettings: { widgetType: 'current', style: 'photo', photoSource: 'widget', photoUri: uri('widget'), affirmationPhotoUris: [uri('affirmation')], widgetCustomizations: { current: { photoUri: uri('widget-current') } } },
    showCompleted: false, completionIcon: 'check', designMode: 'photo', monoAppearance: 'auto', monoPattern: 'plain', hapticsEnabled: true, premiumTrialReminderEnabled: true, liveActivityEnabled: false,
    readNoticeIds: [], taskTemplates: [], savedTaskTemplates: [], chicPattern: 'plain', chicCheckColor: 'lavender', recoveryHistory: [], departureCheckIns: [], routineArchives: [],
    behaviorEvents: Array.from({ length: profile.events }, (_, i) => ({ id: `event-${i}`, eventKey: `task_completed:${i}`, source: 'manual', version: 1, type: 'task_completed', occurredAt: stamp, taskId: `task-${i % profile.tasks}`, taskTitleSnapshot: text(24) })),
    focusSessions: Array.from({ length: profile.focus }, (_, i) => ({ id: `focus-${i}`, taskId: `task-${i % profile.tasks}`, taskTitle: text(24), startedAt: stamp, completedAt: stamp, durationMinutes: 25 })),
    wishMonths, calendarMarks: {}, calendarImportCalendarIds: [], calendarImportKnownCalendarIds: [], sharedEvents: [], sharedParticipantIdsByToken: {}, sharedParticipantPrefsByToken: {}, departurePreparationStatuses: {}, affirmations: [], affirmationCustomTexts: [],
    photoTheme: { placement: 'background', imageUri: uri('background'), focusBackgroundUri: uri('focus'), topImageUris: Object.fromEntries(['home', 'timeline', 'analysis', 'wish'].map(slot => [slot, uri(slot)])), topImageOriginalUris: { home: uri('home-original') }, topImageCropRects: { home: { x: 0, y: 0.2, width: 1, height: 0.4 } } },
    travelApps: { apps: [] }, designCustomizePurchased: false,
  };
}
function measure() {
  return Object.entries(profiles).map(([name, profile]) => {
    const body = JSON.stringify(createState(profile));
    const bodyBytes = Buffer.byteLength(body, 'utf8');
    return { name, ...profile, bodyBytes, percentOf1MB: +(bodyBytes / 1_000_000 * 100).toFixed(2), exceeds900KB: bodyBytes > 900_000 };
  });
}
module.exports = { profiles, createState, measure };
if (require.main === module) console.log(JSON.stringify(measure(), null, 2));
