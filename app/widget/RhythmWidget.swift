import Foundation
import SwiftUI
import UIKit
import WidgetKit
import Intents

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
    let photoFileName: String?
    let photoLayout: String?
    let designPattern: String?
    let designCheckColor: String?
    let designPatternUnlocked: Bool?
    let affirmationBackgrounds: [String]?
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

  struct ScheduleItem: Codable {
    let id: String?
    let title: String
    let scheduledAt: Date
    let location: String?
    let allDay: Bool?
    let leaveAt: Date?
  }

  struct MonthDay: Codable {
    let date: String
    let day: Int
    let weekdayIndex: Int
    let hasSchedule: Bool
    let scheduleCount: Int
    let isToday: Bool
  }

  struct CalendarMonth: Codable {
    let year: Int
    let month: Int
    let leadingEmptyCount: Int
    let days: [MonthDay]
  }

  struct WeekDay: Codable {
    let date: String
    let day: Int
    let weekday: String
    let isToday: Bool
    let schedules: [ScheduleItem]
  }

  struct CalendarWeek: Codable {
    let startDate: String
    let days: [WeekDay]
  }

  struct Goal: Codable {
    let id: String
    let title: String
    let progress: Int
    let completedActions: Int
    let actionCount: Int
  }

  struct ChecklistItem: Codable {
    let id: String
    let title: String
    let done: Bool
  }

  struct AffirmationItem: Codable {
    let id: String
    let text: String
  }

  let updatedAt: Date
  let appearance: Appearance?
  let displayOptions: [String: Bool]?
  let currentTask: Task?
  let nextPlan: Plan?
  let calendarMonth: CalendarMonth?
  let calendarWeek: CalendarWeek?
  let todaySchedules: [ScheduleItem]?
  let todayScheduleCount: Int?
  let checklist: [ChecklistItem]?
  let goal: Goal?
  let affirmations: [AffirmationItem]?
  let affirmationPhotoFileNames: [String]?

  /// Older snapshots do not contain displayOptions. Treat missing or malformed
  /// entries as enabled so an upgrade never hides existing widget content.
  func isDisplayOptionEnabled(_ key: String) -> Bool {
    displayOptions?[key] ?? true
  }
}

struct RhythmWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
  let affirmationTextOverride: String?
  let affirmationPhotoFileNameOverride: String?

  init(date: Date, snapshot: WidgetSnapshot?, affirmationTextOverride: String? = nil, affirmationPhotoFileNameOverride: String? = nil) {
    self.date = date
    self.snapshot = snapshot
    self.affirmationTextOverride = affirmationTextOverride
    self.affirmationPhotoFileNameOverride = affirmationPhotoFileNameOverride
  }
}

/// iOS 15-compatible Home Screen configuration. Xcode generates this type
/// from RhythmWidgetConfiguration.intentdefinition in the Widget target.
private typealias RhythmWidgetIntent = RhythmWidgetConfigurationIntent

