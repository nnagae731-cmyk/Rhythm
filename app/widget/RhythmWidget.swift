import Foundation
import Darwin
import SwiftUI
import UIKit
import WidgetKit
import AppIntents

private let appGroup = "group.app.rhythm.daily"
private let snapshotKey = "rhythmWidgetSnapshot"
private let pendingActionsKey = "rhythmWidgetPendingActions"
private let pendingActionsLockFile = ".rhythmWidgetPendingActions.lock"

private func widgetISO8601String(_ date: Date) -> String {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter.string(from: date)
}

#if canImport(AppIntents)
@available(iOS 17.0, *)
private enum WidgetPendingActionStore {
  /// AppIntents may run concurrently (and the app process may acknowledge
  /// actions at the same time).  Guard the App Group read/modify/write with a
  /// shared file lock so one writer cannot overwrite another writer's action.
  private static func withSharedLock<T>(_ body: () -> T) -> T? {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
    let lockURL = container.appendingPathComponent(pendingActionsLockFile)
    let descriptor = open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { return nil }
    let deadline = Date().addingTimeInterval(2)
    while flock(descriptor, LOCK_EX | LOCK_NB) != 0 {
      if errno != EWOULDBLOCK && errno != EAGAIN && errno != EINTR || Date() >= deadline {
        close(descriptor)
        return nil
      }
      usleep(20_000)
    }
    defer { flock(descriptor, LOCK_UN); close(descriptor) }
    return body()
  }

  static func append(_ action: [String: Any]) {
    _ = withSharedLock {
      guard let defaults = UserDefaults(suiteName: appGroup),
            let data = try? JSONSerialization.data(withJSONObject: action),
            let decoded = try? JSONSerialization.jsonObject(with: data),
            let object = decoded as? [String: Any] else { return }
      var actions: [[String: Any]] = []
      if let raw = defaults.string(forKey: pendingActionsKey), let rawData = raw.data(using: .utf8),
         let existing = try? JSONSerialization.jsonObject(with: rawData) as? [[String: Any]] { actions = existing }
      if let id = object["id"] as? String { actions.removeAll { ($0["id"] as? String) == id } }
      actions.append(object)
      // Each action id is de-duplicated above. Leave unacknowledged actions in
      // the App Group until the containing app confirms reconciliation; silently
      // truncating the queue could lose a user's widget tap before launch.
      if let encoded = try? JSONSerialization.data(withJSONObject: actions), let text = String(data: encoded, encoding: .utf8) {
        defaults.set(text, forKey: pendingActionsKey)
      }
    }
  }

