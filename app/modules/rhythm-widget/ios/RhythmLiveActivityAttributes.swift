import Foundation
import ActivityKit

/// Small, Codable state shared by the app-side bridge and the Widget extension.
/// Keep this intentionally text/date-only so ActivityKit never receives a full
/// Widget snapshot or image data.
@available(iOS 16.1, *)
public struct RhythmLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public enum Mode: String, Codable, Hashable { case normal, focus }

    public var mode: Mode
    public var currentTaskTitle: String?
    public var nextScheduleTitle: String?
    public var nextScheduleAt: Date?
    public var departureAt: Date?
    public var focusTaskTitle: String?
    public var focusEndsAt: Date?
    public var accentHex: String

    public init(mode: Mode, currentTaskTitle: String? = nil, nextScheduleTitle: String? = nil,
                nextScheduleAt: Date? = nil, departureAt: Date? = nil,
                focusTaskTitle: String? = nil, focusEndsAt: Date? = nil,
                accentHex: String = "#7559E8") {
      self.mode = mode
      self.currentTaskTitle = currentTaskTitle
      self.nextScheduleTitle = nextScheduleTitle
      self.nextScheduleAt = nextScheduleAt
      self.departureAt = departureAt
      self.focusTaskTitle = focusTaskTitle
      self.focusEndsAt = focusEndsAt
      self.accentHex = accentHex
    }
  }

  public var appName: String
  public init(appName: String = "RhythmPace") { self.appName = appName }
}