/// Gallery-only content used to show the finished widget design before a user
/// has written any data. This is never returned from getTimeline, so sample
/// values cannot reach a widget installed on the Home Screen.
private func gallerySampleSnapshot(now: Date = Date()) -> WidgetSnapshot {
  var calendar = Calendar.current
  calendar.timeZone = .current
  let today = calendar.startOfDay(for: now)
  let isoDay: (Date) -> String = { date in
    let formatter = DateFormatter()
    formatter.calendar = calendar
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }
  let dateAt: (Date, Int, Int) -> Date = { date, hour, minute in
    calendar.date(bySettingHour: hour, minute: minute, second: 0, of: date) ?? date
  }
  let taskStart = dateAt(today, 15, 10)
  let nextSchedule = dateAt(today, 18, 0)
  let leaveAt = dateAt(today, 16, 18)
  let sampleSchedules: [(String, Int, Int, String)] = [
    ("会議", 9, 0, "会議室"),
    ("資料提出", 10, 30, ""),
    ("打ち合わせ", 15, 0, ""),
    ("美容院", 18, 0, "駅前"),
  ]
  let todayItems = sampleSchedules.enumerated().map { index, item in
    WidgetSnapshot.ScheduleItem(
      id: "gallery-today-\(index)",
      title: item.0,
      scheduledAt: dateAt(today, item.1, item.2),
      location: item.3.isEmpty ? nil : item.3,
      allDay: false,
      leaveAt: nil
    )
  }
  let weekStart = calendar.date(byAdding: .day, value: 1 - calendar.component(.weekday, from: today), to: today) ?? today
  let weekDaySchedules: [Int: (String, Int, Int)] = [
    1: ("会議", 9, 0),
    2: ("資料提出", 10, 30),
    3: ("打ち合わせ", 15, 0),
    5: ("美容院", 18, 0),
  ]
  let weekDays = (0..<7).map { index in
    let date = calendar.date(byAdding: .day, value: index, to: weekStart) ?? weekStart
    let schedules: [WidgetSnapshot.ScheduleItem]
    if let item = weekDaySchedules[index] {
      schedules = [WidgetSnapshot.ScheduleItem(
        id: "gallery-week-\(index)",
        title: item.0,
        scheduledAt: dateAt(date, item.1, item.2),
        location: nil,
        allDay: false,
        leaveAt: nil
      )]
    } else {
      schedules = []
    }
    return WidgetSnapshot.WeekDay(
      date: isoDay(date),
      day: calendar.component(.day, from: date),
      weekday: ["日", "月", "火", "水", "木", "金", "土"][calendar.component(.weekday, from: date) - 1],
      isToday: calendar.isDate(date, inSameDayAs: today),
      schedules: schedules
    )
  }
  let monthComponents = calendar.dateComponents([.year, .month], from: today)
  let monthStart = calendar.date(from: monthComponents) ?? today
  let daysInMonth = calendar.range(of: .day, in: .month, for: monthStart) ?? (1..<32)
  let scheduledDays: Set<Int> = [3, 8, 14, 22]
  let monthDays = daysInMonth.map { day in
    let date = calendar.date(bySetting: .day, value: day, of: monthStart) ?? monthStart
    return WidgetSnapshot.MonthDay(
      date: isoDay(date),
      day: day,
      weekdayIndex: calendar.component(.weekday, from: date) - 1,
      hasSchedule: scheduledDays.contains(day),
      scheduleCount: scheduledDays.contains(day) ? 1 : 0,
      isToday: calendar.isDate(date, inSameDayAs: today)
    )
  }
  return WidgetSnapshot(
    updatedAt: now,
    appearance: WidgetSnapshot.Appearance(style: .color, accentHex: "#8EA6FF", photoFileName: nil, photoLayout: nil, designPattern: "dot", designCheckColor: "cool", designPatternUnlocked: true, affirmationBackgrounds: ["floral", "dot", "check"]),
    displayOptions: nil,
    currentTask: WidgetSnapshot.Task(id: "gallery-task", title: "資料をまとめる", startAt: taskStart, estimatedMinutes: 45, remainingMinutes: 25, status: "active", priority: "中"),
    nextPlan: WidgetSnapshot.Plan(id: "gallery-plan", title: "美容院", scheduledAt: nextSchedule, location: "駅前", allDay: false, leaveAt: leaveAt, remainingToLeave: 102, departureAt: leaveAt),
    calendarMonth: WidgetSnapshot.CalendarMonth(year: monthComponents.year ?? calendar.component(.year, from: today), month: monthComponents.month ?? calendar.component(.month, from: today), leadingEmptyCount: calendar.component(.weekday, from: monthStart) - 1, days: monthDays),
    calendarWeek: WidgetSnapshot.CalendarWeek(startDate: isoDay(weekStart), days: weekDays),
    todaySchedules: todayItems,
    todayScheduleCount: todayItems.count,
    checklist: [
      WidgetSnapshot.ChecklistItem(id: "gallery-wallet", title: "財布", done: true),
      WidgetSnapshot.ChecklistItem(id: "gallery-keys", title: "鍵", done: false),
      WidgetSnapshot.ChecklistItem(id: "gallery-charger", title: "充電器", done: false),
      WidgetSnapshot.ChecklistItem(id: "gallery-medicine", title: "薬", done: false),
    ],
    goal: WidgetSnapshot.Goal(id: "gallery-goal", title: "アプリ完成", progress: 60, completedActions: 1, actionCount: 2),
    affirmations: [
      WidgetSnapshot.AffirmationItem(id: "gallery-affirmation-1", text: "私は私のペースで進めばいい"),
      WidgetSnapshot.AffirmationItem(id: "gallery-affirmation-2", text: "小さくても、今日も前に進んでいる"),
    ],
    affirmationPhotoFileNames: nil
  )
}

struct RhythmWidgetProvider: IntentTimelineProvider {
  typealias Intent = RhythmWidgetIntent
  let widgetKind: String?

  init(widgetKind: String? = nil) {
    self.widgetKind = widgetKind
  }

  func placeholder(in context: Context) -> RhythmWidgetEntry {
    RhythmWidgetEntry(date: .now, snapshot: gallerySampleSnapshot())
  }

  func getSnapshot(for configuration: RhythmWidgetIntent, in context: Context, completion: @escaping (RhythmWidgetEntry) -> Void) {
    let snapshot = context.isPreview ? gallerySampleSnapshot() : loadSnapshot().map { applying(configuration, to: $0) }
    completion(RhythmWidgetEntry(date: .now, snapshot: snapshot))
  }

