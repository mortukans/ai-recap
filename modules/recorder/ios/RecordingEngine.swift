import AVFoundation
import Foundation

/// Core capture engine: AVAudioEngine input-node tap → rotating AAC (.m4a) chunk files, with an
/// atomically-rewritten manifest for crash recovery. See AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.2–§7.4.
///
/// STATUS: structural skeleton. The session/permission/lifecycle wiring is real; the tap-write and
/// rotation internals (marked TODO(M1-3)) must be finalized and validated on a physical device
/// (MVP tasks M1-3 … M1-7). This file does not compile on Windows — build via EAS / a Mac.
final class RecordingEngine {
  struct RecordResult { let durationSeconds: Double; let chunkCount: Int }

  enum State { case idle, recording, paused, finishing }

  /// (eventName, payload) — bridged to JS by RecorderModule.
  var onEvent: ((String, [String: Any]) -> Void)?

  private let audioEngine = AVAudioEngine()
  private let writeQueue = DispatchQueue(label: "lv.airecap.recorder.write")

  private var state: State = .idle
  private var recapId: String = ""
  private var recapDir: URL?
  private var chunkSeconds: Double = 60
  private var targetSampleRate: Double = 16000

  private var currentFile: AVAudioFile?
  private var converter: AVAudioConverter?
  private var chunkIndex: Int = 0
  private var framesInChunk: AVAudioFrameCount = 0
  private var accumulatedSeconds: Double = 0

  // MARK: - Permission

  static func requestPermission() async -> Bool {
    await withCheckedContinuation { continuation in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        continuation.resume(returning: granted)
      }
    }
  }

  static func permissionStatus() -> String {
    switch AVAudioSession.sharedInstance().recordPermission {
    case .granted: return "granted"
    case .denied: return "denied"
    default: return "undetermined"
    }
  }

  // MARK: - Session

  private func configureSession() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .default,
      options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
    )
    try session.setActive(true)
    registerInterruptionObservers()
  }

  // MARK: - Lifecycle

  func start(recapId: String, chunkSeconds: Double, sampleRate: Double) throws {
    guard state == .idle else { return }
    self.recapId = recapId
    self.chunkSeconds = chunkSeconds
    self.targetSampleRate = sampleRate
    self.chunkIndex = 0
    self.accumulatedSeconds = 0

    try configureSession()
    self.recapDir = try RecapStorage.chunkDirectory(for: recapId)

    try openNextChunk()
    installTapAndStart()
    state = .recording
  }

  func pause() throws {
    guard state == .recording else { return }
    audioEngine.pause()
    closeCurrentChunk()
    state = .paused
  }

  func resume() throws {
    guard state == .paused else { return }
    try openNextChunk()
    try audioEngine.start()
    state = .recording
    onEvent?("resumed", [:])
  }

  func finish() throws -> RecordResult {
    state = .finishing
    audioEngine.inputNode.removeTap(onBus: 0)
    audioEngine.stop()
    closeCurrentChunk()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    let result = RecordResult(durationSeconds: accumulatedSeconds, chunkCount: chunkIndex)
    state = .idle
    return result
  }

  func addMarker(label: String?) {
    // Markers are captured against the current offset; persisted by JS. UI is Phase 2 (Product Plan §4).
  }

  func teardown() {
    audioEngine.inputNode.removeTap(onBus: 0)
    if audioEngine.isRunning { audioEngine.stop() }
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Capture (TODO(M1-3): validate on device)

  private func installTapAndStart() {
    let input = audioEngine.inputNode
    let inputFormat = input.outputFormat(forBus: 0)
    converter = makeConverter(from: inputFormat)

    input.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, _ in
      // Keep the audio thread light: hand off to the write queue.
      self?.writeQueue.async { self?.appendBuffer(buffer) }
    }

    audioEngine.prepare()
    try? audioEngine.start()
  }

  private func makeConverter(from inputFormat: AVAudioFormat) -> AVAudioConverter? {
    guard
      let outFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: targetSampleRate,
        channels: 1,
        interleaved: false
      )
    else { return nil }
    return AVAudioConverter(from: inputFormat, to: outFormat)
  }

  /// TODO(M1-3): convert `buffer` to the 16 kHz mono target format, write to `currentFile`,
  /// increment `framesInChunk`, emit periodic "duration" events, and rotate when the chunk reaches
  /// `chunkSeconds`. Rotation must happen on a buffer boundary so no sample is dropped (§7.2).
  private func appendBuffer(_ buffer: AVAudioPCMBuffer) {
    // Placeholder — real conversion + write lands in M1-3 against a device.
  }

  // MARK: - Chunk files

  private func settingsForChunk() -> [String: Any] {
    [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVSampleRateKey: targetSampleRate,
      AVNumberOfChannelsKey: 1,
      AVEncoderBitRateKey: 32000,
    ]
  }

  private func openNextChunk() throws {
    guard let dir = recapDir else { throw RecorderError.notStarted }
    chunkIndex += 1
    framesInChunk = 0
    let name = String(format: "chunk_%04d.m4a", chunkIndex)
    let url = dir.appendingPathComponent(name)
    currentFile = try AVAudioFile(forWriting: url, settings: settingsForChunk())
  }

  private func closeCurrentChunk() {
    guard let file = currentFile else { return }
    let relativePath = "chunks/\(file.url.lastPathComponent)"
    let duration = Double(framesInChunk) / targetSampleRate
    let startOffset = accumulatedSeconds
    accumulatedSeconds += duration
    currentFile = nil

    let byteSize = (try? FileManager.default.attributesOfItem(atPath: file.url.path)[.size] as? Int) ?? 0
    RecapStorage.appendToManifest(
      recapId: recapId,
      index: chunkIndex,
      relativePath: relativePath,
      startOffset: startOffset,
      duration: duration,
      byteSize: byteSize ?? 0
    )
    onEvent?("chunkClosed", [
      "index": chunkIndex,
      "relativePath": relativePath,
      "startOffset": startOffset,
      "duration": duration,
      "byteSize": byteSize ?? 0,
    ])
  }

  // MARK: - Interruptions (§7.2)

  private func registerInterruptionObservers() {
    let nc = NotificationCenter.default
    nc.addObserver(self, selector: #selector(handleInterruption(_:)),
                   name: AVAudioSession.interruptionNotification, object: nil)
    nc.addObserver(self, selector: #selector(handleRouteChange(_:)),
                   name: AVAudioSession.routeChangeNotification, object: nil)
    nc.addObserver(self, selector: #selector(handleMediaReset(_:)),
                   name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
  }

  @objc private func handleInterruption(_ note: Notification) {
    guard
      let info = note.userInfo,
      let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }

    switch type {
    case .began:
      try? pause()
      onEvent?("interrupted", ["reason": "interruption"])
    case .ended:
      let opts = (info[AVAudioSessionInterruptionOptionKey] as? UInt).map(AVAudioSession.InterruptionOptions.init)
      if opts?.contains(.shouldResume) == true { try? resume() }
    @unknown default:
      break
    }
  }

  @objc private func handleRouteChange(_ note: Notification) {
    guard
      let info = note.userInfo,
      let raw = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: raw)
    else { return }
    if reason == .oldDeviceUnavailable {
      try? pause()
      onEvent?("interrupted", ["reason": "routeChange"])
    }
  }

  @objc private func handleMediaReset(_ note: Notification) {
    // TODO(M1-6): rebuild engine + session from scratch, resume into a new chunk; never lose chunks.
    onEvent?("interrupted", ["reason": "mediaReset"])
  }
}

enum RecorderError: Error { case notStarted }
