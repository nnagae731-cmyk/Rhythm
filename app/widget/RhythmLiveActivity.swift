import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
struct RhythmLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RhythmLiveActivityAttributes.self) { context in
      RhythmLiveActivityLockScreenView(state: context.state)
        .activityBackgroundTint(Color(hex: context.state.accentHex).opacity(0.12))
        .activitySystemActionForegroundColor(Color(hex: context.state.accentHex))
        .widgetURL(URL(string: context.state.mode == .focus ? "rhythm://focus" : "rhythm://today"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.state.mode == .focus ? "集中" : "Rhythm")
            .font(.caption.weight(.semibold))
        }
        DynamicIslandExpandedRegion(.center) {
          Text(RhythmLiveActivityCopy.title(for: context.state))
            .font(.headline)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        DynamicIslandExpandedRegion(.bottom) {
          RhythmLiveActivityDetail(state: context.state)
        }
      } compactLeading: {
        Image(systemName: context.state.mode == .focus ? "timer" : "checkmark.circle")
      } compactTrailing: {
        RhythmLiveActivityTimer(state: context.state)
      } minimal: {
        Image(systemName: context.state.mode == .focus ? "timer" : "checkmark.circle")
      }
      .widgetURL(URL(string: context.state.mode == .focus ? "rhythm://focus" : "rhythm://today"))
    }
  }
}

@available(iOS 16.1, *)
private enum RhythmLiveActivityCopy {
  static func title(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if state.mode == .focus, let title = state.focusTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if state.mode == .normal, let title = state.currentTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    return state.mode == .focus ? "集中タイム" : "今日のRhythm"
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityLockScreenView: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(state.mode == .focus ? "集中タイム" : "今日のRhythm")
        .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
      Text(RhythmLiveActivityCopy.title(for: state))
        .font(.headline).lineLimit(2).minimumScaleFactor(0.75)
      RhythmLiveActivityDetail(state: state)
    }.padding(.horizontal, 16).padding(.vertical, 12)
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityDetail: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      if state.mode == .normal {
        if let title = state.nextScheduleTitle, let date = state.nextScheduleAt {
          Label { Text(title).lineLimit(1) } icon: { Image(systemName: "calendar") }
          Text(date, style: .time).font(.caption2).foregroundStyle(.secondary)
        }
        if let departure = state.departureAt {
          Label { Text(departure, style: .relative).lineLimit(1) } icon: { Image(systemName: "figure.walk") }
            .font(.caption)
        }
      } else if let ends = state.focusEndsAt {
        Label { Text(ends, style: .timer) } icon: { Image(systemName: "timer") }
          .font(.title3.monospacedDigit())
      }
    }
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityTimer: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    if let date = state.mode == .focus ? state.focusEndsAt : state.nextScheduleAt {
      Text(date, style: .timer).font(.caption2.monospacedDigit())
    } else { Image(systemName: "circle") }
  }
}

private extension Color {
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    self.init(.sRGB, red: Double((value >> 16) & 0xff) / 255, green: Double((value >> 8) & 0xff) / 255, blue: Double(value & 0xff), opacity: 1)
  }
}