  func getTimeline(for configuration: RhythmWidgetIntent, in context: Context, completion: @escaping (Timeline<RhythmWidgetEntry>) -> Void) {
    let now = Date()
    let snapshot = loadSnapshot().map { applying(configuration, to: $0) }
    if widgetKind == "RhythmAffirmationWidget", configuration.affirmationMode?.identifier == "automatic", let snapshot, let affirmations = snapshot.affirmations, !affirmations.isEmpty {
      var calendar = Calendar.current
      calendar.timeZone = .current
      let hours = [7, 12, 17, 21]
      let photoNames = snapshot.affirmationPhotoFileNames ?? []
      let startOfDay = calendar.startOfDay(for: now)
      let entries: [RhythmWidgetEntry] = hours.enumerated().compactMap { index, hour in
        guard let date = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: startOfDay), date > now else { return nil }
        let text = affirmations[index % affirmations.count].text
        let photo = photoNames.isEmpty ? nil : photoNames[index % photoNames.count]
        return RhythmWidgetEntry(date: date, snapshot: snapshot, affirmationTextOverride: text, affirmationPhotoFileNameOverride: photo)
      }
      let tomorrow = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay
      let nextEntries = hours.enumerated().compactMap { index, hour -> RhythmWidgetEntry? in
        guard let date = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: tomorrow) else { return nil }
        let text = affirmations[(index + entries.count) % affirmations.count].text
        let photo = photoNames.isEmpty ? nil : photoNames[(index + entries.count) % photoNames.count]
        return RhythmWidgetEntry(date: date, snapshot: snapshot, affirmationTextOverride: text, affirmationPhotoFileNameOverride: photo)
      }
      completion(Timeline(entries: entries + nextEntries, policy: .atEnd))
      return
    }
    let refresh = nextRefreshDate(snapshot: snapshot, from: now)
    completion(Timeline(entries: [RhythmWidgetEntry(date: now, snapshot: snapshot)], policy: .after(refresh)))
  }

  private func applying(_ configuration: RhythmWidgetIntent, to snapshot: WidgetSnapshot) -> WidgetSnapshot {
    guard let stored = snapshot.appearance else { return snapshot }
    let styleId = configuration.appearance?.identifier
    let patternId = configuration.designPattern?.identifier
    let colorId = configuration.designColor?.identifier
    let layoutId = configuration.photoLayout?.identifier
    let style = styleId == "photo" ? WidgetSnapshot.Style.photo : styleId == "design" ? WidgetSnapshot.Style.color : styleId == "color" ? WidgetSnapshot.Style.color : styleId == "mono" ? WidgetSnapshot.Style.mono : stored.style
    let pattern = stored.designPatternUnlocked == true ? (patternId ?? stored.designPattern) : stored.designPattern
    let layout = layoutId ?? stored.photoLayout
    let appearance = WidgetSnapshot.Appearance(style: style, accentHex: stored.accentHex, photoFileName: stored.photoFileName, photoLayout: layout, designPattern: pattern, designCheckColor: colorId ?? stored.designCheckColor, designPatternUnlocked: stored.designPatternUnlocked, affirmationBackgrounds: stored.affirmationBackgrounds)
    return WidgetSnapshot(updatedAt: snapshot.updatedAt, appearance: appearance, displayOptions: snapshot.displayOptions, currentTask: snapshot.currentTask, nextPlan: snapshot.nextPlan, calendarMonth: snapshot.calendarMonth, calendarWeek: snapshot.calendarWeek, todaySchedules: snapshot.todaySchedules, todayScheduleCount: snapshot.todayScheduleCount, checklist: snapshot.checklist, goal: snapshot.goal, affirmations: snapshot.affirmations, affirmationPhotoFileNames: snapshot.affirmationPhotoFileNames)
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
  let divider: Color
  let designPattern: String?
  let designCheckColor: String?

  static func forAppearance(_ appearance: WidgetSnapshot.Appearance?) -> WidgetPalette {
    let style = appearance?.style ?? .mono
    let accent = appearance?.accentHex.map(Color.init(hex:)) ?? Color.accentColor
    let photoAvailable = appearance?.photoFileName.map { loadWidgetPhoto($0) != nil } ?? false
    let photoBackground = style == .photo && appearance?.photoLayout == "background" && photoAvailable
    switch style {
    case .mono:
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: Color.primary, background: Color(uiColor: .systemBackground), divider: Color.primary.opacity(0.12), designPattern: nil, designCheckColor: nil)
    case .color:
      let pattern = appearance?.designPattern
      let colors = DesignPatternColors(checkColor: appearance?.designCheckColor)
      let background = pattern.map { colors.background(for: $0) } ?? accent.opacity(0.07)
      return WidgetPalette(foreground: Color.primary, secondary: Color.secondary, accent: accent, background: background, divider: accent.opacity(0.22), designPattern: pattern, designCheckColor: appearance?.designCheckColor)
    case .photo:
      // The photo layer is applied by WidgetSurface. Keep a readable Mono
      // palette underneath it so missing or stale images fall back safely.
      return WidgetPalette(foreground: photoBackground ? .white : Color.primary, secondary: photoBackground ? .white.opacity(0.78) : Color.secondary, accent: accent, background: Color(uiColor: .systemBackground), divider: photoBackground ? .white.opacity(0.3) : Color.primary.opacity(0.12), designPattern: nil, designCheckColor: nil)
    }
  }
}

private struct DesignPatternColors {
  let background: Color
  let stripe: Color
  let accent: Color

  init(checkColor: String?) {
    switch checkColor {
    case "monochrome":
      background = Color(hex: "F4F1EE"); stripe = Color(hex: "D8D3D6"); accent = Color(hex: "343237")
    case "warm":
      background = Color(hex: "FBF1F3"); stripe = Color(hex: "EBCFD7"); accent = Color(hex: "B66E86")
    case "green":
      background = Color(hex: "F2F6F0"); stripe = Color(hex: "D3E0D4"); accent = Color(hex: "758D7B")
    default:
      background = Color(hex: "F4F3FA"); stripe = Color(hex: "D8D6EA"); accent = Color(hex: "9C91C4")
    }
  }

