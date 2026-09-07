import Foundation
import ActivityKit

@available(iOS 16.1, *)
struct RhythmLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    enum Mode: String, Codable, Hashable { case normal, focus }
    enum Tier: String, Codable, Hashable { case free, design, premium }
    enum FontDesign: String, Codable, Hashable { case `default`, rounded, serif, monospaced }
    enum FontSize: String, Codable, Hashable { case small, medium, large }
    enum AffirmationRotationMode: String, Codable, Hashable { case fixed, automatic }
    struct ListItem: Codable, Hashable {
      var id: String
      var text: String
      var checked: Bool
    }
    struct TaskItem: Codable, Hashable {
      var id: String
      var title: String
    }
    struct DisplayOptions: Codable, Hashable {
      var currentTask: Bool
      var nextSchedule: Bool
      var departureCountdown: Bool
      var focusRemaining: Bool
      var affirmation: Bool
      static let all = DisplayOptions()
      init(currentTask: Bool = true, nextSchedule: Bool = true, departureCountdown: Bool = true, focusRemaining: Bool = true, affirmation: Bool = true) {
        self.currentTask = currentTask
        self.nextSchedule = nextSchedule
        self.departureCountdown = departureCountdown
        self.focusRemaining = focusRemaining
        self.affirmation = affirmation
      }
      init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        currentTask = try container.decodeIfPresent(Bool.self, forKey: .currentTask) ?? true
        nextSchedule = try container.decodeIfPresent(Bool.self, forKey: .nextSchedule) ?? true
        departureCountdown = try container.decodeIfPresent(Bool.self, forKey: .departureCountdown) ?? true
        focusRemaining = try container.decodeIfPresent(Bool.self, forKey: .focusRemaining) ?? true
        affirmation = try container.decodeIfPresent(Bool.self, forKey: .affirmation) ?? true
      }
      private enum CodingKeys: String, CodingKey { case currentTask, nextSchedule, departureCountdown, focusRemaining, affirmation }
    }
    var mode: Mode
    var tier: Tier
    var currentTaskTitle: String?
    var nextScheduleTitle: String?
    var nextScheduleAt: Date?
    var departureAt: Date?
    var focusTaskTitle: String?
    var focusEndsAt: Date?
    var focusElapsedStartAt: Date?
    var focusElapsedSeconds: Int?
    var focusRemainingSeconds: Int?
    var focusRunning: Bool
    var affirmationText: String?
    var accentHex: String
    var displayOptions: DisplayOptions
    var interactiveChecks: Bool
    var currentTaskId: String?
    var currentTasks: [TaskItem]?
    var currentTaskRemainingCount: Int
    var currentTaskListItems: [ListItem]?
    var affirmationTexts: [String]?
    var affirmationRotationMode: AffirmationRotationMode
    var affirmationRotationIntervalMinutes: Int
    var affirmationRotationAnchor: Date?
    var fontDesign: FontDesign
    var fontSize: FontSize

    init(mode: Mode, tier: Tier = .free, currentTaskTitle: String? = nil, nextScheduleTitle: String? = nil, nextScheduleAt: Date? = nil, departureAt: Date? = nil, focusTaskTitle: String? = nil, focusEndsAt: Date? = nil, focusElapsedStartAt: Date? = nil, focusElapsedSeconds: Int? = nil, focusRemainingSeconds: Int? = nil, focusRunning: Bool = false, affirmationText: String? = nil, accentHex: String = "#FFFFFF", displayOptions: DisplayOptions = .all, interactiveChecks: Bool = false, currentTaskId: String? = nil, currentTasks: [TaskItem]? = nil, currentTaskRemainingCount: Int = 0, currentTaskListItems: [ListItem]? = nil, affirmationTexts: [String]? = nil, affirmationRotationMode: AffirmationRotationMode = .fixed, affirmationRotationIntervalMinutes: Int = 60, affirmationRotationAnchor: Date? = nil, fontDesign: FontDesign = .default, fontSize: FontSize = .medium) {
      self.mode = mode
      self.tier = tier
      self.currentTaskTitle = currentTaskTitle
      self.nextScheduleTitle = nextScheduleTitle
      self.nextScheduleAt = nextScheduleAt
      self.departureAt = departureAt
      self.focusTaskTitle = focusTaskTitle
      self.focusEndsAt = focusEndsAt
      self.focusElapsedStartAt = focusElapsedStartAt
      self.focusElapsedSeconds = focusElapsedSeconds
      self.focusRemainingSeconds = focusRemainingSeconds
      self.focusRunning = focusRunning
      self.affirmationText = affirmationText
      self.accentHex = accentHex
      self.displayOptions = displayOptions
      self.interactiveChecks = interactiveChecks
      self.currentTaskId = currentTaskId
      self.currentTasks = currentTasks
      self.currentTaskRemainingCount = max(0, currentTaskRemainingCount)
      self.currentTaskListItems = currentTaskListItems
      self.affirmationTexts = affirmationTexts
      self.affirmationRotationMode = affirmationRotationMode
      self.affirmationRotationIntervalMinutes = affirmationRotationIntervalMinutes
      self.affirmationRotationAnchor = affirmationRotationAnchor
      self.fontDesign = fontDesign
      self.fontSize = fontSize
    }

    private enum CodingKeys: String, CodingKey {
      case mode, tier, currentTaskTitle, nextScheduleTitle, nextScheduleAt, departureAt, focusTaskTitle, focusEndsAt, focusElapsedStartAt, focusElapsedSeconds, focusRemainingSeconds, focusRunning, affirmationText, accentHex, displayOptions, interactiveChecks, currentTaskId, currentTasks, currentTaskRemainingCount, currentTaskListItems, affirmationTexts, affirmationRotationMode, affirmationRotationIntervalMinutes, affirmationRotationAnchor, fontDesign, fontSize
    }

    // Old activities did not carry tier/affirmation. Defaults keep an
    // activity created by an earlier build decodable during an app update.
    init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      mode = try container.decodeIfPresent(Mode.self, forKey: .mode) ?? .normal
      tier = try container.decodeIfPresent(Tier.self, forKey: .tier) ?? .free
      currentTaskTitle = try container.decodeIfPresent(String.self, forKey: .currentTaskTitle)
      nextScheduleTitle = try container.decodeIfPresent(String.self, forKey: .nextScheduleTitle)
      nextScheduleAt = try container.decodeIfPresent(Date.self, forKey: .nextScheduleAt)
      departureAt = try container.decodeIfPresent(Date.self, forKey: .departureAt)
      focusTaskTitle = try container.decodeIfPresent(String.self, forKey: .focusTaskTitle)
      focusEndsAt = try container.decodeIfPresent(Date.self, forKey: .focusEndsAt)
      focusElapsedStartAt = try container.decodeIfPresent(Date.self, forKey: .focusElapsedStartAt)
      focusElapsedSeconds = try container.decodeIfPresent(Int.self, forKey: .focusElapsedSeconds)
      focusRemainingSeconds = try container.decodeIfPresent(Int.self, forKey: .focusRemainingSeconds)
      focusRunning = try container.decodeIfPresent(Bool.self, forKey: .focusRunning) ?? (focusEndsAt != nil)
      affirmationText = try container.decodeIfPresent(String.self, forKey: .affirmationText)
      accentHex = try container.decodeIfPresent(String.self, forKey: .accentHex) ?? "#FFFFFF"
      displayOptions = try container.decodeIfPresent(DisplayOptions.self, forKey: .displayOptions) ?? .all
      interactiveChecks = try container.decodeIfPresent(Bool.self, forKey: .interactiveChecks) ?? false
      currentTaskId = try container.decodeIfPresent(String.self, forKey: .currentTaskId)
      currentTasks = try container.decodeIfPresent([TaskItem].self, forKey: .currentTasks)
      currentTaskRemainingCount = max(0, try container.decodeIfPresent(Int.self, forKey: .currentTaskRemainingCount) ?? 0)
      currentTaskListItems = try container.decodeIfPresent([ListItem].self, forKey: .currentTaskListItems)
      affirmationTexts = try container.decodeIfPresent([String].self, forKey: .affirmationTexts)
      affirmationRotationMode = try container.decodeIfPresent(AffirmationRotationMode.self, forKey: .affirmationRotationMode) ?? .fixed
      affirmationRotationIntervalMinutes = try container.decodeIfPresent(Int.self, forKey: .affirmationRotationIntervalMinutes) ?? 60
      affirmationRotationAnchor = try container.decodeIfPresent(Date.self, forKey: .affirmationRotationAnchor)
      fontDesign = try container.decodeIfPresent(FontDesign.self, forKey: .fontDesign) ?? .default
      fontSize = try container.decodeIfPresent(FontSize.self, forKey: .fontSize) ?? .medium
    }

    func encode(to encoder: Encoder) throws {
      var container = encoder.container(keyedBy: CodingKeys.self)
      try container.encode(mode, forKey: .mode)
      try container.encode(tier, forKey: .tier)
      try container.encodeIfPresent(currentTaskTitle, forKey: .currentTaskTitle)
      try container.encodeIfPresent(nextScheduleTitle, forKey: .nextScheduleTitle)
      try container.encodeIfPresent(nextScheduleAt, forKey: .nextScheduleAt)
      try container.encodeIfPresent(departureAt, forKey: .departureAt)
      try container.encodeIfPresent(focusTaskTitle, forKey: .focusTaskTitle)
      try container.encodeIfPresent(focusEndsAt, forKey: .focusEndsAt)
      try container.encodeIfPresent(focusElapsedStartAt, forKey: .focusElapsedStartAt)
      try container.encodeIfPresent(focusElapsedSeconds, forKey: .focusElapsedSeconds)
      try container.encodeIfPresent(focusRemainingSeconds, forKey: .focusRemainingSeconds)
      try container.encode(focusRunning, forKey: .focusRunning)
      try container.encodeIfPresent(affirmationText, forKey: .affirmationText)
      try container.encode(accentHex, forKey: .accentHex)
      try container.encode(displayOptions, forKey: .displayOptions)
      try container.encode(interactiveChecks, forKey: .interactiveChecks)
      try container.encodeIfPresent(currentTaskId, forKey: .currentTaskId)
      try container.encodeIfPresent(currentTasks, forKey: .currentTasks)
      try container.encode(currentTaskRemainingCount, forKey: .currentTaskRemainingCount)
      try container.encodeIfPresent(currentTaskListItems, forKey: .currentTaskListItems)
      try container.encodeIfPresent(affirmationTexts, forKey: .affirmationTexts)
      try container.encode(affirmationRotationMode, forKey: .affirmationRotationMode)
      try container.encode(affirmationRotationIntervalMinutes, forKey: .affirmationRotationIntervalMinutes)
      try container.encodeIfPresent(affirmationRotationAnchor, forKey: .affirmationRotationAnchor)
      try container.encode(fontDesign, forKey: .fontDesign)
      try container.encode(fontSize, forKey: .fontSize)
    }
  }
  var appName: String
}
