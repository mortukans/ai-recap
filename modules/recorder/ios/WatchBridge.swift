import Foundation
import WatchConnectivity

/// iPhone side of the Apple Watch remote control. Receives start/pause/resume/finish commands from the
/// watch app and forwards them to JS (which owns the recording lifecycle and the database); publishes
/// the recorder state back so the watch can mirror the timer.
///
/// `applicationContext` is used for state (latest-wins, delivered even if the watch app is closed);
/// direct messages are answered with the current state so the watch UI updates instantly.
final class WatchBridge: NSObject, WCSessionDelegate {
  static let shared = WatchBridge()

  /// Called with the command string ("start" | "pause" | "resume" | "finish"). Set by RecorderModule.
  var onCommand: ((String) -> Void)?

  private var lastState: [String: Any] = ["state": "idle", "startedAt": 0, "pausedElapsed": 0]

  private override init() {
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  /// Push the recorder state to the watch. `startedAt` is epoch seconds of the current run
  /// (already shifted for pauses); `pausedElapsed` is what to show while paused.
  func publish(state: String, startedAt: Double, pausedElapsed: Double) {
    lastState = ["state": state, "startedAt": startedAt, "pausedElapsed": pausedElapsed]
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    try? session.updateApplicationContext(lastState)
    if session.isReachable {
      session.sendMessage(lastState, replyHandler: nil, errorHandler: nil)
    }
  }

  private func handle(_ payload: [String: Any]) {
    guard let command = payload["command"] as? String else { return }
    DispatchQueue.main.async { self.onCommand?(command) }
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    if state == .activated { try? session.updateApplicationContext(lastState) }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // Watch switched; re-activate for the new pairing.
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handle(message)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    handle(message)
    replyHandler(lastState)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handle(userInfo)
  }
}
