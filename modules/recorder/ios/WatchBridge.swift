import AVFoundation
import Foundation
import WatchConnectivity

/// iPhone side of the Apple Watch integration.
///  • Remote control: start/pause/resume/finish commands from the watch → forwarded to JS.
///  • State mirroring: recorder state + whether the app is in the foreground → `applicationContext`.
///  • Import: recordings made on the watch arrive as file transfers (even while this app is closed —
///    iOS launches it in the background); they are moved into the recap storage layout and a
///    `watch.json` marker is written so JS can register the recap immediately or on next launch.
final class WatchBridge: NSObject, WCSessionDelegate {
  static let shared = WatchBridge()

  /// ("start" | "pause" | "resume" | "finish"). Set by RecorderModule.
  var onCommand: ((String) -> Void)?
  /// A watch recording was imported: payload has recapId/startedAt/durationSeconds.
  var onWatchRecording: (([String: Any]) -> Void)?

  private var lastState: [String: Any] = ["state": "idle", "startedAt": 0, "pausedElapsed": 0, "phoneActive": false]
  /// Most recent recap (title/status/time) so the watch home card can show it.
  private var lastRecap: [String: Any] = [:]

  private var context: [String: Any] { lastState.merging(lastRecap) { current, _ in current } }

  private override init() {
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func publish(state: String, startedAt: Double, pausedElapsed: Double, phoneActive: Bool) {
    lastState = ["state": state, "startedAt": startedAt, "pausedElapsed": pausedElapsed, "phoneActive": phoneActive]
    push(sendMessage: true)
  }

  /// Latest recap summary line for the watch home screen (title, pipeline status, start time in ms).
  func publishLastRecap(title: String, status: String, startedAt: Double) {
    lastRecap = ["lastTitle": title, "lastStatus": status, "lastStartedAt": startedAt]
    push(sendMessage: false)
  }

  private func push(sendMessage: Bool) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    try? session.updateApplicationContext(context)
    if sendMessage && session.isReachable {
      session.sendMessage(context, replyHandler: nil, errorHandler: nil)
    }
  }

  private func handle(_ payload: [String: Any]) {
    guard let command = payload["command"] as? String else { return }
    DispatchQueue.main.async { self.onCommand?(command) }
  }

  // MARK: Watch recording import

  /// Must finish synchronously: WatchConnectivity deletes the temp file when the delegate returns.
  private func importWatchRecording(file: WCSessionFile) {
    guard let meta = file.metadata, meta["type"] as? String == "watchRecording",
          let recapId = meta["recapId"] as? String, !recapId.isEmpty else { return }
    do {
      let chunkDir = try RecapStorage.chunkDirectory(for: recapId)
      let dest = chunkDir.appendingPathComponent("chunk_0001.m4a")
      if FileManager.default.fileExists(atPath: dest.path) { try FileManager.default.removeItem(at: dest) }
      try FileManager.default.moveItem(at: file.fileURL, to: dest)

      var duration = (meta["duration"] as? Double) ?? 0
      if duration <= 0 {
        duration = CMTimeGetSeconds(AVURLAsset(url: dest).duration)
      }
      let byteSize = ((try? FileManager.default.attributesOfItem(atPath: dest.path))?[.size] as? Int) ?? 0
      let startedAt = (meta["startedAt"] as? Double) ?? Date().timeIntervalSince1970 * 1000

      RecapStorage.appendToManifest(
        recapId: recapId, index: 1, relativePath: "chunks/chunk_0001.m4a",
        startOffset: 0, duration: duration, byteSize: byteSize)

      // Marker consumed by JS (now, or at next launch if the app was closed).
      let marker: [String: Any] = [
        "recapId": recapId, "source": "watch", "startedAt": startedAt,
        "durationSeconds": duration, "receivedAt": Date().timeIntervalSince1970 * 1000,
      ]
      let markerURL = try RecapStorage.recapDirectory(for: recapId).appendingPathComponent("watch.json")
      let data = try JSONSerialization.data(withJSONObject: marker, options: [.prettyPrinted])
      try data.write(to: markerURL, options: .atomic)

      DispatchQueue.main.async { self.onWatchRecording?(marker) }
    } catch {
      // Leave it; the watch keeps its copy and retries the transfer on failure paths.
    }
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    if state == .activated { try? session.updateApplicationContext(context) }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
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

  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    importWatchRecording(file: file)
  }
}
