import SwiftUI
import UIKit
import WidgetKit

private let appGroup = "group.app.rhythm.daily"
private let snapshotKey = "rhythmWidgetSnapshot"

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
    let accentHex: String?
  }

  struct Task: Codable {
    let id: String
    let title: String
    let startAt: Date?
    let estimatedMinutes: Int?
    let remainingMinutes: Int?
    let status: String?
    let priority: String?
  }

  struct Plan: Codable {
    let id: String?
    let title: String
    let scheduledAt: Date
    let location: String?
    let allDay: Bool?
    let leaveAt: Date?
    let remainingToLeave: Int?
    /// Kept for snapshots written before the expanded `leaveAt` field.
    let departureAt: Date?
  }

  let updatedAt: Date
  let appearance: Appearance?
  let currentTask: Task?
  let nextPlan: Plan?
}

struct RhythmWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct RhythmWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> RhythmWidgetEntry {
    RhythmWidgetEntry(date: .now, snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (RhythmWidgetEntry) -> Void) {
    completion(RhythmWidgetEntry(date: .now, snapshot: loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RhythmWidgetEntry>) -> Void) {
    let now = Date()
    let snapshot = loadSnapshot()
    let refresh = nextRefreshDate(snapshot: snapshot, from: now)
    completion(Timeline(entries: [RhythmWidgetEntry(date: now, snapshot: snapshot)], policy: .after(refresh)))
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
      throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid widget snapshot date")
    }
    return try? decoder.decode(WidgetSnapshot.self, from: data)
  }

  private func nextRefreshDate(snapshot: WidgetSnapshot?, from now: Date) -> Date {
    // SwiftUI's relative date label changes itself. This is only a low-frequency
    // safety refresh for passed departure times or a new app snapshot.
    let departureAt = snapshot?.nextPlan?.leaveAt ?? snapshot?.nextPlan?.departureAt
    if let departureAt, departureAt > now {
      return min(departureAt.addingTimeInterval(60), now.addingTimeInterval(30 * 60))
    }
    return now.addingTimeInterval(30 * 60)
  }
}

private struct WidgetPalette {
  let foreground: Color
  let secondary: Color
  let accent: Color
  let background: Color

  static func forAppearance(_ appearance: WidgetSnapshot.Appearance?) -> WidgetPalette {
    let style = appearance?.style ?? .mono
    let accent = appearance?.accentHex.map(Color.init(hex:)) ?? Color.accentColor
    switch style {
    case .mono:
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: Color.primary, background: Color(uiColor: .systemBackground))
    case .color:
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: accent, background: Color(uiColor: .systemBackground))
    case .photo:
      // Photo assets are not shared with the extension yet. Keep the same
      // readable surface while preserving a style slot for the future asset.
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: accent, background: Color(uiColor: .systemBackground))
    }
  }
}

struct RhythmWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, snapshot.currentTask != nil || snapshot.nextPlan != nil {
        VStack(alignment: .leading, spacing: 10) {
          Text("Rhythm")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          if let task = snapshot.currentTask {
            Link(destination: URL(string: "rhythm://todo")!) {
              WidgetTaskRow(task: task, palette: palette)
            }
          } else {
            WidgetRow(label: "今はこれ", value: "予定なし", palette: palette)
          }
          if let plan = snapshot.nextPlan {
            Link(destination: URL(string: "rhythm://schedule")!) {
              WidgetPlanRow(plan: plan, palette: palette)
            }
          } else {
            WidgetRow(label: "次の予定", value: "ありません", palette: palette)
          }
        }
      } else {
        VStack(alignment: .leading, spacing: 8) {
          Text("Rhythm")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          Text("今日はゆっくりで大丈夫")
            .font(.subheadline)
            .foregroundStyle(palette.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
    }
    .rhythmWidgetBackground(palette.background)
  }
}

