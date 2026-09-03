import ExpoModulesCore
import Foundation
import CoreImage
import ImageIO
import UIKit
import Vision
import WidgetKit
#if canImport(ActivityKit)
import ActivityKit
#endif

public final class RhythmWidgetModule: Module {
  private let appGroup = "group.app.rhythm.daily"
  private let snapshotKey = "rhythmWidgetSnapshot"
  private let photoFileName = "rhythm-widget-photo.jpg"
  private let widgetPhotoPrefix = "rhythm-widget-photo-"
  private let widgetCutoutPrefix = "rhythm-widget-cutout-"
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
          let allowedCutoutNames = Set(customizations.values.compactMap { value -> String? in
            guard let customization = value as? [String: Any], let name = customization["cutoutFileName"] as? String,
                  name.hasPrefix(self.widgetCutoutPrefix), name.hasSuffix(".png") else { return nil }
            return name
          })
          for kind in self.widgetPhotoKinds {
            let name = "\(self.widgetCutoutPrefix)\(kind).png"
            if !allowedCutoutNames.contains(name) {
              try? FileManager.default.removeItem(at: container.appendingPathComponent(name))
              let cacheURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent(name)
              try? FileManager.default.removeItem(at: cacheURL)
            }
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

    AsyncFunction("isWidgetPhotoBackgroundRemovalAvailable") { () -> Bool in
      if #available(iOS 17.0, *) {
        #if DEBUG
        print("[BackgroundRemoval][Native] availability true")
        #endif
        return true
      }
      #if DEBUG
      print("[BackgroundRemoval][Native] availability false")
      #endif
      return false
    }

    AsyncFunction("removeWidgetPhotoBackground") { (uri: String, widgetType: String) async throws -> String? in
      guard self.widgetPhotoKinds.contains(widgetType) else {
        throw NSError(domain: "RhythmWidget", code: 10, userInfo: [NSLocalizedDescriptionKey: "Invalid widget photo target"])
      }
      guard #available(iOS 17.0, *) else { return nil }
      #if DEBUG
      print("[BackgroundRemoval][Native] start")
      print("[BackgroundRemoval][Native] widget=\(widgetType)")
      #endif
      let sourceURL = Self.resolvedFileURL(uri)
      let sourceExists = FileManager.default.fileExists(atPath: sourceURL.path)
      #if DEBUG
      print("[BackgroundRemoval][Native] sourceExists \(sourceExists)")
      #endif
      guard sourceExists else {
        throw NSError(domain: "RhythmWidget", code: 11, userInfo: [NSLocalizedDescriptionKey: "Widget photo file is unavailable"])
      }
      let sourcePath = sourceURL.path
      #if DEBUG
      print("[BackgroundRemoval][Native] sourcePath \(sourcePath)")
      #endif
      let pngData: Data
      do {
        pngData = try await Task.detached(priority: .userInitiated) {
          try Self.foregroundCutoutPNGData(sourceURL: URL(fileURLWithPath: sourcePath))
        }.value
      } catch {
        #if DEBUG
        print("[BackgroundRemoval][Native] error \(error.localizedDescription)")
        #endif
        throw error
      }
      guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 12, userInfo: [NSLocalizedDescriptionKey: "App Group is unavailable"])
      }
      let fileName = "\(self.widgetCutoutPrefix)\(widgetType).png"
      let destination = container.appendingPathComponent(fileName)
      try Self.atomicWrite(pngData, to: destination)
      #if DEBUG
      print("[BackgroundRemoval][Native] appGroupWrite \(destination.path)")
      #endif
      // Keep a managed cache copy so the RN preview can display the result;
      // the Widget itself reads only the App Group filename from the snapshot.
      let cacheURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent(fileName)
      let cacheWritten: Bool
      do {
        try Self.atomicWrite(pngData, to: cacheURL)
        cacheWritten = true
      } catch {
        // App Group output is already valid. Returning it keeps the cutout
        // usable even if the optional preview cache cannot be written.
        cacheWritten = false
        #if DEBUG
        print("[BackgroundRemoval][Native] cacheWrite failure \(error.localizedDescription)")
        #endif
      }
      #if DEBUG
      print("[BackgroundRemoval][Native] pngBytes \(pngData.count)")
      print("[BackgroundRemoval][Native] cacheURL \(cacheURL.path)")
      print("[BackgroundRemoval][Native] cacheWritten \(cacheWritten)")
      print("[BackgroundRemoval][Native] success widget=\(widgetType)")
      #endif
      return cacheWritten ? cacheURL.absoluteString : destination.absoluteString
    }

    AsyncFunction("saveWidgetPhotoCutout") { (uri: String, widgetType: String) throws -> Bool in
      guard self.widgetPhotoKinds.contains(widgetType), let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 13, userInfo: [NSLocalizedDescriptionKey: "Invalid widget cutout target"])
      }
      let sourceURL = Self.resolvedFileURL(uri)
      let sourceExists = FileManager.default.fileExists(atPath: sourceURL.path)
      #if DEBUG
      print("[BackgroundRemoval][Native] appGroupSourcePath \(sourceURL.path)")
      print("[BackgroundRemoval][Native] appGroupSourceExists \(sourceExists)")
      #endif
      guard sourceExists else {
        throw NSError(domain: "RhythmWidget", code: 14, userInfo: [NSLocalizedDescriptionKey: "Widget cutout file is unavailable"])
      }
      let destination = container.appendingPathComponent("\(self.widgetCutoutPrefix)\(widgetType).png")
      try Self.atomicCopy(from: sourceURL, to: destination)
      #if DEBUG
      print("[BackgroundRemoval][Native] appGroupCopy widget=\(widgetType) success=true")
      #endif
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

    AsyncFunction("isLiveActivityAvailable") { () -> Bool in
      if #available(iOS 16.1, *) { return Self.liveActivityAvailable() }
      return false
    }

    AsyncFunction("startOrUpdateLiveActivity") { (payload: String) async -> Bool in
      if #available(iOS 16.1, *) { return await Self.startOrUpdateLiveActivity(payload: payload) }
      return false
    }

    AsyncFunction("updateLiveActivity") { (payload: String) async -> Bool in
      if #available(iOS 16.1, *) { return await Self.updateLiveActivity(payload: payload) }
      return false
    }

    AsyncFunction("endLiveActivity") { () async -> Bool in
      if #available(iOS 16.1, *) { return await Self.endLiveActivity() }
      return false
    }

    AsyncFunction("getLiveActivityStatus") { () -> String in
      if #available(iOS 16.1, *) { return Self.liveActivityStatus() }
      return "{\"available\":false,\"active\":false}"
    }
  }
}

