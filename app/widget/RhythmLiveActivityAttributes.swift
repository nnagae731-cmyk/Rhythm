import Foundation
import ActivityKit

@available(iOS 16.1, *)
struct RhythmLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    enum Mode: String, Codable, Hashable { case normal, focus }
    var mode: Mode
    var currentTaskTitle: String?
    var nextScheduleTitle: String?
    var nextScheduleAt: Date?
    var departureAt: Date?
    var focusTaskTitle: String?
    var focusEndsAt: Date?
    var accentHex: String
  }
  var appName: String
}