private struct CurrentTaskWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let task = entry.snapshot?.currentTask {
        Link(destination: URL(string: "rhythm://todo")!) {
          VStack(alignment: .leading, spacing: 7) {
            Text("今はこれ")
              .font(.caption.weight(.semibold))
              .foregroundStyle(palette.accent)
            Text(task.title)
              .font(.headline.weight(.semibold))
              .foregroundStyle(palette.foreground)
              .lineLimit(3)
            if let startAt = task.startAt {
              Label(startAt.formatted(date: .omitted, time: .shortened), systemImage: "clock")
                .font(.caption)
                .foregroundStyle(palette.secondary)
            }
            if let remaining = task.remainingMinutes {
              Text("開始まで \(remaining)分")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.accent)
            } else if let priority = task.priority {
              Text("優先度 \(priority)")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
      } else {
        VStack(alignment: .leading, spacing: 6) {
          Text("今はこれ")
            .font(.caption.weight(.semibold))
            .foregroundStyle(palette.accent)
          Text("やることはありません")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(palette.foreground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .rhythmWidgetBackground(palette.background)
  }
}

private struct NextScheduleWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let plan = entry.snapshot?.nextPlan {
        Link(destination: URL(string: "rhythm://schedule")!) {
          VStack(alignment: .leading, spacing: 7) {
            Text("次の予定")
              .font(.caption.weight(.semibold))
              .foregroundStyle(palette.accent)
            Text(plan.title)
              .font(.headline.weight(.semibold))
              .foregroundStyle(palette.foreground)
              .lineLimit(2)
            if plan.allDay == true {
              Text("終日")
                .font(.caption)
                .foregroundStyle(palette.secondary)
            } else {
              Text(plan.scheduledAt, style: .time)
                .font(.caption)
                .foregroundStyle(palette.secondary)
            }
            if let location = plan.location, !location.isEmpty {
              Label(location, systemImage: "mappin.and.ellipse")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
                .lineLimit(1)
            }
            if let remaining = plan.remainingToLeave {
              Text("出発まで \(remaining)分")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.accent)
            } else if let leaveAt = plan.leaveAt ?? plan.departureAt {
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
    .rhythmWidgetBackground(palette.background)
  }
}

private struct WidgetTaskRow: View {
  let task: WidgetSnapshot.Task
  let palette: WidgetPalette

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("今はこれ")
        .font(.caption)
        .foregroundStyle(palette.secondary)
      Text(task.title)
        .font(.subheadline.weight(.medium))
        .foregroundStyle(palette.foreground)
        .lineLimit(1)
      if let startAt = task.startAt {
        Text(startAt, style: .time)
          .font(.caption2)
          .foregroundStyle(palette.secondary)
      }
    }
  }
}

private struct WidgetPlanRow: View {
  let plan: WidgetSnapshot.Plan
  let palette: WidgetPalette

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      WidgetRow(label: "次の予定", value: plan.allDay == true ? plan.title : "\(plan.scheduledAt.formatted(date: .omitted, time: .shortened))  \(plan.title)", palette: palette)
      if let location = plan.location, !location.isEmpty {
        Text(location)
          .font(.caption2)
          .foregroundStyle(palette.secondary)
          .lineLimit(1)
      }
      if let leaveAt = plan.leaveAt ?? plan.departureAt {
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

private extension View {
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

/// The original combined widget remains available for existing placements.
struct RhythmWidget: Widget {
  let kind = "RhythmWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: RhythmWidgetProvider()) { entry in
      RhythmWidgetView(entry: entry)
    }
    .configurationDisplayName("今はこれ＋次の予定")
    .description("今やることと次の予定を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmCurrentTaskWidget: Widget {
  let kind = "RhythmCurrentTaskWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: RhythmWidgetProvider()) { entry in
      CurrentTaskWidgetView(entry: entry)
    }
    .configurationDisplayName("今はこれ")
    .description("今やることをすぐ確認できます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct RhythmNextScheduleWidget: Widget {
  let kind = "RhythmNextScheduleWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: RhythmWidgetProvider()) { entry in
      NextScheduleWidgetView(entry: entry)
    }
    .configurationDisplayName("次の予定")
    .description("次の予定と出発時刻を確認できます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