private extension RhythmWidgetModule {
  static func resolvedFileURL(_ uri: String) -> URL {
    if let parsed = URL(string: uri), parsed.isFileURL { return parsed }
    return URL(fileURLWithPath: uri)
  }

  static func atomicWrite(_ data: Data, to destination: URL) throws {
    let temporary = destination.appendingPathExtension("tmp")
    try? FileManager.default.removeItem(at: temporary)
    try data.write(to: temporary, options: .atomic)
    try? FileManager.default.removeItem(at: destination)
    try FileManager.default.moveItem(at: temporary, to: destination)
  }

  static func atomicCopy(from source: URL, to destination: URL) throws {
    let temporary = destination.appendingPathExtension("tmp")
    try? FileManager.default.removeItem(at: temporary)
    try FileManager.default.copyItem(at: source, to: temporary)
    try? FileManager.default.removeItem(at: destination)
    try FileManager.default.moveItem(at: temporary, to: destination)
  }

  @available(iOS 17.0, *)
  static func foregroundCutoutPNGData(sourceURL: URL) throws -> Data {
    guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
      throw NSError(domain: "RhythmWidget", code: 15, userInfo: [NSLocalizedDescriptionKey: "Photo could not be decoded"])
    }
    let orientationRaw = (CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as NSDictionary?)?[kCGImagePropertyOrientation] as? NSNumber
    let orientation = CGImagePropertyOrientation(rawValue: orientationRaw?.uint32Value ?? 1) ?? .up
    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    #if DEBUG
    print("[BackgroundRemoval][Native] instances \(request.results?.first?.allInstances.count ?? 0)")
    #endif
    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      #if DEBUG
      print("[BackgroundRemoval][Native] no-foreground")
      #endif
      throw NSError(domain: "RhythmWidget", code: 16, userInfo: [NSLocalizedDescriptionKey: "No foreground subject detected"])
    }
    let maskedBuffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: false)
    #if DEBUG
    print("[BackgroundRemoval][Native] maskedBuffer \(CVPixelBufferGetWidth(maskedBuffer))x\(CVPixelBufferGetHeight(maskedBuffer))")
    #endif
    let ciImage = CIImage(cvPixelBuffer: maskedBuffer)
    let context = CIContext(options: nil)
    guard let output = context.createCGImage(ciImage, from: ciImage.extent) else {
      throw NSError(domain: "RhythmWidget", code: 17, userInfo: [NSLocalizedDescriptionKey: "Foreground mask could not be rendered"])
    }
    guard let png = UIImage(cgImage: output, scale: 1, orientation: .up).pngData() else {
      throw NSError(domain: "RhythmWidget", code: 18, userInfo: [NSLocalizedDescriptionKey: "Foreground mask could not be encoded"])
    }
    #if DEBUG
    print("[BackgroundRemoval][Native] pngBytes \(png.count)")
    #endif
    return png
  }
}

#if canImport(ActivityKit)
@available(iOS 16.1, *)
private extension RhythmWidgetModule {
  static let liveActivityDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  static func liveActivityAvailable() -> Bool {
    guard #available(iOS 16.1, *) else { return false }
    return ActivityAuthorizationInfo().areActivitiesEnabled
  }

