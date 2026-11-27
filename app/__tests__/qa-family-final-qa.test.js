const fs = require('fs');
const path = require('path');
const { createFamilyDebugTools } = require('../features/sharing/familyDebug');
const { resolveFamilyConflict, canUseFamily } = require('../features/sharing/records');
const store = fs.readFileSync(path.join(__dirname, '../modules/rhythm-family/ios/FamilyStore.swift'), 'utf8');
const presenter = fs.readFileSync(path.join(__dirname, '../modules/rhythm-family/ios/RhythmFamilyModule.swift'), 'utf8');
const address = { scope: 'shared', zoneName: 'rhythm-family-qa', ownerName: 'owner', recordName: 'group' };
const record = (updatedAt, mutationId, isDeleted = 0) => ({ ...address, recordName: 'item', type: 'SharedTodo', fields: { title: 'QA', creatorId: 'A', done: 0, updatedAt, mutationId, isDeleted } });

test('招待UIはCKShareの閲覧専用と編集可能を許可しpublic共有を許可しない', () => {
  expect(presenter).toContain('controller.availablePermissions = [.allowPrivate, .allowReadOnly, .allowReadWrite]');
  expect(presenter).not.toContain('.allowPublic');
  expect(presenter).toContain('UICloudSharingControllerDelegate');
  expect(store).toContain('share.currentUserParticipant');
});

