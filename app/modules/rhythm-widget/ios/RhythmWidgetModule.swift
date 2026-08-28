import ExpoModulesCore
import Foundation
import WidgetKit

public final class RhythmWidgetModule: Module {
  private let appGroup = "group.app.rhythm.daily"
  private let snapshotKey = "rhythmWidgetSnapshot"

  public func definition() -> ModuleDefinition {
    Name("RhythmWidget")

    AsyncFunction("saveSnapshot") { (snapshot: String) throws -> Bool in
      guard let defaults = UserDefaults(suiteName: self.appGroup) else {
        throw NSError(domain: "RhythmWidget", code: 1, userInfo: [NSLocalizedDescriptionKey: "App Group is unavailable"])
      }
      defaults.set(snapshot, forKey: self.snapshotKey)
      WidgetCenter.shared.reloadTimelines(ofKind: "RhythmWidget")
      return true
    }
  }
}
