import Foundation
import ActivityKit

@available(iOS 16.1, *)
struct RhythmLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    enum Mode: String, Codable, Hashable { case normal, focus }
    enum Tier: String, Codable, Hashable { case free, design, premium }
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
    var affirmationText: String?
    var accentHex: String
    var displayOptions: DisplayOptions

    init(mode: Mode, tier: Tier = .free, currentTaskTitle: String? = nil, nextScheduleTitle: String? = nil, nextScheduleAt: Date? = nil, departureAt: Date? = nil, focusTaskTitle: String? = nil, focusEndsAt: Date? = nil, affirmationText: String? = nil, accentHex: String = "#7559E8", displayOptions: DisplayOptions = .all) {
      self.mode = mode
      self.tier = tier
      self.currentTaskTitle = currentTaskTitle
      self.nextScheduleTitle = nextScheduleTitle
      self.nextScheduleAt = nextScheduleAt
      self.departureAt = departureAt
      self.focusTaskTitle = focusTaskTitle
      self.focusEndsAt = focusEndsAt
      self.affirmationText = affirmationText
      self.accentHex = accentHex
      self.displayOptions = displayOptions
    }

    private enum CodingKeys: String, CodingKey {
      case mode, tier, currentTaskTitle, nextScheduleTitle, nextScheduleAt, departureAt, focusTaskTitle, focusEndsAt, affirmationText, accentHex, displayOptions
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
      affirmationText = try container.decodeIfPresent(String.self, forKey: .affirmationText)
      accentHex = try container.decodeIfPresent(String.self, forKey: .accentHex) ?? "#7559E8"
      displayOptions = try container.decodeIfPresent(DisplayOptions.self, forKey: .displayOptions) ?? .all
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
      try container.encodeIfPresent(affirmationText, forKey: .affirmationText)
      try container.encode(accentHex, forKey: .accentHex)
      try container.encode(displayOptions, forKey: .displayOptions)
    }
  }
  var appName: String
}
