import ExpoModulesCore
import Foundation
import WidgetKit

public final class RhythmWidgetModule: Module {
  private let appGroup = "group.app.rhythm.daily"
  private let snapshotKey = "rhythmWidgetSnapshot"
  private let photoFileName = "rhythm-widget-photo.jpg"
  private let widgetPhotoPrefix = "rhythm-widget-photo-"
  private let affirmationPhotoPrefix = "rhythm-affirmation-photo-"
  private let pendingActionsKey = "rhythmWidgetPendingActions"
  private let widgetPhotoKinds: Set<String> = [
    "current", "next", "combined", "monthly", "weekly", "today", "checklist", "goal", "voice", "affirmation",
  ]

  public func definition() -> ModuleDefinition {
    Name("RhythmWidget")

    AsyncFunction("saveSnapshot") { (snapshot: String) throws -> Bool in
      guard let defaults = UserDefaults(suiteName: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 1, userInfo: [NSLocalizedDescriptionKey: "App Group is unavailable"])
      }
      defaults.set(snapshot, forKey: self.snapshotKey)
      // Remove only files owned by the affirmation widget. The main Widget
      // photo uses a different filename and is never touched here.
      if let data = snapshot.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) {
        let names = object["affirmationPhotoFileNames"] as? [String] ?? []
        let allowed = Set(names.filter { $0.hasPrefix(self.affirmationPhotoPrefix) && $0.hasSuffix(".jpg") })
        for slot in 1...3 {
          let name = "\(self.affirmationPhotoPrefix)\(slot).jpg"
          if !allowed.contains(name) { try? FileManager.default.removeItem(at: container.appendingPathComponent(name)) }
        }
        // Clean only the per-widget namespace, and only when a current
        // snapshot explicitly contains that field. Older snapshots remain
        // backward compatible and do not delete files they cannot reference.
        if let customizations = object["widgetCustomizations"] as? [String: Any] {
          let allowedWidgetNames = Set(customizations.values.compactMap { value -> String? in
            guard let customization = value as? [String: Any], let name = customization["photoFileName"] as? String,
                  name.hasPrefix(self.widgetPhotoPrefix), name.hasSuffix(".jpg") else { return nil }
            return name
          })
          for kind in self.widgetPhotoKinds {
            let name = "\(self.widgetPhotoPrefix)\(kind).jpg"
            if !allowedWidgetNames.contains(name) { try? FileManager.default.removeItem(at: container.appendingPathComponent(name)) }
          }
        }
      }
      ["RhythmWidget", "RhythmCurrentTaskWidget", "RhythmNextScheduleWidget", "RhythmMonthlyCalendarWidget", "RhythmWeeklyCalendarWidget", "RhythmTodayScheduleWidget", "RhythmChecklistWidget", "RhythmGoalWidget", "RhythmVoiceWidget", "RhythmAffirmationWidget"].forEach {
        WidgetCenter.shared.reloadTimelines(ofKind: $0)
      }
      return true
    }

    AsyncFunction("savePhoto") { (uri: String) throws -> Bool in
      guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 2, userInfo: [NSLocalizedDescriptionKey: "App Group is unavailable"])
      }
      let sourceURL: URL
      if let parsed = URL(string: uri), parsed.isFileURL {
        sourceURL = parsed
      } else {
        sourceURL = URL(fileURLWithPath: uri)
      }
      guard FileManager.default.fileExists(atPath: sourceURL.path) else {
        throw NSError(domain: "RhythmWidget", code: 3, userInfo: [NSLocalizedDescriptionKey: "Photo file is unavailable"])
      }
      let destination = container.appendingPathComponent(self.photoFileName)
      let temporary = destination.appendingPathExtension("tmp")
      try? FileManager.default.removeItem(at: temporary)
      try FileManager.default.copyItem(at: sourceURL, to: temporary)
      try? FileManager.default.removeItem(at: destination)
      try FileManager.default.moveItem(at: temporary, to: destination)
      return true
    }

    AsyncFunction("saveWidgetPhoto") { (uri: String, widgetType: String) throws -> Bool in
      guard self.widgetPhotoKinds.contains(widgetType), let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 6, userInfo: [NSLocalizedDescriptionKey: "Invalid widget photo target"])
      }
      let sourceURL: URL
      if let parsed = URL(string: uri), parsed.isFileURL {
        sourceURL = parsed
      } else {
        sourceURL = URL(fileURLWithPath: uri)
      }
      guard FileManager.default.fileExists(atPath: sourceURL.path) else {
        throw NSError(domain: "RhythmWidget", code: 7, userInfo: [NSLocalizedDescriptionKey: "Widget photo file is unavailable"])
      }
      let destination = container.appendingPathComponent("\(self.widgetPhotoPrefix)\(widgetType).jpg")
      let temporary = destination.appendingPathExtension("tmp")
      try? FileManager.default.removeItem(at: temporary)
      try FileManager.default.copyItem(at: sourceURL, to: temporary)
      try? FileManager.default.removeItem(at: destination)
      try FileManager.default.moveItem(at: temporary, to: destination)
      return true
    }

    AsyncFunction("saveAffirmationPhoto") { (uri: String, slot: Int) throws -> Bool in
      guard (1...3).contains(slot), let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 4, userInfo: [NSLocalizedDescriptionKey: "Invalid affirmation photo slot"])
      }
      let sourceURL: URL
      if let parsedURL = URL(string: uri), parsedURL.isFileURL {
        sourceURL = parsedURL
      } else {
        sourceURL = URL(fileURLWithPath: uri)
      }
      guard FileManager.default.fileExists(atPath: sourceURL.path) else {
        throw NSError(domain: "RhythmWidget", code: 5, userInfo: [NSLocalizedDescriptionKey: "Affirmation photo file is unavailable"])
      }
      let destination = container.appendingPathComponent("\(self.affirmationPhotoPrefix)\(slot).jpg")
      let temporary = destination.appendingPathExtension("tmp")
      try? FileManager.default.removeItem(at: temporary)
      try FileManager.default.copyItem(at: sourceURL, to: temporary)
      try? FileManager.default.removeItem(at: destination)
      try FileManager.default.moveItem(at: temporary, to: destination)
      return true
    }

    AsyncFunction("getPendingWidgetActions") { () -> String in
      guard let defaults = UserDefaults(suiteName: self.appGroup) else { return "[]" }
      return defaults.string(forKey: self.pendingActionsKey) ?? "[]"
    }

    AsyncFunction("acknowledgePendingWidgetActions") { (actionIds: [String]) -> Bool in
      guard let defaults = UserDefaults(suiteName: self.appGroup), !actionIds.isEmpty,
            let raw = defaults.string(forKey: self.pendingActionsKey),
            let data = raw.data(using: .utf8),
            let decodedObject = try? JSONSerialization.jsonObject(with: data),
            let decoded = decodedObject as? [[String: Any]] else { return false }
      var actions = decoded
      let ids = Set(actionIds)
      actions.removeAll { action in
        guard let id = action["id"] as? String else { return false }
        return ids.contains(id)
      }
      guard let encoded = try? JSONSerialization.data(withJSONObject: actions), let text = String(data: encoded, encoding: .utf8) else { return false }
      defaults.set(text, forKey: self.pendingActionsKey)
      return true
    }
  }
}