  static func decodeLiveActivityState(payload: String) -> RhythmLiveActivityAttributes.ContentState? {
    guard let data = payload.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    let mode = RhythmLiveActivityAttributes.ContentState.Mode(rawValue: object["mode"] as? String ?? "normal") ?? .normal
    let tier = RhythmLiveActivityAttributes.ContentState.Tier(rawValue: object["tier"] as? String ?? "free") ?? .free
    let displayObject = object["displayOptions"] as? [String: Any]
    let displayOptions = RhythmLiveActivityAttributes.ContentState.DisplayOptions(
      currentTask: displayObject?["currentTask"] as? Bool ?? true,
      nextSchedule: displayObject?["nextSchedule"] as? Bool ?? true,
      departureCountdown: displayObject?["departureCountdown"] as? Bool ?? true,
      focusRemaining: displayObject?["focusRemaining"] as? Bool ?? true,
      affirmation: displayObject?["affirmation"] as? Bool ?? true
    )
    let date = { (key: String) -> Date? in
      guard let value = object[key] as? String else { return nil }
      return liveActivityDateFormatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
    func text(_ key: String) -> String? {
      guard let value = object[key] as? String else { return nil }
      let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
      return trimmed.isEmpty ? nil : String(trimmed.prefix(300))
    }
    return RhythmLiveActivityAttributes.ContentState(
      mode: mode,
      tier: tier,
      currentTaskTitle: text("currentTaskTitle"),
      nextScheduleTitle: text("nextScheduleTitle"),
      nextScheduleAt: date("nextScheduleAt"),
      departureAt: date("departureAt"),
      focusTaskTitle: text("focusTaskTitle"),
      focusEndsAt: date("focusEndsAt"),
      affirmationText: text("affirmationText"),
      accentHex: text("accentHex") ?? "#7559E8",
      displayOptions: displayOptions
    )
  }

  @available(iOS 16.2, *)
  static func activityContent(_ state: RhythmLiveActivityAttributes.ContentState) -> ActivityContent<RhythmLiveActivityAttributes.ContentState> {
    let staleDate = [state.focusEndsAt, state.departureAt, state.nextScheduleAt].compactMap { $0 }.max()
    return ActivityContent(state: state, staleDate: staleDate)
  }

  static func startOrUpdateLiveActivity(payload: String) async -> Bool {
    guard #available(iOS 16.1, *), let state = decodeLiveActivityState(payload: payload), liveActivityAvailable() else { return false }
    do {
      let activities = Activity<RhythmLiveActivityAttributes>.activities
      if let activity = activities.first {
        if #available(iOS 16.2, *) {
          try await activity.update(activityContent(state))
        } else {
          try await activity.update(using: state)
        }
        // Keep the v1 contract to one activity even if an older build left
        // more than one instance behind.
        for duplicate in activities.dropFirst() {
          if #available(iOS 16.2, *) {
            await duplicate.end(nil, dismissalPolicy: .immediate)
          } else {
            await duplicate.end(using: nil, dismissalPolicy: .immediate)
          }
        }
      } else {
        if #available(iOS 16.2, *) {
          _ = try Activity.request(attributes: RhythmLiveActivityAttributes(), content: activityContent(state), pushType: nil)
        } else {
          _ = try Activity.request(attributes: RhythmLiveActivityAttributes(), contentState: state, pushType: nil)
        }
      }
      return true
    } catch {
      #if DEBUG
      print("[RhythmLiveActivity] start/update failed: \(error)")
      #endif
      return false
    }
  }

  static func updateLiveActivity(payload: String) async -> Bool {
    guard #available(iOS 16.1, *), let state = decodeLiveActivityState(payload: payload), let activity = Activity<RhythmLiveActivityAttributes>.activities.first else { return false }
    do {
      if #available(iOS 16.2, *) {
        try await activity.update(activityContent(state))
      } else {
        try await activity.update(using: state)
      }
      return true
    } catch {
      #if DEBUG
      print("[RhythmLiveActivity] update failed: \(error)")
      #endif
      return false
    }
  }

  static func endLiveActivity() async -> Bool {
    guard #available(iOS 16.1, *) else { return false }
    do {
      for activity in Activity<RhythmLiveActivityAttributes>.activities {
        if #available(iOS 16.2, *) {
          await activity.end(nil, dismissalPolicy: .default)
        } else {
          await activity.end(using: nil, dismissalPolicy: .default)
        }
      }
      return true
    } catch {
      #if DEBUG
      print("[RhythmLiveActivity] end failed: \(error)")
      #endif
      return false
    }
  }

  static func liveActivityStatus() -> String {
    guard #available(iOS 16.1, *) else { return "{\"available\":false,\"active\":false}" }
    let active = !Activity<RhythmLiveActivityAttributes>.activities.isEmpty
    return "{\"available\":\(liveActivityAvailable()),\"active\":\(active)}"
  }
}
#else
private extension RhythmWidgetModule {
  static func liveActivityAvailable() -> Bool { false }
  static func startOrUpdateLiveActivity(payload: String) async -> Bool { false }
  static func updateLiveActivity(payload: String) async -> Bool { false }
  static func endLiveActivity() async -> Bool { false }
  static func liveActivityStatus() -> String { "{\"available\":false,\"active\":false}" }
}
#endif
