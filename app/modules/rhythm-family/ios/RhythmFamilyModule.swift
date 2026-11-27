import CloudKit
import ExpoModulesCore
import Foundation
import UIKit

private func familyArguments(_ raw: String) throws -> [String: Any] {
  guard let data = raw.data(using: .utf8), let args = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw familyError("Invalid family request") }
  return args
}

public final class RhythmFamilyModule: Module {
  private var observer: NSObjectProtocol?
  public func definition() -> ModuleDefinition {
    Name("RhythmFamily")
    Events("onFamilyChange")
    OnCreate {
      self.observer = NotificationCenter.default.addObserver(forName: FamilyStore.changed, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onFamilyChange", [:])
      }
    }
    OnDestroy { if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }; self.observer = nil }
    AsyncFunction("perform") { (operation: String, raw: String) async throws -> String in
      let value = try await FamilyStore.shared.execute(operation, args: familyArguments(raw))
      let data = try JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed, .sortedKeys])
      return String(decoding: data, as: UTF8.self)
    }
    AsyncFunction("presentInvite") { (raw: String) async throws in
      let address = try FamilyAddress.parse(familyArguments(raw))
      let (share, container, title) = try await FamilyStore.shared.invitation(address)
      try await MainActor.run { try FamilySharingPresenter.present(share: share, container: container, title: title, group: address) }
    }
  }
}

@MainActor
private final class FamilySharingPresenter: NSObject, UICloudSharingControllerDelegate {
  private static var active: FamilySharingPresenter?
  private let title: String
  private let group: FamilyAddress
  init(title: String, group: FamilyAddress) { self.title = title; self.group = group }
  static func present(share: CKShare, container: CKContainer, title: String, group: FamilyAddress) throws {
    guard active == nil,
          let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
          let root = scene.windows.first(where: \.isKeyWindow)?.rootViewController else { throw familyError("No active window") }
    // Never put the native sharing sheet over another native modal.
    guard root.presentedViewController == nil else { throw familyError("Close the current sheet before inviting") }
    let presenter = FamilySharingPresenter(title: title, group: group)
    let controller = FamilyCloudController(share: share, container: container)
    controller.onClose = { Self.active = nil }
    controller.delegate = presenter
    controller.availablePermissions = [.allowPrivate, .allowReadWrite]
    controller.popoverPresentationController?.sourceView = root.view
    controller.popoverPresentationController?.sourceRect = CGRect(x: root.view.bounds.midX, y: root.view.bounds.midY, width: 1, height: 1)
    active = presenter
    root.present(controller, animated: true)
    // Retained until the sheet disappears, including cancel-without-save.
    controller.presentationController?.delegate = presenter
  }
  func itemTitle(for csc: UICloudSharingController) -> String? { title }
  func cloudSharingController(_ csc: UICloudSharingController, failedToSaveShareWithError error: Error) {
    NSLog("[RhythmFamily] Sharing UI failed (%ld).", (error as NSError).code)
  }
  func cloudSharingControllerDidSaveShare(_ csc: UICloudSharingController) { Task { await FamilyStore.shared.resumeIfUsed() } }
  func cloudSharingControllerDidStopSharing(_ csc: UICloudSharingController) { Task { await FamilyStore.shared.systemSharingStopped(group) } }
}
@MainActor
private final class FamilyCloudController: UICloudSharingController {
  var onClose: (() -> Void)?
  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    if isBeingDismissed || presentingViewController == nil { onClose?() }
  }
}
extension FamilySharingPresenter: UIAdaptivePresentationControllerDelegate {
  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { Self.active = nil }
}

// Expo SDK 54 leaves this UIApplicationDelegate method unforwarded. The config
// plugin installs one explicit bridge; it does not replace existing link code.
public enum RhythmFamilyInvitationBridge {
  public static func accept(_ metadata: CKShare.Metadata) {
    guard metadata.containerIdentifier == FamilyStore.containerID else { return }
    Task {
      do { try await FamilyStore.shared.accept(metadata) }
      catch { NSLog("[RhythmFamily] Invitation acceptance failed (%ld).", (error as NSError).code) }
    }
  }
}

public final class RhythmFamilyLifecycle: ExpoAppDelegateSubscriber {
  private var accountObserver: NSObjectProtocol?
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    accountObserver = NotificationCenter.default.addObserver(forName: .CKAccountChanged, object: nil, queue: nil) { _ in
      Task { await FamilyStore.shared.invalidate(); await FamilyStore.shared.resumeIfUsed() }
    }
    Task { await FamilyStore.shared.resumeIfUsed() }
    return true
  }
  public func applicationDidBecomeActive(_ application: UIApplication) { Task { await FamilyStore.shared.resumeIfUsed() } }
  public func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    guard CKNotification(fromRemoteNotificationDictionary: userInfo)?.containerIdentifier == FamilyStore.containerID else { completionHandler(.noData); return }
    Task { await FamilyStore.shared.resumeIfUsed(); completionHandler(.newData) }
  }
  deinit { if let accountObserver { NotificationCenter.default.removeObserver(accountObserver) } }
}
