import Combine
import Foundation
import WatchConnectivity
import WatchKit

/// Recorder state mirrored from the iPhone. `startedAt` lets the watch tick the timer locally.
struct RecorderSnapshot: Equatable {
  enum State: String { case idle, recording, paused, finishing }
  var state: State = .idle
  var startedAt: TimeInterval = 0
  var pausedElapsed: TimeInterval = 0
  /// Whether the iPhone app is in the foreground (only then can it begin recording).
  var phoneActive = false

  static func from(_ dict: [String: Any]) -> RecorderSnapshot {
    var s = RecorderSnapshot()
    s.state = State(rawValue: dict["state"] as? String ?? "idle") ?? .idle
    s.startedAt = dict["startedAt"] as? TimeInterval ?? 0
    s.pausedElapsed = dict["pausedElapsed"] as? TimeInterval ?? 0
    if let b = dict["phoneActive"] as? Bool {
      s.phoneActive = b
    } else if let n = dict["phoneActive"] as? Int {
      s.phoneActive = n == 1
    }
    return s
  }
}

/// What the watch UI drives: the phone's recorder (remote) or the watch's own recorder (local).
enum WatchMode: Equatable { case remote, local }

/// Watch-side controller. Decides per tap whether to drive the iPhone recorder (phone app in the
/// foreground: best mic) or to record on the watch itself (phone app backgrounded/closed: iOS
/// refuses to start capture there). Local recordings are shipped to the phone as files.
final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = PhoneLink()

  @Published var snapshot = RecorderSnapshot()
  @Published var mode: WatchMode = .remote
  @Published var localState: RecorderSnapshot.State = .idle
  @Published var reachable = false
  @Published var uploading = false
  @Published var lastError: String?

  private let recorder = WatchRecorder()
  private var localRecapId = ""

  private override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  // MARK: Unified UI state

  var displayState: RecorderSnapshot.State { mode == .local ? localState : snapshot.state }

  func elapsed(at date: Date) -> TimeInterval {
    if mode == .local {
      return localState == .idle ? 0 : recorder.elapsed
    }
    switch snapshot.state {
    case .recording: return max(0, date.timeIntervalSince1970 - snapshot.startedAt)
    case .paused: return snapshot.pausedElapsed
    default: return 0
    }
  }

  // MARK: Actions

  private func haptic(_ type: WKHapticType) {
    WKInterfaceDevice.current().play(type)
  }

  func start() {
    lastError = nil
    haptic(.start)
    let session = WCSession.default
    if snapshot.phoneActive && session.isReachable && snapshot.state == .idle {
      mode = .remote
      send("start")
    } else {
      startLocal()
    }
  }

  func pause() {
    haptic(.click)
    if mode == .local { pauseLocal() } else { send("pause") }
  }

  func resume() {
    haptic(.click)
    if mode == .local { resumeLocal() } else { send("resume") }
  }

  func finish() {
    haptic(.stop)
    if mode == .local { finishLocal() } else { send("finish") }
  }

  // MARK: Local (on-watch) recording

  private func startLocal() {
    mode = .local
    localRecapId = UUID().uuidString.lowercased()
    WatchRecorder.requestPermission { [weak self] granted in
      guard let self = self else { return }
      guard granted else {
        self.lastError = "Allow microphone access for AI Recap on the watch"
        self.mode = .remote
        return
      }
      self.recorder.start(recapId: self.localRecapId) { error in
        if let error = error {
          self.lastError = "Could not record: \(error.localizedDescription)"
          self.mode = .remote
        } else {
          self.localState = .recording
        }
      }
    }
  }

  private func pauseLocal() {
    recorder.pause()
    localState = .paused
  }

  private func resumeLocal() {
    recorder.resume()
    localState = .recording
  }

  private func finishLocal() {
    guard let result = recorder.stop() else { return }
    uploading = true
    let meta: [String: Any] = [
      "type": "watchRecording",
      "recapId": localRecapId,
      "startedAt": result.startedAt.timeIntervalSince1970 * 1000,
      "duration": result.durationSeconds,
    ]
    // Queued transfer: delivered even if the iPhone app is closed (iOS wakes it in the background).
    WCSession.default.transferFile(result.url, metadata: meta)
    localState = .idle
    mode = .remote
  }

  // MARK: Remote commands

  private func send(_ command: String) {
    let payload: [String: Any] = ["command": command, "sentAt": Date().timeIntervalSince1970]
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(payload, replyHandler: { [weak self] reply in
        DispatchQueue.main.async { self?.apply(reply) }
      }, errorHandler: { [weak self] error in
        DispatchQueue.main.async { self?.lastError = error.localizedDescription }
        session.transferUserInfo(payload)
      })
    } else {
      session.transferUserInfo(payload)
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
      self.uploading = !session.outstandingFileTransfers.isEmpty
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

  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
    DispatchQueue.main.async {
      if error == nil {
        try? FileManager.default.removeItem(at: fileTransfer.file.fileURL)
      } else {
        self.lastError = "Transfer to iPhone failed. Retrying."
        WCSession.default.transferFile(fileTransfer.file.fileURL, metadata: fileTransfer.file.metadata)
      }
      self.uploading = !session.outstandingFileTransfers.isEmpty
    }
  }
}