  func background(for pattern: String) -> Color {
    switch pattern {
    case "floral": return Color(hex: "F8F1EC")
    case "floralSoft": return Color(hex: "FBFAF7")
    case "floralSeasonal", "floralDark": return Color(hex: "FCF3F5")
    default: return background
    }
  }
}

private func loadWidgetPhoto(_ fileName: String?) -> Image? {
  guard let fileName, !fileName.isEmpty, fileName == URL(fileURLWithPath: fileName).lastPathComponent,
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
  let url = container.appendingPathComponent(fileName)
  guard let image = UIImage(contentsOfFile: url.path) else { return nil }
  return Image(uiImage: image)
}

/// Reuses the app's persisted Design identifiers. The geometry mirrors the
/// existing React Native decoration (dot spacing and check band proportions)
/// and stays a low-opacity layer so widget content remains readable.
private struct DesignPatternLayer: View {
  let pattern: String
  let colors: DesignPatternColors

  @ViewBuilder
  var body: some View {
    GeometryReader { proxy in
      switch pattern {
      case "dot":
        let columns = max(1, Int(ceil(proxy.size.width / 25)) + 1)
        let rows = max(1, Int(ceil(proxy.size.height / 22)) + 1)
        ZStack(alignment: .topLeading) {
          ForEach(0..<(columns * rows), id: \.self) { index in
            let row = index / columns
            let column = index % columns
            let size: CGFloat = index % 3 == 0 ? 6 : index % 2 == 0 ? 4 : 3
            Circle()
              .fill((index % 2 == 0 ? colors.accent : colors.stripe).opacity(0.32))
              .frame(width: size, height: size)
              .offset(x: 4 + CGFloat(column) * 25 + (row % 2 == 1 ? 12.5 : 0), y: 5 + CGFloat(row) * 22)
          }
        }
      case "checkLavenderSatin", "checkBeigeNoir", "checkMauveFrame":
        let cell: CGFloat = pattern == "checkLavenderSatin" ? 32 : pattern == "checkBeigeNoir" ? 14 : 22
        let band = cell * 0.36
        let countX = max(1, Int(ceil(proxy.size.width / cell)) + 2)
        let countY = max(1, Int(ceil(proxy.size.height / cell)) + 2)
        ZStack(alignment: .topLeading) {
          ForEach(0..<countX, id: \.self) { index in
            Rectangle().fill(colors.stripe.opacity(0.18)).frame(width: band, height: proxy.size.height).offset(x: CGFloat(index) * cell + (cell - band) / 2)
          }
          ForEach(0..<countY, id: \.self) { index in
            Rectangle().fill(colors.stripe.opacity(0.16)).frame(width: proxy.size.width, height: band).offset(y: CGFloat(index) * cell + (cell - band) / 2)
          }
          ForEach(0..<(countX * countY), id: \.self) { index in
            let column = index % countX
            let row = index / countX
            Rectangle().fill(colors.stripe.opacity(0.24)).frame(width: band, height: band).offset(x: CGFloat(column) * cell + (cell - band) / 2, y: CGFloat(row) * cell + (cell - band) / 2)
          }
        }
      case "floral", "floralSoft", "floralSeasonal", "floralDark":
        // The source image names are the same existing app Design assets. If
        // a target omits one, Image renders safely as an empty image and the
        // neutral palette background remains visible.
        Image(pattern == "floralSoft" ? "botanical-line" : pattern == "floral" ? "vintage-bloom" : "sheer-floral")
          .resizable()
          .scaledToFill()
          .opacity(0.20)
          .frame(width: proxy.size.width, height: proxy.size.height)
          .clipped()
      default:
        Color.clear
      }
    }
    .allowsHitTesting(false)
  }
}

private struct WidgetSurface<Content: View>: View {
  let palette: WidgetPalette
  let appearance: WidgetSnapshot.Appearance?
  let content: Content

  init(palette: WidgetPalette, appearance: WidgetSnapshot.Appearance?, @ViewBuilder content: () -> Content) {
    self.palette = palette
    self.appearance = appearance
    self.content = content()
  }

