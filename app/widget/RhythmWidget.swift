import SwiftUI
import UIKit
import WidgetKit

private let appGroup = "group.app.rhythm.daily"
private let snapshotKey = "rhythmWidgetSnapshot"

// These models are shared by the TimelineProvider and the widget view. Keep
// them at the file's default (internal) visibility so protocol requirements
// can expose RhythmWidgetEntry without leaking a private type.
struct WidgetSnapshot: Codable {
  struct Task: Codable { let id: String; let title: String }
  struct Plan: Codable {
    let id: String?
    let title: String
    let scheduledAt: Date
    let allDay: Bool?
    let departureAt: Date?
  }

  let updatedAt: Date
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
    if let departureAt = snapshot?.nextPlan?.departureAt, departureAt > now {
      return min(departureAt.addingTimeInterval(60), now.addingTimeInterval(30 * 60))
    }
    return now.addingTimeInterval(30 * 60)
  }
}

struct RhythmWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    if let snapshot = entry.snapshot, snapshot.currentTask != nil || snapshot.nextPlan != nil {
      VStack(alignment: .leading, spacing: 10) {
        Text("Rhythm")
          .font(.headline.weight(.semibold))
        if let task = snapshot.currentTask {
          Link(destination: URL(string: "rhythm://todo")!) {
            WidgetRow(label: "今はこれ", value: task.title)
          }
        } else {
          WidgetRow(label: "今はこれ", value: "予定なし")
        }
        if let plan = snapshot.nextPlan {
          Link(destination: URL(string: "rhythm://schedule")!) {
            VStack(alignment: .leading, spacing: 3) {
              WidgetRow(label: "次の予定", value: plan.allDay == true ? plan.title : "\(plan.scheduledAt.formatted(date: .omitted, time: .shortened))  \(plan.title)")
              if let departureAt = plan.departureAt {
                HStack(spacing: 6) {
                  Text("出発まで")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                  Text(departureAt, style: .relative)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tint)
                }
              }
            }
          }
        } else {
          WidgetRow(label: "次の予定", value: "ありません")
        }
      }
      .rhythmWidgetBackground()
    } else {
      VStack(alignment: .leading, spacing: 8) {
        Text("Rhythm").font(.headline.weight(.semibold))
        Text("今日はゆっくりで大丈夫")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .rhythmWidgetBackground()
    }
  }
}

private struct WidgetRow: View {
  let label: String
  let value: String

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
      Text(value)
        .font(.subheadline.weight(.medium))
        .lineLimit(1)
    }
  }
}

private extension View {
  @ViewBuilder
  func rhythmWidgetBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    } else {
      self.background(Color(uiColor: .systemBackground))
    }
  }
}

struct RhythmWidget: Widget {
  let kind = "RhythmWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: RhythmWidgetProvider()) { entry in
      RhythmWidgetView(entry: entry)
    }
    .configurationDisplayName("Rhythm")
    .description("今やることと次の予定を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}