  /// Optimistically update the cached snapshot while retaining the pending
  /// action for the main app to reconcile when it next becomes active.
  private static func updateSnapshot(_ update: (inout [String: Any]) -> Void) {
    _ = withSharedLock {
      guard let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: snapshotKey),
            let data = raw.data(using: .utf8),
            var object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
      update(&object)
      guard JSONSerialization.isValidJSONObject(object),
            let encoded = try? JSONSerialization.data(withJSONObject: object),
            let text = String(data: encoded, encoding: .utf8) else { return }
      defaults.set(text, forKey: snapshotKey)
    }
  }

  static func completeTaskInSnapshot(_ taskId: String) {
    updateSnapshot { object in
      let currentId = (object["currentTask"] as? [String: Any])?["id"] as? String
      var remaining = object["todayNowTasks"] as? [[String: Any]] ?? []
      let remainingIndex = remaining.firstIndex { ($0["id"] as? String) == taskId }
      guard currentId == taskId || remainingIndex != nil else { return }
      if currentId == taskId {
        // Keep the completed task in place for the next timeline render. The
        // app's regular snapshot reconciliation will remove it and promote the
        // next candidate; doing that immediately here made a successful tap
        // look like a missed interaction.
        var completed = (object["currentTask"] as? [String: Any]) ?? [:]
        completed["status"] = "completed"
        completed["optimisticCompletedAt"] = widgetISO8601String(Date())
        object["currentTask"] = completed
      } else if let remainingIndex = remainingIndex {
        remaining[remainingIndex]["status"] = "completed"
        remaining[remainingIndex]["optimisticCompletedAt"] = widgetISO8601String(Date())
      }
      object["todayNowTasks"] = remaining
      if var candidates = object["currentTaskCandidates"] as? [[String: Any]] {
        for index in candidates.indices where (candidates[index]["id"] as? String) == taskId {
          candidates[index]["status"] = "completed"
          candidates[index]["optimisticCompletedAt"] = widgetISO8601String(Date())
        }
        object["currentTaskCandidates"] = candidates
      }
    }
  }

  static func toggleListItemInSnapshot(taskId: String, listItemId: String, completed: Bool) {
    updateSnapshot { object in
      guard var checklist = object["checklist"] as? [[String: Any]] else { return }
      for index in checklist.indices where (checklist[index]["taskId"] as? String) == taskId && (checklist[index]["listItemId"] as? String) == listItemId {
        checklist[index]["done"] = completed
      }
      object["checklist"] = checklist
    }
  }

  static func appendTask(title: String, scheduledDate: String? = nil, scheduledTime: String? = nil) {
    let normalized = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalized.isEmpty else { return }
    let id = "addTask:\(UUID().uuidString)"
    var action: [String: Any] = [
      "id": id,
      "type": "addTask",
      "title": normalized,
    ]
    if let scheduledDate { action["scheduledDate"] = scheduledDate }
    if let scheduledTime { action["scheduledTime"] = scheduledTime }
    append(action)
  }

  static func appendPlan(title: String, scheduledDate: String? = nil, scheduledTime: String? = nil) {
    let normalized = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalized.isEmpty else { return }
    let id = "addPlan:\(UUID().uuidString)"
    var action: [String: Any] = [
      "id": id,
      "type": "addPlan",
      "title": normalized,
    ]
    if let scheduledDate { action["scheduledDate"] = scheduledDate }
    if let scheduledTime { action["scheduledTime"] = scheduledTime }
    append(action)
  }

  static func loadSnapshot() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: snapshotKey),
          let data = raw.data(using: .utf8) else { return nil }
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let value = try container.decode(String.self)
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = formatter.date(from: value) { return date }
      formatter.formatOptions = [.withInternetDateTime]
      if let date = formatter.date(from: value) { return date }
      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid widget snapshot date")
    }
    return try? decoder.decode(WidgetSnapshot.self, from: data)
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmCompleteTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "タスクを完了"
  static var openAppWhenRun: Bool { false }
  @Parameter(title: "Task ID") var taskId: String
  init() { taskId = "" }
  init(taskId: String) { self.taskId = taskId }
  func perform() async throws -> some IntentResult {
    WidgetPendingActionStore.completeTaskInSnapshot(taskId)
    WidgetPendingActionStore.append(["id": "completeTask:\(taskId)", "type": "completeTask", "taskId": taskId])
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmToggleListItemIntent: AppIntent {
  static var title: LocalizedStringResource = "リスト項目を切り替え"
  static var openAppWhenRun: Bool { false }
  @Parameter(title: "Task ID") var taskId: String
  @Parameter(title: "List Item ID") var listItemId: String
  @Parameter(title: "完了") var completed: Bool
  init() { taskId = ""; listItemId = ""; completed = false }
  init(taskId: String, listItemId: String, completed: Bool) { self.taskId = taskId; self.listItemId = listItemId; self.completed = completed }
  func perform() async throws -> some IntentResult {
    WidgetPendingActionStore.toggleListItemInSnapshot(taskId: taskId, listItemId: listItemId, completed: completed)
    WidgetPendingActionStore.append(["id": "toggleListItem:\(taskId):\(listItemId)", "type": "toggleListItem", "taskId": taskId, "listItemId": listItemId, "completed": completed])
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmAddTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "RhythmPaceにタスクを追加"
  static var description = IntentDescription("RhythmPaceに新しいタスクを追加します。")
  static var openAppWhenRun: Bool { true }

  @Parameter(title: "タスク名") var title: String
  @Parameter(title: "日時") var scheduledAt: Date?

  init() { title = ""; scheduledAt = nil }
  init(title: String, scheduledAt: Date? = nil) { self.title = title; self.scheduledAt = scheduledAt }

  func perform() async throws -> some IntentResult {
    var calendar = Calendar.current
    calendar.timeZone = .current
    let dateFormatter = DateFormatter()
    dateFormatter.calendar = calendar
    dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let timeFormatter = DateFormatter()
    timeFormatter.calendar = calendar
    timeFormatter.locale = Locale(identifier: "en_US_POSIX")
    timeFormatter.dateFormat = "HH:mm"
    WidgetPendingActionStore.appendTask(
      title: title,
      scheduledDate: scheduledAt.map { dateFormatter.string(from: $0) },
      scheduledTime: scheduledAt.map { timeFormatter.string(from: $0) }
    )
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmAddPlanIntent: AppIntent {
  static var title: LocalizedStringResource = "RhythmPaceに予定を追加"
  static var description = IntentDescription("RhythmPaceの予定表に新しい予定を追加します。")
  static var openAppWhenRun: Bool { true }

  @Parameter(title: "予定名") var title: String
  @Parameter(title: "日時") var scheduledAt: Date?

  init() { title = ""; scheduledAt = nil }
  init(title: String, scheduledAt: Date? = nil) { self.title = title; self.scheduledAt = scheduledAt }

  func perform() async throws -> some IntentResult {
    var calendar = Calendar.current
    calendar.timeZone = .current
    let dateFormatter = DateFormatter()
    dateFormatter.calendar = calendar
    dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let timeFormatter = DateFormatter()
    timeFormatter.calendar = calendar
    timeFormatter.locale = Locale(identifier: "en_US_POSIX")
    timeFormatter.dateFormat = "HH:mm"
    WidgetPendingActionStore.appendPlan(
      title: title,
      scheduledDate: scheduledAt.map { dateFormatter.string(from: $0) },
      scheduledTime: scheduledAt.map { timeFormatter.string(from: $0) }
    )
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: RhythmAddTaskIntent(),
      phrases: ["\(.applicationName)にタスクを追加"],
      shortTitle: "タスクを追加",
      systemImageName: "plus.circle"
    )
    AppShortcut(
      intent: RhythmAddPlanIntent(),
      phrases: ["\(.applicationName)に予定を追加"],
      shortTitle: "予定を追加",
      systemImageName: "calendar.badge.plus"
    )
    AppShortcut(
      intent: RhythmReadTodayTasksIntent(),
      phrases: ["\(.applicationName)の今日のタスクを教えて"],
      shortTitle: "今日のタスク",
      systemImageName: "checklist"
    )
    AppShortcut(
      intent: RhythmReadNextScheduleIntent(),
      phrases: ["\(.applicationName)の次の予定を教えて"],
      shortTitle: "次の予定",
      systemImageName: "calendar"
    )
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmReadTodayTasksIntent: AppIntent {
  static var title: LocalizedStringResource = "今日のタスクを確認"
  static var description = IntentDescription("RhythmPaceの今日のタスクを読み上げます。")
  static var openAppWhenRun: Bool { false }

  func perform() async throws -> some IntentResult {
    guard let snapshot = WidgetPendingActionStore.loadSnapshot() else {
      return .result(dialog: "RhythmPaceのデータをまだ読み込めません。")
    }
    var tasks: [WidgetSnapshot.Task] = []
    if let current = snapshot.currentTask { tasks.append(current) }
    tasks.append(contentsOf: snapshot.todayNowTasks ?? [])
    var seen = Set<String>()
    let titles = tasks.filter { task in
      guard task.status != "completed", task.status != "skipped", seen.insert(task.id).inserted else { return false }
      return true
    }.prefix(5).map(\.title)
    guard !titles.isEmpty else { return .result(dialog: "今日の未完了タスクはありません。") }
    return .result(dialog: "今日のタスクは、\(titles.joined(separator: "、"))です。")
  }
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmReadNextScheduleIntent: AppIntent {
  static var title: LocalizedStringResource = "次の予定を確認"
  static var description = IntentDescription("RhythmPaceの次の予定を読み上げます。")
  static var openAppWhenRun: Bool { false }

  func perform() async throws -> some IntentResult {
    guard let snapshot = WidgetPendingActionStore.loadSnapshot() else {
      return .result(dialog: "RhythmPaceのデータをまだ読み込めません。")
    }
    let plan = (snapshot.nextPlans?.first ?? snapshot.nextPlan)
    guard let plan else { return .result(dialog: "次の予定はありません。") }
    return .result(dialog: "次の予定は、\(plan.title)です。")
  }
}
#endif

/// The payload is intentionally shared by all widget configurations. Optional
/// fields keep snapshots written by older app versions backwards compatible.
struct WidgetSnapshot: Codable {
  enum Style: String, Codable {
    case mono
    case color
    case photo
  }

  struct Appearance: Codable {
    let style: Style
    let monoTemplate: String?
    let fontDesign: String?
    let accentHex: String?
    let photoFileName: String?
    let cutoutFileName: String?
    let photoLayout: String?
    let designPattern: String?
    let designCheckColor: String?
    let designPatternUnlocked: Bool?
    let affirmationBackgrounds: [String]?
  }

  struct WidgetCustomization: Codable {
    let photoFileName: String?
    let cutoutFileName: String?
    let photoLayout: String?
    let monoTemplate: String?
  }

  struct WidgetPhotoUnlock: Codable {
    let widgetType: String?
    let expiresAt: Date?
  }

  struct Task: Codable {
    let id: String
    let title: String
    let startAt: Date?
    let estimatedMinutes: Int?
    let remainingMinutes: Int?
    let status: String?
    let priority: String?
    let actionableAt: Date?
    let deadlineAt: Date?
    let createdAt: Date?
    let scheduledDate: String?
    let optimisticCompletedAt: Date?
  }

  struct Plan: Codable {
    let id: String?
    let title: String
    let scheduledAt: Date
    let location: String?
    let allDay: Bool?
    var leaveAt: Date?
    var remainingToLeave: Int?
    /// Kept for snapshots written before the expanded `leaveAt` field.
    var departureAt: Date?
  }

  struct ScheduleItem: Codable {
    let id: String?
    let title: String
    let scheduledAt: Date
    let location: String?
    let allDay: Bool?
    let leaveAt: Date?
  }

  struct MonthDay: Codable {
    let date: String
    let day: Int
    let weekdayIndex: Int
    let hasSchedule: Bool
    let scheduleCount: Int
    let scheduleTitle: String?
    let isToday: Bool
  }

  struct CalendarMonth: Codable {
    let year: Int
    let month: Int
    let leadingEmptyCount: Int
    let days: [MonthDay]
  }

  struct WeekDay: Codable {
    let date: String
    let day: Int
    let weekday: String
    let isToday: Bool
    let schedules: [ScheduleItem]
  }

  struct CalendarWeek: Codable {
    let startDate: String
    let days: [WeekDay]
  }

  struct Goal: Codable {
    let id: String
    let title: String
    let progress: Int
    let completedActions: Int
    let actionCount: Int
  }

  struct ChecklistItem: Codable {
    let id: String
    let taskId: String?
    let listItemId: String?
    let title: String
    let done: Bool
  }

  struct AffirmationItem: Codable {
    let id: String
    let text: String
  }

  let updatedAt: Date
  let isPremium: Bool?
  let designCustomizePurchased: Bool?
  let appearance: Appearance?
  /// Optional per-kind photo references. Older snapshots omit this field and
  /// continue using the shared appearance photo as a fallback.
  let widgetCustomizations: [String: WidgetCustomization]?
  let displayOptions: [String: Bool]?
  let currentTask: Task?
  let currentTaskCandidates: [Task]?
  let todayNowTasks: [Task]?
  let todayNowTaskCount: Int?
  let nextPlan: Plan?
  let nextPlans: [Plan]?
  let calendarPlans: [ScheduleItem]?
  let calendarMonth: CalendarMonth?
  let calendarWeek: CalendarWeek?
  let todaySchedules: [ScheduleItem]?
  let todayScheduleCount: Int?
  let checklist: [ChecklistItem]?
  let goal: Goal?
  let goalMonths: [String: Goal]?
  let widgetPhotoUnlock: WidgetPhotoUnlock?
  let affirmations: [AffirmationItem]?
  let affirmationPhotoFileNames: [String]?

  /// Widget kinds are gated by the effective entitlements written by the
  /// containing app. Missing fields are treated as the free tier so older
  /// snapshots remain safe and readable.
  func canDisplayWidget(kind: String) -> Bool {
    if isPremium == true { return true }
    switch kind {
    case "RhythmCurrentTaskWidget", "RhythmNextScheduleWidget", "RhythmVoiceWidget":
      return true
    case "RhythmWidget", "RhythmMonthlyCalendarWidget", "RhythmWeeklyCalendarWidget", "RhythmTodayScheduleWidget", "RhythmChecklistWidget":
      return designCustomizePurchased == true
    case "RhythmGoalWidget", "RhythmAffirmationWidget":
      return false
    default:
      return true
    }
  }

  func canDisplayPhoto(kind: String?, at date: Date) -> Bool {
    if isPremium == true || designCustomizePurchased == true { return true }
    guard let unlock = widgetPhotoUnlock, let widgetType = unlock.widgetType,
          widgetType == WidgetSnapshot.widgetTypeKey(for: kind),
          let expiresAt = unlock.expiresAt else { return false }
    return expiresAt > date
  }

  private static func widgetTypeKey(for kind: String?) -> String? {
    switch kind {
    case "RhythmCurrentTaskWidget": return "current"
    case "RhythmNextScheduleWidget": return "next"
    case "RhythmWidget": return "combined"
    case "RhythmMonthlyCalendarWidget": return "monthly"
    case "RhythmWeeklyCalendarWidget": return "weekly"
    case "RhythmTodayScheduleWidget": return "today"
    case "RhythmChecklistWidget": return "checklist"
    case "RhythmGoalWidget": return "goal"
    case "RhythmVoiceWidget": return "voice"
    case "RhythmAffirmationWidget": return "affirmation"
    default: return nil
    }
  }

  /// Older snapshots do not contain displayOptions. Treat missing or malformed
  /// entries as enabled so an upgrade never hides existing widget content.
  func isDisplayOptionEnabled(_ key: String) -> Bool {
    displayOptions?[key] ?? true
  }

  /// Re-evaluates the bounded candidate payload at the timeline entry time.
  /// The ranking mirrors the JS task selector (overdue, near, today, then
  /// target time/priority/registration order) without requiring the app to run.
  func resolved(at date: Date, kind: String? = nil) -> WidgetSnapshot {
    let hasCandidatePayload = currentTaskCandidates != nil
    let candidates = currentTaskCandidates ?? (currentTask.map { [$0] } ?? [])
    let calendar = Calendar.current
    let dayFormatter = DateFormatter()
    dayFormatter.calendar = calendar
    dayFormatter.dateFormat = "yyyy-MM-dd"
    let currentDay = dayFormatter.string(from: date)
    let eligible = candidates.filter { task in
      if let scheduledDate = task.scheduledDate, scheduledDate > currentDay { return false }
      guard let start = task.startAt else { return true }
      return calendar.isDate(start, inSameDayAs: date) || start < date
    }
    let priorityRank: [String: Int] = ["高": 0, "中": 1, "低": 2]
    let ranked = eligible.enumerated().sorted { left, right in
      let a = left.element
      let b = right.element
      let aOverdue = (a.deadlineAt?.timeIntervalSince(date) ?? 1) < 0 || (a.actionableAt?.timeIntervalSince(date) ?? 1) <= 0
      let bOverdue = (b.deadlineAt?.timeIntervalSince(date) ?? 1) < 0 || (b.actionableAt?.timeIntervalSince(date) ?? 1) <= 0
      let aNear = !aOverdue && (a.actionableAt.map { $0 > date && $0 <= date.addingTimeInterval(2 * 60 * 60) } ?? false)
      let bNear = !bOverdue && (b.actionableAt.map { $0 > date && $0 <= date.addingTimeInterval(2 * 60 * 60) } ?? false)
      let aToday = !aOverdue && !aNear && (a.actionableAt.map { calendar.isDate($0, inSameDayAs: date) } ?? false)
      let bToday = !bOverdue && !bNear && (b.actionableAt.map { calendar.isDate($0, inSameDayAs: date) } ?? false)
      let aRank = aOverdue ? 0 : aNear ? 1 : aToday ? 2 : 3
      let bRank = bOverdue ? 0 : bNear ? 1 : bToday ? 2 : 3
      let aTarget = a.actionableAt ?? a.startAt ?? a.deadlineAt ?? .distantFuture
      let bTarget = b.actionableAt ?? b.startAt ?? b.deadlineAt ?? .distantFuture
      let aCreated = a.createdAt ?? .distantFuture
      let bCreated = b.createdAt ?? .distantFuture
      if aRank != bRank { return aRank < bRank }
      if aTarget != bTarget { return aTarget < bTarget }
      let aPriority = priorityRank[a.priority ?? ""] ?? 1
      let bPriority = priorityRank[b.priority ?? ""] ?? 1
      if aPriority != bPriority { return aPriority < bPriority }
      if aCreated != bCreated { return aCreated < bCreated }
      return left.offset < right.offset
    }.map(\.element).filter { task in
      guard task.status != "skipped" else { return false }
      if task.status != "completed" { return true }
      return task.optimisticCompletedAt.map { $0.addingTimeInterval(1.2) > date } ?? false
    }
    let selected = hasCandidatePayload ? ranked.first : currentTask
    let remaining = hasCandidatePayload ? Array(ranked.dropFirst().prefix(3)) : (todayNowTasks ?? [])
    // The next appointment is selected by its scheduled time. Departure is
    // supplementary state and must not make a future appointment disappear
    // merely because its leave time has already passed.
    let plans = (nextPlans ?? (nextPlan.map { [$0] } ?? []))
      .filter { $0.scheduledAt >= date }
      .sorted { $0.scheduledAt < $1.scheduledAt }
    var selectedPlan = plans.first
    if var plan = selectedPlan {
      if let leave = plan.leaveAt ?? plan.departureAt, leave > date {
        plan.remainingToLeave = max(0, Int(ceil(leave.timeIntervalSince(date) / 60)))
      } else {
        plan.leaveAt = nil
        plan.departureAt = nil
        plan.remainingToLeave = nil
      }
      selectedPlan = plan
    }
    let resolvedAppearance: Appearance? = {
      guard let appearance, appearance.style == .photo, !canDisplayPhoto(kind: kind, at: date) else { return appearance }
      let fallbackStyle: Style = appearance.designPatternUnlocked == true ? .color : .mono
      return Appearance(style: fallbackStyle, monoTemplate: appearance.monoTemplate, fontDesign: appearance.fontDesign, accentHex: appearance.accentHex, photoFileName: nil, cutoutFileName: nil, photoLayout: appearance.photoLayout, designPattern: fallbackStyle == .color ? (appearance.designPattern ?? "plain") : nil, designCheckColor: appearance.designCheckColor, designPatternUnlocked: appearance.designPatternUnlocked, affirmationBackgrounds: appearance.affirmationBackgrounds)
    }()
    let legacyPeriodChanged = calendarPlans == nil && isoDay(updatedAt) != isoDay(date)
    let resolvedMonth: CalendarMonth? = {
      guard let calendarPlans else { return legacyPeriodChanged ? nil : calendarMonth }
      let rebuilt = buildCalendarMonth(calendarPlans, at: date)
      // Newer snapshots carry a bounded calendarPlans list so the Widget can
      // refresh at month boundaries. If that bounded list has no entry for
      // the current month, retain a same-month calendarMonth from the app
      // snapshot instead of erasing its schedule markers and titles.
      let rebuiltHasSchedules = rebuilt.days.contains { $0.hasSchedule }
      let storedIsSameMonth = calendarMonth?.year == rebuilt.year && calendarMonth?.month == rebuilt.month
      if !rebuiltHasSchedules, storedIsSameMonth, let calendarMonth, calendarMonth.days.contains(where: { $0.hasSchedule }) {
        return calendarMonth
      }
      return rebuilt
    }()
    let resolvedWeek = calendarPlans.map { buildCalendarWeek($0, at: date) } ?? (legacyPeriodChanged ? nil : calendarWeek)
    let resolvedToday: [ScheduleItem]? = {
      guard let calendarPlans else { return legacyPeriodChanged ? nil : todaySchedules }
      return Array(calendarPlans.filter { Calendar.current.isDate($0.scheduledAt, inSameDayAs: date) }.sorted { $0.scheduledAt < $1.scheduledAt }.prefix(8))
    }()
    let monthKey = monthKey(for: date)
    let resolvedGoal = goalMonths?[monthKey] ?? (goalMonths == nil && !legacyPeriodChanged ? goal : nil)
    let resolvedTodayCount = calendarPlans?.filter { Calendar.current.isDate($0.scheduledAt, inSameDayAs: date) }.count ?? todayScheduleCount
    return WidgetSnapshot(updatedAt: updatedAt, isPremium: isPremium, designCustomizePurchased: designCustomizePurchased, appearance: resolvedAppearance, widgetCustomizations: widgetCustomizations, displayOptions: displayOptions, currentTask: selected, currentTaskCandidates: currentTaskCandidates, todayNowTasks: remaining, todayNowTaskCount: hasCandidatePayload ? (ranked.count > 1 ? ranked.count - 1 : nil) : todayNowTaskCount, nextPlan: selectedPlan, nextPlans: nextPlans, calendarPlans: calendarPlans, calendarMonth: resolvedMonth, calendarWeek: resolvedWeek, todaySchedules: resolvedToday, todayScheduleCount: resolvedTodayCount, checklist: checklist, goal: resolvedGoal, goalMonths: goalMonths, widgetPhotoUnlock: widgetPhotoUnlock, affirmations: affirmations, affirmationPhotoFileNames: affirmationPhotoFileNames)
  }

  private func monthKey(for date: Date) -> String {
    let c = Calendar.current; return String(format: "%04d-%02d", c.component(.year, from: date), c.component(.month, from: date))
  }

  private func isoDay(_ date: Date) -> String {
    let f = DateFormatter(); f.calendar = Calendar.current; f.dateFormat = "yyyy-MM-dd"; return f.string(from: date)
  }

  private func buildCalendarMonth(_ plans: [ScheduleItem], at date: Date) -> CalendarMonth {
    let calendar = Calendar.current; let year = calendar.component(.year, from: date); let month = calendar.component(.month, from: date)
    let start = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? date
    let count = calendar.range(of: .day, in: .month, for: start)?.count ?? 30
    let counts = Dictionary(grouping: plans.filter { calendar.component(.year, from: $0.scheduledAt) == year && calendar.component(.month, from: $0.scheduledAt) == month }, by: { calendar.component(.day, from: $0.scheduledAt) })
    let days = (1...count).map { day -> MonthDay in
      let d = calendar.date(byAdding: .day, value: day - 1, to: start) ?? start; let items = counts[day] ?? []
      return MonthDay(date: isoDay(d), day: day, weekdayIndex: calendar.component(.weekday, from: d) - 1, hasSchedule: !items.isEmpty, scheduleCount: items.count, scheduleTitle: items.first?.title, isToday: calendar.isDate(d, inSameDayAs: date))
    }
    return CalendarMonth(year: year, month: month, leadingEmptyCount: calendar.component(.weekday, from: start) - 1, days: days)
  }

  private func buildCalendarWeek(_ plans: [ScheduleItem], at date: Date) -> CalendarWeek {
    let calendar = Calendar.current; let start = calendar.date(byAdding: .day, value: -(calendar.component(.weekday, from: date) - 1), to: calendar.startOfDay(for: date)) ?? date
    let days = (0..<7).map { offset -> WeekDay in
      let d = calendar.date(byAdding: .day, value: offset, to: start) ?? start
      let items = plans.filter { calendar.isDate($0.scheduledAt, inSameDayAs: d) }.sorted { $0.scheduledAt < $1.scheduledAt }.prefix(3)
      return WeekDay(date: isoDay(d), day: calendar.component(.day, from: d), weekday: ["日", "月", "火", "水", "木", "金", "土"][calendar.component(.weekday, from: d) - 1], isToday: calendar.isDate(d, inSameDayAs: date), schedules: Array(items))
    }
    return CalendarWeek(startDate: isoDay(start), days: days)
  }
}

struct RhythmWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
  let affirmationTextOverride: String?
  let affirmationPhotoFileNameOverride: String?
  let widgetKind: String?
  let isGallerySample: Bool

  init(date: Date, snapshot: WidgetSnapshot?, affirmationTextOverride: String? = nil, affirmationPhotoFileNameOverride: String? = nil, widgetKind: String? = nil, isGallerySample: Bool = false) {
    self.date = date
    self.snapshot = snapshot
    self.affirmationTextOverride = affirmationTextOverride
    self.affirmationPhotoFileNameOverride = affirmationPhotoFileNameOverride
    self.widgetKind = widgetKind
    self.isGallerySample = isGallerySample
  }
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetAppearanceValue: String, AppEnum {
  case unknown, mono, design, photo, appDefault
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Widget style"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .mono: "Mono", .design: "Design", .photo: "Photo", .appDefault: "アプリ設定を使用"]
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetDesignPatternValue: String, AppEnum {
  case unknown, dot, checkLavenderSatin, checkBeigeNoir, checkMauveFrame, clean, pinNote, ruledNote, vintageBloom, botanicalLine, sheerFloral, plain, appDefault, looseLeaf, heart
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Design pattern"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .dot: "ドット", .checkLavenderSatin: "チェック1", .checkBeigeNoir: "チェック2", .checkMauveFrame: "チェック3", .clean: "Plain", .pinNote: "Pin Note", .ruledNote: "Ruled Note", .vintageBloom: "花柄1", .botanicalLine: "花柄2", .sheerFloral: "花柄3", .plain: "無地", .appDefault: "アプリ設定を使用", .looseLeaf: "Loose Leaf", .heart: "ハート"]
}

/// AppIntent-facing design choices. The legacy enum above stays intact for
/// decoding old configurations, while this narrower enum keeps Mono-only
/// templates out of the Design edit sheet.
@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetDesignChoiceValue: String, AppEnum {
  case unknown, dot, checkLavenderSatin, checkBeigeNoir, checkMauveFrame, vintageBloom, botanicalLine, sheerFloral, heart, appDefault
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Design pattern"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .dot: "ドット", .checkLavenderSatin: "チェック1", .checkBeigeNoir: "チェック2", .checkMauveFrame: "チェック3", .vintageBloom: "花柄1", .botanicalLine: "花柄2", .sheerFloral: "花柄3", .heart: "ハート", .appDefault: "アプリ設定を使用"]
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetMonoTemplateValue: String, AppEnum {
  case unknown, plain, pinNote, ruledNote, looseLeaf, appDefault
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Mono template"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .plain: "Plain", .pinNote: "Pin Note", .ruledNote: "Ruled Note", .looseLeaf: "Loose Leaf", .appDefault: "アプリ設定を使用"]
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetDesignColorValue: String, AppEnum {
  case unknown, monochrome, cool, warm, green, orange, yellow, blue, lightBlue, pink, appDefault
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Design color"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .monochrome: "モノトーン", .cool: "寒色系", .warm: "赤系", .green: "緑系", .orange: "オレンジ", .yellow: "黄色", .blue: "青", .lightBlue: "水色", .pink: "ピンク", .appDefault: "アプリ設定を使用"]
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetPhotoLayoutValue: String, AppEnum {
  case unknown, background, right, top, card, circle, appDefault
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Photo layout"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .background: "全面背景", .right: "右側", .top: "上部", .card: "カード", .circle: "丸型", .appDefault: "アプリ設定を使用"]
}

@available(iOSApplicationExtension 17.0, *)
enum RhythmWidgetAffirmationModeValue: String, AppEnum {
  case unknown, fixed, automatic
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Affirmation rotation"
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [.unknown: "unknown", .fixed: "固定", .automatic: "自動切替"]
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmWidgetConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Widgetデザイン"
  static var description = IntentDescription("RhythmPace widget appearance")
  @Parameter(title: "スタイル") var appearance: RhythmWidgetAppearanceValue
  @Parameter(title: "柄") var designPattern: RhythmWidgetDesignChoiceValue
  @Parameter(title: "Mono Template") var monoTemplate: RhythmWidgetMonoTemplateValue
  @Parameter(title: "色") var designColor: RhythmWidgetDesignColorValue
  @Parameter(title: "写真レイアウト") var photoLayout: RhythmWidgetPhotoLayoutValue
  @Parameter(title: "アファメーション表示") var affirmationMode: RhythmWidgetAffirmationModeValue

  // iOS 17's parameter summaries let the system keep unrelated controls out
  // of the widget edit sheet.  The resolver still treats hidden values as
  // app defaults, preserving older saved configurations.
  static var parameterSummary: some ParameterSummary {
    When(\RhythmWidgetConfigurationAppIntent.$appearance, .equalTo, .mono) {
      Summary {
        \.$appearance
        \.$monoTemplate
        \.$affirmationMode
      }
    } otherwise: {
      When(\RhythmWidgetConfigurationAppIntent.$appearance, .equalTo, .design) {
        Summary {
          \.$appearance
          \.$designPattern
          \.$designColor
          \.$affirmationMode
        }
      } otherwise: {
        When(\RhythmWidgetConfigurationAppIntent.$appearance, .equalTo, .photo) {
          Summary {
            \.$appearance
            \.$designColor
            \.$photoLayout
            \.$affirmationMode
          }
        } otherwise: {
          Summary {
            \.$appearance
          }
        }
      }
    }
  }

  init() {
    appearance = .appDefault
    designPattern = .appDefault
    monoTemplate = .appDefault
    designColor = .appDefault
    photoLayout = .appDefault
    affirmationMode = .fixed
  }
}

typealias RhythmWidgetIntent = RhythmWidgetConfigurationAppIntent

/// Gallery-only content used to show the finished widget design before a user
/// has written any data. This is never returned from getTimeline, so sample
/// values cannot reach a widget installed on the Home Screen.
private func gallerySampleSnapshot(now: Date = Date()) -> WidgetSnapshot {
  var calendar = Calendar.current
  calendar.timeZone = .current
  let today = calendar.startOfDay(for: now)
  let isoDay: (Date) -> String = { date in
    let formatter = DateFormatter()
    formatter.calendar = calendar
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }
  let dateAt: (Date, Int, Int) -> Date = { date, hour, minute in
    calendar.date(bySettingHour: hour, minute: minute, second: 0, of: date) ?? date
  }
  let taskStart = dateAt(today, 15, 10)
  let nextSchedule = dateAt(today, 18, 0)
  let leaveAt = dateAt(today, 16, 18)
  let sampleSchedules: [(String, Int, Int, String)] = [
    ("朝の確認", 9, 0, ""),
    ("資料提出", 10, 30, ""),
    ("打ち合わせ", 15, 0, ""),
    ("18:00 予定", 18, 0, "駅前"),
  ]
  let todayItems = sampleSchedules.enumerated().map { index, item in
    WidgetSnapshot.ScheduleItem(
      id: "gallery-today-\(index)",
      title: item.0,
      scheduledAt: dateAt(today, item.1, item.2),
      location: item.3.isEmpty ? nil : item.3,
      allDay: false,
      leaveAt: nil
    )
  }
  let weekStart = calendar.date(byAdding: .day, value: 1 - calendar.component(.weekday, from: today), to: today) ?? today
  let weekDaySchedules: [Int: (String, Int, Int)] = [
    1: ("朝の確認", 9, 0),
    2: ("資料提出", 10, 30),
    3: ("打ち合わせ", 15, 0),
    5: ("18:00 予定", 18, 0),
  ]
  let weekDays = (0..<7).map { index in
    let date = calendar.date(byAdding: .day, value: index, to: weekStart) ?? weekStart
    let schedules: [WidgetSnapshot.ScheduleItem]
    if let item = weekDaySchedules[index] {
      schedules = [WidgetSnapshot.ScheduleItem(
        id: "gallery-week-\(index)",
        title: item.0,
        scheduledAt: dateAt(date, item.1, item.2),
        location: nil,
        allDay: false,
        leaveAt: nil
      )]
    } else {
      schedules = []
    }
    return WidgetSnapshot.WeekDay(
      date: isoDay(date),
      day: calendar.component(.day, from: date),
      weekday: ["日", "月", "火", "水", "木", "金", "土"][calendar.component(.weekday, from: date) - 1],
      isToday: calendar.isDate(date, inSameDayAs: today),
      schedules: schedules
    )
  }
  let monthComponents = calendar.dateComponents([.year, .month], from: today)
  let monthStart = calendar.date(from: monthComponents) ?? today
  let daysInMonth = calendar.range(of: .day, in: .month, for: monthStart) ?? (1..<32)
  // Keep calendar marks relative to the current month so the gallery does
  // not look like an old screenshot with permanently fixed dates.
  let monthDay = calendar.component(.day, from: today)
  let lastDay = daysInMonth.count
  let scheduledDays: Set<Int> = Set([0, 3, 8, 14].map { min(lastDay, monthDay + $0) })
  let monthDays = daysInMonth.map { day in
    let date = calendar.date(bySetting: .day, value: day, of: monthStart) ?? monthStart
    return WidgetSnapshot.MonthDay(
      date: isoDay(date),
      day: day,
      weekdayIndex: calendar.component(.weekday, from: date) - 1,
      hasSchedule: scheduledDays.contains(day),
      scheduleCount: scheduledDays.contains(day) ? 1 : 0,
      scheduleTitle: scheduledDays.contains(day) ? "予定" : nil,
      isToday: calendar.isDate(date, inSameDayAs: today)
    )
  }
  // The Widget gallery sample must be reproducible by a Free user. Keep the
  // sample data rich, but render it with the neutral Mono Plain treatment;
  // the installed-widget placeholder uses the same appearance below.
  let sampleAppearance = WidgetSnapshot.Appearance(style: .mono, monoTemplate: "clean", fontDesign: "default", accentHex: nil, photoFileName: nil, cutoutFileName: nil, photoLayout: nil, designPattern: nil, designCheckColor: nil, designPatternUnlocked: false, affirmationBackgrounds: nil)
  return WidgetSnapshot(
    updatedAt: now,
    isPremium: false,
    designCustomizePurchased: false,
    appearance: sampleAppearance,
    widgetCustomizations: nil,
    // Gallery keeps the task preview focused on the task itself; the timer
    // ring belongs to the live widget and is intentionally omitted here.
    displayOptions: ["remainingTime": false],
    currentTask: WidgetSnapshot.Task(id: "gallery-task", title: "今日のタスクを確認", startAt: taskStart, estimatedMinutes: 25, remainingMinutes: 25, status: "active", priority: "中", actionableAt: taskStart, deadlineAt: nil, createdAt: now.addingTimeInterval(-3600), scheduledDate: isoDay(today), optimisticCompletedAt: nil),
    currentTaskCandidates: nil,
    todayNowTasks: [
      WidgetSnapshot.Task(id: "gallery-task-2", title: "メールを確認", startAt: dateAt(today, 16, 0), estimatedMinutes: nil, remainingMinutes: nil, status: "active", priority: "低", actionableAt: dateAt(today, 16, 0), deadlineAt: nil, createdAt: now, scheduledDate: isoDay(today), optimisticCompletedAt: nil),
      WidgetSnapshot.Task(id: "gallery-task-3", title: "資料を送る", startAt: dateAt(today, 17, 0), estimatedMinutes: nil, remainingMinutes: nil, status: "active", priority: "中", actionableAt: dateAt(today, 17, 0), deadlineAt: nil, createdAt: now, scheduledDate: isoDay(today), optimisticCompletedAt: nil),
    ],
    todayNowTaskCount: 2,
    nextPlan: WidgetSnapshot.Plan(id: "gallery-plan", title: "18:00 予定", scheduledAt: nextSchedule, location: "駅前", allDay: false, leaveAt: leaveAt, remainingToLeave: 102, departureAt: leaveAt),
    nextPlans: nil,
    calendarPlans: nil,
    calendarMonth: WidgetSnapshot.CalendarMonth(year: monthComponents.year ?? calendar.component(.year, from: today), month: monthComponents.month ?? calendar.component(.month, from: today), leadingEmptyCount: calendar.component(.weekday, from: monthStart) - 1, days: monthDays),
    calendarWeek: WidgetSnapshot.CalendarWeek(startDate: isoDay(weekStart), days: weekDays),
    todaySchedules: todayItems,
    todayScheduleCount: todayItems.count,
    checklist: [
      WidgetSnapshot.ChecklistItem(id: "gallery-wallet", taskId: nil, listItemId: nil, title: "財布", done: true),
      WidgetSnapshot.ChecklistItem(id: "gallery-keys", taskId: nil, listItemId: nil, title: "鍵", done: false),
      WidgetSnapshot.ChecklistItem(id: "gallery-charger", taskId: nil, listItemId: nil, title: "充電器", done: false),
      WidgetSnapshot.ChecklistItem(id: "gallery-medicine", taskId: nil, listItemId: nil, title: "薬", done: false),
    ],
    goal: WidgetSnapshot.Goal(id: "gallery-goal", title: "旅行のために貯金", progress: 60, completedActions: 1, actionCount: 2),
    goalMonths: nil,
    widgetPhotoUnlock: nil,
    affirmations: [
      WidgetSnapshot.AffirmationItem(id: "gallery-affirmation-1", text: "私は私のペースで進めばいい"),
      WidgetSnapshot.AffirmationItem(id: "gallery-affirmation-2", text: "小さくても、今日も前に進んでいる"),
    ],
    affirmationPhotoFileNames: nil
  )
}

/// Automatic affirmation rotation uses four stable day-part slots. Keeping
/// this in one helper makes the provider and the rendered entry agree even
/// when WidgetKit recreates a timeline at a different time of day.
private func affirmationSlotIndex(for date: Date) -> Int {
  var calendar = Calendar.current
  calendar.timeZone = .current
  switch calendar.component(.hour, from: date) {
  case 7..<12: return 0
  case 12..<17: return 1
  case 17..<21: return 2
  default: return 3
  }
}

private func affirmationBoundaryDates(after date: Date, count: Int = 8) -> [Date] {
  var calendar = Calendar.current
  calendar.timeZone = .current
  let startOfDay = calendar.startOfDay(for: date)
  let boundaryHours = [7, 12, 17, 21]
  var boundaries: [Date] = []
  var dayOffset = 0
  while boundaries.count < count && dayOffset < 4 {
    guard let day = calendar.date(byAdding: .day, value: dayOffset, to: startOfDay) else {
      dayOffset += 1
      continue
    }
    for hour in boundaryHours {
      guard let boundary = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day), boundary > date else { continue }
      boundaries.append(boundary)
      if boundaries.count == count { break }
    }
    dayOffset += 1
  }
  return boundaries
}

@available(iOSApplicationExtension 17.0, *)
struct RhythmWidgetProvider: AppIntentTimelineProvider {
  typealias Entry = RhythmWidgetEntry
  typealias Intent = RhythmWidgetIntent
  let widgetKind: String?

  init(widgetKind: String? = nil) {
    self.widgetKind = widgetKind
  }

  func placeholder(in context: Context) -> RhythmWidgetEntry {
    // Placeholder is also used while an installed widget is being reloaded.
    // Keep it neutral so the gallery's finished cool+dot sample cannot flash
    // on the Home Screen between the old and new configured snapshots.
    RhythmWidgetEntry(date: .now, snapshot: gallerySampleSnapshot(), widgetKind: widgetKind, isGallerySample: true)
  }

  func snapshot(for configuration: RhythmWidgetIntent, in context: Context) async -> RhythmWidgetEntry {
    let isGallerySample = context.isPreview
    let snapshot = isGallerySample ? gallerySampleSnapshot() : loadSnapshot().map { applying(configuration, to: $0) }
    let now = Date()
    let resolved = snapshot?.resolved(at: now, kind: widgetKind)
    if widgetKind == "RhythmAffirmationWidget", configuration.affirmationMode == .automatic, let resolved, let affirmations = resolved.affirmations, !affirmations.isEmpty {
      let slotIndex = affirmationSlotIndex(for: now)
      let photoNames = resolved.affirmationPhotoFileNames ?? []
      let photo = photoNames.isEmpty ? nil : photoNames[slotIndex % photoNames.count]
      return RhythmWidgetEntry(date: now, snapshot: resolved, affirmationTextOverride: affirmations[slotIndex % affirmations.count].text, affirmationPhotoFileNameOverride: photo, widgetKind: widgetKind, isGallerySample: isGallerySample)
    }
    return RhythmWidgetEntry(date: now, snapshot: resolved, widgetKind: widgetKind, isGallerySample: isGallerySample)
  }

  func timeline(for configuration: RhythmWidgetIntent, in context: Context) async -> Timeline<RhythmWidgetEntry> {
    let now = Date()
    let snapshot = loadSnapshot().map { applying(configuration, to: $0) }
    if widgetKind == "RhythmAffirmationWidget", configuration.affirmationMode == .automatic, let snapshot, let affirmations = snapshot.affirmations, !affirmations.isEmpty {
      let photoNames = snapshot.affirmationPhotoFileNames ?? []
      let entryDates = [now] + affirmationBoundaryDates(after: now)
      let entries = entryDates.map { date -> RhythmWidgetEntry in
        let slotIndex = affirmationSlotIndex(for: date)
        let text = affirmations[slotIndex % affirmations.count].text
        let photo = photoNames.isEmpty ? nil : photoNames[slotIndex % photoNames.count]
        return RhythmWidgetEntry(date: date, snapshot: snapshot.resolved(at: date, kind: widgetKind), affirmationTextOverride: text, affirmationPhotoFileNameOverride: photo, widgetKind: widgetKind)
      }
      return Timeline(entries: entries, policy: .atEnd)
    }
    guard let snapshot else {
      return Timeline(entries: [RhythmWidgetEntry(date: now, snapshot: nil, widgetKind: widgetKind)], policy: .after(now.addingTimeInterval(30 * 60)))
    }
    let transitionDates = timelineTransitionDates(snapshot: snapshot, from: now)
    let dates = [now] + transitionDates
    let entries = dates.map { RhythmWidgetEntry(date: $0, snapshot: snapshot.resolved(at: $0, kind: widgetKind), widgetKind: widgetKind) }
    let refresh = transitionDates.last?.addingTimeInterval(60) ?? now.addingTimeInterval(30 * 60)
    return Timeline(entries: entries, policy: .after(refresh))
  }

  private func applying(_ configuration: RhythmWidgetIntent, to snapshot: WidgetSnapshot) -> WidgetSnapshot {
    guard let stored = snapshot.appearance else { return snapshot }
    let customizationKey: String? = {
      switch widgetKind {
      case "RhythmCurrentTaskWidget": return "current"
      case "RhythmNextScheduleWidget": return "next"
      case "RhythmWidget": return "combined"
      case "RhythmMonthlyCalendarWidget": return "monthly"
      case "RhythmWeeklyCalendarWidget": return "weekly"
      case "RhythmTodayScheduleWidget": return "today"
      case "RhythmChecklistWidget": return "checklist"
      case "RhythmGoalWidget": return "goal"
      case "RhythmVoiceWidget": return "voice"
      case "RhythmAffirmationWidget": return "affirmation"
      default: return nil
      }
    }()
    let customization = customizationKey.flatMap { snapshot.widgetCustomizations?[$0] }
    // IntentDefinition reserves index 0 for `unknown`. Treat it as a safe
    // default instead of allowing an unknown enum value to reach the view.
    let style: WidgetSnapshot.Style = {
      switch configuration.appearance {
      case .photo: return .photo
      case .design: return .color
      case .mono, .unknown: return .mono
      case .appDefault:
        // A per-widget photo selected in the app is an effective Photo style
        // when the installed widget follows the app default. An explicit
        // native Mono/Design/Photo selection below still wins.
        return customization?.photoFileName != nil ? .photo : stored.style
      @unknown default: return .mono
      }
    }()
    let pattern: String? = {
      // Design patterns are meaningful only for the Design appearance. Mono
      // uses the template value below, while Photo uses its layout and photo.
      guard style == .color, stored.designPatternUnlocked == true else { return nil }
      switch configuration.designPattern {
      // `floral` was the legacy standard-floral identifier. It is no longer
      // offered in the edit UI, but an older snapshot/configuration can still
      // carry it; keep that value rendering as Flower 1 instead of dropping
      // to an unrelated pattern.
      // An appDefault/unknown configuration must not manufacture a visible
      // Dot while an older or partially populated snapshot is being resolved.
      // Keep an explicitly stored pattern unchanged, but use the neutral
      // plain design when no pattern is available yet.
      case .unknown, .appDefault: return stored.designPattern ?? "plain"
      case .dot: return "dot"
      case .checkLavenderSatin: return "checkLavenderSatin"
      case .checkBeigeNoir: return "checkBeigeNoir"
      case .checkMauveFrame: return "checkMauveFrame"
      case .vintageBloom: return "floral"
      case .botanicalLine: return "floralSoft"
      case .sheerFloral: return "floralSeasonal"
      case .heart: return "heart"
      @unknown default: return stored.designPattern ?? "plain"
      }
    }()
    let layout: String? = {
      guard style == .photo else { return nil }
      switch configuration.photoLayout {
      case .unknown, .appDefault: return nil
      case .background: return "background"
      case .right: return "right"
      case .top: return "top"
      case .card: return "card"
      case .circle: return "circle"
      @unknown default: return "background"
      }
    }()
    let designCheckColor: String? = {
      guard style != .mono else { return nil }
      switch configuration.designColor {
      case .unknown, .appDefault: return nil
      case .monochrome: return "monochrome"
      case .cool: return "cool"
      case .warm: return "warm"
      case .green: return "green"
      case .orange: return "orange"
      case .yellow: return "yellow"
      case .blue: return "blue"
      case .lightBlue: return "lightBlue"
      case .pink: return "pink"
      @unknown default: return "monochrome"
      }
    }()
    // `appDefault`/unknown inherit the app's shared theme color carried in
    // the snapshot. An explicit native color remains a per-widget override.
    let resolvedDesignCheckColor: String? = {
      // Floral artwork is a finished, fixed-color design. Do not let the
      // per-widget theme color alter its background or content accent.
      if let pattern, ["floral", "floralSoft", "floralSeasonal", "floralDark"].contains(pattern) { return nil }
      return designCheckColor ?? stored.designCheckColor ?? "cool"
    }()
    let resolvedPhotoFileName = customization?.photoFileName ?? stored.photoFileName
    // An explicit native selection wins. The appDefault/unknown sentinel
    // falls through to the per-widget app setting, then the shared legacy
    // setting, and finally the safe background default.
    let resolvedPhotoLayout = style == .photo ? (layout ?? customization?.photoLayout ?? stored.photoLayout ?? "background") : nil
    let resolvedMonoTemplate: String? = {
      guard style == .mono else { return nil }
      switch configuration.monoTemplate {
      case .plain: return "clean"
      case .pinNote: return "pinNote"
      case .ruledNote: return "ruledNote"
      case .looseLeaf: return "looseLeaf"
      case .unknown, .appDefault:
        return customization?.monoTemplate ?? stored.monoTemplate ?? (stored.designPattern == "pinNote" || stored.designPattern == "ruledNote" ? stored.designPattern : nil)
      @unknown default: return customization?.monoTemplate ?? stored.monoTemplate ?? (stored.designPattern == "pinNote" || stored.designPattern == "ruledNote" ? stored.designPattern : nil)
      }
    }()
    let appearance = WidgetSnapshot.Appearance(style: style, monoTemplate: resolvedMonoTemplate, fontDesign: stored.fontDesign, accentHex: stored.accentHex, photoFileName: resolvedPhotoFileName, cutoutFileName: nil, photoLayout: resolvedPhotoLayout, designPattern: pattern, designCheckColor: resolvedDesignCheckColor, designPatternUnlocked: stored.designPatternUnlocked, affirmationBackgrounds: stored.affirmationBackgrounds)
    return WidgetSnapshot(updatedAt: snapshot.updatedAt, isPremium: snapshot.isPremium, designCustomizePurchased: snapshot.designCustomizePurchased, appearance: appearance, widgetCustomizations: snapshot.widgetCustomizations, displayOptions: snapshot.displayOptions, currentTask: snapshot.currentTask, currentTaskCandidates: snapshot.currentTaskCandidates, todayNowTasks: snapshot.todayNowTasks, todayNowTaskCount: snapshot.todayNowTaskCount, nextPlan: snapshot.nextPlan, nextPlans: snapshot.nextPlans, calendarPlans: snapshot.calendarPlans, calendarMonth: snapshot.calendarMonth, calendarWeek: snapshot.calendarWeek, todaySchedules: snapshot.todaySchedules, todayScheduleCount: snapshot.todayScheduleCount, checklist: snapshot.checklist, goal: snapshot.goal, goalMonths: snapshot.goalMonths, widgetPhotoUnlock: snapshot.widgetPhotoUnlock, affirmations: snapshot.affirmations, affirmationPhotoFileNames: snapshot.affirmationPhotoFileNames)
  }

  private func loadSnapshot() -> WidgetSnapshot? {
    guard let text = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey), let data = text.data(using: .utf8) else {
      return nil
    }
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let value = try container.decode(String.self)
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = formatter.date(from: value) {
        return date
      }
      // Older snapshots and a few native producers omit fractional seconds.
      // Accept both ISO-8601 forms so one legacy date cannot invalidate the
      // entire Codable snapshot.
      formatter.formatOptions = [.withInternetDateTime]
      if let date = formatter.date(from: value) {
        return date
      }
      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid widget snapshot date")
    }
    return try? decoder.decode(WidgetSnapshot.self, from: data)
  }

  private func timelineTransitionDates(snapshot: WidgetSnapshot, from now: Date) -> [Date] {
    // Calendar/month transitions can be several weeks away; keep the source
    // bounded while still scheduling the next meaningful boundary.
    let horizon = now.addingTimeInterval(40 * 24 * 60 * 60)
    let calendar = Calendar.current
    let taskDates = (snapshot.currentTaskCandidates ?? []).flatMap { task -> [Date] in
      var dates = [task.startAt, task.actionableAt, task.deadlineAt].compactMap { $0 }
      if let start = task.startAt {
        let dayStart = calendar.startOfDay(for: start)
        if dayStart > now { dates.append(dayStart) }
      }
      return dates
    }
    let planDates = (snapshot.nextPlans ?? []).flatMap { [$0.scheduledAt, $0.leaveAt ?? $0.departureAt] }.compactMap { $0 }
    var boundaryDates: [Date] = []
    let startOfToday = calendar.startOfDay(for: now)
    if let tomorrow = calendar.date(byAdding: .day, value: 1, to: startOfToday) { boundaryDates.append(tomorrow) }
    if let nextWeek = calendar.date(byAdding: .day, value: 8 - calendar.component(.weekday, from: now), to: startOfToday) { boundaryDates.append(nextWeek) }
    if let nextMonth = calendar.date(from: DateComponents(year: calendar.component(.year, from: now), month: calendar.component(.month, from: now) + 1, day: 1)) { boundaryDates.append(nextMonth) }
    let optimisticDates = (snapshot.currentTaskCandidates ?? []).compactMap { $0.optimisticCompletedAt?.addingTimeInterval(1.3) }
    let unlockDates = [snapshot.widgetPhotoUnlock?.expiresAt].compactMap { $0 }
    let unique = Set((taskDates + planDates + boundaryDates + optimisticDates + unlockDates).filter { $0 > now && $0 <= horizon }.map { Int($0.timeIntervalSince1970) })
    return unique.sorted().map { Date(timeIntervalSince1970: TimeInterval($0)) }
  }
}

private struct WidgetPalette {
  let foreground: Color
  let secondary: Color
  let accent: Color
  let background: Color
  let divider: Color
  let monoTemplate: String?
  let designPattern: String?
  let designCheckColor: String?

  static func forAppearance(_ appearance: WidgetSnapshot.Appearance?) -> WidgetPalette {
    let style = appearance?.style ?? .mono
    let colors = DesignPatternColors(checkColor: appearance?.designCheckColor)
    let accent = colors.accent
    // Stored photo filenames remain available for Photo -> Mono -> Photo
    // round-trips, but only the effective Photo style may render them.
    let photoAvailable = style == .photo && (appearance?.photoFileName.map { loadWidgetPhoto($0) != nil } ?? false)
    let photoBackground = style == .photo && appearance?.photoLayout == "background" && photoAvailable
    if photoBackground {
      return WidgetPalette(foreground: .white, secondary: .white.opacity(0.82), accent: accent, background: colors.background, divider: colors.background.opacity(0.34), monoTemplate: nil, designPattern: nil, designCheckColor: appearance?.designCheckColor)
    }
    switch style {
    case .mono:
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: Color.primary, background: Color(uiColor: .systemBackground), divider: Color.primary.opacity(0.12), monoTemplate: appearance?.monoTemplate, designPattern: nil, designCheckColor: nil)
    case .color:
      let pattern = appearance?.designPattern
      let background = pattern.map { colors.background(for: $0) } ?? colors.background
      let patternAccent = pattern.map { colors.accent(for: $0) } ?? accent
      let patternIsFloral = pattern.map { colors.isFloral($0) } ?? false
      return WidgetPalette(foreground: Color(hex: "302D33"), secondary: Color(hex: "6E6872"), accent: patternAccent, background: background, divider: patternAccent.opacity(0.28), monoTemplate: nil, designPattern: pattern, designCheckColor: patternIsFloral ? nil : appearance?.designCheckColor)
    case .photo:
      // The photo layer is applied by WidgetSurface. Keep a readable Mono
      // palette underneath it so missing or stale images fall back safely.
      return WidgetPalette(foreground: photoBackground ? .white : Color(hex: "302D33"), secondary: photoBackground ? .white.opacity(0.78) : Color(hex: "6E6872"), accent: accent, background: colors.background, divider: photoBackground ? .white.opacity(0.3) : accent.opacity(0.28), monoTemplate: appearance?.monoTemplate, designPattern: nil, designCheckColor: appearance?.designCheckColor)
    }
  }
}

private struct DesignPatternColors {
  let background: Color
  let stripe: Color
  let accent: Color

  init(checkColor: String?) {
    switch checkColor {
    case "monochrome":
      background = Color(hex: "F4F1EE"); stripe = Color(hex: "D8D3D6"); accent = Color(hex: "343237")
    case "cool":
      background = Color(hex: "F4F3FA"); stripe = Color(hex: "D8D6EA"); accent = Color(hex: "8278B8")
    case "warm":
      background = Color(hex: "FCF0F0"); stripe = Color(hex: "E9C4C4"); accent = Color(hex: "B85D5D")
    case "green":
      background = Color(hex: "F0F7F2"); stripe = Color(hex: "C9DDCE"); accent = Color(hex: "5F8A6D")
    case "orange":
      background = Color(hex: "FCF1E7"); stripe = Color(hex: "EAC8AA"); accent = Color(hex: "B8774C")
    case "yellow":
      background = Color(hex: "FFF9D9"); stripe = Color(hex: "F0DE82"); accent = Color(hex: "A48616")
    case "blue":
      background = Color(hex: "EEF3FC"); stripe = Color(hex: "C4D4ED"); accent = Color(hex: "5577AE")
    case "lightBlue":
      background = Color(hex: "EAF9FE"); stripe = Color(hex: "BCE7F2"); accent = Color(hex: "3F91AA")
    case "pink":
      background = Color(hex: "FCF0F5"); stripe = Color(hex: "E8C4D3"); accent = Color(hex: "A65E79")
    default:
      background = Color(hex: "F4F3FA"); stripe = Color(hex: "D8D6EA"); accent = Color(hex: "8278B8")
    }
  }

  func background(for pattern: String) -> Color {
    switch pattern {
    // Floral PNGs are finished artwork. Their transparent pixels use the
    // same fixed neutral paper tones as the existing app floral palettes,
    // never the user's nine-colour theme.
    case "floral": return Color(hex: "F8F1EC")
    case "floralSoft": return Color(hex: "FBFAF7")
    case "floralSeasonal", "floralDark": return Color(hex: "FCF3F5")
    case "plain": return background
    default: return background
    }
  }

  func isFloral(_ pattern: String) -> Bool {
    pattern == "floral" || pattern == "floralSoft" || pattern == "floralSeasonal" || pattern == "floralDark"
  }

  func accent(for pattern: String) -> Color {
    switch pattern {
    case "floral": return Color(hex: "B78382")
    case "floralSoft": return Color(hex: "9A8877")
    case "floralSeasonal", "floralDark": return Color(hex: "C17E99")
    default: return accent
    }
  }
}

private func loadWidgetPhoto(_ fileName: String?) -> Image? {
  guard let fileName, !fileName.isEmpty, fileName == URL(fileURLWithPath: fileName).lastPathComponent,
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
    return nil
  }
  let url = container.appendingPathComponent(fileName)
  guard let image = UIImage(contentsOfFile: url.path) else {
    return nil
  }
  return Image(uiImage: image)
}

private struct WidgetHeartMark {
  let x: CGFloat
  let y: CGFloat
  let size: CGFloat
  let filled: Bool
  let rotation: Double
}

// A small deterministic scatter keeps the Widget recognisably heart-themed
// without introducing random layout changes between timeline renders.
private let widgetHeartMarks: [WidgetHeartMark] = [
  WidgetHeartMark(x: 0.08, y: 0.08, size: 14, filled: true, rotation: -10),
  WidgetHeartMark(x: 0.27, y: 0.06, size: 9, filled: false, rotation: 8),
  WidgetHeartMark(x: 0.48, y: 0.12, size: 18, filled: true, rotation: -8),
  WidgetHeartMark(x: 0.73, y: 0.07, size: 10, filled: false, rotation: 10),
  WidgetHeartMark(x: 0.91, y: 0.15, size: 16, filled: true, rotation: 8),
  WidgetHeartMark(x: 0.16, y: 0.28, size: 11, filled: false, rotation: -8),
  WidgetHeartMark(x: 0.39, y: 0.24, size: 13, filled: true, rotation: 7),
  WidgetHeartMark(x: 0.64, y: 0.31, size: 9, filled: true, rotation: -6),
  WidgetHeartMark(x: 0.84, y: 0.27, size: 19, filled: false, rotation: 9),
  WidgetHeartMark(x: 0.06, y: 0.52, size: 17, filled: true, rotation: 8),
  WidgetHeartMark(x: 0.29, y: 0.56, size: 10, filled: false, rotation: -9),
  WidgetHeartMark(x: 0.55, y: 0.50, size: 14, filled: true, rotation: 6),
  WidgetHeartMark(x: 0.77, y: 0.58, size: 11, filled: false, rotation: -8),
  WidgetHeartMark(x: 0.95, y: 0.52, size: 17, filled: true, rotation: 10),
  WidgetHeartMark(x: 0.13, y: 0.79, size: 12, filled: false, rotation: -7),
  WidgetHeartMark(x: 0.38, y: 0.84, size: 18, filled: true, rotation: 8),
  WidgetHeartMark(x: 0.63, y: 0.78, size: 10, filled: true, rotation: -10),
  WidgetHeartMark(x: 0.87, y: 0.86, size: 15, filled: false, rotation: 7),
]

private struct WidgetHeartConfetti {
  let x: CGFloat
  let y: CGFloat
  let rotation: Double
}

private let widgetHeartConfetti: [WidgetHeartConfetti] = [
  WidgetHeartConfetti(x: 0.18, y: 0.17, rotation: 24),
  WidgetHeartConfetti(x: 0.58, y: 0.06, rotation: -20),
  WidgetHeartConfetti(x: 0.93, y: 0.34, rotation: 18),
  WidgetHeartConfetti(x: 0.32, y: 0.39, rotation: -26),
  WidgetHeartConfetti(x: 0.72, y: 0.43, rotation: 22),
  WidgetHeartConfetti(x: 0.08, y: 0.66, rotation: -18),
  WidgetHeartConfetti(x: 0.52, y: 0.72, rotation: 16),
  WidgetHeartConfetti(x: 0.91, y: 0.76, rotation: -24),
]

private let widgetHeartDots: [(x: CGFloat, y: CGFloat, size: CGFloat)] = [
  (0.12, 0.11, 3), (0.37, 0.18, 2.5), (0.79, 0.18, 3),
  (0.24, 0.48, 2.5), (0.47, 0.35, 3), (0.69, 0.64, 2.5),
  (0.36, 0.74, 3), (0.82, 0.91, 2.5),
]

/// Family-specific generated floral PNGs are transparent overlays. Keeping
/// the filename mapping here means replacing the artwork never requires a
/// Swift source change; missing artwork safely leaves the fixed floral paper
/// background visible.
private struct DesignPatternLayer: View {
  let pattern: String
  let colors: DesignPatternColors
  @Environment(\.widgetFamily) private var family

  private var floralResourceName: String? {
    widgetFloralResourceName(pattern: pattern, family: family)
  }

  @ViewBuilder
  var body: some View {
    GeometryReader { proxy in
      switch pattern {
      case "dot":
        let columns = max(1, Int(ceil(proxy.size.width / 25)) + 1)
        let rows = max(1, Int(ceil(proxy.size.height / 22)) + 1)
        ZStack(alignment: .topLeading) {
          ForEach(0..<(columns * rows), id: \.self) { index in
            let row = index / columns
            let column = index % columns
            let size: CGFloat = index % 3 == 0 ? 6 : index % 2 == 0 ? 4 : 3
            Circle()
              .fill((index % 2 == 0 ? colors.accent : colors.stripe).opacity(0.50))
              .frame(width: size, height: size)
              .offset(x: 4 + CGFloat(column) * 25 + (row % 2 == 1 ? 12.5 : 0), y: 5 + CGFloat(row) * 22)
          }
         }
       case "heart":
         ZStack {
           ForEach(Array(widgetHeartMarks.enumerated()), id: \.offset) { _, mark in
             Text(mark.filled ? "♥" : "♡")
               .font(.system(size: mark.size, weight: .regular))
               .foregroundStyle(colors.accent.opacity(mark.filled ? 0.38 : 0.28))
               .rotationEffect(.degrees(mark.rotation))
               .position(x: proxy.size.width * mark.x, y: proxy.size.height * mark.y)
           }
           ForEach(Array(widgetHeartConfetti.enumerated()), id: \.offset) { _, mark in
             RoundedRectangle(cornerRadius: 1, style: .continuous)
               .fill(colors.stripe.opacity(0.34))
               .frame(width: 4, height: 10)
               .rotationEffect(.degrees(mark.rotation))
               .position(x: proxy.size.width * mark.x, y: proxy.size.height * mark.y)
           }
           ForEach(Array(widgetHeartDots.enumerated()), id: \.offset) { _, mark in
             Circle()
               .fill(colors.accent.opacity(0.30))
               .frame(width: mark.size, height: mark.size)
               .position(x: proxy.size.width * mark.x, y: proxy.size.height * mark.y)
           }
         }
       case "checkLavenderSatin", "checkBeigeNoir", "checkMauveFrame":
        let cell: CGFloat = pattern == "checkLavenderSatin" ? 32 : pattern == "checkBeigeNoir" ? 14 : 22
        let band = cell * 0.36
        let countX = max(1, Int(ceil(proxy.size.width / cell)) + 2)
        let countY = max(1, Int(ceil(proxy.size.height / cell)) + 2)
        ZStack(alignment: .topLeading) {
          ForEach(0..<countX, id: \.self) { index in
            Rectangle().fill(colors.stripe.opacity(0.34)).frame(width: band, height: proxy.size.height).offset(x: CGFloat(index) * cell + (cell - band) / 2)
          }
          ForEach(0..<countY, id: \.self) { index in
            Rectangle().fill(colors.stripe.opacity(0.30)).frame(width: proxy.size.width, height: band).offset(y: CGFloat(index) * cell + (cell - band) / 2)
          }
          ForEach(0..<(countX * countY), id: \.self) { index in
            let column = index % countX
            let row = index / countX
            Rectangle().fill(colors.stripe.opacity(0.46)).frame(width: band, height: band).offset(x: CGFloat(column) * cell + (cell - band) / 2, y: CGFloat(row) * cell + (cell - band) / 2)
          }
        }
      case "floral", "floralSoft", "floralSeasonal", "floralDark":
        if let resourceName = floralResourceName, let image = loadBundledFloralImage(resourceName) {
          image.resizable().scaledToFit().frame(width: proxy.size.width, height: proxy.size.height)
        } else {
          // PNG artwork is optional until the final asset bundle is supplied;
          // never resurrect legacy JPG or procedural floral rendering.
          Color.clear
        }
      case "pinNote":
        Circle().fill(colors.accent.opacity(0.75)).frame(width: 9, height: 9).position(x: proxy.size.width * 0.5, y: 8)
      case "ruledNote":
        ForEach(1..<max(2, Int(proxy.size.height / 22)), id: \.self) { index in
          Rectangle().fill(colors.stripe.opacity(0.45)).frame(width: proxy.size.width, height: 1).offset(y: CGFloat(index) * 22)
        }
      case "clean":
        Color.clear
      default:
        Color.clear
      }
    }
    .allowsHitTesting(false)
  }
}

private func loadBundledFloralImage(_ resourceName: String) -> Image? {
  guard let url = Bundle.main.url(forResource: resourceName, withExtension: "png"),
       let image = UIImage(contentsOfFile: url.path) else {
    return nil
  }
  return Image(uiImage: image)
}

private func widgetFloralResourceName(pattern: String, family: WidgetFamily) -> String? {
  let suffix: String
  switch family {
  case .systemSmall: suffix = "small"
  case .systemMedium: suffix = "medium"
  case .systemLarge: suffix = "large"
  @unknown default: suffix = "medium"
  }
  switch pattern {
  case "floral": return "widget-floral1-\(suffix)"
  case "floralSoft": return "widget-floral2-\(suffix)"
  case "floralSeasonal", "floralDark": return "widget-floral3-\(suffix)"
  default: return nil
  }
}

/// A small corner ribbon shared by the existing check/dot treatments. It is
/// decorative only, stays outside the text's leading area, and scales with
/// the widget family instead of becoming a separate theme.
private struct DesignRibbonLayer: View {
  let color: Color
  @Environment(\.widgetFamily) private var family

  var body: some View {
    GeometryReader { proxy in
      let width: CGFloat = family == .systemSmall ? 38 : family == .systemLarge ? 64 : 50
      RoundedRectangle(cornerRadius: 2, style: .continuous)
        .fill(color.opacity(0.78))
        .frame(width: width, height: 10)
        .rotationEffect(.degrees(32))
        .position(x: proxy.size.width - width * 0.52, y: max(8, min(14, proxy.size.height * 0.12)))
    }
    .allowsHitTesting(false)
  }
}

private struct WidgetSurface<Content: View>: View {
  let palette: WidgetPalette
  let appearance: WidgetSnapshot.Appearance?
  let widgetKind: String?
  let content: Content
  @Environment(\.widgetFamily) private var family

  init(palette: WidgetPalette, appearance: WidgetSnapshot.Appearance?, widgetKind: String? = nil, @ViewBuilder content: () -> Content) {
    self.palette = palette
    self.appearance = appearance
    self.widgetKind = widgetKind
    self.content = content()
  }

  @ViewBuilder
  private func photoLayer(_ image: Image, layout: String, size: CGSize, palette: WidgetPalette) -> some View {
    let isMonthly = widgetKind == "RhythmMonthlyCalendarWidget"
    switch layout {
    case "right", "side":
      if isMonthly {
        image.resizable().scaledToFill()
          .frame(width: size.width * 0.22, height: size.height * 0.22)
          .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
          .padding(8)
      } else {
        HStack(spacing: 0) {
          Spacer(minLength: 0)
          image.resizable().scaledToFill().frame(width: size.width * (family == .systemSmall ? 0.22 : family == .systemLarge ? 0.26 : 0.24), height: size.height).clipped()
        }
      }
    case "top":
      VStack(spacing: 0) {
        image.resizable().scaledToFill().frame(width: size.width, height: size.height * (isMonthly ? 0.16 : family == .systemLarge ? 0.30 : 0.36)).clipped()
        Spacer(minLength: 0)
      }
    case "card":
      let widthFraction: CGFloat = isMonthly ? 0.22 : family == .systemSmall ? 0.28 : family == .systemLarge ? 0.34 : 0.32
      let heightFraction: CGFloat = isMonthly ? 0.18 : family == .systemSmall ? 0.28 : family == .systemLarge ? 0.30 : 0.28
      image.resizable().scaledToFill()
        .frame(width: min(size.width * widthFraction, family == .systemLarge ? 210 : 120), height: min(size.height * heightFraction, family == .systemLarge ? 150 : 78))
        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).stroke(Color.white.opacity(0.9), lineWidth: 4))
        .shadow(color: .black.opacity(0.18), radius: 5, y: 2)
        .rotationEffect(.degrees(2))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding(10)
    case "circle":
      let fraction: CGFloat = isMonthly ? 0.16 : family == .systemSmall ? 0.22 : family == .systemLarge ? 0.23 : 0.20
      let cap: CGFloat = isMonthly ? 82 : family == .systemSmall ? 48 : family == .systemLarge ? 120 : 64
      let circleSize = min(size.width * fraction, cap)
      image.resizable().scaledToFill()
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.white.opacity(0.95), lineWidth: 3))
        .shadow(color: .black.opacity(0.18), radius: 4, y: 2)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding(11)
    default:
      ZStack {
        image.resizable().scaledToFill().frame(width: size.width, height: size.height).clipped()
        LinearGradient(colors: [palette.background.opacity(0.18), Color.clear, palette.background.opacity(0.14)], startPoint: .topLeading, endPoint: .bottomTrailing)
      }
    }
  }

  var body: some View {
    GeometryReader { proxy in
      // Old snapshots can carry the retired `cutout` layout. Render the
      // original saved photo as a normal background instead of keeping a
      // second derived image path alive.
      let configuredPhotoLayout = appearance?.photoLayout == "cutout" ? "background" : (appearance?.photoLayout ?? "background")
      // A stored photo is data, not a rendering mode. Only Photo may display
      // it; Mono and Design must remain their own visual treatments.
      let photo = appearance?.style == .photo ? loadWidgetPhoto(appearance?.photoFileName) : nil
      let photoLayout = configuredPhotoLayout
      ZStack {
        palette.background
        if let monoTemplate = palette.monoTemplate,
           (appearance?.style == .mono || (appearance?.style == .photo && appearance?.photoLayout != "background")) {
          MonoTemplateLayer(template: monoTemplate, line: palette.divider, accent: palette.accent)
        }
        if palette.designPattern != nil, palette.designPattern != "plain", let pattern = palette.designPattern {
          DesignPatternLayer(pattern: pattern, colors: DesignPatternColors(checkColor: palette.designCheckColor))
          if pattern == "dot" || pattern == "checkLavenderSatin" || pattern == "checkBeigeNoir" || pattern == "checkMauveFrame" {
            DesignRibbonLayer(color: palette.accent)
          }
        }
        if let photo = photo {
          photoLayer(photo, layout: photoLayout, size: proxy.size, palette: palette)
        }
        content
          .fontDesign(widgetFontDesign(appearance?.fontDesign))
          .padding(family == .systemSmall ? 8 : family == .systemLarge ? 12 : 10)
          .padding(.top, photo != nil && photoLayout == "top" ? proxy.size.height * (widgetKind == "RhythmMonthlyCalendarWidget" ? 0.14 : family == .systemLarge ? 0.23 : 0.27) : 0)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .background(photo != nil && photoLayout == "background" ? palette.background.opacity(0.12) : Color.clear)
      }
      .clipped()
    }
    .rhythmWidgetBackground(palette.background)
  }
}

private func widgetFontDesign(_ raw: String?) -> Font.Design {
  switch raw {
  case "rounded": return .rounded
  case "serif": return .serif
  case "monospaced": return .monospaced
  default: return .default
  }
}

/// Lightweight Mono paper treatments. They are drawn with basic SwiftUI
/// primitives so the widget keeps its simple, native rendering path.
private struct MonoTemplateLayer: View {
  let template: String
  let line: Color
  let accent: Color

  var body: some View {
    GeometryReader { proxy in
      ZStack(alignment: .topLeading) {
        if template == "looseLeaf" {
          // Subtle paper rules and binder holes keep the Mono information
          // layout unchanged while adding only the requested loose-leaf cue.
          ForEach(1..<max(2, Int(proxy.size.height / 22)), id: \.self) { index in
            Rectangle()
              .fill(line.opacity(0.32))
              .frame(width: proxy.size.width, height: 1)
              .offset(y: CGFloat(index) * 22)
          }
          Rectangle()
            .fill(line.opacity(0.20))
            .frame(width: 1, height: proxy.size.height)
            .offset(x: min(24, proxy.size.width * 0.14))
          ForEach(1..<max(2, Int(proxy.size.height / 34)), id: \.self) { index in
            Circle()
              .fill(Color.white.opacity(0.92))
              .overlay(Circle().stroke(line.opacity(0.28), lineWidth: 0.7))
              .frame(width: 7, height: 7)
              .offset(x: 5, y: CGFloat(index) * 34 + 4)
          }
        } else if template == "ruledNote" {
          ForEach(1..<max(2, Int(proxy.size.height / 22)), id: \.self) { index in
            Rectangle()
              .fill(line.opacity(0.55))
              .frame(width: proxy.size.width, height: 1)
              .offset(y: CGFloat(index) * 22)
          }
          Rectangle()
            .fill(accent.opacity(0.16))
            .frame(width: 1.5, height: proxy.size.height)
            .offset(x: min(22, proxy.size.width * 0.12))
        } else if template == "pinNote" {
          Circle()
            .fill(accent.opacity(0.82))
            .frame(width: 10, height: 10)
            .overlay(Circle().stroke(Color.white.opacity(0.75), lineWidth: 1))
            .shadow(color: .black.opacity(0.18), radius: 2, y: 1)
            .position(x: proxy.size.width * 0.5, y: 8)
        }
      }
    }
    .allowsHitTesting(false)
  }
}

private func widgetStatusText(_ status: String) -> String {
  switch status {
  case "active": return "進行中"
  case "completed", "done": return "完了"
  case "skipped": return "スキップ"
  default: return status
  }
}

private func widgetTaskIsCompleted(_ task: WidgetSnapshot.Task) -> Bool {
  guard let status = task.status?.lowercased() else { return false }
  return status == "completed" || status == "done"
}

private func timerRingDiameter(for appearance: WidgetSnapshot.Appearance?, family: WidgetFamily) -> CGFloat {
  guard appearance?.style != .color,
        let layout = appearance?.photoLayout else { return 68 }
  switch layout {
  case "right", "side", "card", "circle":
    return family == .systemSmall ? 50 : family == .systemLarge ? 60 : 54
  default: return 68
  }
}

private func shouldShowTimerRing(snapshot: WidgetSnapshot, task: WidgetSnapshot.Task) -> Bool {
  snapshot.isDisplayOptionEnabled("remainingTime")
    && (task.estimatedMinutes ?? 0) > 0
    && task.remainingMinutes != nil
}

struct RhythmWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, snapshot.currentTask != nil || snapshot.nextPlan != nil {
        let currentAvailable = snapshot.currentTask != nil
        let nextAvailable = snapshot.nextPlan != nil
        let currentEnabled = snapshot.isDisplayOptionEnabled("currentTask")
        let nextEnabled = snapshot.isDisplayOptionEnabled("nextPlan")
        // A malformed payload must not result in an empty combined widget.
        // Prefer the current task, then the next plan, when the selected
        // section is unavailable or both sections are explicitly disabled.
        let preferredCurrent = currentAvailable && currentEnabled
        let preferredNext = nextAvailable && nextEnabled
        let noPreferredSection = !preferredCurrent && !preferredNext
        let showCurrent = preferredCurrent || (noPreferredSection && currentAvailable)
          let showNext = preferredNext || (noPreferredSection && !currentAvailable && nextAvailable)
          VStack(alignment: .leading, spacing: 8) {
          Text("RhythmPace")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          if showCurrent, let task = snapshot.currentTask {
            HStack(alignment: .center, spacing: 8) {
              TaskCompletionButton(taskId: task.id, palette: palette, completed: widgetTaskIsCompleted(task))
              Link(destination: URL(string: "rhythm://todo")!) {
                HStack(alignment: .center, spacing: 8) {
                  WidgetTaskRow(task: task, palette: palette)
                  Spacer(minLength: 4)
                  if shouldShowTimerRing(snapshot: snapshot, task: task) { TaskTimerRing(task: task, palette: palette, diameter: timerRingDiameter(for: snapshot.appearance, family: family)) }
                }
              }
            }
          } else if showCurrent {
            WidgetRow(label: "今日のTODO", value: "予定なし", palette: palette)
          }
          if showCurrent && showNext {
            Divider().overlay(palette.divider)
          }
          if showNext, let plan = snapshot.nextPlan {
            Link(destination: URL(string: "rhythm://schedule")!) {
              WidgetPlanRow(
                plan: plan,
                palette: palette,
                showDeparture: snapshot.isDisplayOptionEnabled("combinedRemainingToLeave")
              )
            }
          } else if showNext {
            WidgetRow(label: "次の予定", value: "ありません", palette: palette)
          }
        }
      } else {
        VStack(alignment: .leading, spacing: 8) {
          Text("RhythmPace")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          Text("今日はゆっくりで大丈夫")
            .font(.subheadline)
            .foregroundStyle(palette.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct CurrentTaskWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, let task = snapshot.currentTask {
        if family == .systemMedium {
          VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .center, spacing: 8) {
              TaskCompletionButton(taskId: task.id, palette: palette, completed: widgetTaskIsCompleted(task))
              Link(destination: URL(string: "rhythm://todo")!) {
                HStack(alignment: .center, spacing: 10) {
                  TaskInformation(task: task, snapshot: snapshot, palette: palette)
                    .layoutPriority(2)
                  Spacer(minLength: 4)
                  if shouldShowTimerRing(snapshot: snapshot, task: task) { TaskTimerRing(task: task, palette: palette, diameter: timerRingDiameter(for: snapshot.appearance, family: family)).layoutPriority(0) }
                }
              }
            }
            if let more = snapshot.todayNowTasks, !more.isEmpty {
              Divider().overlay(palette.divider)
              ForEach(Array(more.prefix(3)), id: \.id) { item in
                let completed = widgetTaskIsCompleted(item)
                HStack(spacing: 6) {
                  TaskCompletionButton(taskId: item.id, palette: palette, completed: completed)
                  Link(destination: URL(string: "rhythm://todo")!) {
                    Text(item.title).strikethrough(completed, color: palette.secondary).font(.caption).foregroundStyle(palette.foreground).lineLimit(1).opacity(completed ? 0.52 : 1)
                    Spacer(minLength: 2)
                    if let startAt = item.startAt { Text(startAt, style: .time).font(.caption2).foregroundStyle(palette.secondary).opacity(completed ? 0.52 : 1) }
                  }
                }
              }
              let displayedCount = min(3, more.count)
              let remainingCount = max(0, (snapshot.todayNowTaskCount ?? more.count) - displayedCount)
              if remainingCount > 0 {
                Text("ほか\(remainingCount)件")
                  .font(.caption.weight(.medium))
                  .foregroundStyle(palette.secondary)
              }
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        } else {
          let completed = widgetTaskIsCompleted(task)
          let sectionFont: Font = family == .systemLarge ? .headline.weight(.semibold) : .caption.weight(.semibold)
          let titleFont: Font = family == .systemLarge ? .title2.weight(.semibold) : .title3.weight(.semibold)
          HStack(alignment: .top, spacing: 6) {
            TaskCompletionButton(taskId: task.id, palette: palette, completed: widgetTaskIsCompleted(task))
            Link(destination: URL(string: "rhythm://todo")!) {
              VStack(alignment: .leading, spacing: 7) {
              Text("今日のTODO").font(sectionFont).foregroundStyle(palette.accent)
              Text(task.title).strikethrough(completed, color: palette.secondary).font(titleFont).foregroundStyle(palette.foreground).lineLimit(3).opacity(completed ? 0.52 : 1)
              if shouldShowTimerRing(snapshot: snapshot, task: task) { TaskTimerRing(task: task, palette: palette, diameter: timerRingDiameter(for: snapshot.appearance, family: family)).frame(maxWidth: .infinity, alignment: .center) }
              if snapshot.isDisplayOptionEnabled("startTime"), let startAt = task.startAt { Text(startAt.formatted(date: .omitted, time: .shortened)).font(family == .systemLarge ? .subheadline : .caption2).foregroundStyle(palette.secondary).opacity(completed ? 0.52 : 1) }
              if snapshot.isDisplayOptionEnabled("status"), let status = task.status, !status.isEmpty { Text(widgetStatusText(status)).font(family == .systemLarge ? .subheadline : .caption2).foregroundStyle(palette.secondary).opacity(completed ? 0.52 : 1) }
              }
              .layoutPriority(2)
              .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
          }
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          Text("今日のTODO")
            .font(.caption.weight(.semibold))
            .foregroundStyle(palette.accent)
          Text("やることはありません")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(palette.foreground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct TaskInformation: View {
  let task: WidgetSnapshot.Task
  let snapshot: WidgetSnapshot
  let palette: WidgetPalette

  var body: some View {
    let completed = widgetTaskIsCompleted(task)
    VStack(alignment: .leading, spacing: 6) {
      Text("今日のTODO").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
      Text(task.title).strikethrough(completed, color: palette.secondary).font(.title3.weight(.semibold)).foregroundStyle(palette.foreground).lineLimit(3).opacity(completed ? 0.52 : 1)
      if snapshot.isDisplayOptionEnabled("startTime"), let startAt = task.startAt {
        Label(startAt.formatted(date: .omitted, time: .shortened), systemImage: "clock")
          .font(.caption).foregroundStyle(palette.secondary).opacity(completed ? 0.52 : 1)
      }
      if snapshot.isDisplayOptionEnabled("status"), let status = task.status, !status.isEmpty {
        Text(widgetStatusText(status)).font(.caption2).foregroundStyle(palette.secondary).opacity(completed ? 0.52 : 1)
      }
    }
  }
}

private struct TaskCompletionButton: View {
  let taskId: String
  let palette: WidgetPalette
  let completed: Bool
  @Environment(\.widgetFamily) private var family

  private var tapSize: CGFloat {
    family == .systemSmall ? 40 : family == .systemLarge ? 44 : 42
  }

  init(taskId: String, palette: WidgetPalette, completed: Bool = false) {
    self.taskId = taskId
    self.palette = palette
    self.completed = completed
  }

  private var iconSize: CGFloat {
    family == .systemSmall ? 21 : family == .systemLarge ? 27 : 24
  }

  @ViewBuilder
  var body: some View {
    if #available(iOSApplicationExtension 17.0, *) {
      Button(intent: RhythmCompleteTaskIntent(taskId: taskId)) {
        Image(systemName: completed ? "checkmark.circle.fill" : "circle")
          .font(.system(size: iconSize, weight: .medium))
          .foregroundStyle(completed ? palette.secondary : palette.accent)
          .frame(width: tapSize, height: tapSize, alignment: .center)
          .accessibilityLabel("タスクを完了")
      }
      .buttonStyle(.plain)
      .contentShape(Rectangle())
    } else {
      Image(systemName: completed ? "checkmark.circle.fill" : "circle")
        .font(.system(size: iconSize, weight: .medium))
        .foregroundStyle(completed ? palette.accent : palette.secondary)
        .frame(width: tapSize, height: tapSize, alignment: .center)
        .accessibilityHidden(true)
    }
  }
}

private struct ListItemToggleButton: View {
  let item: WidgetSnapshot.ChecklistItem
  let palette: WidgetPalette
  @Environment(\.widgetFamily) private var family

  private var tapSize: CGFloat {
    family == .systemSmall ? 40 : family == .systemLarge ? 44 : 42
  }

  private var iconSize: CGFloat {
    family == .systemSmall ? 21 : family == .systemLarge ? 27 : 24
  }

  @ViewBuilder
  var body: some View {
    if #available(iOSApplicationExtension 17.0, *), let taskId = item.taskId, let listItemId = item.listItemId {
      Button(intent: RhythmToggleListItemIntent(taskId: taskId, listItemId: listItemId, completed: !item.done)) {
        Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
          .font(.system(size: iconSize, weight: .medium))
          .foregroundStyle(item.done ? palette.accent : palette.secondary)
          .frame(width: tapSize, height: tapSize, alignment: .center)
          .accessibilityLabel(item.done ? "完了済み" : "未完了")
      }
      .buttonStyle(.plain)
      .contentShape(Rectangle())
    } else {
      Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
        .font(.system(size: iconSize, weight: .medium))
        .foregroundStyle(item.done ? palette.accent : palette.secondary)
        .frame(width: tapSize, height: tapSize, alignment: .center)
        .accessibilityHidden(true)
    }
  }
}

private struct TaskTimerRing: View {
  let task: WidgetSnapshot.Task
  let palette: WidgetPalette
  let diameter: CGFloat

  init(task: WidgetSnapshot.Task, palette: WidgetPalette, diameter: CGFloat = 68) {
    self.task = task
    self.palette = palette
    self.diameter = diameter
  }

  private var progress: Double {
    guard let duration = task.estimatedMinutes, duration > 0, let remaining = task.remainingMinutes else { return 0 }
    return min(1, max(0, 1 - Double(remaining) / Double(duration)))
  }

  var body: some View {
    ZStack {
      Circle().stroke(palette.divider, lineWidth: max(3, diameter * 0.074))
      Circle().trim(from: 0, to: progress).stroke(palette.accent, style: StrokeStyle(lineWidth: max(3, diameter * 0.074), lineCap: .round)).rotationEffect(.degrees(-90))
      VStack(spacing: 0) {
        Text("\(task.remainingMinutes ?? 0)").font(.system(size: max(15, diameter * 0.25), weight: .semibold)).foregroundStyle(palette.foreground)
        Text("min").font(.system(size: max(8, diameter * 0.13))).foregroundStyle(palette.secondary)
      }
    }
    .frame(width: diameter, height: diameter)
    .accessibilityHidden(true)
  }
}

private struct NextScheduleWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, let plan = snapshot.nextPlan {
        Link(destination: URL(string: "rhythm://schedule")!) {
          VStack(alignment: .leading, spacing: 7) {
            Text("次の予定")
              .font(.caption.weight(.semibold))
              .foregroundStyle(palette.accent)
            Text(plan.title)
              .font(.headline.weight(.semibold))
              .foregroundStyle(palette.foreground)
              .lineLimit(2)
            if snapshot.isDisplayOptionEnabled("scheduleTime"), plan.allDay == true {
              Text("終日")
                .font(.caption)
                .foregroundStyle(palette.secondary)
            } else if snapshot.isDisplayOptionEnabled("scheduleTime") {
              Text(plan.scheduledAt, style: .time)
                .font(.caption)
                .foregroundStyle(palette.secondary)
            }
            if snapshot.isDisplayOptionEnabled("location"), let location = plan.location, !location.isEmpty {
              Label(location, systemImage: "mappin.and.ellipse")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
                .lineLimit(1)
            }
            if snapshot.isDisplayOptionEnabled("remainingToLeave"), let remaining = plan.remainingToLeave {
              Text("出発まで \(remaining)分")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.accent)
            } else if snapshot.isDisplayOptionEnabled("remainingToLeave"), let leaveAt = plan.leaveAt ?? plan.departureAt {
              Text("出発 \(leaveAt, style: .time)")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          Text("次の予定")
            .font(.caption.weight(.semibold))
            .foregroundStyle(palette.accent)
          Text("予定はありません")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(palette.foreground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct WidgetTaskRow: View {
  let task: WidgetSnapshot.Task
  let palette: WidgetPalette

  var body: some View {
    let completed = widgetTaskIsCompleted(task)
    VStack(alignment: .leading, spacing: 2) {
      Text("今日のTODO")
        .font(.caption)
        .foregroundStyle(palette.secondary)
      Text(task.title)
        .strikethrough(completed, color: palette.secondary)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(palette.foreground)
        .opacity(completed ? 0.52 : 1)
        .lineLimit(1)
      if let startAt = task.startAt {
        Text(startAt, style: .time)
          .font(.caption2)
          .foregroundStyle(palette.secondary)
          .opacity(completed ? 0.52 : 1)
      }
    }
  }
}

private struct WidgetPlanRow: View {
  let plan: WidgetSnapshot.Plan
  let palette: WidgetPalette
  let showDeparture: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      WidgetRow(label: "次の予定", value: plan.allDay == true ? plan.title : "\(plan.scheduledAt.formatted(date: .omitted, time: .shortened))  \(plan.title)", palette: palette)
      if let location = plan.location, !location.isEmpty {
        Text(location)
          .font(.caption2)
          .foregroundStyle(palette.secondary)
          .lineLimit(1)
      }
      if showDeparture, let leaveAt = plan.leaveAt ?? plan.departureAt {
        HStack(spacing: 6) {
          Text("出発まで")
            .font(.caption)
            .foregroundStyle(palette.secondary)
          Text(leaveAt, style: .relative)
            .font(.caption.weight(.semibold))
            .foregroundStyle(palette.accent)
        }
      }
    }
  }
}

private struct WidgetRow: View {
  let label: String
  let value: String
  let palette: WidgetPalette

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(label)
        .font(.caption)
        .foregroundStyle(palette.secondary)
      Text(value)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(palette.foreground)
        .lineLimit(1)
    }
  }
}

private struct MonthlyCalendarWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    let isLarge = family == .systemLarge
    Group {
      if let month = entry.snapshot?.calendarMonth {
        let weekCount = max(1, Int(ceil(Double(month.leadingEmptyCount + month.days.count) / 7.0)))
        let dayCellHeight: CGFloat = isLarge ? (weekCount >= 6 ? 31 : 36) : 22
        VStack(alignment: .leading, spacing: isLarge ? 8 : 5) {
          Text(verbatim: "\(month.year)年\(month.month)月")
            .font((isLarge ? Font.title3 : Font.headline).weight(.semibold))
            .foregroundStyle(palette.foreground)
          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: isLarge ? 3 : 1), count: 7), spacing: isLarge ? 5 : 3) {
            ForEach(["日", "月", "火", "水", "木", "金", "土"], id: \.self) { label in
              Text(label).font(isLarge ? .subheadline : .caption2.weight(.medium)).foregroundStyle(palette.foreground.opacity(0.82))
            }
            ForEach(0..<max(0, month.leadingEmptyCount), id: \.self) { _ in
              Color.clear.frame(height: dayCellHeight)
            }
            ForEach(Array(month.days.enumerated()), id: \.offset) { _, day in
              VStack(alignment: .leading, spacing: 1) {
                ZStack {
                  if day.isToday {
                    Circle().fill(palette.accent)
                  }
                  Text(verbatim: "\(day.day)")
                    .font((isLarge ? Font.caption : Font.caption2).weight(day.isToday ? .bold : .regular))
                    // Use the palette background as the contrast color for
                    // the accent-filled today marker. This keeps Mono Dark's
                    // white accent readable without introducing a theme-
                    // specific hardcoded text color.
                    .foregroundStyle(day.isToday ? palette.background : palette.foreground)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity, minHeight: isLarge ? 20 : 16)
                if day.hasSchedule {
                  HStack(spacing: 2) {
                    Circle().fill(palette.accent).frame(width: isLarge ? 4 : 3, height: isLarge ? 4 : 3)
                    if day.scheduleCount > 1 {
                      Text("\(day.scheduleCount)")
                        .font(.system(size: isLarge ? 7 : 6, weight: .semibold))
                        .foregroundStyle(palette.accent)
                        .lineLimit(1)
                    }
                  }
                  .frame(maxWidth: .infinity, alignment: .center)
                  if isLarge, let title = day.scheduleTitle {
                    Text(title)
                      .font(.system(size: 7, weight: .medium))
                      .foregroundStyle(palette.foreground.opacity(0.82))
                      .lineLimit(1)
                      .minimumScaleFactor(0.65)
                      .frame(maxWidth: .infinity, alignment: .leading)
                  }
                }
              }
              .frame(maxWidth: .infinity, minHeight: dayCellHeight, alignment: .topLeading)
            }
          }
        }
      } else {
        Text("今月の予定はありません").font(.subheadline).foregroundStyle(palette.secondary)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct WeeklyCalendarWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let week = entry.snapshot?.calendarWeek {
        VStack(alignment: .leading, spacing: 6) {
          Text("今週の予定").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          if family == .systemLarge {
            VStack(spacing: 6) {
              ForEach(Array(week.days.enumerated()), id: \.offset) { _, day in
                HStack(alignment: .top, spacing: 10) {
                  Text("\(day.weekday) \(day.day)").font(.subheadline.weight(day.isToday ? .bold : .regular)).foregroundStyle(day.isToday ? palette.accent : palette.secondary).lineLimit(1).minimumScaleFactor(0.7).frame(width: 52, alignment: .leading)
                  if day.schedules.isEmpty { Text("—").font(.caption).foregroundStyle(palette.secondary) }
                  else {
                    VStack(alignment: .leading, spacing: 2) {
                      Text(day.schedules.first?.title ?? "予定").font(.subheadline.weight(.medium)).foregroundStyle(palette.foreground).lineLimit(1).minimumScaleFactor(0.7)
                      if day.schedules.count > 1 { Text("ほか\(day.schedules.count - 1)件").font(.caption).foregroundStyle(palette.secondary) }
                    }
                  }
                }
              }
            }
          } else {
            HStack(alignment: .top, spacing: 2) {
              ForEach(Array(week.days.enumerated()), id: \.offset) { _, day in
                VStack(spacing: 3) {
                  Text(day.weekday).font(.caption2.weight(day.isToday ? .bold : .medium)).foregroundStyle(day.isToday ? palette.accent : palette.foreground.opacity(0.82))
                  Text("\(day.day)").font(.caption2).foregroundStyle(palette.foreground)
                  if day.schedules.isEmpty {
                    Text("—").font(.caption2).foregroundStyle(palette.foreground.opacity(0.55))
                  } else {
                    HStack(spacing: 2) {
                      Circle().fill(palette.accent).frame(width: 4, height: 4)
                      if day.schedules.count > 1 { Text("\(day.schedules.count)").font(.caption2.weight(.semibold)).foregroundStyle(palette.accent) }
                    }
                    if let title = day.schedules.first?.title {
                      Text(title).font(.system(size: 7, weight: .medium)).foregroundStyle(palette.foreground.opacity(0.82)).lineLimit(1).minimumScaleFactor(0.65)
                    }
                  }
                }.frame(maxWidth: .infinity)
              }
            }
          }
        }
      } else { Text("今週の予定はありません").font(.subheadline).foregroundStyle(palette.secondary) }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct TodayScheduleWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let schedules = entry.snapshot?.todaySchedules, !schedules.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
          Text("今日の予定一覧").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          ForEach(Array(schedules.prefix(5).enumerated()), id: \.offset) { _, item in
            Link(destination: URL(string: "rhythm://schedule")!) {
              HStack(spacing: 6) {
                Text(item.allDay == true ? "終日" : item.scheduledAt.formatted(date: .omitted, time: .shortened)).font(.caption2).foregroundStyle(palette.accent).frame(width: 48, alignment: .leading)
                VStack(alignment: .leading, spacing: 1) {
                  Text(item.title).font(.caption.weight(.medium)).foregroundStyle(palette.foreground).lineLimit(1)
                  if let location = item.location, !location.isEmpty { Text(location).font(.caption2).foregroundStyle(palette.foreground.opacity(0.78)).lineLimit(1) }
                }
              }
            }
          }
          if let total = entry.snapshot?.todayScheduleCount, total > 5 { Text("ほか\(total - 5)件").font(.caption2).foregroundStyle(palette.foreground.opacity(0.78)) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("今日の予定一覧").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground); Text("予定はありません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct ChecklistWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    let limit = family == .systemSmall ? 3 : 5
    Group {
      if let items = entry.snapshot?.checklist, !items.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
            Text("TODO一覧").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
          ForEach(Array(items.prefix(limit).enumerated()), id: \.offset) { _, item in
            HStack(spacing: 6) {
              ListItemToggleButton(item: item, palette: palette)
              Link(destination: URL(string: "rhythm://todo")!) {
                Text(item.title)
                  .font(.caption)
                  .foregroundStyle(palette.foreground)
                  .opacity(item.done ? 0.55 : 1)
                  .lineLimit(1)
              }
            }
          }
          if items.count > limit { Text("ほか\(items.count - limit)件").font(.caption2).foregroundStyle(palette.secondary) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("TODO一覧").font(.caption.weight(.semibold)).foregroundStyle(palette.accent); Text("項目はありません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct GoalWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let goal = entry.snapshot?.goal {
        VStack(alignment: .leading, spacing: 8) {
          Text("叶えたいこと").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          Text(goal.title).font(.title3.weight(.semibold)).foregroundStyle(palette.foreground).lineLimit(2)
          HStack(spacing: 8) {
            ProgressView(value: Double(goal.progress), total: 100).tint(palette.accent)
            Text("\(goal.progress)%").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
          }
          if goal.actionCount > 0 { Text("行動 \(goal.completedActions)/\(goal.actionCount)").font(.caption2).foregroundStyle(palette.secondary) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("叶えたいこと").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground); Text("まだ登録されていません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct VoiceWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Link(destination: URL(string: "rhythm://voice")!) {
      VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
        Image(systemName: "mic.fill")
          .font(.system(size: family == .systemSmall ? 24 : 28, weight: .semibold))
          .foregroundStyle(palette.accent)
        Text("音声で追加")
          .font(.headline.weight(.semibold))
          .foregroundStyle(palette.foreground)
        Text(family == .systemSmall ? "話して予定・タスクを追加" : "タップして音声入力を開始")
          .font(.caption)
          .foregroundStyle(palette.secondary)
          .lineLimit(2)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
    .accessibilityLabel("音声入力。タップしてRhythmPaceで音声入力を開始")
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance, widgetKind: entry.widgetKind)
  }
}

private struct AffirmationWidgetView: View {
  let entry: RhythmWidgetEntry

  private var text: String {
    entry.affirmationTextOverride
      ?? entry.snapshot?.affirmations?.first?.text
      ?? "アファメーションを設定すると、ここに表示されます"
  }

  var body: some View {
    let snapshot = entry.snapshot
    let baseAppearance = snapshot?.appearance
    let automaticPhoto: String? = {
      guard entry.affirmationTextOverride != nil, let photoNames = snapshot?.affirmationPhotoFileNames, !photoNames.isEmpty else { return nil }
      return photoNames[affirmationSlotIndex(for: entry.date) % photoNames.count]
    }()
    let selectedPhoto = entry.affirmationPhotoFileNameOverride ?? automaticPhoto ?? snapshot?.affirmationPhotoFileNames?.first
    let appearance: WidgetSnapshot.Appearance? = {
      guard let baseAppearance else { return nil }
      // Automatic entries rotate a bounded list deterministically. Missing or
      // invalid photos simply fall back to the existing Design palette.
      if entry.affirmationTextOverride != nil {
        let backgrounds = baseAppearance.affirmationBackgrounds?.filter { ["floral", "dot", "check", "photo"].contains($0) } ?? []
        let safeBackgrounds = backgrounds.isEmpty ? ["floral", "dot", "check"] : backgrounds
        let slotIndex = affirmationSlotIndex(for: entry.date)
        let selectedBackground = safeBackgrounds[slotIndex % safeBackgrounds.count]
        if selectedBackground == "photo", let selectedPhoto {
          return WidgetSnapshot.Appearance(style: .photo, monoTemplate: baseAppearance.monoTemplate, fontDesign: baseAppearance.fontDesign, accentHex: baseAppearance.accentHex, photoFileName: selectedPhoto, cutoutFileName: nil, photoLayout: baseAppearance.photoLayout == "cutout" ? "background" : (baseAppearance.photoLayout ?? "background"), designPattern: nil, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: baseAppearance.designPatternUnlocked, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
        }
        if baseAppearance.designPatternUnlocked != true {
          return WidgetSnapshot.Appearance(style: .mono, monoTemplate: baseAppearance.monoTemplate, fontDesign: baseAppearance.fontDesign, accentHex: baseAppearance.accentHex, photoFileName: nil, cutoutFileName: nil, photoLayout: baseAppearance.photoLayout, designPattern: nil, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: false, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
        }
        let pattern = selectedBackground == "dot" ? "dot" : selectedBackground == "check" ? "checkLavenderSatin" : "floral"
        return WidgetSnapshot.Appearance(style: .color, monoTemplate: baseAppearance.monoTemplate, fontDesign: baseAppearance.fontDesign, accentHex: baseAppearance.accentHex, photoFileName: nil, cutoutFileName: nil, photoLayout: baseAppearance.photoLayout, designPattern: pattern, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: baseAppearance.designPatternUnlocked, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
      }
      return baseAppearance
    }()
    let palette = WidgetPalette.forAppearance(appearance)
    Link(destination: URL(string: "rhythm://affirmation")!) {
      VStack(alignment: .leading, spacing: 8) {
        Text("今日のアファメーション")
          .font(.caption.weight(.semibold))
          .foregroundStyle(palette.accent)
        Text("「\(text)」")
          .font(.title3.weight(.semibold))
          .foregroundStyle(palette.foreground)
          .lineLimit(5)
          .minimumScaleFactor(0.78)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .accessibilityLabel("今日のアファメーション。タップしてRhythmPaceで設定を開く")
    .rhythmWidgetSurface(palette: palette, appearance: appearance, widgetKind: entry.widgetKind)
  }
}

private extension View {
  func rhythmWidgetSurface(palette: WidgetPalette, appearance: WidgetSnapshot.Appearance?, widgetKind: String? = nil) -> some View {
    WidgetSurface(palette: palette, appearance: appearance, widgetKind: widgetKind) { self }
  }

  @ViewBuilder
  func rhythmWidgetBackground(_ color: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) { color }
    } else {
      self.background(color)
    }
  }
}

private extension Color {
  init(hex: String) {
    let normalized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard normalized.count == 6, let value = UInt64(normalized, radix: 16) else {
      self = .accentColor
      return
    }
    self.init(
      red: Double((value >> 16) & 0xff) / 255,
      green: Double((value >> 8) & 0xff) / 255,
      blue: Double(value & 0xff) / 255
    )
  }
}

private struct WidgetAccessLockedView: View {
  let kind: String

  private var premiumOnly: Bool {
    kind == "RhythmGoalWidget" || kind == "RhythmAffirmationWidget"
  }

  var body: some View {
    let title = premiumOnly ? "Premiumで使えます" : "Design Customizeで使えます"
    let message = premiumOnly ? "PremiumならすべてのWidgetを利用できます。" : "購入済みのDesign CustomizeまたはPremiumで利用できます。"
    let destination = URL(string: premiumOnly ? "rhythm://premium" : "rhythm://design")
    Group {
      if let destination = destination {
        Link(destination: destination) {
          lockedContent(title: title, message: message)
        }
      } else {
        lockedContent(title: title, message: message)
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
    .accessibilityElement(children: .combine)
    .accessibilityLabel("\(title)。タップして利用方法を確認")
  }

  private func lockedContent(title: String, message: String) -> some View {
    VStack(spacing: 8) {
      Image(systemName: "lock.fill")
        .font(.title3)
        .foregroundColor(.secondary)
      Text(title)
        .font(.headline)
        .foregroundColor(.primary)
      Text(message)
        .font(.caption)
        .foregroundColor(.secondary)
        .multilineTextAlignment(.center)
        .lineLimit(3)
    }
  }
}

private struct WidgetAccessGate<Content: View>: View {
  let entry: RhythmWidgetEntry
  let content: Content

  init(entry: RhythmWidgetEntry, @ViewBuilder content: () -> Content) {
    self.entry = entry
    self.content = content()
  }

  @ViewBuilder
  var body: some View {
    if !entry.isGallerySample,
       let snapshot = entry.snapshot,
       let kind = entry.widgetKind,
       !snapshot.canDisplayWidget(kind: kind) {
      WidgetAccessLockedView(kind: kind)
    } else {
      content
    }
  }
}

/// The original combined widget remains available for existing placements.
struct RhythmWidget: Widget {
  let kind = "RhythmWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { RhythmWidgetView(entry: entry) }
    }
    .configurationDisplayName("今日のTODO＋次の予定")
    .description("登録したTODOと次の予定を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmCurrentTaskWidget: Widget {
  let kind = "RhythmCurrentTaskWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { CurrentTaskWidgetView(entry: entry) }
    }
    .configurationDisplayName("今日のTODO")
    .description("今日取り組むTODOを確認できます。")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct RhythmNextScheduleWidget: Widget {
  let kind = "RhythmNextScheduleWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { NextScheduleWidgetView(entry: entry) }
    }
    .configurationDisplayName("次の予定")
    .description("次の予定と出発時刻を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmMonthlyCalendarWidget: Widget {
  let kind = "RhythmMonthlyCalendarWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { MonthlyCalendarWidgetView(entry: entry) }
    }
    .configurationDisplayName("月間カレンダー")
    .description("予定のある日を月ごとに確認できます。")
    .supportedFamilies([.systemLarge])
  }
}

struct RhythmWeeklyCalendarWidget: Widget {
  let kind = "RhythmWeeklyCalendarWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { WeeklyCalendarWidgetView(entry: entry) }
    }
    .configurationDisplayName("週間カレンダー")
    .description("今週の予定の流れを確認できます。")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct RhythmTodayScheduleWidget: Widget {
  let kind = "RhythmTodayScheduleWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { TodayScheduleWidgetView(entry: entry) }
    }
    .configurationDisplayName("今日の予定一覧")
    .description("今日の予定を時系列で確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmChecklistWidget: Widget {
  let kind = "RhythmChecklistWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { ChecklistWidgetView(entry: entry) }
    }
    .configurationDisplayName("TODO一覧")
    .description("登録したTODOを一覧で確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmGoalWidget: Widget {
  let kind = "RhythmGoalWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { GoalWidgetView(entry: entry) }
    }
    .configurationDisplayName("叶えたいこと")
    .description("叶えたいことの進み具合を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmVoiceWidget: Widget {
  let kind = "RhythmVoiceWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { VoiceWidgetView(entry: entry) }
    }
    .configurationDisplayName("音声で追加")
    .description("ホーム画面からタスクや予定を追加できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmAffirmationWidget: Widget {
  let kind = "RhythmAffirmationWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      WidgetAccessGate(entry: entry) { AffirmationWidgetView(entry: entry) }
    }
    .configurationDisplayName("アファメーション")
    .description("言葉と背景で気持ちを整えます。")
    .supportedFamilies([.systemMedium])
  }
}
