import CloudKit
import Foundation
import UIKit

public actor FamilyStore: CKSyncEngineDelegate {
  public static let shared = FamilyStore()
  static let containerID = "iCloud.app.rhythm.daily.family"
  static let changed = Notification.Name("RhythmFamilyChanged")
  private let container = CKContainer(identifier: containerID)
  private var user: String?
  private var archive = FamilyArchive()
  private var file: URL?
  private var engines: [String: CKSyncEngine] = [:]
  private var healthy = true
  private var syncTask: Task<Void, Error>?
  private var syncTaskID: UUID?
  private var syncRevision = 0
  private var generation = 0

  private func database(_ scope: String) -> CKDatabase { scope == "private" ? container.privateCloudDatabase : container.sharedCloudDatabase }
  private func commit(notify: Bool = true, _ body: (inout FamilyArchive) throws -> Void) throws {
    guard healthy, let file else { throw familyError("Sharing storage is unavailable") }
    var next = archive
    try body(&next)
    try JSONEncoder().encode(next).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    archive = next
    if notify { NotificationCenter.default.post(name: Self.changed, object: nil) }
  }
  func prepare() async throws {
    guard try await container.accountStatus() == .available else { throw familyError("iCloud unavailable") }
    let identity = try await container.userRecordID().recordName
    if user == identity, !engines.isEmpty { guard healthy else { throw familyError("Sharing storage failed") }; return }
    await invalidate()
    let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("RhythmFamily", isDirectory: true)
    try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
    var excluded = base
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try excluded.setResourceValues(values)
    let location = base.appendingPathComponent(familyHash(identity) + ".json")
    let existing: FamilyArchive
    if FileManager.default.fileExists(atPath: location.path) {
      existing = try JSONDecoder().decode(FamilyArchive.self, from: Data(contentsOf: location))
      guard existing.version == 1 else { throw familyError("Unsupported family cache") }
      // Corrupt caches fail closed, never silently discard a durable outbox.
      for data in existing.records.values { _ = try unarchiveRecord(data) }
      for p in existing.pending.values { if let data = p.record { _ = try unarchiveRecord(data) } }
    } else { existing = FamilyArchive() }
    user = identity; archive = existing; file = location; healthy = true
    for scope in ["private", "shared"] {
      let config = CKSyncEngine.Configuration(database: database(scope), stateSerialization: archive.checkpoints[scope], delegate: self)
      engines[scope] = CKSyncEngine(config)
    }
    // Reconcile durable outbox even if the process stopped before stateUpdate.
    for p in archive.pending.values { enqueue(p) }
    for a in archive.zoneDeletes.values { engines[a.scope]?.state.add(pendingDatabaseChanges: [.deleteZone(a.id.zoneID)]) }
    UserDefaults.standard.set(true, forKey: "rhythm-family-used-v1")
    await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
  }
  func invalidate() async {
    generation += 1
    syncTask?.cancel(); syncTask = nil; syncTaskID = nil
    let old = Array(engines.values)
    engines = [:]; user = nil; file = nil; archive = FamilyArchive(); healthy = true
    // Never await cancellation inside the engine's own delegate callback.
    for engine in old { Task { await engine.cancelOperations() } }
    NotificationCenter.default.post(name: Self.changed, object: nil)
  }
  func resumeIfUsed() async {
    guard UserDefaults.standard.bool(forKey: "rhythm-family-used-v1") else { return }
    do { try await prepare(); try await sync() } catch { log(error) }
  }
  private func enqueue(_ p: FamilyPending) {
    engines[p.address.scope]?.state.add(pendingRecordZoneChanges: [p.kind == "leave" ? .deleteRecord(p.address.id) : .saveRecord(p.address.id)])
  }
  private func cached(_ address: FamilyAddress) throws -> CKRecord {
    guard let data = archive.records[address.key] else { throw familyError("Family record is not cached; sync first") }
    return try unarchiveRecord(data)
  }
  private func group(_ address: FamilyAddress, writing: Bool = false) throws -> CKRecord {
    let r = try cached(address)
    guard r.recordType == "FamilyGroup", (r["isDeleted"] as? NSNumber)?.intValue != 1,
          !archive.zoneDeletes.values.contains(where: { $0.sameZone(address) }),
          !archive.pending.values.contains(where: { $0.kind == "leave" && $0.address.sameZone(address) }) else { throw familyError("Group is unavailable") }
    if address.scope == "shared" {
      guard let access = archive.access[address.key], access.status == "accepted", access.permission != "none" else { throw familyError("No family access") }
      if writing && access.permission != "readWrite" { throw familyError("Family is read-only") }
    }
    return r
  }
  private func verifyAccess(_ address: FamilyAddress) async throws {
    guard archive.zoneDeletes[address.key] == nil,
          !archive.pending.values.contains(where: { $0.kind == "leave" && $0.address.sameZone(address) }) else { return }
    let root = try cached(address)
    guard root.recordType == "FamilyGroup" else { throw familyError("Not a group") }
    let gen = generation
    if address.scope == "private" {
      guard root["creatorId"] as? String == user else { throw familyError("Different group owner") }
      try commit(notify: archive.access[address.key]?.status != "accepted") { $0.access[address.key] = FamilyAccess(group: address, role: "owner", permission: "readWrite", status: "accepted", checkedAt: Date().timeIntervalSince1970 * 1000) }
      return
    }
    do {
      let fresh = try await database("shared").record(for: address.id)
      guard let shareID = fresh.share?.recordID, let share = try await database("shared").record(for: shareID) as? CKShare,
            let participant = share.currentUserParticipant, participant.acceptanceStatus == .accepted, [CKShare.ParticipantPermission.readOnly, .readWrite].contains(participant.permission) else { throw familyError("Share no longer accessible") }
      guard gen == generation else { throw familyError("Account changed") }
      let access = FamilyAccess(group: address, role: "participant", permission: participant.permission == .readWrite ? "readWrite" : "readOnly", status: "accepted", checkedAt: Date().timeIntervalSince1970 * 1000)
      if access.permission == "readOnly", archive.pending.values.contains(where: { $0.kind == "save" && $0.address.sameZone(address) }) {
        try purge(address.id.zoneID, scope: address.scope)
        try commit { $0.access[address.key] = access }
        try await resetEngine(address.scope) // Refetch server values, not unauthorized optimistic edits.
        return
      }
      let old = archive.access[address.key]
      try commit(notify: old?.status != access.status || old?.permission != access.permission) { $0.access[address.key] = access }
    } catch {
      guard gen == generation else { throw familyError("Account changed") }
      let code = (error as? CKError)?.code
      if code == .permissionFailure || code == .unknownItem || code == .zoneNotFound || (error as NSError).domain == "RhythmFamily" {
        try purge(address.id.zoneID, scope: address.scope); throw error
      }
      // Owner-approved policy: last verified access is usable offline with no
      // time limit. A reconnect/permission failure revalidates and purges it.
      _ = try group(address)
    }
  }
  private func refreshAccess() async {
    let groups = archive.addresses.values.filter { $0.recordName == "group" }
    for a in groups { do { try await verifyAccess(a) } catch { log(error) } }
  }
  private func put(_ record: CKRecord, scope: String) throws {
    let a = FamilyAddress(scope: scope, id: record.recordID), data = try archiveRecord(record)
    let p = FamilyPending(address: a, kind: "save", record: data, mutationId: record["mutationId"] as? String ?? "")
    try commit { $0.records[a.key] = data; $0.addresses[a.key] = a; $0.pending[a.key] = p; $0.syncStates[a.key] = FamilySyncState(record: a, state: "pending") }
    enqueue(p)
  }
  private func purge(_ zone: CKRecordZone.ID, scope: String) throws {
    let keys = archive.addresses.filter { $0.value.scope == scope && $0.value.id.zoneID == zone }.map(\.key)
    let pending = archive.pending.values.filter { $0.address.scope == scope && $0.address.id.zoneID == zone }
    try commit { next in
      for k in keys { next.records[k] = nil; next.addresses[k] = nil }
      for p in pending { next.pending[p.address.key] = nil }
      next.zoneDeletes = next.zoneDeletes.filter { !($0.value.scope == scope && $0.value.id.zoneID == zone) }
      next.syncStates = next.syncStates.filter { !($0.value.record.scope == scope && $0.value.record.id.zoneID == zone) }
      let group = FamilyAddress(scope: scope, id: CKRecord.ID(recordName: "group", zoneID: zone))
      let prior = next.access[group.key]
      let status = ["left", "stopped"].contains(prior?.status ?? "") ? prior!.status : "revoked"
      next.access[group.key] = FamilyAccess(group: group, role: prior?.role ?? (scope == "private" ? "owner" : "participant"), permission: "none", status: status, checkedAt: Date().timeIntervalSince1970 * 1000)
    }
    engines[scope]?.state.remove(pendingRecordZoneChanges: pending.map { $0.kind == "leave" ? .deleteRecord($0.address.id) : .saveRecord($0.address.id) })
    engines[scope]?.state.remove(pendingDatabaseChanges: [.deleteZone(zone)])
  }
  private func memberID(_ identity: String, in zone: CKRecordZone.ID) -> CKRecord.ID { CKRecord.ID(recordName: "member-" + familyHash(identity), zoneID: zone) }
  private func saveProfile(_ root: CKRecord, scope: String, name: String, color: String, memberIdentity: String? = nil) throws -> FamilyAddress {
    guard let user, name.count <= 100, color.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil else { throw familyError("Invalid member profile") }
    let identity = memberIdentity ?? user
    let id = memberID(identity, in: root.recordID.zoneID), a = FamilyAddress(scope: scope, id: id)
    let r = (try? cached(a)) ?? CKRecord(recordType: "FamilyMember", recordID: id)
    r.parent = CKRecord.Reference(recordID: root.recordID, action: .none)
    r["userId"] = identity as CKRecordValue; r["displayName"] = name as CKRecordValue; r["color"] = color as CKRecordValue
    stampFamilyRecord(r); try put(r, scope: scope); return a
  }
  private func ensureProfile(_ root: CKRecord, scope: String) throws {
    guard let user else { throw familyError("No sharing account") }
    let a = FamilyAddress(scope: scope, id: memberID(user, in: root.recordID.zoneID))
    if archive.records[a.key] == nil {
      // Empty name means "not entered". Stable generated color is stored once,
      // not an invented participant or a hard-coded member palette/index.
      _ = try saveProfile(root, scope: scope, name: "", color: "#" + String(familyHash(user).prefix(6)))
    }
  }
  func execute(_ operation: String, args: [String: Any]) async throws -> Any {
    if operation == "availability" {
      return ["available": (try? await container.accountStatus()) == .available]
    }
    do { try await prepare() } catch {
      if (try? await container.accountStatus()) != .available { return ["unavailable": true] }
      throw error
    }
    let requestGeneration = generation
    if operation == "snapshot" { await refreshAccess() }
    if let raw = args["group"] { try await verifyAccess(FamilyAddress.parse(raw)) }
    guard requestGeneration == generation else { throw familyError("Account changed") }
    switch operation {
    case "initialize": return ["available": true]
    case "snapshot": return try snapshot()
    case "sync": try await sync(); return true
    case "createGroup":
      guard let name = args["name"] as? String, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 100,
            let display = args["displayName"] as? String, !display.isEmpty, display.count <= 100,
            let color = args["color"] as? String, color.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil, let user else { throw familyError("Invalid group") }
      let gen = generation
      let zone = CKRecordZone(zoneName: "rhythm-family-" + UUID().uuidString)
      _ = try await database("private").save(zone)
      guard gen == generation else { throw familyError("Account changed") }
      let root = CKRecord(recordType: "FamilyGroup", recordID: CKRecord.ID(recordName: "group", zoneID: zone.zoneID))
      root["name"] = name as CKRecordValue; root["creatorId"] = user as CKRecordValue
      root["createdAt"] = NSNumber(value: Int64(Date().timeIntervalSince1970 * 1000)); stampFamilyRecord(root)
      let share = CKShare(rootRecord: root); share.publicPermission = .none; share[CKShare.SystemFieldKey.title] = name as CKRecordValue
      let results = try await database("private").modifyRecords(saving: [root, share], deleting: [], savePolicy: .ifServerRecordUnchanged, atomically: true)
      let saved = try results.saveResults[root.recordID]!.get()
      _ = try results.saveResults[share.recordID]!.get()
      guard gen == generation else { throw familyError("Account changed") }
      let a = FamilyAddress(scope: "private", id: root.recordID), data = try archiveRecord(saved)
      try commit { $0.records[a.key] = data; $0.addresses[a.key] = a; $0.syncStates[a.key] = FamilySyncState(record: a, state: "synced") }
      try await verifyAccess(a)
      _ = try saveProfile(saved, scope: "private", name: display, color: color)
      return a.json
    case "acceptURL":
      guard let raw = args["url"] as? String, let url = URL(string: raw), url.scheme == "https", ["icloud.com", "www.icloud.com"].contains(url.host ?? ""), url.path.hasPrefix("/share/"), url.user == nil, url.password == nil, url.port == nil else { throw familyError("Invalid invitation URL") }
      let metadata = try await container.shareMetadata(for: url)
      guard requestGeneration == generation else { throw familyError("Account changed") }
      try await accept(metadata); return true
    case "members":
      let result = try await members(FamilyAddress.parse(args["group"]))
      guard requestGeneration == generation else { throw familyError("Account changed") }
      return result
    case "setProfile":
      let a = try FamilyAddress.parse(args["group"]), r = try group(a, writing: true)
      guard let name = args["displayName"] as? String, !name.isEmpty, let color = args["color"] as? String else { throw familyError("Invalid profile") }
      return try saveProfile(r, scope: a.scope, name: name, color: color).json
    case "setMemberProfile":
      let a = try FamilyAddress.parse(args["group"]), r = try group(a, writing: true)
      guard a.scope == "private", r["creatorId"] as? String == user,
            let identity = args["userId"] as? String, let name = args["displayName"] as? String, !name.isEmpty,
            let color = args["color"] as? String else { throw familyError("Only owner may assign member profiles") }
      let participants = try await members(a)
      guard requestGeneration == generation else { throw familyError("Account changed") }
      guard participants.contains(where: { $0["id"] as? String == identity }) else { throw familyError("Not a share participant") }
      return try saveProfile(r, scope: a.scope, name: name, color: color, memberIdentity: identity).json
    case "saveEvent", "saveTodo": return try saveItem(operation, args: args).json
    case "removeRecord":
      let a = try FamilyAddress.parse(args["record"]), r = try cached(a)
      guard ["SharedTodo", "SharedEvent"].contains(r.recordType), let parent = r.parent else { throw familyError("Not a shared item") }
      let root = FamilyAddress(scope: a.scope, id: parent.recordID)
      try await verifyAccess(root)
      guard requestGeneration == generation else { throw familyError("Account changed") }
      _ = try group(root, writing: true)
      r["isDeleted"] = NSNumber(value: 1); stampFamilyRecord(r); try put(r, scope: a.scope); return true
    case "leaveGroup", "stopGroup":
      let a = try FamilyAddress.parse(args["group"]), root = try group(a)
      let abandoned = archive.pending.values.filter { $0.address.sameZone(a) && $0.kind == "save" }
      if operation == "stopGroup" {
        guard a.scope == "private", root["creatorId"] as? String == user else { throw familyError("Only owner can delete group") }
        try commit { next in
          next.zoneDeletes[a.key] = a
          next.access[a.key]?.status = "stopped"
          next.syncStates[a.key] = FamilySyncState(record: a, state: "pending")
          for p in abandoned { next.pending[p.address.key] = nil }
        }
        engines[a.scope]?.state.add(pendingDatabaseChanges: [.deleteZone(a.id.zoneID)])
      } else {
        guard a.scope == "shared", let id = root.share?.recordID else { throw familyError("Only participant can leave") }
        let address = FamilyAddress(scope: a.scope, id: id)
        let p = FamilyPending(address: address, kind: "leave", mutationId: UUID().uuidString)
        try commit { next in
          for item in abandoned { next.pending[item.address.key] = nil }
          next.pending[address.key] = p
          next.access[a.key]?.status = "left"
          next.syncStates[address.key] = FamilySyncState(record: address, state: "pending")
        }; enqueue(p)
      }
      engines[a.scope]?.state.remove(pendingRecordZoneChanges: abandoned.map { .saveRecord($0.address.id) })
      return true
    default: throw familyError("Unknown family operation")
    }
  }
  private func saveItem(_ operation: String, args: [String: Any]) throws -> FamilyAddress {
    let a = try FamilyAddress.parse(args["group"]), root = try group(a, writing: true)
    guard let input = args["input"] as? [String: Any], let title = input["title"] as? String, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, title.count <= 500, let user else { throw familyError("Invalid item") }
    let type = operation == "saveEvent" ? "SharedEvent" : "SharedTodo"
    try ensureProfile(root, scope: a.scope)
    let name = input["id"] as? String ?? UUID().uuidString
    let id = CKRecord.ID(recordName: name, zoneID: a.id.zoneID), address = FamilyAddress(scope: a.scope, id: id)
    let record: CKRecord
    if input["id"] != nil {
      record = try cached(address)
      guard record.recordType == type, record.parent?.recordID == root.recordID, (record["isDeleted"] as? NSNumber)?.intValue != 1 else { throw familyError("Item no longer editable") }
    } else {
      record = CKRecord(recordType: type, recordID: id)
      record["creatorId"] = user as CKRecordValue
      record["creatorMember"] = CKRecord.Reference(recordID: memberID(user, in: a.id.zoneID), action: .none)
      record.parent = CKRecord.Reference(recordID: root.recordID, action: .none)
    }
    record["title"] = title.trimmingCharacters(in: .whitespacesAndNewlines) as CKRecordValue
    if type == "SharedEvent" {
      guard let allDay = input["allDay"] as? Bool else { throw familyError("Invalid event kind") }
      if allDay {
        guard let start = input["startDate"] as? String, let end = input["endDateExclusive"] as? String, validCalendarDate(start), validCalendarDate(end), end > start else { throw familyError("Invalid all-day dates") }
        record["startDate"] = start as CKRecordValue; record["endDateExclusive"] = end as CKRecordValue
        record["startAt"] = nil; record["endAt"] = nil; record["timeZoneID"] = nil
      } else {
        guard let start = input["startAt"] as? NSNumber, let end = input["endAt"] as? NSNumber, start.doubleValue.isFinite, end.doubleValue.isFinite, start.doubleValue >= 0, end.doubleValue >= start.doubleValue, end.doubleValue <= 8_640_000_000_000_000,
              let zone = input["timeZoneID"] as? String, !zone.hasPrefix("+"), !zone.hasPrefix("-"), TimeZone(identifier: zone) != nil else { throw familyError("Invalid event instants/timezone") }
        record["startAt"] = start; record["endAt"] = end; record["timeZoneID"] = zone as CKRecordValue
        record["startDate"] = nil; record["endDateExclusive"] = nil
      }
      let location = input["location"] as? String ?? "", note = input["note"] as? String ?? ""
      guard location.count <= 1000, note.count <= 10000 else { throw familyError("Event text too long") }
      record["allDay"] = NSNumber(value: allDay ? 1 : 0)
      record["location"] = location as CKRecordValue; record["note"] = note as CKRecordValue
    } else {
      guard let done = input["done"] as? Bool else { throw familyError("Invalid todo status") }
      if let due = input["dueAt"] as? NSNumber { guard due.doubleValue.isFinite, due.doubleValue >= 0, due.doubleValue <= 8_640_000_000_000_000 else { throw familyError("Invalid due date") }; record["dueAt"] = due }
      else { record["dueAt"] = nil }
      let wasDone = (record["done"] as? NSNumber)?.boolValue ?? false
      record["done"] = NSNumber(value: done ? 1 : 0)
      if !done { record["completedBy"] = nil }
      else if !wasDone { record["completedBy"] = user as CKRecordValue }
    }
    stampFamilyRecord(record); try put(record, scope: a.scope); return address
  }
  private func snapshot() throws -> [String: Any] {
    let hidden = Array(archive.zoneDeletes.values) + archive.pending.values.filter { $0.kind == "leave" }.map(\.address)
    var records: [[String: Any]] = []
    for (key, data) in archive.records {
      guard let a = archive.addresses[key], !hidden.contains(where: { $0.sameZone(a) }) else { continue }
      let root = FamilyAddress(scope: a.scope, id: CKRecord.ID(recordName: "group", zoneID: a.id.zoneID))
      guard (try? group(root)) != nil else { continue }
      let r = try unarchiveRecord(data)
      guard ["FamilyGroup", "SharedEvent", "SharedTodo", "FamilyMember"].contains(r.recordType), (r["isDeleted"] as? NSNumber)?.intValue != 1 else { continue }
      var fields: [String: Any] = [:]
      for k in r.allKeys() {
        if let v = r[k] as? String { fields[k] = v }
        else if let v = r[k] as? NSNumber { fields[k] = v }
      }
      if let creator = r["creatorMember"] as? CKRecord.Reference, creator.recordID.zoneID == a.id.zoneID {
        fields["creatorMemberId"] = creator.recordID.recordName
      }
      var row = a.json; row["type"] = r.recordType; row["fields"] = fields; records.append(row)
    }
    let syncStates: [[String: Any]] = archive.syncStates.values.map { state in
      var row: [String: Any] = ["record": state.record.json, "state": state.state]
      if let code = state.errorCode { row["errorCode"] = code }; return row
    }
    let access: [[String: Any]] = archive.access.values.map {
      return ["group": $0.group.json, "role": $0.role, "permission": $0.permission, "status": $0.status, "checkedAt": $0.checkedAt,
              "verified": $0.status == "accepted" && $0.permission != "none"]
    }
    return ["userId": user ?? "", "records": records, "pendingCount": archive.pending.count + archive.zoneDeletes.count, "syncStates": syncStates, "access": access]
  }
  func sync() async throws {
    syncRevision += 1
    if let syncTask { return try await syncTask.value }
    let id = UUID()
    let job = Task { try await self.drainSync() }
    syncTask = job; syncTaskID = id
    defer { if syncTaskID == id { syncTask = nil; syncTaskID = nil } }
    try await job.value
  }
  private func drainSync() async throws {
    var observed: Int
    repeat {
      observed = syncRevision
      try await runSync()
    } while observed != syncRevision
  }
  private func runSync() async throws {
    let gen = generation
    for p in archive.pending.values { enqueue(p) }
    for engine in Array(engines.values) {
      try Task.checkCancellation()
      try await engine.fetchChanges()
      guard gen == generation, healthy else { throw familyError("Family sync interrupted") }
      await refreshAccess()
      guard scope(of: engine) != nil else { continue }
      try await engine.sendChanges()
    }
    await refreshAccess()
  }
  func accept(_ metadata: CKShare.Metadata) async throws {
    guard metadata.containerIdentifier == Self.containerID else { throw familyError("Different CloudKit container") }
    guard metadata.participantStatus == .pending || metadata.participantStatus == .accepted else { throw familyError("Invitation is no longer usable") }
    try await prepare()
    let gen = generation
    if metadata.participantStatus != .accepted { _ = try await container.accept(metadata) }
    guard gen == generation else { throw familyError("Account changed") }
    let zone = metadata.share.recordID.zoneID
    try commit { next in next.access = next.access.filter { !($0.value.group.scope == "shared" && $0.value.group.id.zoneID == zone) } }
    try await resetEngine("shared")
    guard gen == generation else { throw familyError("Account changed") }
    try await sync()
    for a in archive.addresses.values where a.scope == "shared" && a.recordName == "group" {
      if let root = try? group(a, writing: true) { try ensureProfile(root, scope: a.scope) }
    }
    // A member's profile is explicit input via setProfile, never a fabricated name.
  }
  func invitation(_ address: FamilyAddress, createIfMissing: Bool = true) async throws -> (CKShare, CKContainer, String) {
    try await prepare(); _ = try group(address)
    let gen = generation
    let fresh = try await database(address.scope).record(for: address.id)
    guard gen == generation else { throw familyError("Account changed") }
    let share: CKShare
    if let shareID = fresh.share?.recordID, let saved = try await database(address.scope).record(for: shareID) as? CKShare { share = saved }
    else {
      guard createIfMissing, address.scope == "private" else { throw familyError("Share no longer available") }
      let new = CKShare(rootRecord: fresh); new.publicPermission = .none
      new[CKShare.SystemFieldKey.title] = fresh["name"]
      let saved = try await database("private").modifyRecords(saving: [fresh, new], deleting: [], savePolicy: .ifServerRecordUnchanged, atomically: true)
      _ = try saved.saveResults[fresh.recordID]!.get()
      guard let result = try saved.saveResults[new.recordID]!.get() as? CKShare else { throw familyError("Invalid share") }; share = result
    }
    guard gen == generation else { throw familyError("Account changed") }
    return (share, container, fresh["name"] as? String ?? "")
  }
  private func members(_ address: FamilyAddress) async throws -> [[String: Any]] {
    let (share, _, _) = try await invitation(address, createIfMissing: false)
    let profiles = try archive.records.values.map(unarchiveRecord).filter { $0.recordType == "FamilyMember" && $0.recordID.zoneID == address.id.zoneID && ($0["isDeleted"] as? NSNumber)?.intValue != 1 }
    return share.participants.map { p in
      let id = p.userIdentity.userRecordID?.recordName
      let profile = id.flatMap { identity in profiles.first { $0["userId"] as? String == identity } }
      let status: String
      switch p.acceptanceStatus { case .accepted: status = "accepted"; case .pending: status = "pending"; case .removed: status = "removed"; default: status = "unknown" }
      return ["id": id as Any? ?? NSNull(), "role": p.role == .owner ? "owner" : p.role == .privateUser ? "participant" : "unknown", "status": status,
              "permission": p.permission == .readWrite ? "readWrite" : p.permission == .readOnly ? "readOnly" : "none",
              "displayName": profile?["displayName"] as? String as Any? ?? NSNull(), "color": profile?["color"] as? String as Any? ?? NSNull()]
    }
  }
  private func log(_ error: Error) { NSLog("[RhythmFamily] Operation failed (%@); personal state untouched.", String((error as NSError).code)) }
  func systemSharingStopped(_ address: FamilyAddress) async {
    do {
      try await prepare()
      if address.scope == "private" {
        _ = try await execute("stopGroup", args: ["group": address.json])
        try await sync()
      } else {
        try commit { $0.access[address.key]?.status = "left" }
        try purge(address.id.zoneID, scope: "shared")
      }
    } catch { log(error) }
  }
  private func resetEngine(_ scope: String) async throws {
    let old = engines[scope]
    try commit(notify: false) { $0.checkpoints[scope] = nil }
    engines[scope] = CKSyncEngine(CKSyncEngine.Configuration(database: database(scope), stateSerialization: nil, delegate: self))
    for p in archive.pending.values where p.address.scope == scope { enqueue(p) }
    if let old { Task { await old.cancelOperations() } }
  }
  private func markFailed(_ address: FamilyAddress, code: Int) throws {
    try commit { $0.syncStates[address.key] = FamilySyncState(record: address, state: "failed", errorCode: code) }
  }
}