  @ViewBuilder
  private func photoLayer(_ image: Image, layout: String, size: CGSize) -> some View {
    switch layout {
    case "right", "side":
      HStack(spacing: 0) {
        Spacer(minLength: 0)
        image.resizable().scaledToFill().frame(width: size.width * 0.34, height: size.height).clipped()
      }
    case "top":
      VStack(spacing: 0) {
        image.resizable().scaledToFill().frame(width: size.width, height: size.height * 0.36).clipped()
        Spacer(minLength: 0)
      }
    case "card":
      image.resizable().scaledToFill()
        .frame(width: min(size.width * 0.5, 150), height: min(size.height * 0.46, 92))
        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).stroke(Color.white.opacity(0.9), lineWidth: 4))
        .shadow(color: .black.opacity(0.18), radius: 5, y: 2)
        .rotationEffect(.degrees(2))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(10)
    case "circle":
      image.resizable().scaledToFill()
        .frame(width: min(size.width * 0.42, 100), height: min(size.width * 0.42, 100))
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.white.opacity(0.95), lineWidth: 3))
        .shadow(color: .black.opacity(0.18), radius: 4, y: 2)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        .padding(11)
    default:
      ZStack {
        image.resizable().scaledToFill().frame(width: size.width, height: size.height).clipped()
        LinearGradient(colors: [Color.black.opacity(0.38), Color.black.opacity(0.08), Color.black.opacity(0.32)], startPoint: .topLeading, endPoint: .bottomTrailing)
      }
    }
  }

  var body: some View {
    GeometryReader { proxy in
      let photo = appearance?.style == .photo ? loadWidgetPhoto(appearance?.photoFileName) : nil
      let photoLayout = appearance?.photoLayout
      let trailingInset: CGFloat = {
        guard photo != nil else { return 0 }
        switch photoLayout {
        case "side": return proxy.size.width * 0.30
        case "card", "circle": return proxy.size.width * 0.16
        default: return 0
        }
      }()
      ZStack {
        palette.background
        if palette.designPattern != nil, palette.designPattern != "plain", let pattern = palette.designPattern {
          DesignPatternLayer(pattern: pattern, colors: DesignPatternColors(checkColor: palette.designCheckColor))
        }
        if let photo, let layout = appearance?.photoLayout {
          photoLayer(photo, layout: layout, size: proxy.size)
        }
        content
          .padding(12)
          .padding(.trailing, trailingInset)
          .padding(.top, photo != nil && appearance?.photoLayout == "top" ? proxy.size.height * 0.27 : 0)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .background(photo != nil && appearance?.style == .photo && appearance?.photoLayout == "background" ? Color.black.opacity(0.16) : Color.clear)
      }
      .clipped()
    }
    .rhythmWidgetBackground(palette.background)
  }
}

private func widgetStatusText(_ status: String) -> String {
  switch status {
  case "active": return "進行中"
  case "completed", "done": return "完了"
  case "skipped": return "スキップ"
  default: return status
  }
}

