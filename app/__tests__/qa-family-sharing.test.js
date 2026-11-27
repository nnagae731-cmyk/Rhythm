jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn(() => null) }));
const { createFamilySharing, familySharing, FAMILY_CONTAINER } = require('../features/sharing/familySharing');
const { parseFamilyRecord, parseFamilyMember, invitationAction, recordKey, resolveFamilyConflict, visibleFamilyRecords, participantStatus, familySyncStatus, canUseFamily, isCalendarDate, validateEvent, validateTodo, validateShareURL } = require('../features/sharing/records');
const fs = require('fs'), path = require('path');
const { patchDelegate, familyEntitlements, familyInfo } = require('../plugins/with-rhythm-family');
const address = { scope: 'shared', zoneName: 'rhythm-family-test', ownerName: 'owner-A', recordName: 'item' };
function record(type = 'SharedTodo', fields = {}) {
  return { ...address, type, fields: { updatedAt: 1000, mutationId: 'a', isDeleted: 0, creatorId: 'user-A', title: '買い物', done: 0, ...fields } };
}
test.each([
  ['FamilyGroup', { name: '家族', createdAt: 10 }],
  ['SharedEvent', { startAt: 10, endAt: 20, allDay: 0, timeZoneID: 'Asia/Tokyo', location: 'お店', note: 'メモ' }],
  ['SharedTodo', { done: 1, completedBy: 'user-B', dueAt: 99 }],
  ['FamilyMember', { userId: 'user-A', displayName: '', color: '#89AbCd' }],
])('共有レコードを非破壊で変換する：%s', (type, fields) => {
  const original = record(type, fields), copy = parseFamilyRecord(original);
  expect(copy).toEqual(original); expect(copy).not.toBe(original); expect(copy.fields).not.toBe(original.fields);
});
test.each([null, [], {}, record('Other'), record('SharedEvent', { startAt: 20, endAt: 10, allDay: 0 }), record('SharedTodo', { dueAt: -1 }), record('FamilyMember', { userId: 'A', displayName: 'A', color: 'brown' }), record('SharedTodo', { updatedAt: Infinity }), record('SharedTodo', { mutationId: '' })])('不正な共有レコードを拒否する %#', input => expect(() => parseFamilyRecord(input)).toThrow());
test.each([[100, 200, 'remote'], [200, 100, 'local'], [100, 100, 'remote']])('LWW：local=%s remote=%s', (a, b, winner) => {
  const local = record('SharedTodo', { updatedAt: a, mutationId: 'a' }), remote = record('SharedTodo', { updatedAt: b, mutationId: 'b' });
  expect(resolveFamilyConflict(local, remote)).toBe(winner === 'remote' ? remote : local);
  expect(resolveFamilyConflict(remote, local)).toBe(winner === 'remote' ? remote : local);
});
test('削除フラグはLWWを通り、表示から除外される（古い編集は復活させない）', () => {
  const local = record(), deleted = record('SharedTodo', { updatedAt: 2000, isDeleted: 1 });
  const winner = resolveFamilyConflict(local, deleted);
  expect(winner).toBe(deleted); expect(visibleFamilyRecords([winner])).toEqual([]);
  expect(deleted.fields.isDeleted).toBe(1);
});
test('削除は時計の進んだ編集・遅延した編集にも勝ち、同じIDを復活させない', () => {
  const deleted = record('SharedTodo', { updatedAt: 1, isDeleted: 1 });
  const edit = record('SharedTodo', { updatedAt: 99999999 });
  expect(resolveFamilyConflict(deleted, edit)).toBe(deleted);
  expect(resolveFamilyConflict(edit, deleted)).toBe(deleted);
});
test.each(['Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati'])('終日予定はUTC変換せず同じ暦日を保持する：%s', zone => {
  const input = { title: '休み', allDay: true, startDate: '2026-12-31', endDateExclusive: '2027-01-02' };
  expect(validateEvent(input)).toEqual(input);
  expect(parseFamilyRecord(record('SharedEvent', { allDay: 1, startDate: input.startDate, endDateExclusive: input.endDateExclusive })).fields.startDate).toBe('2026-12-31');
  // Rendering in these zones must use calendar strings, never new Date(startDate).
  expect(new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone).toBeTruthy();
});
test.each(['2026-02-29', '2026-13-01', '2026-02-30', '0000-01-01', '2026-1-01'])('不正な終日暦日を拒否する：%s', value => expect(isCalendarDate(value)).toBe(false));
test('時刻付き予定は絶対時刻とIANA timezoneを保持する', () => {
  const input = { title: '予定', allDay: false, startAt: 100, endAt: 200, timeZoneID: 'America/New_York' };
  expect(validateEvent(input)).toEqual(input);
  expect(() => validateEvent({ ...input, timeZoneID: 'Not/AZone' })).toThrow();
  expect(() => validateEvent({ title: '予定', allDay: true, startDate: '2026-11-27', endDateExclusive: '2026-11-27' })).toThrow();
});
test.each([[false, undefined, 'synced'], [true, undefined, 'pending'], [true, 9, 'failed']])('同期状態を区別する：pending=%s error=%s', (pending, code, expected) => expect(familySyncStatus(pending, code)).toBe(expected));
test('閲覧のみ・権限喪失を区別し、offline利用は時間制限しない（オーナー決定）', () => {
  const access = { group: address, role: 'participant', permission: 'readWrite', status: 'accepted', checkedAt: 1000, verified: true };
  expect(canUseFamily(access, 1100, true)).toBe(true);
  expect(canUseFamily({ ...access, permission: 'readOnly' }, 1100)).toBe(true);
  expect(canUseFamily({ ...access, permission: 'readOnly' }, 1100, true)).toBe(false);
  for (const status of ['left', 'revoked', 'stopped']) expect(canUseFamily({ ...access, status }, 1100)).toBe(false);
  expect(canUseFamily(access, 1000 + 30 * 86400000)).toBe(true);
  expect(canUseFamily({ ...access, verified: false }, 1100)).toBe(false);
});
test('Native契約：正式parent・checkpoint・outbox・recordChangeTag・競合・account分離の接続がある（Native実行試験ではない）', () => {
  const native = fs.readFileSync(path.join(__dirname, '../modules/rhythm-family/ios/FamilyStore.swift'), 'utf8');
  const archive = fs.readFileSync(path.join(__dirname, '../modules/rhythm-family/ios/FamilyArchive.swift'), 'utf8');
  expect((native.match(/\.parent = CKRecord.Reference\(recordID: root.recordID/g) ?? []).length).toBe(2);
  for (const token of ['.stateUpdate(let e)', 'e.stateSerialization', '.serverRecordChanged', '.ifServerRecordUnchanged', 'archive.pending', 'familyHash(identity)', 'markFailed', 'currentUserParticipant']) expect(native).toContain(token);
  expect(archive).toContain('server.recordChangeTag'); expect(archive).toContain('requiringSecureCoding: true');
});
test('zone owner/scopeが異なる同名レコードを混同しない', () => {
  expect(recordKey(address)).not.toBe(recordKey({ ...address, ownerName: 'owner-B' }));
  expect(() => resolveFamilyConflict(record(), { ...record(), scope: 'private' })).toThrow();
});
test.each([[0, 'unknown'], [1, 'pending'], [2, 'accepted'], [3, 'removed'], [99, 'unknown']])('招待状態 %s', (raw, status) => expect(participantStatus(raw)).toBe(status));
test.each([['pending', 'accept'], ['accepted', 'fetch'], ['removed', 'reject'], ['unknown', 'reject']])('重複招待は再取得だけ、退出済み招待は受諾しない：%s', (status, action) => expect(invitationAction(status)).toBe(action));
test('招待中の匿名参加者を架空名で埋めず、閲覧のみと編集可能を区別する', () => {
  const pending = { id: null, role: 'participant', status: 'pending', permission: 'readOnly', displayName: null, color: null };
  expect(parseFamilyMember(pending)).toEqual(pending);
  expect(parseFamilyMember({ ...pending, id: 'B', status: 'accepted', permission: 'readWrite', displayName: '本人の名前', color: '#123456' }).permission).toBe('readWrite');
  expect(() => parseFamilyMember({ ...pending, status: 'fake' })).toThrow();
});
test('閲覧のみ参加者のプロフィールはオーナーが実参加者IDに割り当てるAPIを持つ', async () => {
  const native = { perform: jest.fn(async () => JSON.stringify(address)) };
  await createFamilySharing(native).setMemberProfile(address, 'read-only-member', '本人が伝えた名前', '#123456');
  expect(native.perform.mock.calls[0][0]).toBe('setMemberProfile');
  expect(JSON.parse(native.perform.mock.calls[0][1]).userId).toBe('read-only-member');
});
test('予定/TODO入力は有効な値だけを通す', () => {
  expect(validateEvent({ title: ' 予定 ', startAt: 10, endAt: 10, allDay: false, timeZoneID: 'Asia/Tokyo' }).title).toBe('予定');
  expect(validateTodo({ title: ' 買い物 ', done: false }).title).toBe('買い物');
  expect(() => validateEvent({ title: '予定', startAt: 20, endAt: 10, allDay: false })).toThrow();
  expect(() => validateTodo({ title: '', done: false })).toThrow();
});
test.each(['http://icloud.com/share/x', 'https://icloud.com.evil.test/share/x', 'https://icloud.com/other/x', 'https://evil@icloud.com/share/x', 'https://icloud.com:123/share/x'])('無関係な招待URLを拒否：%s', url => expect(() => validateShareURL(url)).toThrow());
test('正式なCloudKit共有URLは変更しない', () => expect(validateShareURL('https://www.icloud.com/share/example')).toBe('https://www.icloud.com/share/example'));
test('moduleなし/Android相当ではCloud呼出しも購読もなく安全なunavailable', async () => {
  const api = createFamilySharing(null);
  expect((await api.initialize()).code).toBe('unavailable'); expect((await api.snapshot()).code).toBe('unavailable');
  expect((await api.presentInvite(address)).code).toBe('unavailable'); expect(() => api.subscribe(jest.fn()).remove()).not.toThrow();
  expect((await familySharing.initialize()).code).toBe('unavailable');
});
test('Nativeへの共有操作は独立APIを通り、本人IDを入力から偽装しない', async () => {
  const native = { perform: jest.fn(async () => JSON.stringify(address)), presentInvite: jest.fn(async () => {}), addListener: jest.fn(() => ({ remove: jest.fn() })) };
  const api = createFamilySharing(native);
  await api.saveEvent(address, { title: '予定', startAt: 1, endAt: 2, allDay: false, timeZoneID: 'Asia/Tokyo' });
  const [op, raw] = native.perform.mock.calls[0]; const payload = JSON.parse(raw);
  expect(op).toBe('saveEvent'); expect(payload.group).toEqual(address); expect(payload.input.creatorId).toBeUndefined();
  await api.presentInvite(address); expect(native.presentInvite).toHaveBeenCalledWith(JSON.stringify(address));
  api.subscribe(jest.fn()); expect(native.addListener.mock.calls[0][0]).toBe('onFamilyChange');
});
test('iCloud未ログインとNative例外は個人保存へ伝播しない', async () => {
  const native = { perform: jest.fn(async () => '{"unavailable":true}') };
  expect((await createFamilySharing(native).initialize()).code).toBe('unavailable');
  native.perform.mockRejectedValueOnce(Error('network'));
  expect((await createFamilySharing(native).sync()).code).toBe('failed');
});
test('snapshotのレコード検証に失敗した場合は利用しない', async () => {
  const native = { perform: jest.fn(async () => JSON.stringify({ userId: 'A', pendingCount: 0, records: [{}], syncStates: [], access: [] })) };
  expect((await createFamilySharing(native).snapshot()).ok).toBe(false);
});
test('同一の安定IDを二重に表示せず、別zoneの同名レコードは混同しない', async () => {
  const base = { userId: 'A', pendingCount: 0, syncStates: [], access: [], records: [record()] };
  const native = { perform: jest.fn(async () => JSON.stringify(base)) }, api = createFamilySharing(native);
  expect((await api.snapshot()).ok).toBe(true);
  base.records.push(record()); expect((await api.snapshot()).ok).toBe(false);
  base.records[1] = { ...record(), ownerName: 'other-owner' }; expect((await api.snapshot()).ok).toBe(true);
});
test('参加者decoderは不要なメールアドレスをアプリ用モデルへ持ち込まない', () => {
  const member = { id: 'A', role: 'owner', permission: 'readWrite', status: 'accepted', displayName: '本人', color: '#123456' };
  expect(parseFamilyMember({ ...member, emailAddress: 'private@example.test' })).toEqual(member);
});
test('Native同期の契約：待機中syncをawait、アカウント世代確認、100件のzone別batch（Native実行試験ではない）', () => {
  const native = fs.readFileSync(path.join(__dirname, '../modules/rhythm-family/ios/FamilyStore.swift'), 'utf8');
  for (const token of ['syncTask.value', 'syncRevision', 'requestGeneration == generation', 'prefix(100)', 'batch?.atomicByZone = true']) expect(native).toContain(token);
  expect(native).not.toMatch(/emailAddress|phoneNumber|rhythm-mvp-state-v1|NSUbiquitousKeyValueStore/);
});
test('groupとprofileの名前・色は入力値でありメンバーを固定しない', async () => {
  const native = { perform: jest.fn(async () => JSON.stringify(address)) }; const api = createFamilySharing(native);
  await api.createGroup('家族', 'なつみ', '#a1b2c3'); await api.setProfile(address, '別の名前', '#123456');
  expect(JSON.parse(native.perform.mock.calls[1][1])).toEqual({ group: address, displayName: '別の名前', color: '#123456' });
  expect(() => api.createGroup('家族', '', '#123456')).toThrow();
});
test('CloudKit招待bridgeは既存Expoリンク処理を残して冪等に挿入する', () => {
  const original = 'import Expo\npublic class AppDelegate: ExpoAppDelegate {\n // existing URL handler\n}';
  const patched = patchDelegate(original);
  expect(patched).toContain('RhythmFamilyInvitationBridge.accept(metadata)'); expect(patched).toContain('// existing URL handler');
  expect(patchDelegate(patched)).toBe(patched);
  expect(() => patchDelegate('class Other {}')).toThrow();
  expect(() => patchDelegate(original.replace('// existing URL handler', 'func userDidAcceptCloudKitShareWith() {}'))).toThrow();
});
test('CloudKit entitlementは既存KVS・Widget・App Group・production APNsを変更しない', () => {
  const input = { 'com.apple.developer.ubiquity-kvstore-identifier': 'old-kvs', 'com.apple.security.application-groups': ['group.existing'], 'aps-environment': 'production', 'com.apple.developer.icloud-container-identifiers': ['iCloud.other'] };
  const next = familyEntitlements(input);
  for (const key of ['com.apple.developer.ubiquity-kvstore-identifier', 'com.apple.security.application-groups', 'aps-environment']) expect(next[key]).toEqual(input[key]);
  expect(next['com.apple.developer.icloud-container-identifiers']).toEqual(['iCloud.other', FAMILY_CONTAINER]);
  expect(familyEntitlements(next)).toEqual(next); expect(input['com.apple.developer.icloud-container-identifiers']).toEqual(['iCloud.other']);
});
test.each(['Development', 'Production'])('CloudKit %sを明示しAPNs・KVS・App Groupを維持する', (environment) => {
  const input = { 'aps-environment': 'production', 'com.apple.developer.ubiquity-kvstore-identifier': 'existing-kvs', 'com.apple.security.application-groups': ['group.existing'] };
  const next = familyEntitlements(input, environment);
  expect(next['com.apple.developer.icloud-container-environment']).toBe(environment);
  for (const key of Object.keys(input)) expect(next[key]).toEqual(input[key]);
  expect(input).not.toHaveProperty('com.apple.developer.icloud-container-environment');
});
test('CloudKit環境の未指定は既存値を維持し不正な値は拒否する', () => {
  const key = 'com.apple.developer.icloud-container-environment';
  expect(familyEntitlements({ [key]: 'Production' })[key]).toBe('Production');
  expect(familyEntitlements({})).not.toHaveProperty(key);
  for (const value of ['', 'development', 'preview']) expect(() => familyEntitlements({}, value)).toThrow();
});
test('development-widgetだけがCloudKit Developmentを明示する', () => {
  const eas = require('../eas.json');
  expect(eas.build['development-widget'].env.RHYTHM_CLOUDKIT_ENVIRONMENT).toBe('Development');
  expect(eas.build['development-widget'].distribution).toBe('internal');
  expect(eas.build['development-widget'].developmentClient).toBe(true);
  expect(eas.build.production.env).not.toHaveProperty('RHYTHM_CLOUDKIT_ENVIRONMENT');
});
test('招待設定は既存background modeを維持しscene構成の未接続を検出する', () => {
  const input = { UIBackgroundModes: ['audio'] };
  expect(familyInfo(input)).toEqual({ CKSharingSupported: true, UIBackgroundModes: ['audio', 'remote-notification'] });
  expect(familyInfo(familyInfo(input))).toEqual(familyInfo(input));
  expect(() => familyInfo({ UIApplicationSceneManifest: {} })).toThrow();
});
test('個人KVS・PersistedState・保存フローを共有featureから参照しない', () => {
  for (const file of ['familySharing.ts', 'records.ts', 'debug.ts']) {
    const source = fs.readFileSync(path.join(__dirname, '../features/sharing', file), 'utf8');
    expect(source).not.toMatch(/from ['"].*(?:features\/sync|storage\/|\/types['"])/);
    expect(source).not.toContain('rhythm-mvp-state-v1');
  }
  expect(FAMILY_CONTAINER).toBe('iCloud.app.rhythm.daily.family');
  const plugin = fs.readFileSync(path.join(__dirname, '../plugins/with-rhythm-family.js'), 'utf8');
  expect(plugin).not.toContain('ubiquity-kvstore-identifier');
});
