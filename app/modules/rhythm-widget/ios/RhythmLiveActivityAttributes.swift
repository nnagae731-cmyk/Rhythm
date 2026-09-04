import Foundation
import ActivityKit

/// Small, Codable state shared by the app-side bridge and the Widget extension.
/// Keep this intentionally text/date-only so ActivityKit never receives a full
/// Widget snapshot or image data.
@available(iOS 16.1, *)
public struct RhythmLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public enum Mode: String, Codable, Hashable { case normal, focus }
    public enum Tier: String, Codable, Hashable { case free, design, premium }
    public struct DisplayOptions: Codable, Hashable {
      public var currentTask: Bool
      public var nextSchedule: Bool
      public var departureCountdown: Bool
      public var focusRemaining: Bool
      public var affirmation: Bool

      public static let all = DisplayOptions()
      public init(currentTask: Bool = true, nextSchedule: Bool = true, departureCountdown: Bool = true, focusRemaining: Bool = true, affirmation: Bool = true) {
        self.currentTask = currentTask
        self.nextSchedule = nextSchedule
        self.departureCountdown = departureCountdown
        self.focusRemaining = focusRemaining
        self.affirmation = affirmation
      }
      public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        currentTask = try container.decodeIfPresent(Bool.self, forKey: .currentTask) ?? true
        nextSchedule = try container.decodeIfPresent(Bool.self, forKey: .nextSchedule) ?? true
        departureCountdown = try container.decodeIfPresent(Bool.self, forKey: .departureCountdown) ?? true
        focusRemaining = try container.decodeIfPresent(Bool.self, forKey: .focusRemaining) ?? true
        affirmation = try container.decodeIfPresent(Bool.self, forKey: .affirmation) ?? true
      }
      private enum CodingKeys: String, CodingKey { case currentTask, nextSchedule, departureCountdown, focusRemaining, affirmation }
    }

    public var mode: Mode
    public var tier: Tier
    public var currentTaskTitle: String?
    public var nextScheduleTitle: String?
    public var nextScheduleAt: Date?
    public var departureAt: Date?
    public var focusTaskTitle: String?
    public var focusEndsAt: Date?
    public var affirmationText: String?
    public var accentHex: String
    public var displayOptions: DisplayOptions

    public init(mode: Mode, tier: Tier = .free, currentTaskTitle: String? = nil, nextScheduleTitle: String? = nil,
                nextScheduleAt: Date? = nil, departureAt: Date? = nil,
                focusTaskTitle: String? = nil, focusEndsAt: Date? = nil,
                affirmationText: String? = nil,
                accentHex: String = "#FFFFFF",
                displayOptions: DisplayOptions = .all) {
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

    public init(from decoder: Decoder) throws {
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
      accentHex = try container.decodeIfPresent(String.self, forKey: .accentHex) ?? "#FFFFFF"
      displayOptions = try container.decodeIfPresent(DisplayOptions.self, forKey: .displayOptions) ?? .all
    }

    public func encode(to encoder: Encoder) throws {
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

  public var appName: String
  public init(appName: String = "RhythmPace") { self.appName = appName }
}
