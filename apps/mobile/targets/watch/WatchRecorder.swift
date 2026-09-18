import AVFoundation
import Foundation

/// On-watch audio capture, used when the iPhone app is not in the foreground (iOS cannot begin
/// microphone capture from the background). One AAC file per recording; kept small (16 kHz mono)
/// because it travels to the phone over WatchConnectivity. Keeps recording with the wrist down
/// thanks to the `audio` WKBackgroundMode.
final class WatchRecorder: NSObject, AVAudioRecorderDelegate {
  struct Result {
    let url: URL
    let durationSeconds: Double
    let startedAt: Date
  }

  private var recorder: AVAudioRecorder?
  private(set) var startedAt = Date()
  private var accumulated: TimeInterval = 0 // seconds recorded before the current run
  private var runStart: Date?

  var isRecording: Bool { recorder?.isRecording == true }

  var elapsed: TimeInterval {
    accumulated + (runStart.map { Date().timeIntervalSince($0) } ?? 0)
  }

  static func requestPermission(_ completion: @escaping (Bool) -> Void) {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in
      DispatchQueue.main.async { completion(granted) }
    }
  }

  func start(recapId: String, completion: @escaping (Error?) -> Void) {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.record, mode: .default, options: [])
    } catch {
      completion(error)
      return
    }
    // watchOS requires asynchronous activation.
    session.activate(options: []) { [weak self] ok, error in
      DispatchQueue.main.async {
        guard let self = self else { return }
        guard ok, error == nil else {
          completion(error ?? NSError(domain: "lv.airecap.watch", code: 1))
          return
        }
        do {
          let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("outbox", isDirectory: true)
          try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
          let url = dir.appendingPathComponent("\(recapId).m4a")
          let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 32000,
          ]
          let rec = try AVAudioRecorder(url: url, settings: settings)
          rec.delegate = self
          guard rec.record() else { throw NSError(domain: "lv.airecap.watch", code: 2) }
          self.recorder = rec
          self.startedAt = Date()
          self.accumulated = 0
          self.runStart = Date()
          completion(nil)
        } catch {
          completion(error)
        }
      }
    }
  }

  func pause() {
    guard let rec = recorder, rec.isRecording else { return }
    rec.pause()
    if let s = runStart { accumulated += Date().timeIntervalSince(s) }
    runStart = nil
  }

  func resume() {
    guard let rec = recorder, !rec.isRecording else { return }
    if rec.record() { runStart = Date() }
  }

  func stop() -> Result? {
    guard let rec = recorder else { return nil }
    if let s = runStart { accumulated += Date().timeIntervalSince(s) }
    runStart = nil
    rec.stop()
    recorder = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    return Result(url: rec.url, durationSeconds: accumulated, startedAt: startedAt)
  }
}
