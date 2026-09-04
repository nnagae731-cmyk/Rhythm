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
        .widgetURL(URL(string: RhythmLiveActivityCopy.hasActiveFocus(context.state) ? "rhythm://focus" : "rhythm://today"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          TimelineView(.periodic(from: .now, by: 30)) { _ in
            Text(RhythmLiveActivityCopy.statusLabel(for: context.state))
              .font(.caption.weight(.semibold))
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          TimelineView(.periodic(from: .now, by: 30)) { _ in
            Text(RhythmLiveActivityCopy.dynamicIslandTitle(for: context.state))
              .font(.headline)
              .lineLimit(RhythmLiveActivityCopy.isAffirmationOnly(context.state) ? 2 : 1)
              .minimumScaleFactor(0.7)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          TimelineView(.periodic(from: .now, by: 30)) { _ in
            RhythmLiveActivityDetail(state: context.state, suppressAffirmationOnly: true)
          }
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
      .widgetURL(URL(string: RhythmLiveActivityCopy.hasActiveFocus(context.state) ? "rhythm://focus" : "rhythm://today"))
    }
  }
}

@available(iOS 16.1, *)
private enum RhythmLiveActivityCopy {
  private static func hasText(_ value: String?) -> Bool {
    guard let value else { return false }
    return !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  static func hasActiveFocus(_ state: RhythmLiveActivityAttributes.ContentState, now: Date = Date()) -> Bool {
    state.tier == .premium && state.mode == .focus && state.displayOptions.focusRemaining && (state.focusEndsAt.map { $0 > now } ?? false) && hasText(state.focusTaskTitle)
  }

  static func hasActiveDeparture(_ state: RhythmLiveActivityAttributes.ContentState, now: Date = Date()) -> Bool {
    state.tier == .premium && state.displayOptions.departureCountdown && (state.departureAt.map { $0 > now } ?? false) && hasText(state.nextScheduleTitle)
  }

  static func hasActiveNext(_ state: RhythmLiveActivityAttributes.ContentState, now: Date = Date()) -> Bool {
    state.tier == .premium && state.displayOptions.nextSchedule && (state.nextScheduleAt.map { $0 > now } ?? false) && hasText(state.nextScheduleTitle)
  }

  static func hasActiveCurrent(_ state: RhythmLiveActivityAttributes.ContentState) -> Bool {
    (state.tier != .premium || state.displayOptions.currentTask) && hasText(state.currentTaskTitle)
  }

  static func isAffirmationOnly(_ state: RhythmLiveActivityAttributes.ContentState, now: Date = Date()) -> Bool {
    guard state.tier == .premium, state.displayOptions.affirmation,
          hasText(state.affirmationText) else { return false }
    return !hasActiveFocus(state, now: now) && !hasActiveDeparture(state, now: now) && !hasActiveNext(state, now: now) && !hasActiveCurrent(state)
  }

  static func dynamicIslandTitle(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if isAffirmationOnly(state), let text = state.affirmationText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty { return text }
    return title(for: state)
  }

  static func statusLabel(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if hasActiveFocus(state) { return "集中" }
    if hasActiveDeparture(state) { return "出発" }
    if hasActiveNext(state) { return "次の予定" }
    if isAffirmationOnly(state) { return "今日のRhythm" }
    return "Rhythm"
  }

  static func iconName(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    hasActiveFocus(state) ? "timer" : "checkmark.circle"
  }

  static func title(for state: RhythmLiveActivityAttributes.ContentState) -> String {
    if hasActiveFocus(state), let title = state.focusTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if hasActiveDeparture(state),
       let title = state.nextScheduleTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if hasActiveNext(state), let title = state.nextScheduleTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if hasActiveCurrent(state),
       let title = state.currentTaskTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty { return title }
    if state.tier == .premium, state.displayOptions.affirmation,
       let text = state.affirmationText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty { return text }
    return "今日のRhythm"
  }
}

@available(iOS 16.1, *)
private struct RhythmLiveActivityLockScreenView: View {
  let state: RhythmLiveActivityAttributes.ContentState
  var body: some View {
    TimelineView(.periodic(from: .now, by: 30)) { _ in
      VStack(alignment: .leading, spacing: 8) {
        Text(RhythmLiveActivityCopy.statusLabel(for: state))
          .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        Text(RhythmLiveActivityCopy.title(for: state))
          .font(.headline).lineLimit(2).minimumScaleFactor(0.75)
        RhythmLiveActivityDetail(state: state, suppressAffirmationOnly: false)
      }
      .padding(.horizontal, 16).padding(.vertical, 12)
    }
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
      if RhythmLiveActivityCopy.hasActiveFocus(state) {
        if let ends = state.focusEndsAt {
          Label { Text(ends, style: .timer).lineLimit(1) } icon: { Image(systemName: "timer") }
            .font(.title3.monospacedDigit())
        }
      } else if RhythmLiveActivityCopy.hasActiveDeparture(state) {
        if let departure = state.departureAt {
          Label { Text(departure, style: .relative).lineLimit(1) } icon: { Image(systemName: "figure.walk") }
            .font(.caption)
        }
      } else if RhythmLiveActivityCopy.hasActiveNext(state) {
        if let title = state.nextScheduleTitle, let date = state.nextScheduleAt {
          Label { Text(title).lineLimit(1) } icon: { Image(systemName: "calendar") }
          Text(date, style: .time).font(.caption2).foregroundStyle(.secondary)
        }
      } else if RhythmLiveActivityCopy.isAffirmationOnly(state) && !suppressAffirmationOnly {
        RhythmLiveActivityAffirmation(text: state.affirmationText)
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
      if RhythmLiveActivityCopy.hasActiveFocus(state), let date = state.focusEndsAt {
        Text(date, style: .timer).font(.caption2.monospacedDigit())
      } else if RhythmLiveActivityCopy.hasActiveDeparture(state), let date = state.departureAt {
        Text(date, style: .timer).font(.caption2.monospacedDigit())
      } else if RhythmLiveActivityCopy.hasActiveNext(state), let date = state.nextScheduleAt {
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
    if RhythmLiveActivityCopy.hasActiveFocus(state) { return "集中タイム。\(title)" }
    if RhythmLiveActivityCopy.hasActiveDeparture(state) { return "出発。\(title)" }
    if RhythmLiveActivityCopy.hasActiveNext(state) { return "次の予定。\(title)" }
    if RhythmLiveActivityCopy.isAffirmationOnly(state) { return "アファメーション。\(title)" }
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