test.each([false, true])('QA native moduleなしではno-op（enabled=%s）', async enabled => {
  const api = createFamilyDebugTools(null, enabled);
  expect((await api.setAutomaticSync(false)).code).toBe('unavailable');
  expect((await api.sendPending()).code).toBe('unavailable');
  expect((await api.probeReadOnlyWrite(address)).code).toBe('unavailable');
});
test('QA無効時はnativeへ一切アクセスしない', async () => {
  const adapter = { perform: jest.fn() }, api = createFamilyDebugTools(adapter, false);
  await api.setAutomaticSync(false); await api.sendPending(); await api.diagnostics(); await api.probeReadOnlyWrite(address);
  expect(adapter.perform).not.toHaveBeenCalled();
});
test('QA呼出しは共有用APIに限定し、グループと引数をそのまま渡す', async () => {
  const adapter = { perform: jest.fn(async () => JSON.stringify({ serverRejected: true, cloudKitErrorCode: 10, unexpectedWrite: false })) };
  const api = createFamilyDebugTools(adapter, true);
  expect((await api.probeReadOnlyWrite(address)).value.serverRejected).toBe(true);
  await api.setAutomaticSync(false); await api.sendPending(); await api.diagnostics();
  expect(adapter.perform.mock.calls.map(([op]) => op)).toEqual(['debugProbeReadOnlyWrite', 'debugSetAutomaticSync', 'debugSendPending', 'debugDiagnostics']);
  expect(JSON.parse(adapter.perform.mock.calls[0][1])).toEqual({ group: address });
  expect(JSON.parse(adapter.perform.mock.calls[1][1])).toEqual({ enabled: false });
});
test('QAのnative例外・不正JSONは通常利用へ伝播しない', async () => {
  const adapter = { perform: jest.fn().mockRejectedValueOnce(Error('native')).mockResolvedValueOnce('invalid') };
  const api = createFamilyDebugTools(adapter, true);
  expect((await api.sendPending()).code).toBe('failed');
  expect((await api.diagnostics()).code).toBe('failed');
});
test('QAもiCloudログアウトを成功扱いにしない', async () => {
  const api = createFamilyDebugTools({ perform: jest.fn(async () => '{"unavailable":true}') }, true);
  expect((await api.diagnostics()).code).toBe('unavailable');
});
test('実サーバー権限probeはDEBUG専用でlocal outboxを使わない（Nativeソース契約）', () => {
  const probe = store.slice(store.indexOf('  private func probeReadOnlyWrite'), store.indexOf('\n#endif\n}', store.indexOf('  private func probeReadOnlyWrite')));
  expect(store).toMatch(/#if DEBUG\s+private func probeReadOnlyWrite/);
  expect(probe).toContain('server-verified readOnly access');
  expect(probe).toContain('database("shared").modifyRecords(saving: [probe]');
  expect(probe).toContain('specific?.code == .permissionFailure');
  expect(probe).toContain('partialErrorsByItemID');
  expect(probe).toContain('"serverRejected": false, "unexpectedWrite": true');
  expect(probe).not.toMatch(/try put\(|archive\.pending|AsyncStorage|NSUbiquitousKeyValueStore/);
  expect(store).toMatch(/#if DEBUG\s+case "debugSetAutomaticSync"/);
});
test('権限拒否で閲覧権限を即失効と決めず実CKShareを再確認する（Nativeソース契約）', () => {
  const recovery = store.slice(store.indexOf('  private func recoverPermissionFailure'), store.indexOf('\n#if DEBUG\n  private func probeReadOnlyWrite'));
  expect(recovery).toContain('share.currentUserParticipant');
  expect(recovery).toContain('participant.permission == .readOnly');
  expect(recovery).toContain('guard gen == generation');
  expect(recovery.indexOf('try purge(')).toBeLessThan(recovery.indexOf('$0.access[address.key] = readOnly'));
  expect(store).toContain('try await recoverPermissionFailure(address)');
  expect(store).toContain('try await resetEngine(scope)');
});
test.each([
  [100, 'a', 200, 'b', 'b'], [200, 'a', 100, 'b', 'a'],
  [100, 'a', 100, 'b', 'b'], [100, 'z', 100, 'b', 'z'],
])('実競合の解決は順序によらず同じ勝者になる：%s/%s vs %s/%s', (at, aid, bt, bid, winner) => {
  const a = record(at, aid), b = record(bt, bid);
  expect(resolveFamilyConflict(a, b).fields.mutationId).toBe(winner);
  expect(resolveFamilyConflict(b, a).fields.mutationId).toBe(winner);
  expect(resolveFamilyConflict(a, b)).toEqual(resolveFamilyConflict(b, a));
});
test.each([[0, 1], [1, 0]])('編集と削除が衝突したら時計や引数順序より削除が優先：%s/%s', (ad, bd) => {
  const a = record(999999, 'z', ad), b = record(1, 'a', bd);
  expect(resolveFamilyConflict(a, b).fields.isDeleted).toBe(1);
  expect(resolveFamilyConflict(b, a).fields.isDeleted).toBe(1);
});
test.each(['left', 'revoked', 'stopped'])('退出・権限失効後は閲覧/編集を許可しない：%s', status => {
  const access = { group: address, role: 'participant', permission: 'readWrite', status, verified: true, checkedAt: 1 };
  expect(canUseFamily(access, Date.now(), false)).toBe(false);
  expect(canUseFamily(access, Date.now(), true)).toBe(false);
});
test('readOnlyへ変更されても閲覧は保持し書き込みは禁止する', () => {
  const access = { group: address, role: 'participant', permission: 'readOnly', status: 'accepted', verified: true, checkedAt: 1 };
  expect(canUseFamily(access, Date.now(), false)).toBe(true);
  expect(canUseFamily(access, Date.now(), true)).toBe(false);
});
test('個人保存・KVS・Widgetへの共有コードの接続を追加しない', () => {
  for (const file of ['familyDebug.ts', 'debug.ts']) {
    const code = fs.readFileSync(path.join(__dirname, '../features/sharing', file), 'utf8');
    expect(code).not.toMatch(/AsyncStorage|rhythm-mvp-state-v1|features\/sync|storage\/|features\/widget/);
  }
  expect(store).not.toMatch(/AsyncStorage|NSUbiquitousKeyValueStore|rhythm-mvp-state-v1/);
});
