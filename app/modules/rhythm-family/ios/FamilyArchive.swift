import CloudKit
import CryptoKit
import Foundation

// Whole archive (records + durable outbox + engine checkpoints) is atomic and
// account-scoped. It never reads AsyncStorage, the KVS store or personal data.
struct FamilyAddress: Codable, Hashable {
  var scope: String
  var zoneName: String
  var ownerName: String
  var recordName: String
  var id: CKRecord.ID { CKRecord.ID(recordName: recordName, zoneID: CKRecordZone.ID(zoneName: zoneName, ownerName: ownerName)) }
  var key: String { [scope, ownerName, zoneName, recordName].map { Data($0.utf8).base64EncodedString() }.joined(separator: ":") }
  init(scope: String, id: CKRecord.ID) { self.scope = scope; zoneName = id.zoneID.zoneName; ownerName = id.zoneID.ownerName; recordName = id.recordName }
  func sameZone(_ other: FamilyAddress) -> Bool { scope == other.scope && zoneName == other.zoneName && ownerName == other.ownerName }
  var json: [String: Any] { ["scope": scope, "zoneName": zoneName, "ownerName": ownerName, "recordName": recordName] }
  static func parse(_ value: Any?) throws -> FamilyAddress {
    guard let d = value as? [String: Any], let s = d["scope"] as? String, ["private", "shared"].contains(s),
          let z = d["zoneName"] as? String, z.hasPrefix("rhythm-family-"),
          let o = d["ownerName"] as? String, !o.isEmpty,
          let r = d["recordName"] as? String, !r.isEmpty else { throw familyError("Invalid family address") }
    return FamilyAddress(scope: s, id: CKRecord.ID(recordName: r, zoneID: .init(zoneName: z, ownerName: o)))
  }
}
struct FamilyPending: Codable {
  var address: FamilyAddress
  var kind: String // save / leave (delete CKShare from participant Shared DB)
  var record: Data?
  var mutationId: String
}
struct FamilyAccess: Codable {
  var group: FamilyAddress
  var role: String
  var permission: String
  var status: String
  var checkedAt: Double
}
struct FamilySyncState: Codable {
  var record: FamilyAddress
  var state: String
  var errorCode: Int?
}
struct FamilyArchive: Codable {
  var version = 1
  var records: [String: Data] = [:]
  var addresses: [String: FamilyAddress] = [:]
  var pending: [String: FamilyPending] = [:]
  var zoneDeletes: [String: FamilyAddress] = [:]
  var checkpoints: [String: CKSyncEngine.State.Serialization] = [:]
  var access: [String: FamilyAccess] = [:]
  var syncStates: [String: FamilySyncState] = [:]
}
func familyError(_ message: String) -> NSError { NSError(domain: "RhythmFamily", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
func archiveRecord(_ record: CKRecord) throws -> Data { try NSKeyedArchiver.archivedData(withRootObject: record, requiringSecureCoding: true) }
func unarchiveRecord(_ data: Data) throws -> CKRecord {
  guard let r = try NSKeyedUnarchiver.unarchivedObject(ofClass: CKRecord.self, from: data) else { throw familyError("Invalid archived record") }
  return r
}
func familyHash(_ value: String) -> String { SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined() }
func newerFamilyRecord(_ a: CKRecord, than b: CKRecord) -> Bool {
  let aDeleted = (a["isDeleted"] as? NSNumber)?.intValue == 1, bDeleted = (b["isDeleted"] as? NSNumber)?.intValue == 1
  if aDeleted != bDeleted { return aDeleted }
  let x = (a["updatedAt"] as? NSNumber)?.doubleValue ?? 0, y = (b["updatedAt"] as? NSNumber)?.doubleValue ?? 0
  return x > y || (x == y && (a["mutationId"] as? String ?? "") > (b["mutationId"] as? String ?? ""))
}
func overlayFamilyRecord(_ local: CKRecord, on server: CKRecord) throws -> CKRecord {
  guard let tag = server.recordChangeTag, !tag.isEmpty else { throw familyError("Missing server concurrency token") }
  let merged = try unarchiveRecord(archiveRecord(server))
  for key in server.allKeys() { merged[key] = nil }
  for key in local.allKeys() { merged[key] = local[key] }
  merged.parent = local.parent
  return merged
}
func stampFamilyRecord(_ record: CKRecord) {
  let previous = min(max((record["updatedAt"] as? NSNumber)?.int64Value ?? 0, 0), 8_640_000_000_000_000)
  record["updatedAt"] = NSNumber(value: max(Int64(Date().timeIntervalSince1970 * 1000), previous + 1))
  record["mutationId"] = UUID().uuidString as CKRecordValue
  if record["isDeleted"] == nil { record["isDeleted"] = NSNumber(value: 0) }
}
func validCalendarDate(_ value: String) -> Bool {
  guard value.range(of: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", options: .regularExpression) != nil, !value.hasPrefix("0000") else { return false }
  let formatter = DateFormatter()
  formatter.calendar = Calendar(identifier: .gregorian); formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0); formatter.dateFormat = "yyyy-MM-dd"; formatter.isLenient = false
  guard let date = formatter.date(from: value) else { return false }
  return formatter.string(from: date) == value
}
