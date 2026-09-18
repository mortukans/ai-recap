import Combine
import Foundation
import WatchConnectivity

/// Recorder state mirrored from the iPhone. `startedAt` lets the watch tick the timer locally, so the
/// phone only has to send an update when the state changes (WatchConnectivity is rate-limited).
struct RecorderSnapshot: Equatable {
  enum State: String { case idle, recording, paused, finishing }
  var state: State = .idle
  /// Epoch seconds when the current run of recording began (already offset for pauses).
  var startedAt: TimeInterval = 0
  /// Elapsed seconds frozen at the moment of pausing.
  var pausedElapsed: TimeInterval = 0

  static func from(_ dict: [String: Any]) -> RecorderSnapshot {
    var s = RecorderSnapshot()
    s.state = State(rawValue: dict["state"] as? String ?? "idle") ?? .idle
    s.startedAt = dict["startedAt"] as? TimeInterval ?? 0
    s.pausedElapsed = dict["pausedElapsed"] as? TimeInterval ?? 0
    return s
  }
}

/// WCSession wrapper for the watch side. Commands go phone-ward as small dictionaries; state comes
/// back via `applicationContext` (latest-wins, survives the phone app being backgrounded) and, when
/// both apps are live, via immediate messages.
final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = PhoneLink()

  @Published var snapshot = RecorderSnapshot()
  @Published var reachable = false
  @Published var lastError: String?

  private override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  // MARK: Commands

  func send(_ command: String) {
    let payload: [String: Any] = ["command": command, "sentAt": Date().timeIntervalSince1970]
    let session = WCSession.default
    lastError = nil
    if session.isReachable {
      session.sendMessage(payload, replyHandler: { [weak self] reply in
        DispatchQueue.main.async { self?.apply(reply) }
      }, errorHandler: { [weak self] error in
        DispatchQueue.main.async { self?.lastError = error.localizedDescription }
        // Fall back to the queued channel so the command still lands when the phone wakes.
        session.transferUserInfo(payload)
      })
    } else {
      session.transferUserInfo(payload)
      lastError = command == "start" ? "Tap the notification on your iPhone to start" : "Open AI Recap on your iPhone"
    }
  }

  private func apply(_ dict: [String: Any]) {
    if dict["state"] != nil { snapshot = RecorderSnapshot.from(dict) }
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async {
      self.reachable = session.isReachable
      self.apply(session.receivedApplicationContext)
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.reachable = session.isReachable }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async { self.apply(applicationContext) }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async { self.apply(message) }
  }
}
