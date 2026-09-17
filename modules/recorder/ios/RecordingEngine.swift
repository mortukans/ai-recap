import AVFoundation
import Foundation

/// Core capture engine: AVAudioEngine input-node tap → rotating AAC (.m4a) chunk files, with an
/// atomically-rewritten manifest for crash recovery (AI_RECAP_TECHNICAL_ARCHITECTURE.md §7).
///
/// First working implementation (M1-3): records at the microphone's native format straight to AAC to
/// avoid sample-rate conversion bugs. Downsampling to 16 kHz for transcription happens later (M2).
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

  private var currentFile: AVAudioFile?
  private var tapFormat: AVAudioFormat?
  private var fileSampleRate: Double = 48000
  private var fileChannels: AVAudioChannelCount = 1

  private var chunkIndex: Int = 0
  private var framesInChunk: AVAudioFrameCount = 0
  private var accumulatedSeconds: Double = 0
  private var lastEmittedSecond: Int = -1

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
    self.chunkSeconds = max(5, chunkSeconds)
    self.chunkIndex = 0
    self.accumulatedSeconds = 0
    self.lastEmittedSecond = -1

    try configureSession()
    self.recapDir = try RecapStorage.chunkDirectory(for: recapId)

    // Read the input format only after the session is active.
    let input = audioEngine.inputNode
    let format = input.outputFormat(forBus: 0)
    self.tapFormat = format
    self.fileSampleRate = format.sampleRate > 0 ? format.sampleRate : 48000
    self.fileChannels = max(1, format.channelCount)

    try openNextChunk()

    input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
      self?.writeQueue.async { self?.appendBuffer(buffer) }
    }

    audioEngine.prepare()
    try audioEngine.start()
    state = .recording
  }

  func pause() throws {
    guard state == .recording else { return }
    audioEngine.pause()
    writeQueue.sync { closeCurrentChunk() }
    state = .paused
  }

  func resume() throws {
    guard state == .paused else { return }
    try writeQueue.sync { try openNextChunk() }
    try audioEngine.start()
    state = .recording
    onEvent?("resumed", [:])
  }

  func finish() throws -> RecordResult {
    state = .finishing
    audioEngine.inputNode.removeTap(onBus: 0)
    audioEngine.stop()
    writeQueue.sync { closeCurrentChunk() }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    let result = RecordResult(durationSeconds: accumulatedSeconds, chunkCount: chunkIndex)
    state = .idle
    return result
  }

  func addMarker(label: String?) {
    // Markers captured against the current offset; persisted by JS. UI is Phase 2 (Product Plan §4).
  }

  func teardown() {
    if audioEngine.isRunning {
      audioEngine.inputNode.removeTap(onBus: 0)
      audioEngine.stop()
    }
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Capture (runs on writeQueue)

  private func appendBuffer(_ buffer: AVAudioPCMBuffer) {
    guard let file = currentFile, buffer.frameLength > 0 else { return }
    do {
      try file.write(from: buffer)
    } catch {
      onEvent?("error", ["code": "recorder/capture-failed", "message": "\(error)"])
      return
    }
    framesInChunk += buffer.frameLength

    // Emit a duration tick at most once per second (total elapsed across chunks).
    let total = accumulatedSeconds + Double(framesInChunk) / fileSampleRate
    let sec = Int(total)
    if sec != lastEmittedSecond {
      lastEmittedSecond = sec
      onEvent?("duration", ["seconds": total])
    }

    // Rotate the chunk when it reaches the configured length.
    if Double(framesInChunk) >= chunkSeconds * fileSampleRate {
      closeCurrentChunk()
      try? openNextChunk()
    }
  }

  // MARK: - Chunk files

  private func settingsForChunk() -> [String: Any] {
    [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVSampleRateKey: fileSampleRate,
      AVNumberOfChannelsKey: fileChannels,
      AVEncoderBitRateKey: 64000,
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
    let duration = Double(framesInChunk) / fileSampleRate
    let startOffset = accumulatedSeconds
    accumulatedSeconds += duration
    currentFile = nil

    let attrs = try? FileManager.default.attributesOfItem(atPath: file.url.path)
    let byteSize = (attrs?[.size] as? Int) ?? 0

    RecapStorage.appendToManifest(
      recapId: recapId,
      index: chunkIndex,
      relativePath: relativePath,
      startOffset: startOffset,
      duration: duration,
      byteSize: byteSize
    )
    onEvent?("chunkClosed", [
      "index": chunkIndex,
      "relativePath": relativePath,
      "startOffset": startOffset,
      "duration": duration,
      "byteSize": byteSize,
    ])
  }

  // MARK: - Interruptions (§7.2)

  private func registerInterruptionObservers() {
    let nc = NotificationCenter.default
    nc.addObserver(self, selector: #selector(handleInterruption(_:)),
                   name: AVAudioSession.interruptionNotification, object: nil)
    nc.addObserver(self, selector: #selector(handleRouteChange(_:)),
                   name: AVAudioSession.routeChangeNotification, object: nil)
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
}

enum RecorderError: Error { case notStarted }