struct RhythmWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, snapshot.currentTask != nil || snapshot.nextPlan != nil {
        let currentAvailable = snapshot.currentTask != nil
        let nextAvailable = snapshot.nextPlan != nil
        let currentEnabled = snapshot.isDisplayOptionEnabled("currentTask")
        let nextEnabled = snapshot.isDisplayOptionEnabled("nextPlan")
        // A malformed payload must not result in an empty combined widget.
        // Prefer the current task, then the next plan, when the selected
        // section is unavailable or both sections are explicitly disabled.
        let preferredCurrent = currentAvailable && currentEnabled
        let preferredNext = nextAvailable && nextEnabled
        let noPreferredSection = !preferredCurrent && !preferredNext
        let showCurrent = preferredCurrent || (noPreferredSection && currentAvailable)
        let showNext = preferredNext || (noPreferredSection && !currentAvailable && nextAvailable)
        VStack(alignment: .leading, spacing: 10) {
          Text("RhythmPace")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          if showCurrent, let task = snapshot.currentTask {
            Link(destination: URL(string: "rhythm://todo")!) {
              HStack(alignment: .center, spacing: 8) {
                WidgetTaskRow(task: task, palette: palette)
                Spacer(minLength: 4)
                if snapshot.isDisplayOptionEnabled("remainingTime") { TaskTimerRing(task: task, palette: palette) }
              }
            }
          } else if showCurrent {
            WidgetRow(label: "今はこれ", value: "予定なし", palette: palette)
          }
          if showCurrent && showNext {
            Divider().overlay(palette.divider)
          }
          if showNext, let plan = snapshot.nextPlan {
            Link(destination: URL(string: "rhythm://schedule")!) {
              WidgetPlanRow(
                plan: plan,
                palette: palette,
                showDeparture: snapshot.isDisplayOptionEnabled("combinedRemainingToLeave")
              )
            }
          } else if showNext {
            WidgetRow(label: "次の予定", value: "ありません", palette: palette)
          }
        }
      } else {
        VStack(alignment: .leading, spacing: 8) {
          Text("RhythmPace")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          Text("今日はゆっくりで大丈夫")
            .font(.subheadline)
            .foregroundStyle(palette.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct CurrentTaskWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, let task = snapshot.currentTask {
        Link(destination: URL(string: "rhythm://todo")!) {
          Group {
            if family == .systemMedium {
              HStack(alignment: .center, spacing: 10) {
                TaskInformation(task: task, snapshot: snapshot, palette: palette)
                Spacer(minLength: 4)
                if snapshot.isDisplayOptionEnabled("remainingTime") {
                  TaskTimerRing(task: task, palette: palette)
                }
              }
            } else {
              VStack(alignment: .leading, spacing: 7) {
                Text("今はこれ").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
                Text(task.title).font(.title3.weight(.semibold)).foregroundStyle(palette.foreground).lineLimit(3)
                if snapshot.isDisplayOptionEnabled("remainingTime") { TaskTimerRing(task: task, palette: palette).frame(maxWidth: .infinity, alignment: .center) }
                if snapshot.isDisplayOptionEnabled("startTime"), let startAt = task.startAt { Text(startAt.formatted(date: .omitted, time: .shortened)).font(.caption2).foregroundStyle(palette.secondary) }
                if snapshot.isDisplayOptionEnabled("status"), let status = task.status, !status.isEmpty { Text(widgetStatusText(status)).font(.caption2).foregroundStyle(palette.secondary) }
              }
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
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct TaskInformation: View {
  let task: WidgetSnapshot.Task
  let snapshot: WidgetSnapshot
  let palette: WidgetPalette

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("今はこれ").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
      Text(task.title).font(.title3.weight(.semibold)).foregroundStyle(palette.foreground).lineLimit(3)
      if snapshot.isDisplayOptionEnabled("startTime"), let startAt = task.startAt {
        Label(startAt.formatted(date: .omitted, time: .shortened), systemImage: "clock")
          .font(.caption).foregroundStyle(palette.secondary)
      }
      if snapshot.isDisplayOptionEnabled("status"), let status = task.status, !status.isEmpty {
        Text(widgetStatusText(status)).font(.caption2).foregroundStyle(palette.secondary)
      }
    }
  }
}

private struct TaskTimerRing: View {
  let task: WidgetSnapshot.Task
  let palette: WidgetPalette

  private var progress: Double {
    guard let duration = task.estimatedMinutes, duration > 0, let remaining = task.remainingMinutes else { return 0 }
    return min(1, max(0, 1 - Double(remaining) / Double(duration)))
  }

  var body: some View {
    ZStack {
      Circle().stroke(palette.divider, lineWidth: 5)
      Circle().trim(from: 0, to: progress).stroke(palette.accent, style: StrokeStyle(lineWidth: 5, lineCap: .round)).rotationEffect(.degrees(-90))
      VStack(spacing: 0) {
        Text(task.remainingMinutes.map { "\($0)" } ?? "—").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
        Text("min").font(.caption2).foregroundStyle(palette.secondary)
      }
    }
    .frame(width: 68, height: 68)
    .accessibilityHidden(true)
  }
}

private struct NextScheduleWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let snapshot = entry.snapshot, let plan = snapshot.nextPlan {
        Link(destination: URL(string: "rhythm://schedule")!) {
          VStack(alignment: .leading, spacing: 7) {
            Text("次の予定")
              .font(.caption.weight(.semibold))
              .foregroundStyle(palette.accent)
            Text(plan.title)
              .font(.headline.weight(.semibold))
              .foregroundStyle(palette.foreground)
              .lineLimit(2)
            if snapshot.isDisplayOptionEnabled("scheduleTime"), plan.allDay == true {
              Text("終日")
                .font(.caption)
                .foregroundStyle(palette.secondary)
            } else if snapshot.isDisplayOptionEnabled("scheduleTime") {
              Text(plan.scheduledAt, style: .time)
                .font(.caption)
                .foregroundStyle(palette.secondary)
            }
            if snapshot.isDisplayOptionEnabled("location"), let location = plan.location, !location.isEmpty {
              Label(location, systemImage: "mappin.and.ellipse")
                .font(.caption2)
                .foregroundStyle(palette.secondary)
                .lineLimit(1)
            }
            if snapshot.isDisplayOptionEnabled("remainingToLeave"), let remaining = plan.remainingToLeave {
              Text("出発まで \(remaining)分")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.accent)
            } else if snapshot.isDisplayOptionEnabled("remainingToLeave"), let leaveAt = plan.leaveAt ?? plan.departureAt {
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
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
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
  let showDeparture: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      WidgetRow(label: "次の予定", value: plan.allDay == true ? plan.title : "\(plan.scheduledAt.formatted(date: .omitted, time: .shortened))  \(plan.title)", palette: palette)
      if let location = plan.location, !location.isEmpty {
        Text(location)
          .font(.caption2)
          .foregroundStyle(palette.secondary)
          .lineLimit(1)
      }
      if showDeparture, let leaveAt = plan.leaveAt ?? plan.departureAt {
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

private struct MonthlyCalendarWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let month = entry.snapshot?.calendarMonth {
        VStack(alignment: .leading, spacing: 6) {
          Text("\(month.year)年\(month.month)月")
            .font(.headline.weight(.semibold))
            .foregroundStyle(palette.foreground)
          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 4) {
            ForEach(["日", "月", "火", "水", "木", "金", "土"], id: \.self) { label in
              Text(label).font(.caption2).foregroundStyle(palette.secondary)
            }
            ForEach(0..<max(0, month.leadingEmptyCount), id: \.self) { _ in
              Color.clear.frame(height: 18)
            }
            ForEach(Array(month.days.enumerated()), id: \.offset) { _, day in
              VStack(spacing: 1) {
                Text("\(day.day)")
                  .font(.caption2.weight(day.isToday ? .bold : .regular))
                  .foregroundStyle(day.isToday ? palette.background : palette.foreground)
                  .frame(width: 22, height: 18)
                  .background(day.isToday ? palette.accent : Color.clear, in: Circle())
                Circle()
                  .fill(day.hasSchedule ? palette.accent : Color.clear)
                  .frame(width: 3, height: 3)
              }
            }
          }
        }
      } else {
        Text("今月の予定はありません").font(.subheadline).foregroundStyle(palette.secondary)
      }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct WeeklyCalendarWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let week = entry.snapshot?.calendarWeek {
        VStack(alignment: .leading, spacing: 6) {
          Text("今週の予定").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          if family == .systemLarge {
            VStack(spacing: 4) {
              ForEach(Array(week.days.enumerated()), id: \.offset) { _, day in
                HStack(alignment: .top, spacing: 8) {
                  Text("\(day.weekday) \(day.day)").font(.caption.weight(day.isToday ? .bold : .regular)).foregroundStyle(day.isToday ? palette.accent : palette.secondary).frame(width: 44, alignment: .leading)
                  if day.schedules.isEmpty { Text("予定なし").font(.caption2).foregroundStyle(palette.secondary) }
                  else { Text(day.schedules.map { $0.title }.joined(separator: "・")).font(.caption2).foregroundStyle(palette.foreground).lineLimit(1) }
                }
              }
            }
          } else {
            HStack(alignment: .top, spacing: 2) {
              ForEach(Array(week.days.enumerated()), id: \.offset) { _, day in
                VStack(spacing: 3) {
                  Text(day.weekday).font(.caption2.weight(day.isToday ? .bold : .regular)).foregroundStyle(day.isToday ? palette.accent : palette.secondary)
                  Text("\(day.day)").font(.caption2).foregroundStyle(palette.foreground)
                  Text(day.schedules.isEmpty ? "—" : "\(day.schedules.count)").font(.caption2.weight(.semibold)).foregroundStyle(day.schedules.isEmpty ? palette.secondary : palette.accent)
                }.frame(maxWidth: .infinity)
              }
            }
          }
        }
      } else { Text("今週の予定はありません").font(.subheadline).foregroundStyle(palette.secondary) }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct TodayScheduleWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let schedules = entry.snapshot?.todaySchedules, !schedules.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
          Text("今日の予定").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          ForEach(Array(schedules.prefix(5).enumerated()), id: \.offset) { _, item in
            Link(destination: URL(string: "rhythm://schedule")!) {
              HStack(spacing: 6) {
                Text(item.allDay == true ? "終日" : item.scheduledAt.formatted(date: .omitted, time: .shortened)).font(.caption2).foregroundStyle(palette.accent).frame(width: 48, alignment: .leading)
                VStack(alignment: .leading, spacing: 1) {
                  Text(item.title).font(.caption.weight(.medium)).foregroundStyle(palette.foreground).lineLimit(1)
                  if let location = item.location, !location.isEmpty { Text(location).font(.caption2).foregroundStyle(palette.secondary).lineLimit(1) }
                }
              }
            }
          }
          if let total = entry.snapshot?.todayScheduleCount, total > 5 { Text("ほか\(total - 5)件").font(.caption2).foregroundStyle(palette.secondary) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("今日の予定").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground); Text("予定はありません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct ChecklistWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    let limit = family == .systemSmall ? 3 : 5
    Group {
      if let items = entry.snapshot?.checklist, !items.isEmpty {
        VStack(alignment: .leading, spacing: 5) {
          Text("忘れたくない").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          ForEach(Array(items.prefix(limit).enumerated()), id: \.offset) { _, item in
            HStack(spacing: 6) {
              Image(systemName: item.done ? "checkmark.circle.fill" : "circle").foregroundStyle(item.done ? palette.accent : palette.secondary)
              Text(item.title)
                .font(.caption)
                .foregroundStyle(palette.foreground)
                .opacity(item.done ? 0.55 : 1)
                .lineLimit(1)
            }
          }
          if items.count > limit { Text("ほか\(items.count - limit)件").font(.caption2).foregroundStyle(palette.secondary) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("忘れたくない").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground); Text("項目はありません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct GoalWidgetView: View {
  let entry: RhythmWidgetEntry

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Group {
      if let goal = entry.snapshot?.goal {
        VStack(alignment: .leading, spacing: 8) {
          Text("叶えたいこと").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground)
          Text(goal.title).font(.title3.weight(.semibold)).foregroundStyle(palette.foreground).lineLimit(2)
          HStack(spacing: 8) {
            ProgressView(value: Double(goal.progress), total: 100).tint(palette.accent)
            Text("\(goal.progress)%").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
          }
          if goal.actionCount > 0 { Text("行動 \(goal.completedActions)/\(goal.actionCount)").font(.caption2).foregroundStyle(palette.secondary) }
        }
      } else { VStack(alignment: .leading, spacing: 5) { Text("叶えたいこと").font(.headline.weight(.semibold)).foregroundStyle(palette.foreground); Text("まだ登録されていません").font(.subheadline).foregroundStyle(palette.secondary) } }
    }
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct VoiceWidgetView: View {
  let entry: RhythmWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let palette = WidgetPalette.forAppearance(entry.snapshot?.appearance)
    Link(destination: URL(string: "rhythm://voice")!) {
      VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
        Image(systemName: "mic.fill")
          .font(.system(size: family == .systemSmall ? 24 : 28, weight: .semibold))
          .foregroundStyle(palette.accent)
        Text("音声入力")
          .font(.headline.weight(.semibold))
          .foregroundStyle(palette.foreground)
        Text(family == .systemSmall ? "話して予定・タスクを追加" : "タップして音声入力を開始")
          .font(.caption)
          .foregroundStyle(palette.secondary)
          .lineLimit(2)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
    .accessibilityLabel("音声入力。タップしてRhythmPaceで音声入力を開始")
    .rhythmWidgetSurface(palette: palette, appearance: entry.snapshot?.appearance)
  }
}

private struct AffirmationWidgetView: View {
  let entry: RhythmWidgetEntry

  private var text: String {
    entry.affirmationTextOverride
      ?? entry.snapshot?.affirmations?.first?.text
      ?? "アファメーションを設定すると、ここに表示されます"
  }

  var body: some View {
    let snapshot = entry.snapshot
    let baseAppearance = snapshot?.appearance
    let selectedPhoto = entry.affirmationPhotoFileNameOverride ?? snapshot?.affirmationPhotoFileNames?.first
    let appearance: WidgetSnapshot.Appearance? = {
      guard let baseAppearance else { return nil }
      // Automatic entries rotate a bounded list deterministically. Missing or
      // invalid photos simply fall back to the existing Design palette.
      if entry.affirmationTextOverride != nil {
        let backgrounds = baseAppearance.affirmationBackgrounds?.filter { ["floral", "dot", "check", "photo"].contains($0) } ?? ["floral", "dot", "check"]
        let index = (Calendar.current.component(.hour, from: entry.date) / 6) % max(1, backgrounds.count)
        let selectedBackground = backgrounds[index]
        if selectedBackground == "photo", let selectedPhoto {
          return WidgetSnapshot.Appearance(style: .photo, accentHex: baseAppearance.accentHex, photoFileName: selectedPhoto, photoLayout: baseAppearance.photoLayout ?? "background", designPattern: nil, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: baseAppearance.designPatternUnlocked, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
        }
        if baseAppearance.designPatternUnlocked != true {
          return WidgetSnapshot.Appearance(style: .mono, accentHex: baseAppearance.accentHex, photoFileName: nil, photoLayout: baseAppearance.photoLayout, designPattern: nil, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: false, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
        }
        let pattern = selectedBackground == "dot" ? "dot" : selectedBackground == "check" ? "checkLavenderSatin" : "floral"
        return WidgetSnapshot.Appearance(style: .color, accentHex: baseAppearance.accentHex, photoFileName: nil, photoLayout: baseAppearance.photoLayout, designPattern: pattern, designCheckColor: baseAppearance.designCheckColor, designPatternUnlocked: baseAppearance.designPatternUnlocked, affirmationBackgrounds: baseAppearance.affirmationBackgrounds)
      }
      return baseAppearance
    }()
    let palette = WidgetPalette.forAppearance(appearance)
    Link(destination: URL(string: "rhythm://affirmation")!) {
      VStack(alignment: .leading, spacing: 8) {
        Text("今日のアファメーション")
          .font(.caption.weight(.semibold))
          .foregroundStyle(palette.accent)
        Text("「\(text)」")
          .font(.title3.weight(.semibold))
          .foregroundStyle(palette.foreground)
          .lineLimit(5)
          .minimumScaleFactor(0.78)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .accessibilityLabel("今日のアファメーション。タップしてRhythmPaceで設定を開く")
    .rhythmWidgetSurface(palette: palette, appearance: appearance)
  }
}

private extension View {
  func rhythmWidgetSurface(palette: WidgetPalette, appearance: WidgetSnapshot.Appearance?) -> some View {
    WidgetSurface(palette: palette, appearance: appearance) { self }
  }

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
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
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
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
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
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      NextScheduleWidgetView(entry: entry)
    }
    .configurationDisplayName("次の予定")
    .description("次の予定と出発時刻を確認できます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct RhythmMonthlyCalendarWidget: Widget {
  let kind = "RhythmMonthlyCalendarWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      MonthlyCalendarWidgetView(entry: entry)
    }
    .configurationDisplayName("月間カレンダー")
    .description("予定のある日を月ごとに確認できます。")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct RhythmWeeklyCalendarWidget: Widget {
  let kind = "RhythmWeeklyCalendarWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      WeeklyCalendarWidgetView(entry: entry)
    }
    .configurationDisplayName("週間カレンダー")
    .description("今週の予定の流れを確認できます。")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct RhythmTodayScheduleWidget: Widget {
  let kind = "RhythmTodayScheduleWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      TodayScheduleWidgetView(entry: entry)
    }
    .configurationDisplayName("今日の予定")
    .description("今日の予定を時系列で確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmChecklistWidget: Widget {
  let kind = "RhythmChecklistWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      ChecklistWidgetView(entry: entry)
    }
    .configurationDisplayName("忘れたくない")
    .description("待機中の項目を確認できます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct RhythmGoalWidget: Widget {
  let kind = "RhythmGoalWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      GoalWidgetView(entry: entry)
    }
    .configurationDisplayName("叶えたいこと")
    .description("叶えたいことの進み具合を確認できます。")
    .supportedFamilies([.systemMedium])
  }
}

struct RhythmVoiceWidget: Widget {
  let kind = "RhythmVoiceWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider()) { entry in
      VoiceWidgetView(entry: entry)
    }
    .configurationDisplayName("音声入力")
    .description("ホーム画面からすぐに音声入力を開始できます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct RhythmAffirmationWidget: Widget {
  let kind = "RhythmAffirmationWidget"

  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: RhythmWidgetIntent.self, provider: RhythmWidgetProvider(widgetKind: kind)) { entry in
      AffirmationWidgetView(entry: entry)
    }
    .configurationDisplayName("アファメーション")
    .description("言葉と背景で気持ちを整えます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
