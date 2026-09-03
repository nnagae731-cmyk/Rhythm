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
        .widgetURL(URL(string: context.state.mode == .focus && context.state.tier == .premium && context.state.displayOptions.focusRemaining ? "rhythm://focus" : "rhythm://today"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(RhythmLiveActivityCopy.statusLabel(for: context.state))
            .font(.caption.weight(.semibold))
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(RhythmLiveActivityCopy.dynamicIslandTitle(for: context.state))
            .font(.headline)
            .lineLimit(RhythmLiveActivityCopy.isAffirmationOnly(context.state) ? 2 : 1)
            .minimumScaleFactor(0.7)
        }
        DynamicIslandExpandedRegion(.bottom) {
          RhythmLiveActivityDetail(state: context.state, suppressAffirmationOnly: true)
        }
      } compactLeading: {
        Image(systemName: RhythmLiveActivityCopy.iconName(for: context.state))
          .accessibilityHidden(true)
      } compactTrailing: {
        RhythmLiveActivityTimer(state: context.state)
      } minimal: {
        Image(systemName: RhythmLiveActivityCopy.iconName(for: context.state))
          .accessibilityHidden(true)
      }
      .widgetURL(URL(string: context.state.mode == .focus && context.state.tier == .premium && context.state.displayOptions.focusRemaining ? "rhythm://focus" : "rhythm://today"))
    }
  }
}

@available(iOS 16.1, *)
private enum RhythmLiveActivityCopy {
  static func isAffirmationOnly(_ state: RhythmLiveActivityAttributes.ContentState) -> Bool {
    guard state.tier == .premium, state.mode == .normal, state.displayOptions.affirmation,
          let text = state.affirmationText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return false }
    let hasDeparture = state.displayOptions.departureCountdown && state.departureAt != nil
    let hasNext = state.displayOptions.nextSchedule && state.nextScheduleAt != nil && state.nextScheduleTitle?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
    let hasCurrent = state.displayOptions.currentTask && state.currentTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
    return !hasDeparture && !hasNext && !hasCurrent
  }

  static func dynamicIslandTitle(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if isAffirmationOnly(state), let text = state.affirmationText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty { return text }
    return title(for: state)
  }

  static func statusLabel(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining { return "集中" }
    if state.tier == .premium && state.departureAt != nil && state.displayOptions.departureCountdown { return "次の予定" }
    return "Rhythm"
  }

  static func iconName(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining ? "timer" : "checkmark.circle"
  }

  static func title(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining, let title = state.focusTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if state.tier == .premium && state.departureAt != nil && state.displayOptions.departureCountdown,
       let title = state.nextScheduleTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if state.tier == .premium && state.displayOptions.nextSchedule, let title = state.nextScheduleTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if state.tier != .premium || state.displayOptions.currentTask,
       let title = state.currentTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    return state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining ? "集中タイム" : "今日のRhythm"
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityLockScreenView: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(RhythmLiveActivityCopy.statusLabel(for: state))
        .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
      Text(RhythmLiveActivityCopy.title(for: state))
        .font(.headline).lineLimit(2).minimumScaleFactor(0.75)
      RhythmLiveActivityDetail(state: state, suppressAffirmationOnly: false)
    }.padding(.horizontal, 16).padding(.vertical, 12)
      .accessibilityElement(children: .combine)
      .accessibilityLabel(RhythmLiveActivityAccessibility.label(for: state))
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityDetail: View {
  let state: RhythmLiveActivityAttributes.ContentState
  let suppressAffirmationOnly: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      if state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining {
        if let ends = state.focusEndsAt {
          Label { Text(ends, style: .timer).lineLimit(1) } icon: { Image(systemName: "timer") }
            .font(.title3.monospacedDigit())
        }
        if state.displayOptions.affirmation { RhythmLiveActivityAffirmation(text: state.affirmationText) }
      } else if state.tier == .premium {
        if state.displayOptions.nextSchedule, let title = state.nextScheduleTitle, let date = state.nextScheduleAt {
          Label { Text(title).lineLimit(1) } icon: { Image(systemName: "calendar") }
          Text(date, style: .time).font(.caption2).foregroundStyle(.secondary)
        }
        if state.displayOptions.departureCountdown, let departure = state.departureAt {
          Label { Text(departure, style: .relative).lineLimit(1) } icon: { Image(systemName: "figure.walk") }
            .font(.caption)
        }
        if state.displayOptions.affirmation && (!suppressAffirmationOnly || !RhythmLiveActivityCopy.isAffirmationOnly(state)) { RhythmLiveActivityAffirmation(text: state.affirmationText) }
      }
    }
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityAffirmation: View {
  let text: String?
  var body: some View {
    if let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      Text(text).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
    }
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityTimer: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    if state.tier == .premium {
      if state.mode == .focus && state.displayOptions.focusRemaining, let date = state.focusEndsAt {
        Text(date, style: .timer).font(.caption2.monospacedDigit())
      } else if state.displayOptions.departureCountdown, let date = state.departureAt {
        Text(date, style: .timer).font(.caption2.monospacedDigit())
      } else if state.displayOptions.nextSchedule, let date = state.nextScheduleAt {
        Text(date, style: .timer).font(.caption2.monospacedDigit())
      } else {
        Image(systemName: "checkmark.circle").accessibilityHidden(true)
      }
    } else {
      Image(systemName: "checkmark.circle").accessibilityHidden(true)
    }
  }
}

@available(iOS 16.1, *)
private enum RhythmLiveActivityAccessibility {
  static func label(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    let title = RhythmLiveActivityCopy.title(for: state)
    if state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining { return "集中タイム。\(title)" }
    if state.tier == .premium && state.departureAt != nil && state.displayOptions.departureCountdown { return "次の予定。\(title)" }
    return "今はこれ。\(title)"
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