// MARK: - CKSyncEngine: both owner's private DB and participant's shared DB.
extension FamilyStore {
  private func scope(of engine: CKSyncEngine) -> String? { engines.first { $0.value === engine }?.key }
  public func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext, syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
    guard healthy, let scope = scope(of: syncEngine) else { return nil }
    let stale = syncEngine.state.pendingRecordZoneChanges.filter { change in
      switch change {
      case .saveRecord(let id), .deleteRecord(let id): return archive.pending[FamilyAddress(scope: scope, id: id).key] == nil
      @unknown default: return false
      }
    }
    syncEngine.state.remove(pendingRecordZoneChanges: stale)
    var changes = syncEngine.state.pendingRecordZoneChanges.filter { change in
      guard context.options.scope.contains(change) else { return false }
      if case .saveRecord(let id) = change, scope == "shared" {
        let root = FamilyAddress(scope: scope, id: CKRecord.ID(recordName: "group", zoneID: id.zoneID))
        return (try? group(root, writing: true)) != nil
      }
      return true
    }
    // Bounded, one-zone batches. New member references are saved in the same
    // atomic batch before items that reference them. Keep other zones pending.
    let pendingSnapshot = archive.pending
    func address(_ change: CKSyncEngine.PendingRecordZoneChange) -> CKRecord.ID? {
      switch change { case .saveRecord(let id), .deleteRecord(let id): return id; @unknown default: return nil }
    }
    func rank(_ change: CKSyncEngine.PendingRecordZoneChange) -> Int {
      guard let id = address(change), let p = pendingSnapshot[FamilyAddress(scope: scope, id: id).key] else { return 2 }
      if p.kind == "leave" { return 0 }
      if let data = p.record, let r = try? unarchiveRecord(data), r.recordType == "FamilyMember" { return 1 }
      return 2
    }
    changes.sort { lhs, rhs in
      let a = rank(lhs), b = rank(rhs)
      if a != b { return a < b }
      return (address(lhs)?.recordName ?? "") < (address(rhs)?.recordName ?? "")
    }
    if let zone = changes.first.flatMap(address)?.zoneID { changes = Array(changes.filter { address($0)?.zoneID == zone }.prefix(100)) }
    var records: [CKRecord.ID: CKRecord] = [:]
    for p in archive.pending.values where p.address.scope == scope && p.kind == "save" {
      if let data = p.record, let record = try? unarchiveRecord(data) { records[record.recordID] = record }
    }
    let frozenRecords = records
    var batch = await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: changes) { id in frozenRecords[id] }
    batch?.atomicByZone = true
    return batch
  }
  public func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
    guard healthy, let scope = scope(of: syncEngine) else { return }
    var needsReset = false
    do {
      switch event {
      case .stateUpdate(let e): try commit { $0.checkpoints[scope] = e.stateSerialization }
      case .accountChange(let e):
        switch e.changeType {
        case .signOut, .switchAccounts: await invalidate()
        case .signIn: break // prepare() already bound this engine to the authenticated account.
        @unknown default: await invalidate()
        }
      case .fetchedDatabaseChanges(let e):
        for d in e.deletions { try purge(d.zoneID, scope: scope) }
      case .fetchedRecordZoneChanges(let e):
        for m in e.modifications { try receive(m.record, scope: scope) }
        for d in e.deletions {
          if scope == "shared", d.recordType == "cloudkit.share" { try purge(d.recordID.zoneID, scope: scope) }
          else { try hardDelete(d.recordID, scope: scope) }
        }
      case .sentRecordZoneChanges(let e):
        for r in e.savedRecords { try acknowledged(r, scope: scope) }
        for id in e.deletedRecordIDs { try hardDelete(id, scope: scope) }
        for failure in e.failedRecordSaves {
          let address = FamilyAddress(scope: scope, id: failure.record.recordID)
          try markFailed(address, code: failure.error.code.rawValue)
          if failure.error.code == .serverRecordChanged, let server = failure.error.serverRecord {
            try receive(server, scope: scope)
            if let p = archive.pending[FamilyAddress(scope: scope, id: server.recordID).key] { enqueue(p) }
          } else if failure.error.code == .unknownItem || failure.error.code == .zoneNotFound || failure.error.code == .permissionFailure {
            // Never resurrect a removed record/share or recreate a revoked zone.
            if failure.error.code == .unknownItem { try hardDelete(failure.record.recordID, scope: scope) }
            else { try purge(failure.record.recordID.zoneID, scope: scope) }
            if failure.error.code == .permissionFailure { needsReset = true }
          } else { log(failure.error) } // CKSyncEngine retries transient errors.
        }
        for (id, error) in e.failedRecordDeletes {
          try markFailed(FamilyAddress(scope: scope, id: id), code: error.code.rawValue)
          if error.code == .unknownItem { try hardDelete(id, scope: scope) }
          else if error.code == .zoneNotFound || error.code == .permissionFailure { try purge(id.zoneID, scope: scope); needsReset = error.code == .permissionFailure || needsReset }
          else { log(error) }
        }
      case .sentDatabaseChanges(let e):
        for zone in e.deletedZoneIDs { try purge(zone, scope: scope) }
        for (zone, error) in e.failedZoneDeletes {
          try markFailed(FamilyAddress(scope: scope, id: CKRecord.ID(recordName: "group", zoneID: zone)), code: error.code.rawValue)
          if error.code == .zoneNotFound || error.code == .unknownItem { try purge(zone, scope: scope) }
          else { log(error) }
        }
      default: break
      }
      if needsReset { try await resetEngine(scope) }
    } catch {
      // Do not checkpoint past unpersisted fetched data. Disk failure disables
      // this account's session; restart replays from the last durable archive.
      healthy = false; log(error)
    }
  }
  private func receive(_ remote: CKRecord, scope: String) throws {
    guard ["FamilyGroup", "SharedEvent", "SharedTodo", "FamilyMember"].contains(remote.recordType), remote.recordID.zoneID.zoneName.hasPrefix("rhythm-family-") else { return }
    let a = FamilyAddress(scope: scope, id: remote.recordID)
    let root = FamilyAddress(scope: scope, id: CKRecord.ID(recordName: "group", zoneID: a.id.zoneID))
    if ["left", "stopped", "revoked"].contains(archive.access[root.key]?.status ?? "") { return }
    if let local = archive.records[a.key].flatMap({ try? unarchiveRecord($0) }), (local["isDeleted"] as? NSNumber)?.intValue == 1, (remote["isDeleted"] as? NSNumber)?.intValue != 1 {
      try put(overlayFamilyRecord(local, on: remote), scope: scope); return
    }
    if let p = archive.pending[a.key], p.kind == "save", let bytes = p.record {
      let local = try unarchiveRecord(bytes)
      if newerFamilyRecord(local, than: remote) {
        let merged = try overlayFamilyRecord(local, on: remote)
        try put(merged, scope: scope); return
      }
    }
    let data = try archiveRecord(remote)
    try commit { $0.records[a.key] = data; $0.addresses[a.key] = a; $0.pending[a.key] = nil; $0.syncStates[a.key] = FamilySyncState(record: a, state: "synced") }
    engines[scope]?.state.remove(pendingRecordZoneChanges: [.saveRecord(a.id)])
  }
  private func acknowledged(_ server: CKRecord, scope: String) throws {
    let a = FamilyAddress(scope: scope, id: server.recordID)
    if let p = archive.pending[a.key], p.kind == "save", let data = p.record,
       p.mutationId != server["mutationId"] as? String {
      // A newer local edit happened while a batch was in flight; retain it.
      try put(overlayFamilyRecord(unarchiveRecord(data), on: server), scope: scope)
    } else { try receive(server, scope: scope) }
  }
  private func hardDelete(_ id: CKRecord.ID, scope: String) throws {
    let a = FamilyAddress(scope: scope, id: id)
    if archive.pending[a.key]?.kind == "leave" || id.recordName == "group" || archive.records[a.key].flatMap({ try? unarchiveRecord($0) }) is CKShare {
      try purge(id.zoneID, scope: scope); return
    }
    try commit { $0.records[a.key] = nil; $0.addresses[a.key] = nil; $0.pending[a.key] = nil }
    engines[scope]?.state.remove(pendingRecordZoneChanges: [.saveRecord(id), .deleteRecord(id)])
  }
}
